-- Supabase / Postgres schema suggested for IONTIX
-- Run in your Supabase SQL editor or psql to create the tables used by the frontend.

-- Users / Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text UNIQUE,
  avatar_url text,
  glow_points integer DEFAULT 0,
  wallet_balance numeric DEFAULT 0,
  drone_opt_in boolean DEFAULT false,
  body_measurements jsonb,
  try_on_count integer DEFAULT 0,
  orders_count integer DEFAULT 0,
  recommended_size text,
  node_name text,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id bigint PRIMARY KEY,
  name text,
  description text,
  price numeric,
  currency text DEFAULT 'INR',
  category text,
  type text,
  image text,
  images jsonb,
  seller text,
  vendor_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Vendors / Sellers
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  lat numeric,
  lon numeric,
  logo text,
  trust_score numeric DEFAULT 0,
  votes integer DEFAULT 0,
  products jsonb,
  hasStock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_id bigint,
  quantity integer DEFAULT 1,
  price numeric,
  inserted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Orders (items stored as jsonb for flexibility)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  items jsonb,
  total_amount numeric,
  currency text DEFAULT 'INR',
  status text DEFAULT 'placed',
  created_at timestamptz DEFAULT now()
);

-- Offers / bargaining
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  offered_price numeric,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Try-ons / AR sessions
CREATE TABLE IF NOT EXISTS ar_try_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  image text,
  saved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Try-on revisit logs
CREATE TABLE IF NOT EXISTS try_on_revisits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  try_on_id uuid REFERENCES ar_try_sessions(id),
  revisited_at timestamptz DEFAULT now()
);

-- Vendor votes
CREATE TABLE IF NOT EXISTS vendor_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  vendor_id uuid REFERENCES vendors(id),
  voted_at timestamptz DEFAULT now()
);

-- Product views for analytics
CREATE TABLE IF NOT EXISTS product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  vendor text,
  viewed_at timestamptz DEFAULT now()
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  amount numeric,
  currency text DEFAULT 'INR',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Body scans
CREATE TABLE IF NOT EXISTS body_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  scan_data jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  created_at timestamptz DEFAULT now()
);

-- Support requests
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  type text,
  payload jsonb,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Warranty access log
CREATE TABLE IF NOT EXISTS warranty_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  accessed_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_try_user ON ar_try_sessions(user_id);

-- Additional tables for broader feature coverage

-- Product images (separate for flexibility)
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  url text,
  alt text,
  ordinal integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Vendor inventory (structured stock + SKU)
CREATE TABLE IF NOT EXISTS vendor_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  product_id bigint,
  sku text,
  quantity integer DEFAULT 0,
  price_override numeric,
  metadata jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Order items as normalized table for queries
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint,
  name text,
  sku text,
  quantity integer DEFAULT 1,
  unit_price numeric,
  metadata jsonb
);

-- Offers / counter-offers history
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  offered_price numeric,
  status text DEFAULT 'pending',
  vendor_counter numeric,
  created_at timestamptz DEFAULT now()
);

-- Fabric scans and deep material analysis
CREATE TABLE IF NOT EXISTS fabric_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  analysis jsonb,
  created_at timestamptz DEFAULT now()
);

-- Mirror analyses store (AI output persisted)
CREATE TABLE IF NOT EXISTS mirror_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  payload jsonb,
  suggested_items jsonb,
  created_at timestamptz DEFAULT now()
);

-- Shopping rooms and participants for Mall Hangout
CREATE TABLE IF NOT EXISTS shopping_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE,
  host_user_id uuid REFERENCES profiles(id),
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopping_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES shopping_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  joined_at timestamptz DEFAULT now()
);

-- Assistant interactions (Style-GPT / AI events)
CREATE TABLE IF NOT EXISTS assistant_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  context jsonb,
  assistant_response jsonb,
  module text,
  created_at timestamptz DEFAULT now()
);

-- Notifications and preferences
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  title text,
  body text,
  payload jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Referral links and redemptions
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  code text UNIQUE,
  redeemed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Drone deliveries and tracking
CREATE TABLE IF NOT EXISTS drone_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  vendor_id uuid REFERENCES vendors(id),
  status text DEFAULT 'dispatched',
  eta_minutes integer,
  path jsonb,
  created_at timestamptz DEFAULT now()
);

-- Delivery tracking events
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES drone_deliveries(id) ON DELETE CASCADE,
  event_type text,
  meta jsonb,
  happened_at timestamptz DEFAULT now()
);

-- Chat messages (3-module chat: assistant/vendor/logistics)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  channel text,
  sender_id uuid REFERENCES profiles(id),
  sender_role text,
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Analytics: product impressions and clicks
CREATE TABLE IF NOT EXISTS product_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  vendor_id uuid,
  impression_at timestamptz DEFAULT now()
);

-- Vendor stock change log
CREATE TABLE IF NOT EXISTS vendor_stock_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id),
  product_id bigint,
  delta integer,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Wallet refunds and adjustments
CREATE TABLE IF NOT EXISTS wallet_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  amount numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Warranty items (store receipts / warranty metadata)
CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  product_id bigint,
  vendor_id uuid,
  receipt jsonb,
  created_at timestamptz DEFAULT now()
);

-- Coupons & promotions
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  discount jsonb,
  valid_from timestamptz,
  valid_to timestamptz,
  metadata jsonb
);

-- Search index helper table (optional)
CREATE TABLE IF NOT EXISTS product_search_index (
  product_id bigint PRIMARY KEY,
  indexed_text tsvector
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_product ON vendor_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_assistant_user ON assistant_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);

-- Notes:
-- 1) Enable pgcrypto extension in Supabase SQL editor if gen_random_uuid() is not available:
--    CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- 2) Adjust types (uuid vs bigint) depending on your existing IDs and upstream sources.
-- 3) Add Row Level Security (RLS) policies to protect user data. Example: profiles should only be selectable by the owner.
-- 4) Many of the logging tables (mirror_analyses, support_requests) are intentionally flexible (jsonb payload) to accommodate evolving AI outputs.

-- Notes:
-- - Adjust types (uuid vs bigint) depending on your upstream IDs.
-- - Add Row Level Security policies in Supabase as needed for privacy.
-- - This is a suggested schema matching the frontend's best-effort writes.
