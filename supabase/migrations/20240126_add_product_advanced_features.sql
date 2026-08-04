-- Migration: Add advanced features to products table
-- This adds VTO, 3D, Glow Bid, and dynamic attributes support

-- Add new columns for advanced features
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS vto_status TEXT CHECK (vto_status IN ('enabled', 'disabled')) DEFAULT 'disabled',
ADD COLUMN IF NOT EXISTS three_d_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS glow_bid_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_bid_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS attributes_json JSONB,
ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_vto_status ON products(vto_status);
CREATE INDEX IF NOT EXISTS idx_products_three_d_enabled ON products(three_d_enabled);
CREATE INDEX IF NOT EXISTS idx_products_glow_bid_eligible ON products(glow_bid_eligible);
CREATE INDEX IF NOT EXISTS idx_products_floor ON products(floor);
CREATE INDEX IF NOT EXISTS idx_products_attributes_json ON products USING GIN(attributes_json);

-- Add comments for documentation
COMMENT ON COLUMN products.vto_status IS 'Virtual Try-On status: enabled or disabled';
COMMENT ON COLUMN products.three_d_enabled IS 'Whether 3D view is enabled for this product';
COMMENT ON COLUMN products.glow_bid_eligible IS 'Whether this product participates in AI-powered Glow Bid auctions';
COMMENT ON COLUMN products.min_bid_price IS 'Minimum acceptable price for Glow Bid auctions';
COMMENT ON COLUMN products.attributes_json IS 'Dynamic attributes based on product category (fabric, occasion, ingredients, etc.)';
COMMENT ON COLUMN products.floor IS 'MITHAS Glow floor number for smart routing';

-- Create a function to automatically set floor based on category
CREATE OR REPLACE FUNCTION set_product_floor()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign floor based on category
    IF NEW.category ILIKE '%bridal%' OR NEW.category ILIKE '%wedding%' OR NEW.category ILIKE '%festive%' THEN
        NEW.floor = 0; -- Seasonal Store
    ELSIF NEW.category ILIKE '%saree%' OR NEW.category ILIKE '%kurta%' OR NEW.category ILIKE '%dress%' OR NEW.category ILIKE '%ethnic%' THEN
        NEW.floor = 1; -- Fashion
    ELSIF NEW.category ILIKE '%makeup%' OR NEW.category ILIKE '%skincare%' OR NEW.category ILIKE '%haircare%' OR NEW.category ILIKE '%beauty%' THEN
        NEW.floor = 3; -- Beauty & Personal Care
    ELSIF NEW.category ILIKE '%heel%' OR NEW.category ILIKE '%shoe%' OR NEW.category ILIKE '%footwear%' THEN
        NEW.floor = 4; -- Footwear
    ELSIF NEW.category ILIKE '%jewellery%' OR NEW.category ILIKE '%earring%' OR NEW.category ILIKE '%necklace%' OR NEW.category ILIKE '%handbag%' THEN
        NEW.floor = 5; -- Accessories
    ELSE
        NEW.floor = 1; -- Default to Fashion
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set floor
DROP TRIGGER IF EXISTS trigger_set_product_floor ON products;
CREATE TRIGGER trigger_set_product_floor
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_product_floor();

-- Update existing products to have proper floor assignments
UPDATE products 
SET floor = CASE
    WHEN category ILIKE '%bridal%' OR category ILIKE '%wedding%' OR category ILIKE '%festive%' THEN 0
    WHEN category ILIKE '%saree%' OR category ILIKE '%kurta%' OR category ILIKE '%dress%' OR category ILIKE '%ethnic%' THEN 1
    WHEN category ILIKE '%makeup%' OR category ILIKE '%skincare%' OR category ILIKE '%haircare%' OR category ILIKE '%beauty%' THEN 3
    WHEN category ILIKE '%heel%' OR category ILIKE '%shoe%' OR category ILIKE '%footwear%' THEN 4
    WHEN category ILIKE '%jewellery%' OR category ILIKE '%earring%' OR category ILIKE '%necklace%' OR category ILIKE '%handbag%' THEN 5
    ELSE 1
END
WHERE floor IS NULL;

-- Create a view for products with advanced features
CREATE OR REPLACE VIEW products_advanced AS
SELECT 
    p.*,
    CASE 
        WHEN p.vto_status = 'enabled' THEN '✨ VTO Available'
        ELSE NULL
    END as vto_badge,
    CASE 
        WHEN p.three_d_enabled = true THEN '🎯 3D View'
        ELSE NULL
    END as three_d_badge,
    CASE 
        WHEN p.glow_bid_eligible = true THEN '🔥 Glow Bid'
        ELSE NULL
    END as glow_bid_badge
FROM products p
WHERE p.is_active = true;

-- Add RLS policies for new columns if using Row Level Security
-- (Assuming RLS is enabled on products table)
ALTER POLICY "Users can view all active products" ON products 
USING (is_active = true);

ALTER POLICY "Sellers can insert their products" ON products 
WITH CHECK (auth.uid() = seller_id);

ALTER POLICY "Sellers can update their products" ON products 
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Create a function to validate Glow Bid pricing
CREATE OR REPLACE FUNCTION validate_glow_bid_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure min_bid_price is less than selling price
    IF NEW.glow_bid_eligible = true AND NEW.min_bid_price >= NEW.price THEN
        RAISE EXCEPTION 'Minimum bid price must be less than selling price';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Glow Bid validation
DROP TRIGGER IF EXISTS trigger_validate_glow_bid_pricing ON products;
CREATE TRIGGER trigger_validate_glow_bid_pricing
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION validate_glow_bid_pricing();
