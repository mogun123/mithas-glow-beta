-- ORDERS SCREEN SUPABASE SQL
-- Complete schema for orders management system

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_inventory_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.update_chat_last_message() CASCADE;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
DROP TRIGGER IF EXISTS handle_shipping_addresses_updated_at ON public.shipping_addresses;
DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS handle_chats_updated_at ON public.chats;
DROP TRIGGER IF EXISTS sync_inventory_on_order_trigger ON public.orders;
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.messages;

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.shipping_addresses CASCADE;

-- Shipping Addresses table
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table (updated to match database.types.ts)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id),
  seller_id UUID REFERENCES public.profiles(id),
  status TEXT CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  shipping_address_id UUID REFERENCES public.shipping_addresses(id),
  billing_address_id UUID REFERENCES public.shipping_addresses(id),
  payment_method TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_id TEXT,
  tracking_number TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  customer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Logs table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  seller_id UUID REFERENCES public.profiles(id),
  change_type TEXT CHECK (change_type IN ('order_fulfillment', 'stock_adjustment', 'return', 'restock')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_type TEXT CHECK (chat_type IN ('ai_stylist', 'community', 'vendor_dm')) NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  vendor_id UUID REFERENCES public.profiles(id),
  order_id UUID REFERENCES public.orders(id),
  title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachments JSONB,
  translated_content JSONB,
  sentiment_score DECIMAL(3,2),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_default ON public.shipping_addresses(is_default);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_seller ON public.inventory_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON public.inventory_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_chats_user ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_vendor ON public.chats(vendor_id);
CREATE INDEX IF NOT EXISTS idx_chats_order ON public.chats(order_id);
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats(chat_type);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(is_read);

-- Row Level Security Policies
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Shipping Addresses policies
CREATE POLICY "Users can view own addresses" ON public.shipping_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own addresses" ON public.shipping_addresses FOR ALL USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Sellers can update order status" ON public.orders FOR UPDATE USING (auth.uid() = seller_id);

-- Order Items policies
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT USING (
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE id = order_id) OR
  auth.uid() IN (SELECT seller_id FROM public.orders WHERE id = order_id)
);

-- Inventory Logs policies
CREATE POLICY "Sellers can view own inventory logs" ON public.inventory_logs FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create own inventory logs" ON public.inventory_logs FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Chats policies
CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (auth.uid() = user_id OR auth.uid() = vendor_id);
CREATE POLICY "Users can manage own chats" ON public.chats FOR ALL USING (auth.uid() = user_id OR auth.uid() = vendor_id);

-- Messages policies
CREATE POLICY "Chat participants can view messages" ON public.messages FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.chats WHERE id = chat_id) OR
  auth.uid() IN (SELECT vendor_id FROM public.chats WHERE id = chat_id)
);
CREATE POLICY "Chat participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.chats WHERE id = chat_id) OR
  auth.uid() IN (SELECT vendor_id FROM public.chats WHERE id = chat_id)
);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- Functions and Triggers

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_number TEXT;
BEGIN
  LOOP
    order_number := 'ORD-' || to_char(NOW(), 'YYYY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = order_number) THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set order number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_shipping_addresses_updated_at BEFORE UPDATE ON public.shipping_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to sync inventory on order fulfillment
CREATE OR REPLACE FUNCTION public.sync_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- When order status changes to processing, deduct inventory
  IF OLD.status != 'processing' AND NEW.status = 'processing' THEN
    INSERT INTO public.inventory_logs (
      product_id, 
      seller_id, 
      change_type, 
      quantity_change, 
      previous_stock, 
      new_stock, 
      order_id
    )
    SELECT 
      oi.product_id,
      p.seller_id,
      'order_fulfillment',
      -oi.quantity,
      p.stock,
      GREATEST(0, p.stock - oi.quantity),
      NEW.id
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = NEW.id;
    
    -- Update product stock
    UPDATE public.products p
    SET stock = GREATEST(0, p.stock - oi.quantity)
    FROM public.order_items oi
    WHERE oi.product_id = p.id AND oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_inventory_on_order_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_on_order();

-- Function to update chat last message
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

-- Grant permissions
GRANT ALL ON public.shipping_addresses TO authenticated;
GRANT SELECT ON public.shipping_addresses TO anon;
GRANT ALL ON public.orders TO authenticated;
GRANT SELECT ON public.orders TO anon;
GRANT ALL ON public.order_items TO authenticated;
GRANT SELECT ON public.order_items TO anon;
GRANT ALL ON public.inventory_logs TO authenticated;
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- Sample data for testing (commented out - uncomment after creating actual users)
-- INSERT INTO public.shipping_addresses (user_id, name, phone, address_line1, city, state, pincode, is_default) VALUES
-- ('00000000-0000-0000-0000-000000000000', 'Priya Sharma', '+91 98765 43210', '123, MG Road', 'Bangalore', 'Karnataka', '560001', true),
-- ('00000000-0000-0000-0000-000000000001', 'Anita Patel', '+91 87654 32109', '456, Commercial Street', 'Mumbai', 'Maharashtra', '400001', true)
-- ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE public.orders IS 'Main orders table for buyer-seller transactions';
COMMENT ON TABLE public.order_items IS 'Individual items within an order';
COMMENT ON TABLE public.shipping_addresses IS 'User shipping and billing addresses';
COMMENT ON TABLE public.inventory_logs IS 'Track inventory changes and movements';
COMMENT ON TABLE public.chats IS 'Chat threads between users and vendors';
COMMENT ON TABLE public.messages IS 'Individual messages within chat threads';
