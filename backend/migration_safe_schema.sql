-- MIGRATION SAFE SCHEMA FOR MITHAS GLOW
-- This script uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN IF NOT EXISTS
-- to safely update existing Supabase databases without data loss

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE - Enhanced with role-based fields
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
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

-- Add missing columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'normal' CHECK (user_type IN ('normal', 'pro'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_status VARCHAR(20) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add location columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- =====================================================
-- SHOPS TABLE - For Pro users only
-- =====================================================
CREATE TABLE IF NOT EXISTS shops (
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

-- =====================================================
-- PRODUCTS TABLE - For Pro users to list their products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
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

-- =====================================================
-- ORDERS TABLE - For tracking customer orders
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
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

-- =====================================================
-- ORDER_ITEMS TABLE (Alternative to JSONB approach)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADDRESSES TABLE - For user addresses
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing', 'both')),
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadata
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WALLET_TRANSACTIONS TABLE - For wallet management
-- =====================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    type VARCHAR(20) DEFAULT 'credit' CHECK (type IN ('credit', 'debit')),
    description TEXT,
    
    -- Related Entity
    order_id UUID REFERENCES orders(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE - For user notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Entity
    related_id UUID, -- Could be order_id, product_id, etc.
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR PROFILES
-- =====================================================
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- RLS POLICIES FOR SHOPS (Pro users only)
-- =====================================================
CREATE POLICY IF NOT EXISTS "Pro users can view own shop" ON shops
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

CREATE POLICY IF NOT EXISTS "Pro users can update own shop" ON shops
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

CREATE POLICY IF NOT EXISTS "Pro users can insert own shop" ON shops
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

-- =====================================================
-- RLS POLICIES FOR PRODUCTS (Pro users only)
-- =====================================================
CREATE POLICY IF NOT EXISTS "Pro users can manage own products" ON products
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES FOR ORDERS
-- =====================================================
CREATE POLICY IF NOT EXISTS "Shop owners can view own orders" ON orders
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Shop owners can update own orders" ON orders
    FOR UPDATE USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES FOR ADDRESSES
-- =====================================================
CREATE POLICY IF NOT EXISTS "Users can manage own addresses" ON addresses
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES FOR WALLET TRANSACTIONS
-- =====================================================
CREATE POLICY IF NOT EXISTS "Users can view own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own wallet transactions" ON wallet_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES FOR NOTIFICATIONS
-- =====================================================
CREATE POLICY IF NOT EXISTS "Users can manage own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION TO CREATE SHOP WHEN USER BECOMES PRO
-- =====================================================
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

-- =====================================================
-- TRIGGER TO AUTOMATICALLY CREATE SHOP WHEN USER BECOMES PRO
-- =====================================================
DROP TRIGGER IF EXISTS create_shop_on_pro_upgrade ON profiles;
CREATE TRIGGER create_shop_on_pro_upgrade
    AFTER UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_shop_for_pro_user();

-- =====================================================
-- VIEWS FOR EASIER DATA ACCESS
-- =====================================================
CREATE OR REPLACE VIEW pro_users_with_shops AS
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

CREATE OR REPLACE VIEW shop_overview AS
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

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON shops TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON addresses TO authenticated;
GRANT ALL ON wallet_transactions TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT SELECT ON pro_users_with_shops TO authenticated;
GRANT SELECT ON shop_overview TO authenticated;

-- =====================================================
-- STORAGE BUCKET FOR PRODUCT IMAGES (IF USING SUPABASE STORAGE)
-- =====================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR PRODUCT IMAGES
-- =====================================================
CREATE POLICY IF NOT EXISTS "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Pro users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN shops s ON p.id = s.user_id 
            WHERE p.id = auth.uid() AND p.user_type = 'pro'
        )
    );

CREATE POLICY IF NOT EXISTS "Pro users can update own product images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN shops s ON p.id = s.user_id 
            WHERE p.id = auth.uid() AND p.user_type = 'pro'
        )
    );

CREATE POLICY IF NOT EXISTS "Pro users can delete own product images" ON storage.objects
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

-- =====================================================
-- VERIFICATION QUERIES (RUN THESE TO VERIFY INSTALLATION)
-- =====================================================
-- Uncomment these queries to verify the installation:

-- -- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'shops', 'products', 'orders', 'order_items', 'addresses', 'wallet_transactions', 'notifications');

-- -- Check columns exist in profiles table
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- -- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- -- Check policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';
