-- ==========================================
-- ULTIMATE CORRECTED ADVANCED INVENTORY MANAGEMENT
-- Fixes all column name issues including seller_id vs seller
-- ==========================================

-- Step 1: Create product_variants table with all required columns
DO $$
BEGIN
    -- Check if product_variants table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        -- Create the table with all required columns
        CREATE TABLE public.product_variants (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
            sku TEXT NOT NULL,
            variant_name TEXT NOT NULL, -- e.g., "Small-Red", "Medium-Blue", "Large-Green"
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
            
            UNIQUE(sku),
            UNIQUE(product_id, size, color)
        );
    ELSE
        -- Table exists, ensure all required columns exist
        ALTER TABLE public.product_variants 
        ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 2: Modify existing products table to be container-only
DO $$
BEGIN
    -- Check and drop variant-level columns from products table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'original_price' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN original_price;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'size_options' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN size_options;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'color_options' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN color_options;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'in_stock' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN in_stock;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN stock;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku' AND table_schema = 'public') THEN
        ALTER TABLE public.products DROP COLUMN sku;
    END IF;
END $$;

-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS vto_status TEXT CHECK (vto_status IN ('enabled', 'disabled')) DEFAULT 'disabled',
ADD COLUMN IF NOT EXISTS three_d_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_bid_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_bid_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS attributes_json JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;

-- Step 3: Create inventory table with all required columns
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
    ELSE
        -- Ensure all required columns exist
        ALTER TABLE public.inventory 
        ADD COLUMN IF NOT EXISTS total_stock INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS reserved_stock INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS damaged_stock INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Add the generated column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'available_stock' AND table_schema = 'public') THEN
            ALTER TABLE public.inventory ADD COLUMN available_stock INTEGER GENERATED ALWAYS AS (
                total_stock - reserved_stock - damaged_stock
            ) STORED;
        END IF;
    END IF;
END $$;

-- Step 4: Create inventory_logs table
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
    END IF;
END $$;

-- Step 5: Create order_items table
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
    END IF;
END $$;

-- Step 6: Create variant_sales table
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
    END IF;
END $$;

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

-- Step 8: Create indexes safely
DO $$
BEGIN
    -- Product variants indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'product_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'sku' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'size' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_size ON public.product_variants(size);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'color' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_color ON public.product_variants(color);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'selling_price' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_price ON public.product_variants(selling_price);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'is_active' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_product_variants_active ON public.product_variants(is_active);
    END IF;
END $$;

-- Create indexes for inventory table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'variant_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'available_stock' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_available_stock ON public.inventory(available_stock);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'total_stock' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_total_stock ON public.inventory(total_stock);
    END IF;
    
    -- Create conditional indexes only if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'available_stock' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'low_stock_threshold' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(available_stock) WHERE available_stock <= low_stock_threshold;
        CREATE INDEX IF NOT EXISTS idx_inventory_out_of_stock ON public.inventory(available_stock) WHERE available_stock = 0;
    END IF;
END $$;

-- Create indexes for inventory_logs table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'variant_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON public.inventory_logs(variant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'type' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON public.inventory_logs(type);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'created_at' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'order_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_logs_order_id ON public.inventory_logs(order_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'created_by' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_by ON public.inventory_logs(created_by);
    END IF;
END $$;

-- Create indexes for order_items table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'variant_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_order_items_quantity ON public.order_items(quantity);
    END IF;
END $$;

-- Create indexes for variant_sales table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variant_sales' AND column_name = 'variant_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_variant_sales_variant_id ON public.variant_sales(variant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variant_sales' AND column_name = 'order_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_variant_sales_order_id ON public.variant_sales(order_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variant_sales' AND column_name = 'sale_date' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_variant_sales_sale_date ON public.variant_sales(sale_date);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variant_sales' AND column_name = 'created_at' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_variant_sales_created_at ON public.variant_sales(created_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'variant_sales' AND column_name = 'quantity' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_variant_sales_quantity ON public.variant_sales(quantity);
    END IF;
END $$;

-- Update indexes for orders table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'buyer_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'seller_id' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
    END IF;
END $$;

-- Step 9: Create views for business logic - FIXED COLUMN NAMES
CREATE OR REPLACE VIEW public.product_inventory_summary AS
SELECT 
    p.id as product_id,
    -- Use the correct column name for seller reference
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
        THEN p.seller_id
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
        THEN p.seller
        ELSE NULL
    END as seller_id,
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
GROUP BY p.id, 
         CASE 
             WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
             THEN p.seller_id
             WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
             THEN p.seller
             ELSE NULL
         END,
         p.name, p.category, p.status, p.created_at;

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
    -- Use the correct column name for seller reference
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
        THEN p.seller_id
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
        THEN p.seller
        ELSE NULL
    END as seller_id,
    COALESCE(sales_7days.total_quantity, 0) as sales_7days,
    COALESCE(sales_30days.total_quantity, 0) as sales_30days,
    COALESCE(sales_60days.total_quantity, 0) as sales_60days,
    COALESCE(sales_90days.total_quantity, 0) as sales_90days,
    CASE 
        WHEN i.available_stock = 0 THEN 'OUT_OF_STOCK'
        WHEN i.available_stock <= COALESCE(pv.low_stock_threshold, 5) THEN 'LOW_STOCK'
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

-- Step 10: Create triggers and functions
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

DROP TRIGGER IF EXISTS trigger_log_inventory_change ON public.inventory;
CREATE TRIGGER trigger_log_inventory_change
    AFTER UPDATE ON public.inventory
    FOR EACH ROW
    WHEN (OLD.total_stock IS DISTINCT FROM NEW.total_stock OR 
          OLD.reserved_stock IS DISTINCT FROM NEW.reserved_stock OR 
          OLD.damaged_stock IS DISTINCT FROM NEW.damaged_stock)
    EXECUTE FUNCTION log_inventory_change();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Step 11: Enable Row Level Security
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items' AND table_schema = 'public') THEN
        ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variant_sales' AND table_schema = 'public') THEN
        ALTER TABLE public.variant_sales ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 12: Create RLS policies with correct column references
DO $$
BEGIN
    -- Product variants RLS policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Sellers can view variants of their products" ON public.product_variants;
        CREATE POLICY "Sellers can view variants of their products" ON public.product_variants
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.products 
                    WHERE public.products.id = public.product_variants.product_id 
                    AND (
                        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') AND public.products.seller_id = auth.uid())
                        OR
                        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') AND public.products.seller = auth.uid())
                    )
                )
            );

        DROP POLICY IF EXISTS "Sellers can manage variants of their products" ON public.product_variants;
        CREATE POLICY "Sellers can manage variants of their products" ON public.product_variants
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.products 
                    WHERE public.products.id = public.product_variants.product_id 
                    AND (
                        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') AND public.products.seller_id = auth.uid())
                        OR
                        (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') AND public.products.seller = auth.uid())
                    )
                )
            );
    END IF;
END $$;

-- ==========================================
-- ULTIMATE CORRECTED IMPLEMENTATION COMPLETE!
-- ==========================================

-- Verification queries
-- SELECT * FROM public.product_inventory_summary LIMIT 5;
-- SELECT * FROM public.variant_sales_velocity LIMIT 5;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('product_variants', 'inventory', 'inventory_logs', 'order_items', 'variant_sales') ORDER BY table_name;
