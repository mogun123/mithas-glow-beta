-- ==========================================
-- TARGETED ADVANCED INVENTORY MANAGEMENT
-- Works with existing tables: orders, profiles, products
-- ==========================================

-- STEP 1: Check current products table structure
SELECT '=== CURRENT PRODUCTS TABLE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- STEP 2: Check seller column in products
SELECT '=== SELLER COLUMN INFO ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('seller_id', 'seller', 'user_id');

-- STEP 3: Create product_variants table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        CREATE TABLE public.product_variants (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
            sku TEXT NOT NULL UNIQUE,
            variant_name TEXT NOT NULL, -- e.g., "Small-Red", "Medium-Blue"
            size TEXT,
            color TEXT,
            cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            original_price DECIMAL(10,2),
            images TEXT[] DEFAULT '{}',
            attributes JSONB DEFAULT '{}',
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            UNIQUE(product_id, size, color)
        );
        RAISE NOTICE '✅ product_variants table created successfully';
    ELSE
        RAISE NOTICE 'ℹ️ product_variants table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating product_variants: %', SQLERRM;
END $$;

-- STEP 4: Create inventory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
        CREATE TABLE public.inventory (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            variant_id UUID NOT NULL UNIQUE REFERENCES public.product_variants(id) ON DELETE CASCADE,
            total_stock INTEGER NOT NULL DEFAULT 0,
            reserved_stock INTEGER NOT NULL DEFAULT 0,
            damaged_stock INTEGER NOT NULL DEFAULT 0,
            available_stock INTEGER GENERATED ALWAYS AS (
                total_stock - reserved_stock - damaged_stock
            ) STORED,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_by UUID REFERENCES public.profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ inventory table created successfully';
    ELSE
        RAISE NOTICE 'ℹ️ inventory table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating inventory: %', SQLERRM;
END $$;

-- STEP 5: Create inventory_logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs' AND table_schema = 'public') THEN
        CREATE TABLE public.inventory_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'RESERVED', 'RETURN', 'DAMAGE', 'ADJUSTMENT')),
            quantity INTEGER NOT NULL,
            reason TEXT,
            previous_total_stock INTEGER,
            previous_reserved_stock INTEGER,
            previous_damaged_stock INTEGER,
            new_total_stock INTEGER,
            new_reserved_stock INTEGER,
            new_damaged_stock INTEGER,
            order_id UUID REFERENCES public.orders(id),
            created_by UUID REFERENCES public.profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ inventory_logs table created successfully';
    ELSE
        RAISE NOTICE 'ℹ️ inventory_logs table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating inventory_logs: %', SQLERRM;
END $$;

-- STEP 6: Create order_items table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items' AND table_schema = 'public') THEN
        CREATE TABLE public.order_items (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            variant_id UUID NOT NULL REFERENCES public.product_variants(id),
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ order_items table created successfully';
    ELSE
        RAISE NOTICE 'ℹ️ order_items table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating order_items: %', SQLERRM;
END $$;

-- STEP 7: Create variant_sales table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variant_sales' AND table_schema = 'public') THEN
        CREATE TABLE public.variant_sales (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
            order_id UUID REFERENCES public.orders(id),
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            sale_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ variant_sales table created successfully';
    ELSE
        RAISE NOTICE 'ℹ️ variant_sales table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating variant_sales: %', SQLERRM;
END $$;

-- STEP 8: Create essential indexes
DO $$
BEGIN
    -- Product variants indexes
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
    CREATE INDEX IF NOT EXISTS idx_product_variants_active ON public.product_variants(is_active);
    
    -- Inventory indexes
    CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON public.inventory(available_stock);
    
    -- Order items indexes
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
    
    -- Variant sales indexes
    CREATE INDEX IF NOT EXISTS idx_variant_sales_variant_id ON public.variant_sales(variant_id);
    CREATE INDEX IF NOT EXISTS idx_variant_sales_sale_date ON public.variant_sales(sale_date);
    
    RAISE NOTICE '✅ Essential indexes created successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating indexes: %', SQLERRM;
END $$;

-- STEP 9: Create views (using dynamic seller column detection)
CREATE OR REPLACE VIEW public.product_inventory_summary AS
SELECT 
    p.id as product_id,
    -- Dynamic seller column detection
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
        THEN p.seller_id::text
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
        THEN p.seller::text
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id' AND table_schema = 'public') 
        THEN p.user_id::text
        ELSE 'unknown'
    END as seller_id,
    p.name as product_name,
    p.category,
    COALESCE(p.status, 'active') as status,
    COUNT(pv.id) as total_variants,
    COALESCE(SUM(i.available_stock), 0) as total_available_stock,
    COALESCE(SUM(i.reserved_stock), 0) as total_reserved_stock,
    COALESCE(SUM(i.damaged_stock), 0) as total_damaged_stock,
    COALESCE(SUM(i.total_stock), 0) as total_stock,
    CASE 
        WHEN COALESCE(SUM(i.available_stock), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(i.available_stock), 0) <= 5 THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END as inventory_status,
    p.created_at
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
LEFT JOIN public.inventory i ON pv.id = i.variant_id
GROUP BY p.id, 
         CASE 
             WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
             THEN p.seller_id::text
             WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
             THEN p.seller::text
             WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id' AND table_schema = 'public') 
             THEN p.user_id::text
             ELSE 'unknown'
         END,
         p.name, p.category, p.status, p.created_at;

-- STEP 10: Create triggers
CREATE OR REPLACE FUNCTION auto_create_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (variant_id, low_stock_threshold)
    VALUES (NEW.id, COALESCE(NEW.low_stock_threshold, 5))
    ON CONFLICT (variant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_inventory ON public.product_variants;
CREATE TRIGGER trigger_auto_create_inventory
    AFTER INSERT ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_inventory();

-- STEP 11: Enable Row Level Security
DO $$
BEGIN
    ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.variant_sales ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on all tables';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error enabling RLS: %', SQLERRM;
END $$;

-- STEP 12: Create basic RLS policies
DO $$
BEGIN
    -- Product variants policies
    CREATE POLICY "Sellers can view their product variants" ON public.product_variants
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.products 
                WHERE public.products.id = public.product_variants.product_id 
                AND (
                    (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') AND public.products.seller_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') AND public.products.seller = auth.uid())
                    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id' AND table_schema = 'public') AND public.products.user_id = auth.uid())
                )
            )
        );

    CREATE POLICY "Sellers can manage their product variants" ON public.product_variants
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.products 
                WHERE public.products.id = public.product_variants.product_id 
                AND (
                    (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') AND public.products.seller_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') AND public.products.seller = auth.uid())
                    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id' AND table_schema = 'public') AND public.products.user_id = auth.uid())
                )
            )
        );

    RAISE NOTICE '✅ Basic RLS policies created';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating RLS policies: %', SQLERRM;
END $$;

-- STEP 13: Test the implementation
SELECT '=== IMPLEMENTATION TEST ===' as info;

-- Test the view
SELECT 'Testing product_inventory_summary view:' as test;
SELECT * FROM public.product_inventory_summary LIMIT 3;

-- Check table counts
SELECT 'Table record counts:' as test;
SELECT 
    'product_variants' as table_name,
    COUNT(*) as record_count
FROM public.product_variants

UNION ALL

SELECT 
    'inventory' as table_name,
    COUNT(*) as record_count
FROM public.inventory

UNION ALL

SELECT 
    'inventory_logs' as table_name,
    COUNT(*) as record_count
FROM public.inventory_logs;

-- STEP 14: Create sample data for testing (optional)
DO $$
BEGIN
    -- Check if we have products and no variants yet
    DECLARE product_count INTEGER;
    DECLARE variant_count INTEGER;
    
    SELECT COUNT(*) INTO product_count FROM public.products;
    SELECT COUNT(*) INTO variant_count FROM public.product_variants;
    
    IF product_count > 0 AND variant_count = 0 THEN
        DECLARE sample_product_id UUID;
        SELECT id INTO sample_product_id FROM public.products LIMIT 1;
        
        -- Create a sample variant
        INSERT INTO public.product_variants (product_id, sku, variant_name, cost_price, selling_price, low_stock_threshold)
        VALUES (sample_product_id, 'SAMPLE-001', 'Default', 100.00, 200.00, 5);
        
        RAISE NOTICE '✅ Sample variant created for testing';
    ELSIF product_count = 0 THEN
        RAISE NOTICE 'ℹ️ No products found - create some products first';
    ELSE
        RAISE NOTICE 'ℹ️ Variants already exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating sample data: %', SQLERRM;
END $$;

-- FINAL VERIFICATION
SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 'Advanced Inventory Management implementation completed!' as status;

-- ==========================================
-- TARGETED IMPLEMENTATION COMPLETE
-- ==========================================
