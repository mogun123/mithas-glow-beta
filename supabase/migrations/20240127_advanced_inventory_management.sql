-- Advanced Inventory Management System Migration
-- Creates tables for variant-level inventory tracking with overselling prevention

-- 1️⃣ Products Table (Updated)
-- Each product is a container only - stock moved to variants
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ Product Variants (MANDATORY)
-- All stock must be variant-level, never product-level
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    variant_name TEXT NOT NULL, -- size / color / pack
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ Inventory (CORE LOGIC)
-- Real-time stock tracking with overselling prevention
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    total_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    damaged_stock INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (
        total_stock - reserved_stock - damaged_stock
    ) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT check_non_negative_stock CHECK (
        total_stock >= 0 AND 
        reserved_stock >= 0 AND 
        damaged_stock >= 0
    ),
    CONSTRAINT check_reserved_not_exceed_total CHECK (
        reserved_stock <= total_stock
    )
);

-- 4️⃣ Inventory Logs (AUDIT)
-- Track every inventory movement for complete traceability
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'RESERVED', 'RETURN', 'DAMAGE', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    previous_total_stock INTEGER,
    previous_reserved_stock INTEGER,
    previous_damaged_stock INTEGER,
    new_total_stock INTEGER,
    new_reserved_stock INTEGER,
    new_damaged_stock INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id UUID REFERENCES orders(id), -- Link to orders for reservation tracking
    notes TEXT
);

-- 5️⃣ Sales Tracking (for smart tags)
-- Track sales velocity for fast-moving/dead stock identification
CREATE TABLE IF NOT EXISTS variant_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON inventory(available_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON inventory_logs(type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_variant_sales_variant_id ON variant_sales(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_sales_created_at ON variant_sales(created_at);

-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Products: Only seller can see their products
CREATE POLICY "Sellers can view their own products" ON products
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON products
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" ON products
    FOR DELETE USING (auth.uid() = seller_id);

-- Product Variants: Access through product ownership
CREATE POLICY "Sellers can view their product variants" ON product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_variants.product_id 
            AND products.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can manage their product variants" ON product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_variants.product_id 
            AND products.seller_id = auth.uid()
        )
    );

-- Inventory: Access through product ownership
CREATE POLICY "Sellers can view their inventory" ON inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM product_variants
            JOIN products ON products.id = product_variants.product_id
            WHERE product_variants.id = inventory.variant_id 
            AND products.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can manage their inventory" ON inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM product_variants
            JOIN products ON products.id = product_variants.product_id
            WHERE product_variants.id = inventory.variant_id 
            AND products.seller_id = auth.uid()
        )
    );

-- Inventory Logs: Access through product ownership
CREATE POLICY "Sellers can view their inventory logs" ON inventory_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM product_variants
            JOIN products ON products.id = product_variants.product_id
            WHERE product_variants.id = inventory_logs.variant_id 
            AND products.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can create their inventory logs" ON inventory_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM product_variants
            JOIN products ON products.id = product_variants.product_id
            WHERE product_variants.id = inventory_logs.variant_id 
            AND products.seller_id = auth.uid()
        )
    );

-- Variant Sales: Access through product ownership
CREATE POLICY "Sellers can view their variant sales" ON variant_sales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM product_variants
            JOIN products ON products.id = product_variants.product_id
            WHERE product_variants.id = variant_sales.variant_id 
            AND products.seller_id = auth.uid()
        )
    );

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_product_variants_timestamp
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger for Inventory Last Updated
CREATE TRIGGER set_inventory_last_updated
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Function to Create Inventory Record for New Variant
CREATE OR REPLACE FUNCTION create_inventory_for_variant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (variant_id, total_stock, reserved_stock, damaged_stock, updated_by)
    VALUES (NEW.id, 0, 0, 0, auth.uid())
    ON CONFLICT (variant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_inventory_on_variant_insert
    AFTER INSERT ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_for_variant();

-- Function to Log Inventory Changes
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
    log_type TEXT;
BEGIN
    -- Determine log type based on changes
    IF TG_OP = 'INSERT' THEN
        log_type := 'ADJUSTMENT';
        INSERT INTO inventory_logs (
            variant_id, type, quantity, reason,
            previous_total_stock, previous_reserved_stock, previous_damaged_stock,
            new_total_stock, new_reserved_stock, new_damaged_stock,
            created_by, notes
        ) VALUES (
            NEW.variant_id, log_type, NEW.total_stock, 'Initial inventory',
            0, 0, 0,
            NEW.total_stock, NEW.reserved_stock, NEW.damaged_stock,
            NEW.updated_by, 'Initial inventory setup'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        log_type := 'ADJUSTMENT';
        INSERT INTO inventory_logs (
            variant_id, type, quantity, reason,
            previous_total_stock, previous_reserved_stock, previous_damaged_stock,
            new_total_stock, new_reserved_stock, new_damaged_stock,
            created_by, notes
        ) VALUES (
            NEW.variant_id, log_type, 
            (NEW.total_stock - OLD.total_stock) + 
            (NEW.reserved_stock - OLD.reserved_stock) + 
            (NEW.damaged_stock - OLD.damaged_stock),
            'Inventory adjustment',
            OLD.total_stock, OLD.reserved_stock, OLD.damaged_stock,
            NEW.total_stock, NEW.reserved_stock, NEW.damaged_stock,
            NEW.updated_by, 
            CASE 
                WHEN NEW.total_stock != OLD.total_stock THEN 'Total stock changed'
                WHEN NEW.reserved_stock != OLD.reserved_stock THEN 'Reserved stock changed'
                WHEN NEW.damaged_stock != OLD.damaged_stock THEN 'Damaged stock changed'
                ELSE 'Other adjustment'
            END
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_inventory_changes
    AFTER INSERT OR UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION log_inventory_change();

-- View for Product Inventory Summary
CREATE OR REPLACE VIEW product_inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.status,
    COUNT(pv.id) as total_variants,
    COALESCE(SUM(i.available_stock), 0) as total_available_stock,
    COALESCE(SUM(i.reserved_stock), 0) as total_reserved_stock,
    COALESCE(SUM(i.damaged_stock), 0) as total_damaged_stock,
    COALESCE(SUM(i.total_stock), 0) as total_stock,
    CASE 
        WHEN COUNT(CASE WHEN i.available_stock <= pv.low_stock_threshold THEN 1 END) > 0 THEN 'LOW_STOCK'
        WHEN COUNT(CASE WHEN i.available_stock = 0 THEN 1 END) > 0 THEN 'OUT_OF_STOCK'
        ELSE 'HEALTHY'
    END as inventory_status,
    p.seller_id,
    p.created_at
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN inventory i ON pv.id = i.variant_id
GROUP BY p.id, p.name, p.category, p.status, p.seller_id, p.created_at;

-- View for Variant Sales Velocity (last 7/30/60 days)
CREATE OR REPLACE VIEW variant_sales_velocity AS
SELECT 
    pv.id as variant_id,
    pv.product_id,
    pv.variant_name,
    pv.sku,
    COALESCE(SUM(CASE WHEN vs.created_at >= NOW() - INTERVAL '7 days' THEN vs.quantity ELSE 0 END), 0) as sold_7_days,
    COALESCE(SUM(CASE WHEN vs.created_at >= NOW() - INTERVAL '30 days' THEN vs.quantity ELSE 0 END), 0) as sold_30_days,
    COALESCE(SUM(CASE WHEN vs.created_at >= NOW() - INTERVAL '60 days' THEN vs.quantity ELSE 0 END), 0) as sold_60_days,
    MAX(vs.created_at) as last_sale_date,
    i.available_stock,
    i.total_stock,
    pv.low_stock_threshold,
    p.seller_id
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
LEFT JOIN inventory i ON pv.id = i.variant_id
LEFT JOIN variant_sales vs ON pv.id = vs.variant_id
GROUP BY pv.id, pv.product_id, pv.variant_name, pv.sku, i.available_stock, i.total_stock, pv.low_stock_threshold, p.seller_id;

-- Sample Data (for testing)
-- This would be removed in production
DO $$
DECLARE
    seller_user_id UUID := auth.uid();
    product_id UUID;
    variant1_id UUID;
    variant2_id UUID;
BEGIN
    -- Only create sample data if we have a user and no existing data
    IF seller_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        -- Create sample product
        INSERT INTO products (seller_id, name, category, status)
        VALUES (seller_user_id, 'Designer T-Shirt', 'Clothing', 'active')
        RETURNING id INTO product_id;
        
        -- Create variants
        INSERT INTO product_variants (product_id, sku, variant_name, cost_price, selling_price, low_stock_threshold)
        VALUES 
            (product_id, 'TSHIRT-M-RED', 'Medium Red', 500.00, 999.00, 5),
            (product_id, 'TSHIRT-L-RED', 'Large Red', 500.00, 999.00, 5)
        RETURNING id INTO variant1_id, variant2_id;
        
        -- Create inventory records (will be auto-created by trigger)
        -- Update inventory with initial stock
        UPDATE inventory SET 
            total_stock = 50,
            reserved_stock = 5,
            damaged_stock = 2,
            updated_by = seller_user_id
        WHERE variant_id = variant1_id;
        
        UPDATE inventory SET 
            total_stock = 30,
            reserved_stock = 3,
            damaged_stock = 1,
            updated_by = seller_user_id
        WHERE variant_id = variant2_id;
    END IF;
END $$;
