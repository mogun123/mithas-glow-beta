-- MITHAS GLOW Database Schema
-- Created: October 22, 2025
-- Purpose: Complete database structure for beauty & fashion marketplace

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For location-based features

-- =====================================================
-- CUSTOM TYPES
-- =====================================================
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE gender_type AS ENUM ('female', 'male', 'other');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE seller_level AS ENUM ('new_seller', 'trusted_vendor', 'expert_seller', 'glow_partner', 'mithas_star');
CREATE TYPE chat_type AS ENUM ('ai_stylist', 'community', 'vendor_dm');
CREATE TYPE notification_type AS ENUM ('order', 'message', 'promotion', 'system', 'review');

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  gender gender_type,
  date_of_birth DATE,
  role user_role DEFAULT 'buyer',
  
  -- Preferences
  preferred_language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- ADDRESSES TABLE
-- =====================================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Address Details
  address_type TEXT DEFAULT 'home', -- 'home', 'work', 'shop'
  full_address TEXT NOT NULL,
  street TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  
  -- Geolocation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326), -- PostGIS point
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SELLERS TABLE
-- =====================================================
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Shop Details
  shop_name TEXT NOT NULL,
  shop_type TEXT NOT NULL, -- 'Boutique', 'Jewellery', 'Beauty / Salon', etc.
  shop_logo_url TEXT,
  shop_description TEXT,
  
  -- Business Information
  business_registration_number TEXT,
  gst_number TEXT,
  pan_number TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  kyc_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  kyc_documents JSONB,
  
  -- Performance Metrics
  seller_level seller_level DEFAULT 'new_seller',
  trust_score DECIMAL(3, 2) DEFAULT 0.00,
  total_sales DECIMAL(12, 2) DEFAULT 0.00,
  total_orders INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  response_rate DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Bank Details
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_account_name TEXT,
  upi_id TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  auto_accept_orders BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  gender gender_type,
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2), -- For showing discounts
  currency TEXT DEFAULT 'INR',
  
  -- Inventory
  stock INTEGER DEFAULT 0,
  sku TEXT,
  
  -- Media
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  has_ar_model BOOLEAN DEFAULT FALSE,
  ar_model_url TEXT,
  
  -- Tags & SEO
  tags TEXT[] DEFAULT '{}',
  bundle_tags TEXT[] DEFAULT '{}',
  search_keywords TEXT,
  
  -- Features
  as_seen_in_reels BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_draft BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT positive_price CHECK (price > 0),
  CONSTRAINT non_negative_stock CHECK (stock >= 0)
);

-- =====================================================
-- PRODUCT VARIANTS (for sizes, colors, etc.)
-- =====================================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Variant Details
  variant_name TEXT NOT NULL, -- e.g., "Red - Medium"
  sku TEXT,
  
  -- Attributes
  color TEXT,
  size TEXT,
  material TEXT,
  custom_attributes JSONB,
  
  -- Pricing & Inventory
  price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  
  -- Media
  image_url TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VENDOR OFFERS (for same product from multiple vendors)
-- =====================================================
CREATE TABLE public.vendor_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Offer Details
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  delivery_eta TEXT, -- '15 min', '30 min', '2 hours', etc.
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(product_id, seller_id)
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  
  -- Parties
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE RESTRICT,
  
  -- Order Details
  status order_status DEFAULT 'pending',
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  shipping_fee DECIMAL(10, 2) DEFAULT 0.00,
  discount DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Addresses
  shipping_address_id UUID REFERENCES public.addresses(id),
  billing_address_id UUID REFERENCES public.addresses(id),
  
  -- Payment
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  
  -- Tracking
  tracking_number TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  customer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Product Info
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Snapshot (in case product is deleted)
  product_name TEXT NOT NULL,
  product_image TEXT,
  
  -- Pricing
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- =====================================================
-- REVIEWS & RATINGS TABLE
-- =====================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  
  -- Verification
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  
  -- Helpfulness
  helpful_count INTEGER DEFAULT 0,
  
  -- Status
  is_approved BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CART TABLE
-- =====================================================
CREATE TABLE public.cart (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Product Info
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, product_id, variant_id),
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- =====================================================
-- WISHLISTS TABLE
-- =====================================================
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- =====================================================
-- CHATS TABLE
-- =====================================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Chat Type
  chat_type chat_type NOT NULL,
  
  -- Participants
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Chat Details
  title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Message Content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'product', 'voice'
  
  -- Attachments
  attachments JSONB,
  
  -- AI Features
  translated_content JSONB, -- Multi-language translations
  sentiment_score DECIMAL(3, 2),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification Details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Entity
  related_id UUID, -- Could be order_id, product_id, etc.
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REELS TABLE
-- =====================================================
CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  
  -- Content
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  
  -- Tagged Products
  tagged_products UUID[] DEFAULT '{}',
  
  -- Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  
  -- Creator Level
  creator_level TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REEL INTERACTIONS (likes, views)
-- =====================================================
CREATE TABLE public.reel_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Interaction Type
  interaction_type TEXT NOT NULL, -- 'like', 'view', 'share'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(reel_id, user_id, interaction_type)
);

-- =====================================================
-- SELLER GROWTH MILESTONES
-- =====================================================
CREATE TABLE public.seller_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Milestone Info
  level INTEGER NOT NULL,
  title TEXT NOT NULL,
  requirement TEXT NOT NULL,
  badge_url TEXT,
  
  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROMOTIONS & BOOSTING
-- =====================================================
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Promotion Details
  promotion_type TEXT NOT NULL, -- 'product_boost', 'verified_badge', 'heatmap_ad'
  target_id UUID, -- product_id for product boost
  
  -- Pricing
  daily_cost DECIMAL(10, 2) NOT NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- Duration
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WALLET & TRANSACTIONS
-- =====================================================
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type TEXT NOT NULL, -- 'credit', 'debit', 'payout', 'refund'
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Related Entity
  order_id UUID REFERENCES public.orders(id),
  
  -- Description
  description TEXT,
  
  -- Balance
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  
  -- Payout Details
  payout_method TEXT, -- 'bank', 'upi'
  payout_reference TEXT,
  payout_status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User & Profile Indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Address Indexes
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX idx_addresses_location ON public.addresses USING GIST(location);

-- Seller Indexes
CREATE INDEX idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX idx_sellers_verified ON public.sellers(is_verified);
CREATE INDEX idx_sellers_level ON public.sellers(seller_level);

-- Product Indexes
CREATE INDEX idx_products_seller_id ON public.products(seller_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_gender ON public.products(gender);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_tags ON public.products USING GIN(tags);

-- Order Indexes
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- Review Indexes
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

-- Cart Indexes
CREATE INDEX idx_cart_user_id ON public.cart(user_id);
CREATE INDEX idx_cart_product_id ON public.cart(product_id);

-- Chat Indexes
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
CREATE INDEX idx_chats_vendor_id ON public.chats(vendor_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Notification Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Reel Indexes
CREATE INDEX idx_reels_creator_id ON public.reels(creator_id);
CREATE INDEX idx_reels_created_at ON public.reels(created_at DESC);
CREATE INDEX idx_reel_interactions_user_id ON public.reel_interactions(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products: Public read, sellers can manage own
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true OR seller_id IN (
    SELECT id FROM public.sellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Sellers can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (seller_id IN (
    SELECT id FROM public.sellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING (seller_id IN (
    SELECT id FROM public.sellers WHERE user_id = auth.uid()
  ));

-- Orders: Users see own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (
    buyer_id = auth.uid() OR 
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
  );

-- Cart: Users manage own cart
CREATE POLICY "Users can manage own cart"
  ON public.cart FOR ALL
  USING (user_id = auth.uid());

-- Messages: Participants can view
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM public.chats WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Update product rating on review
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET 
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM public.reviews 
      WHERE product_id = NEW.product_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_rating_trigger AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Note: In production, users will be created via Supabase Auth
-- This is just for reference structure

-- Sample categories for products
COMMENT ON COLUMN public.products.category IS 
  'Valid categories: Fashion, Makeup, Jewelry, Footwear, Accessories, Beauty, Sarees, Lehengas';

-- Sample seller levels progression
COMMENT ON TYPE seller_level IS 
  'Levels: new_seller (0-10 orders), trusted_vendor (10-50), expert_seller (50-100), glow_partner (100-500), mithas_star (500+)';

-- =====================================================
-- CLINICAL ANALYSIS TABLES
-- =====================================================

-- Clinical Analyses Table
CREATE TABLE public.clinical_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Session & Analysis Info
  session_id TEXT NOT NULL,
  skin_tone TEXT NOT NULL,
  undertone TEXT NOT NULL,
  skin_type TEXT NOT NULL,
  
  -- Clinical Metrics (0-100 scale)
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: 0-100, redness: 0-100, oiliness: 0-100, moisture: 0-100, texture: 0-100, pores: 0-100, pigment: 0-100, darkCircle: 0-100, elasticity: 0-100, glassSkin: 0-100 }
  
  -- Spatial Data (coordinates for spot visualization)
  spatial_data JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acneClusters: [{x, y, intensity}], oilSpots: [...], rednessClusters: [...], melaninClusters: [...], porePoints: [...], underEyeRegions: [...]}
  
  -- Frame Data (images for different angles)
  frame_data JSONB NOT NULL DEFAULT '{}',
  -- Structure: { center: {image, timestamp}, left: {image, timestamp}, right: {image, timestamp} }
  
  -- LAB Color Values (for clinical accuracy)
  lab_values JSONB NOT NULL DEFAULT '{}',
  -- Structure: { overall: {l, a, b}, forehead: {l, a, b}, leftCheek: {l, a, b}, rightCheek: {l, a, b}, nose: {l, a, b}, chin: {l, a, b} }
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Metrics History Table (for tracking trends)
CREATE TABLE public.clinical_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Analysis Date
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics Snapshot
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: 0-100, redness: 0-100, oiliness: 0-100, moisture: 0-100, texture: 0-100 }
  
  -- Improvements (compared to previous analysis)
  improvements JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: improvement_score, redness: improvement_score, oiliness: improvement_score, moisture: improvement_score, texture: improvement_score }
  
  -- AI Recommendations
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Skin Profiles (for quick access to latest analysis)
CREATE TABLE public.user_skin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Latest Analysis Reference
  latest_analysis_id UUID REFERENCES public.clinical_analyses(id) ON DELETE SET NULL,
  
  -- Current Skin Profile
  current_skin_tone TEXT,
  current_undertone TEXT,
  current_skin_type TEXT,
  
  -- Current Metrics Summary
  current_metrics JSONB DEFAULT '{}',
  
  -- Profile Preferences
  preferred_products TEXT[] DEFAULT '{}',
  skin_concerns TEXT[] DEFAULT '{}',
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CLINICAL TABLE INDEXES
-- =====================================================

-- Clinical Analyses Indexes
CREATE INDEX idx_clinical_analyses_user_id ON public.clinical_analyses(user_id);
CREATE INDEX idx_clinical_analyses_session_id ON public.clinical_analyses(session_id);
CREATE INDEX idx_clinical_analyses_created_at ON public.clinical_analyses(created_at DESC);

-- Clinical Metrics History Indexes
CREATE INDEX idx_clinical_metrics_history_user_id ON public.clinical_metrics_history(user_id);
CREATE INDEX idx_clinical_metrics_history_date ON public.clinical_metrics_history(analysis_date DESC);

-- User Skin Profiles Indexes
CREATE INDEX idx_user_skin_profiles_user_id ON public.user_skin_profiles(user_id);
CREATE INDEX idx_user_skin_profiles_updated ON public.user_skin_profiles(last_updated DESC);

-- =====================================================
-- CLINICAL TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on clinical tables
ALTER TABLE public.clinical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skin_profiles ENABLE ROW LEVEL SECURITY;

-- Clinical Analyses: Users can manage own analyses
CREATE POLICY "Users can manage own clinical analyses"
  ON public.clinical_analyses FOR ALL
  USING (user_id = auth.uid());

-- Clinical Metrics History: Users can read own history
CREATE POLICY "Users can read own metrics history"
  ON public.clinical_metrics_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own metrics history"
  ON public.clinical_metrics_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User Skin Profiles: Users can manage own profile
CREATE POLICY "Users can manage own skin profile"
  ON public.user_skin_profiles FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- CLINICAL TABLE TRIGGERS
-- =====================================================

-- Update updated_at timestamp for clinical tables
CREATE TRIGGER update_clinical_analyses_updated_at BEFORE UPDATE ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skin_profiles_updated_at BEFORE UPDATE ON public.user_skin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update user skin profile when new analysis is created
CREATE OR REPLACE FUNCTION update_user_skin_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_skin_profiles (
    user_id, 
    latest_analysis_id, 
    current_skin_tone, 
    current_undertone, 
    current_skin_type,
    current_metrics,
    last_updated
  ) VALUES (
    NEW.user_id,
    NEW.id,
    NEW.skin_tone,
    NEW.undertone,
    NEW.skin_type,
    NEW.metrics,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    latest_analysis_id = NEW.id,
    current_skin_tone = NEW.skin_tone,
    current_undertone = NEW.undertone,
    current_skin_type = NEW.skin_type,
    current_metrics = NEW.metrics,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_skin_profile_trigger AFTER INSERT ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_user_skin_profile();
