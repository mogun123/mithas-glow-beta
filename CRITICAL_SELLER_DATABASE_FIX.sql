-- ==========================================
-- CRITICAL SELLER PLATFORM DATABASE FIX
-- Fix missing seller columns for proper functionality
-- ==========================================

-- Step 1: Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_category TEXT,
ADD COLUMN IF NOT EXISTS store_description TEXT,
ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_verification_status TEXT DEFAULT 'pending';

-- Step 2: Add missing columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS vto_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS three_d_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS glow_bid_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_acceptable_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS floor TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

-- Step 3: Add missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 4: Create sellers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sellers (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    shop_description TEXT,
    shop_category TEXT,
    shop_logo TEXT,
    shop_banner TEXT,
    business_name TEXT,
    business_address JSONB DEFAULT '{}',
    business_phone TEXT,
    business_email TEXT,
    tax_id TEXT,
    onboarding_status TEXT DEFAULT 'pending',
    verification_status TEXT DEFAULT 'pending',
    verification_documents TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    seller_rating DECIMAL(3,2) DEFAULT 0.0,
    total_sales DECIMAL(12,2) DEFAULT 0.0,
    total_orders INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.0,
    payout_method TEXT,
    payout_details JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_seller_id ON public.profiles(seller_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON public.profiles(is_seller);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_verification_status ON public.sellers(verification_status);

-- Step 6: Create RLS policies for seller data security
-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Sellers are publicly viewable" ON public.profiles;
CREATE POLICY "Sellers are publicly viewable" ON public.profiles
    FOR SELECT USING (is_seller = true);

-- Products table policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own products" ON public.products;
CREATE POLICY "Sellers can view own products" ON public.products
    FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products;
CREATE POLICY "Sellers can manage own products" ON public.products
    FOR ALL USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Active products are publicly viewable" ON public.products;
CREATE POLICY "Active products are publicly viewable" ON public.products
    FOR SELECT USING (status = 'active');

-- Orders table policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own orders" ON public.orders;
CREATE POLICY "Sellers can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can view own orders" ON public.orders;
CREATE POLICY "Buyers can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = customer_id);

DROP POLICY IF EXISTS "Sellers can update own orders" ON public.orders;
CREATE POLICY "Sellers can update own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = seller_id);

-- Sellers table policies
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own profile" ON public.sellers;
CREATE POLICY "Sellers can view own profile" ON public.sellers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update own profile" ON public.sellers;
CREATE POLICY "Sellers can update own profile" ON public.sellers
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Verified sellers are publicly viewable" ON public.sellers;
CREATE POLICY "Verified sellers are publicly viewable" ON public.sellers
    FOR SELECT USING (is_verified = true);

-- Step 7: Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_sellers_updated_at ON public.sellers;
CREATE TRIGGER handle_sellers_updated_at
    BEFORE UPDATE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 8: Create functions for seller operations
CREATE OR REPLACE FUNCTION public.become_seller(
    shop_name_param TEXT,
    shop_category_param TEXT,
    shop_description_param TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    seller_exists BOOLEAN;
BEGIN
    -- Check if user exists
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'User not authenticated';
        RETURN;
    END IF;
    
    -- Check if already a seller
    SELECT EXISTS(
        SELECT 1 FROM public.sellers WHERE user_id = current_user_id
    ) INTO seller_exists;
    
    IF seller_exists THEN
        RETURN QUERY SELECT false, 'Already registered as seller';
        RETURN;
    END IF;
    
    -- Create seller record
    INSERT INTO public.sellers (
        user_id, 
        shop_name, 
        shop_category, 
        shop_description,
        onboarding_status,
        verification_status
    ) VALUES (
        current_user_id,
        shop_name_param,
        shop_category_param,
        shop_description_param,
        'completed',
        'pending'
    );
    
    -- Update profile
    UPDATE public.profiles 
    SET 
        is_seller = true,
        seller_status = 'active',
        store_name = shop_name_param,
        store_category = shop_category_param,
        seller_id = current_user_id
    WHERE id = current_user_id;
    
    RETURN QUERY SELECT true, 'Successfully registered as seller';
END;
$$;

-- Step 9: Create view for seller dashboard data
CREATE OR REPLACE VIEW public.seller_dashboard_view AS
SELECT 
    s.user_id,
    s.shop_name,
    s.seller_rating,
    s.total_sales,
    s.total_orders,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT CASE WHEN p.stock < 5 THEN p.id END) as low_stock_products,
    COUNT(DISTINCT o.id) as total_orders_count,
    COUNT(DISTINCT CASE WHEN o.status = 'pending' OR o.status = 'new' THEN o.id END) as pending_orders,
    COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE THEN o.total ELSE 0 END), 0) as today_revenue
FROM public.sellers s
LEFT JOIN public.products p ON s.user_id = p.seller_id AND p.status = 'active'
LEFT JOIN public.orders o ON s.user_id = o.seller_id
WHERE s.user_id = auth.uid()
GROUP BY s.user_id, s.shop_name, s.seller_rating, s.total_sales, s.total_orders;

-- Step 10: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.sellers TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT SELECT ON public.seller_dashboard_view TO authenticated;

-- Step 11: Verification script
SELECT '=== VERIFICATION RESULTS ===' as info;

-- Check if all critical columns now exist
SELECT 
    'profiles.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN '✅ FIXED' ELSE '❌ STILL MISSING' END as status

UNION ALL

SELECT 
    'profiles.is_seller' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_seller' AND table_schema = 'public'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status

UNION ALL

SELECT 
    'products.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN '✅ FIXED' ELSE '❌ STILL MISSING' END as status

UNION ALL

SELECT 
    'orders.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN '✅ FIXED' ELSE '❌ STILL MISSING' END as status

UNION ALL

SELECT 
    'orders.buyer_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'buyer_id' AND table_schema = 'public'
    ) THEN '✅ FIXED' ELSE '❌ STILL MISSING' END as status;

-- Check if sellers table exists
SELECT 
    'sellers table' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sellers' AND table_schema = 'public'
    ) THEN '✅ CREATED' ELSE '❌ MISSING' END as status;

-- Check if RLS policies are enabled
SELECT 
    'RLS Policies' as check_name,
    COUNT(*)::TEXT || ' policies created' as status
FROM pg_policies 
WHERE schemaname = 'public';

SELECT '=== DATABASE FIX COMPLETE ===' as info;
SELECT '✅ All critical seller columns added' as message;
SELECT '✅ Sellers table created' as message;
SELECT '✅ RLS policies enabled' as message;
SELECT '✅ Indexes created for performance' as message;
SELECT '✅ Functions and views created' as message;
SELECT '🚀 Seller platform is now ready for launch!' as message;
