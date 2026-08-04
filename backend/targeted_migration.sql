-- TARGETED MIGRATION FOR MITHAS GLOW
-- Based on your existing profiles table structure, this adds only what's missing

-- =====================================================
-- ADD MISSING COLUMNS TO PROFILES TABLE
-- =====================================================

-- Add user_type column (most important for role-based system)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'normal' CHECK (user_type IN ('normal', 'pro'));

-- Add latitude and longitude for location features
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Note: You already have most other columns including:
-- - profile_completed ✓
-- - is_seller ✓ 
-- - seller_status ✓
-- - created_at ✓
-- - updated_at ✓
-- - shop_name ✓
-- - shop_type ✓

-- =====================================================
-- CREATE SHOPS TABLE (IF NOT EXISTS)
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
    UNIQUE(user_id)
);

-- =====================================================
-- CREATE PRODUCTS TABLE (IF SHOPS EXISTS)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(100),
            images TEXT[],
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(20) NOT NULL,
            shipping_address TEXT NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
            order_items JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL,
            price_at_time DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Shops policies (Pro users only)
DROP POLICY IF EXISTS "Pro users can view own shop" ON shops;
CREATE POLICY "Pro users can view own shop" ON shops
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

DROP POLICY IF EXISTS "Pro users can update own shop" ON shops;
CREATE POLICY "Pro users can update own shop" ON shops
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

DROP POLICY IF EXISTS "Pro users can insert own shop" ON shops;
CREATE POLICY "Pro users can insert own shop" ON shops
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'pro')
    );

-- Products policies
DROP POLICY IF EXISTS "Pro users can manage own products" ON products;
CREATE POLICY "Pro users can manage own products" ON products
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- Orders policies
DROP POLICY IF EXISTS "Shop owners can view own orders" ON orders;
CREATE POLICY "Shop owners can view own orders" ON orders
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Shop owners can update own orders" ON orders;
CREATE POLICY "Shop owners can update own orders" ON orders
    FOR UPDATE USING (
        shop_id IN (
            SELECT id FROM shops WHERE user_id = auth.uid()
        )
    );

-- Order items policies
DROP POLICY IF EXISTS "Shop owners can view own order items" ON order_items;
CREATE POLICY "Shop owners can view own order items" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE 
            shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
        )
    );

-- =====================================================
-- CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
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

-- =====================================================
-- AUTO-SHOP CREATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION create_shop_for_pro_user()
RETURNS TRIGGER AS $$
BEGIN
    -- If user type is being set to 'pro' and shop doesn't exist
    IF NEW.user_type = 'pro' AND OLD.user_type != 'pro' THEN
        INSERT INTO shops (user_id, shop_name, business_address, professional_bio)
        VALUES (
            NEW.id,
            COALESCE(NEW.shop_name, CONCAT(NEW.display_name, ' Shop')),
            'Address to be updated',
            NEW.bio
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS create_shop_on_pro_upgrade ON profiles;
CREATE TRIGGER create_shop_on_pro_upgrade
    AFTER UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_shop_for_pro_user();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON shops TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'TARGETED MIGRATION COMPLETED' as status, 
       NOW() as completed_at;
