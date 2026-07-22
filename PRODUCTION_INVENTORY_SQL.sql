-- ==========================================
-- PRODUCTION-READY ADVANCED INVENTORY MANAGEMENT
-- Complete SQL Implementation for MITHAS GLOW
-- ==========================================

-- Step 1: Modify existing products table to be container-only
ALTER TABLE public.products 
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS original_price,
DROP COLUMN IF EXISTS size_options,
DROP COLUMN IF EXISTS color_options,
DROP COLUMN IF EXISTS in_stock,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS vto_status TEXT CHECK (vto_status IN ('enabled', 'disabled')) DEFAULT 'disabled',
ADD COLUMN IF NOT EXISTS three_d_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_bid_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_bid_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS attributes_json JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;

-- Step 2: Create product_variants table (mandatory variant-level tracking)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    variant_name TEXT NOT NULL, -- e.g., "Small-Red", "Medium-Blue", "Large-Green"
    size TEXT,
    color TEXT,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    images TEXT[] DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(sku),
    UNIQUE(product_id, size, color)
);

-- Create indexes for product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON public.product_variants(size);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON public.product_variants(color);
CREATE INDEX IF NOT EXISTS idx_product_variants_price ON public.product_variants(selling_price);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON public.product_variants(is_active);

-- Step 3: Create inventory table (core logic)
CREATE TABLE IF NOT EXISTS public.inventory (
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

-- Create indexes for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON public.inventory(available_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(available_stock) WHERE available_stock <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS idx_inventory_out_of_stock ON public.inventory(available_stock) WHERE available_stock = 0;
CREATE INDEX IF NOT EXISTS idx_inventory_total_stock ON public.inventory(total_stock);

-- Step 4: Create inventory_logs table (audit trail)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
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

-- Create indexes for inventory_logs
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON public.inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON public.inventory_logs(type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order_id ON public.inventory_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_by ON public.inventory_logs(created_by);

-- Step 5: Create order_items table (normalize order items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_quantity ON public.order_items(quantity);

-- Step 6: Create variant_sales table (sales velocity tracking)
CREATE TABLE IF NOT EXISTS public.variant_sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for variant_sales
CREATE INDEX IF NOT EXISTS idx_variant_sales_variant_id ON public.variant_sales(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_sales_order_id ON public.variant_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_variant_sales_sale_date ON public.variant_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_variant_sales_created_at ON public.variant_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_variant_sales_quantity ON public.variant_sales(quantity);

-- Step 7: Update orders table to support buyer/seller relationship
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS shipping_address_id UUID,
ADD COLUMN IF NOT EXISTS billing_address_id UUID,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Update indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Step 8: Create views for business logic

-- Product inventory summary view
CREATE OR REPLACE VIEW public.product_inventory_summary AS
SELECT 
    p.id as product_id,
    p.seller_id,
    p.name as product_name,
    p.category,
    p.status,
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
GROUP BY p.id, p.seller_id, p.name, p.category, p.status, p.created_at;

-- Variant sales velocity view
CREATE OR REPLACE VIEW public.variant_sales_velocity AS
SELECT 
    pv.id as variant_id,
    pv.product_id,
    pv.sku,
    pv.variant_name,
    pv.size,
    pv.color,
    pv.cost_price,
    pv.selling_price,
    pv.low_stock_threshold,
    i.total_stock,
    i.reserved_stock,
    i.damaged_stock,
    i.available_stock,
    p.seller_id,
    COALESCE(sales_7days.total_quantity, 0) as sales_7days,
    COALESCE(sales_30days.total_quantity, 0) as sales_30days,
    COALESCE(sales_60days.total_quantity, 0) as sales_60days,
    COALESCE(sales_90days.total_quantity, 0) as sales_90days,
    CASE 
        WHEN i.available_stock = 0 THEN 'OUT_OF_STOCK'
        WHEN i.available_stock <= i.low_stock_threshold THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END as stock_status,
    CASE 
        WHEN COALESCE(sales_7days.total_quantity, 0) > 10 THEN 'FAST_MOVING'
        WHEN COALESCE(sales_90days.total_quantity, 0) = 0 THEN 'DEAD_STOCK'
        ELSE 'NORMAL'
    END as movement_status
FROM public.product_variants pv
JOIN public.products p ON pv.product_id = p.id
LEFT JOIN public.inventory i ON pv.id = i.variant_id
LEFT JOIN (
    SELECT variant_id, SUM(quantity) as total_quantity
    FROM public.variant_sales
    WHERE sale_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY variant_id
) sales_7days ON pv.id = sales_7days.variant_id
LEFT JOIN (
    SELECT variant_id, SUM(quantity) as total_quantity
    FROM public.variant_sales
    WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY variant_id
) sales_30days ON pv.id = sales_30days.variant_id
LEFT JOIN (
    SELECT variant_id, SUM(quantity) as total_quantity
    FROM public.variant_sales
    WHERE sale_date >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY variant_id
) sales_60days ON pv.id = sales_60days.variant_id
LEFT JOIN (
    SELECT variant_id, SUM(quantity) as total_quantity
    FROM public.variant_sales
    WHERE sale_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY variant_id
) sales_90days ON pv.id = sales_90days.variant_id;

-- Step 9: Create triggers and functions

-- Function to auto-create inventory record when variant is created
CREATE OR REPLACE FUNCTION auto_create_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (variant_id, low_stock_threshold)
    VALUES (NEW.id, NEW.low_stock_threshold)
    ON CONFLICT (variant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-creating inventory
DROP TRIGGER IF EXISTS trigger_auto_create_inventory ON public.product_variants;
CREATE TRIGGER trigger_auto_create_inventory
    AFTER INSERT ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_inventory();

-- Function to log inventory changes
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory_logs (
        variant_id, type, quantity, reason,
        previous_total_stock, previous_reserved_stock, previous_damaged_stock,
        new_total_stock, new_reserved_stock, new_damaged_stock,
        created_by, created_at
    )
    VALUES (
        NEW.variant_id, 'ADJUSTMENT', 
        NEW.total_stock - OLD.total_stock, 'Stock adjustment',
        OLD.total_stock, OLD.reserved_stock, OLD.damaged_stock,
        NEW.total_stock, NEW.reserved_stock, NEW.damaged_stock,
        NEW.updated_by, NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging inventory changes
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON public.inventory;
CREATE TRIGGER trigger_log_inventory_change
    AFTER UPDATE ON public.inventory
    FOR EACH ROW
    WHEN (OLD.total_stock IS DISTINCT FROM NEW.total_stock OR 
          OLD.reserved_stock IS DISTINCT FROM NEW.reserved_stock OR 
          OLD.damaged_stock IS DISTINCT FROM NEW.damaged_stock)
    EXECUTE FUNCTION log_inventory_change();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trigger_product_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Enable Row Level Security
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_sales ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies

-- Product variants RLS policies
CREATE POLICY "Sellers can view variants of their products" ON public.product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products 
            WHERE public.products.id = public.product_variants.product_id 
            AND public.products.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can manage variants of their products" ON public.product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products 
            WHERE public.products.id = public.product_variants.product_id 
            AND public.products.seller_id = auth.uid()
        )
    );

-- Inventory RLS policies
CREATE POLICY "Sellers can view inventory of their products" ON public.inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product_variants pv
            JOIN public.products p ON pv.product_id = p.id
            WHERE pv.id = public.inventory.variant_id 
            AND p.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can manage inventory of their products" ON public.inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.product_variants pv
            JOIN public.products p ON pv.product_id = p.id
            WHERE pv.id = public.inventory.variant_id 
            AND p.seller_id = auth.uid()
        )
    );

-- Inventory logs RLS policies
CREATE POLICY "Sellers can view logs of their products" ON public.inventory_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product_variants pv
            JOIN public.products p ON pv.product_id = p.id
            WHERE pv.id = public.inventory_logs.variant_id 
            AND p.seller_id = auth.uid()
        )
    );

CREATE POLICY "System can create inventory logs" ON public.inventory_logs
    FOR INSERT WITH CHECK (true);

-- Order items RLS policies
CREATE POLICY "Sellers can view order items of their products" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_items.order_id 
            AND o.seller_id = auth.uid()
        )
    );

CREATE POLICY "System can create order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

-- Variant sales RLS policies
CREATE POLICY "Sellers can view sales of their products" ON public.variant_sales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product_variants pv
            JOIN public.products p ON pv.product_id = p.id
            WHERE pv.id = public.variant_sales.variant_id 
            AND p.seller_id = auth.uid()
        )
    );

CREATE POLICY "System can create variant sales" ON public.variant_sales
    FOR INSERT WITH CHECK (true);

-- Step 12: Create sample data for testing (optional)
-- Uncomment the following lines to create sample data

-- Get a seller user ID
-- SELECT id FROM public.profiles WHERE is_seller = true LIMIT 1;

-- Sample product
-- INSERT INTO public.products (seller_id, name, description, category, status, floor)
-- VALUES (
--     'your-seller-id-here', 
--     'Sample Product', 
--     'This is a sample product for testing the Advanced Inventory Management system', 
--     'Electronics', 
--     'active',
--     1
-- ) RETURNING id;

-- Sample variant
-- INSERT INTO public.product_variants (product_id, sku, variant_name, size, color, cost_price, selling_price, low_stock_threshold)
-- VALUES (
--     'product-id-from-above', 
--     'SAMPLE-001', 
--     'Small-Red', 
--     'Small', 
--     'Red',
--     100.00, 
--     200.00, 
--     5
-- );

-- ==========================================
-- IMPLEMENTATION COMPLETE!
-- ==========================================

-- Verification queries to test the implementation:

-- Test new tables
-- SELECT * FROM public.product_variants LIMIT 1;
-- SELECT * FROM public.inventory LIMIT 1;
-- SELECT * FROM public.inventory_logs LIMIT 1;
-- SELECT * FROM public.order_items LIMIT 1;
-- SELECT * FROM public.variant_sales LIMIT 1;

-- Test views
-- SELECT * FROM public.product_inventory_summary LIMIT 5;
-- SELECT * FROM public.variant_sales_velocity LIMIT 5;

-- Test RLS policies (run as authenticated user)
-- SELECT COUNT(*) FROM public.product_variants; -- Should only show user's variants
-- SELECT COUNT(*) FROM public.inventory; -- Should only show user's inventory

-- Test business logic
-- SELECT variant_id, available_stock, stock_status FROM public.variant_sales_velocity LIMIT 5;
