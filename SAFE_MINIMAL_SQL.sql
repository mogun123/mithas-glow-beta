-- ==========================================
-- SAFE MINIMAL IMPLEMENTATION
-- Step-by-step approach with error checking at each stage
-- ==========================================

-- STEP 1: First, let's see what we're working with
SELECT '=== CURRENT PRODUCTS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- STEP 2: Check if seller column exists
SELECT '=== SELLER COLUMN STATUS ===' as info;
SELECT 
    column_name,
    CASE WHEN column_name IN ('seller_id', 'seller') THEN 'FOUND' ELSE 'NOT FOUND' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('seller_id', 'seller');

-- STEP 3: Create product_variants table (minimal version first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        CREATE TABLE public.product_variants (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            product_id UUID NOT NULL,
            sku TEXT NOT NULL,
            variant_name TEXT NOT NULL,
            cost_price DECIMAL(10,2) DEFAULT 0.00,
            selling_price DECIMAL(10,2) DEFAULT 0.00,
            low_stock_threshold INTEGER DEFAULT 5,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'product_variants table created successfully';
    ELSE
        RAISE NOTICE 'product_variants table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating product_variants: %', SQLERRM;
END $$;

-- STEP 4: Add foreign key constraint if products table exists
DO $$
BEGIN
    -- Check if we can add the foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        ALTER TABLE public.product_variants 
        ADD CONSTRAINT fk_product_variants_product_id 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Products table does not exist, skipping foreign key';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding foreign key: %', SQLERRM;
END $$;

-- STEP 5: Create inventory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
        CREATE TABLE public.inventory (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            variant_id UUID NOT NULL,
            total_stock INTEGER DEFAULT 0,
            reserved_stock INTEGER DEFAULT 0,
            damaged_stock INTEGER DEFAULT 0,
            low_stock_threshold INTEGER DEFAULT 5,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'inventory table created successfully';
    ELSE
        RAISE NOTICE 'inventory table already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating inventory: %', SQLERRM;
END $$;

-- STEP 6: Add unique constraint and computed column
DO $$
BEGIN
    -- Add unique constraint
    ALTER TABLE public.inventory 
    ADD CONSTRAINT IF NOT EXISTS inventory_variant_id_unique UNIQUE (variant_id);
    
    -- Add foreign key constraint
    ALTER TABLE public.inventory 
    ADD CONSTRAINT IF NOT EXISTS fk_inventory_variant_id 
    FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
    
    -- Add computed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'available_stock' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory 
        ADD COLUMN available_stock INTEGER GENERATED ALWAYS AS (
            total_stock - reserved_stock - damaged_stock
        ) STORED;
    END IF;
    
    RAISE NOTICE 'Inventory table constraints and computed column added successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error setting up inventory: %', SQLERRM;
END $$;

-- STEP 7: Create basic indexes
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
    CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON public.inventory(available_stock);
    RAISE NOTICE 'Basic indexes created successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;

-- STEP 8: Create simple view (without seller reference for now)
CREATE OR REPLACE VIEW public.product_inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    COUNT(pv.id) as total_variants,
    COALESCE(SUM(i.total_stock), 0) as total_stock,
    COALESCE(SUM(i.available_stock), 0) as total_available_stock,
    CASE 
        WHEN COALESCE(SUM(i.available_stock), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(i.available_stock), 0) <= 5 THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END as inventory_status
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
LEFT JOIN public.inventory i ON pv.id = i.variant_id
GROUP BY p.id, p.name, p.category;

-- STEP 9: Test the view
SELECT '=== TESTING VIEW ===' as info;
SELECT * FROM public.product_inventory_summary LIMIT 3;

-- STEP 10: Create trigger for auto-inventory creation
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

-- STEP 11: Test with sample data (optional)
DO $$
BEGIN
    -- Check if we have any products to work with
    IF EXISTS (SELECT 1 FROM public.products LIMIT 1) THEN
        -- Get a sample product
        DECLARE sample_product_id UUID;
        SELECT id INTO sample_product_id FROM public.products LIMIT 1;
        
        -- Insert a sample variant
        INSERT INTO public.product_variants (product_id, sku, variant_name, cost_price, selling_price)
        VALUES (sample_product_id, 'TEST-001', 'Sample Variant', 100.00, 200.00);
        
        RAISE NOTICE 'Sample variant created for product: %', sample_product_id;
    ELSE
        RAISE NOTICE 'No products found to create sample variant';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating sample data: %', SQLERRM;
END $$;

-- STEP 12: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 
    'product_variants' as table_name,
    COUNT(*) as record_count
FROM public.product_variants

UNION ALL

SELECT 
    'inventory' as table_name,
    COUNT(*) as record_count
FROM public.inventory;

SELECT '=== VIEW TEST ===' as info;
SELECT * FROM public.product_inventory_summary LIMIT 3;

-- ==========================================
-- MINIMAL SAFE IMPLEMENTATION COMPLETE
-- ==========================================
