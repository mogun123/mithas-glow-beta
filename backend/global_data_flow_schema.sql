-- GLOBAL DATA FLOW SCHEMA FOR MITHAS GLOW
-- This schema supports role-based data handling, real-time updates, and global state management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for fresh deployment)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- PROFILES TABLE - Enhanced with role-based fields
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    display_name VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(20),
    city VARCHAR(100),
    user_type VARCHAR(20) DEFAULT 'normal' CHECK (user_type IN ('normal', 'pro')),
    profile_completed BOOLEAN DEFAULT FALSE,
    is_seller BOOLEAN DEFAULT FALSE,
    seller_status VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SHOPS TABLE - For Pro users only
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    business_address TEXT NOT NULL,
    professional_bio TEXT,
    gst_number VARCHAR(15),
    shop_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- One shop per user
);

-- PRODUCTS TABLE - For Pro users to list their products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    images TEXT[], -- Array of image URLs
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS TABLE - For tracking customer orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    order_items JSONB NOT NULL, -- Array of product details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDER_ITEMS TABLE (Alternative to JSONB approach)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_shops_user_id ON shops(user_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for PROFILES
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for SHOPS (Pro users only)
CREATE POLICY "Pro users can view own shop" ON shops
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

CREATE POLICY "Pro users can update own shop" ON shops
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

CREATE POLICY "Pro users can insert own shop" ON shops
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

-- RLS Policies for PRODUCTS (Pro users only)
CREATE POLICY "Pro users can manage own products" ON products
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for ORDERS
CREATE POLICY "Shop owners can view own orders" ON orders
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Shop owners can update own orders" ON orders
    FOR UPDATE USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for ORDER_ITEMS
CREATE POLICY "Shop owners can view own order items" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE 
            shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
        )
    );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create shop when user becomes pro
CREATE OR REPLACE FUNCTION create_shop_for_pro_user()
RETURNS TRIGGER AS $$
BEGIN
    -- If user type is being set to 'pro' and shop doesn't exist
    IF NEW.user_type = 'pro' AND OLD.user_type != 'pro' THEN
        INSERT INTO shops (user_id, shop_name, business_address, professional_bio)
        VALUES (
            NEW.id,
            CONCAT(NEW.display_name, ' Shop'),
            'Address to be updated',
            NEW.bio
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    -- If user type is being changed from 'pro' to 'normal'
    IF NEW.user_type = 'normal' AND OLD.user_type = 'pro' THEN
        UPDATE profiles SET is_seller = FALSE, seller_status = NULL WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create shop when user becomes pro
CREATE TRIGGER create_shop_on_pro_upgrade
    AFTER UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_shop_for_pro_user();

-- Sample Data for Testing
INSERT INTO profiles (id, email, username, display_name, full_name, bio, phone, city, user_type, profile_completed) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john@example.com', 'johnbeauty', 'John Beauty Studio', 'John Doe', 'Professional makeup artist and beauty expert', '+91 98765 43210', 'Mumbai', 'pro', TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'sarah@example.com', 'sarahglam', 'Sarah Glam', 'Sarah Smith', 'Beauty enthusiast and content creator', '+91 87654 32109', 'Delhi', 'normal', TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'mike@example.com', 'mikestyle', 'Mike Style', 'Mike Johnson', 'Hair stylist and grooming expert', '+91 76543 21098', 'Bangalore', 'pro', TRUE);

-- Sample Shop Data
INSERT INTO shops (user_id, shop_name, business_address, professional_bio, gst_number, shop_completed) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Beauty Studio', '123 Main Street, Mumbai, Maharashtra 400001', 'Professional makeup services for all occasions', '27AAAPL1234C1ZV', TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'Mike Style Salon', '456 Park Avenue, Bangalore, Karnataka 560001', 'Premium hair styling and grooming services', '29BBBPL1234C1ZY', TRUE);

-- Sample Product Data
INSERT INTO products (shop_id, name, description, price, category, status) VALUES
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'), 'Bridal Makeup Package', 'Complete bridal makeup with hair styling', 5000.00, 'makeup', 'active'),
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'), 'Party Makeup', 'Glamorous makeup for parties and events', 2500.00, 'makeup', 'active'),
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440003'), 'Haircut & Styling', 'Professional haircut and styling session', 1500.00, 'hair', 'active'),
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440003'), 'Beard Grooming', 'Professional beard trimming and styling', 800.00, 'grooming', 'active');

-- Sample Order Data
INSERT INTO orders (shop_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, order_items) VALUES
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'), 'Priya Sharma', 'priya@email.com', '+91 98765 12345', '789 MG Road, Mumbai 400002', 5000.00, 'delivered', '[{"product_id": "550e8400-e29b-41d4-a716-446655440005", "quantity": 1, "price": 5000}]'),
((SELECT id FROM shops WHERE user_id = '550e8400-e29b-41d4-a716-446655440003'), 'Rahul Kumar', 'rahul@email.com', '+91 87654 54321', '321 Brigade Road, Bangalore 560002', 2300.00, 'processing', '[{"product_id": "550e8400-e29b-41d4-a716-446655440007", "quantity": 1, "price": 1500}, {"product_id": "550e8400-e29b-41d4-a716-446655440008", "quantity": 1, "price": 800}]');

-- Views for easier data access
CREATE VIEW pro_users_with_shops AS
SELECT 
    p.id,
    p.email,
    p.display_name,
    p.username,
    p.user_type,
    p.profile_completed,
    s.id as shop_id,
    s.shop_name,
    s.business_address,
    s.professional_bio,
    s.gst_number,
    s.shop_completed
FROM profiles p
LEFT JOIN shops s ON p.id = s.user_id
WHERE p.user_type = 'pro';

CREATE VIEW shop_overview AS
SELECT 
    s.id as shop_id,
    s.shop_name,
    s.business_address,
    p.display_name as owner_name,
    p.email as owner_email,
    p.phone as owner_phone,
    COUNT(pr.id) as product_count,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_revenue
FROM shops s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN products pr ON s.id = pr.shop_id
LEFT JOIN orders o ON s.id = o.shop_id
GROUP BY s.id, s.shop_name, s.business_address, p.display_name, p.email, p.phone;

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON shops TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON pro_users_with_shops TO authenticated;
GRANT SELECT ON shop_overview TO authenticated;

-- Storage bucket for product images (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Pro users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN shops s ON p.id = s.user_id 
            WHERE p.id = auth.uid() AND p.user_type = 'pro'
        )
    );

CREATE POLICY "Pro users can update own product images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN shops s ON p.id = s.user_id 
            WHERE p.id = auth.uid() AND p.user_type = 'pro'
        )
    );

CREATE POLICY "Pro users can delete own product images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN shops s ON p.id = s.user_id 
            WHERE p.id = auth.uid() AND p.user_type = 'pro'
        )
    );

COMMIT;
