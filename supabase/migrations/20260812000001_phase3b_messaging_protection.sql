-- ============================================================
-- PHASE 3B: MESSAGING & REVENUE PROTECTION FOUNDATION (FIXED)
-- ============================================================

-- STEP 0: Clean up old incompatible tables from previous e-commerce schema
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.marketplace_risk_events CASCADE;

-- 1. CONVERSATIONS TABLE
-- Links customers and artists for booking-related discussions
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  
  -- Prevent duplicate active conversations between same users
  UNIQUE(customer_id, artist_id, status)
);

-- 2. MESSAGES TABLE
-- Stores individual messages within conversations
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_risk_level TEXT DEFAULT 'none' CHECK (content_risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
  content_categories TEXT[] DEFAULT '{}',
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'blocked', 'redacted')),
  redacted_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false
  
  -- [FIXED] Removed invalid CHECK constraint with subquery. 
  -- Sender validation is already handled securely by RLS policies and RPC function.
);

-- 3. MARKETPLACE RISK EVENTS TABLE
-- Tracks suspicious behavior for moderation review
CREATE TABLE public.marketplace_risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'PHONE_ATTEMPT',
    'EMAIL_ATTEMPT',
    'WHATSAPP_ATTEMPT',
    'TELEGRAM_ATTEMPT',
    'UPI_ATTEMPT',
    'PAYMENT_LINK_ATTEMPT',
    'EXTERNAL_BOOKING_ATTEMPT',
    'SOCIAL_CONTACT_ATTEMPT',
    'QR_PAYMENT_ATTEMPT',
    'DIRECT_CONTACT_ATTEMPT',
    'BYPASS_LANGUAGE',
    'REPEATED_BYPASS_ATTEMPT'
  )),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  metadata JSONB DEFAULT '{}',
  reviewed BOOLEAN NOT NULL DEFAULT false,
  admin_action TEXT CHECK (admin_action IN ('dismissed', 'warned', 'restricted', 'suspended', 'escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX idx_conversations_artist ON public.conversations(artist_id);
CREATE INDEX idx_conversations_booking ON public.conversations(booking_id);
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_moderation ON public.messages(moderation_status, created_at);

CREATE INDEX idx_risk_events_user ON public.marketplace_risk_events(user_id);
CREATE INDEX idx_risk_events_artist ON public.marketplace_risk_events(artist_id);
CREATE INDEX idx_risk_events_level ON public.marketplace_risk_events(risk_level, created_at);
CREATE INDEX idx_risk_events_reviewed ON public.marketplace_risk_events(reviewed, risk_level DESC);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_risk_events ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their own conversations
CREATE POLICY "Customers view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Artists view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = artist_id);

CREATE POLICY "Customers create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Artists create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Users update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = artist_id);

-- Messages: Users can only see messages in their conversations
CREATE POLICY "Users view messages in own conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
    )
  );

CREATE POLICY "Users send messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
    )
  );

-- Risk Events: Users can view their own events; admins can view all
CREATE POLICY "Users view own risk events" ON public.marketplace_risk_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System insert risk events" ON public.marketplace_risk_events
  FOR INSERT WITH CHECK (true); -- Handled by backend/RPC

CREATE POLICY "Admins manage risk events" ON public.marketplace_risk_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND account_type = 'admin' -- [FIXED] role changed to account_type
    )
  );

-- 6. RPC: PROCESS MESSAGE WITH ENFORCEMENT
-- Validates content, applies risk scoring, and enforces moderation
CREATE OR REPLACE FUNCTION public.process_message_with_enforcement(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  risk_level TEXT,
  moderation_status TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_sender_id UUID;
  v_risk_result RECORD;
  v_message_id UUID;
  v_moderation_status TEXT;
  v_redacted_content TEXT;
BEGIN
  -- Verify sender identity and conversation access
  SELECT 
    CASE 
      WHEN customer_id = auth.uid() THEN customer_id
      WHEN artist_id = auth.uid() THEN artist_id
      ELSE NULL
    END INTO v_sender_id
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'none'::TEXT, 'blocked'::TEXT, 'Unauthorized: Cannot access this conversation';
    RETURN;
  END IF;

  -- Analyze content risk (simplified logic)
  SELECT 
    CASE 
      WHEN p_content ~* '(\+91|0)[6-9]\d{9}' THEN 'high'
      WHEN p_content ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN 'high'
      WHEN p_content ~* '(wa\.me|whatsapp\.com)' THEN 'high'
      WHEN p_content ~* '(@[a-zA-Z0-9_]+|instagram\.com)' THEN 'medium'
      WHEN p_content ~* '(upi|okaxis|oksbi|paytm)' THEN 'critical'
      ELSE 'none'
    END AS level,
    CASE 
      WHEN p_content ~* '(upi|okaxis|oksbi|paytm)' THEN '{UPI,PAYMENT}'
      WHEN p_content ~* '(\+91|0)[6-9]\d{9}' THEN '{PHONE}'
      WHEN p_content ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN '{EMAIL}'
      WHEN p_content ~* '(wa\.me|whatsapp\.com)' THEN '{WHATSAPP}'
      ELSE '{}'
    END AS categories
  INTO v_risk_result;

  -- Determine moderation action based on risk
  IF v_risk_result.level = 'critical' THEN
    v_moderation_status := 'blocked';
    v_redacted_content := 'Message blocked: Contains payment/contact information. Please keep transactions within MITHAS GLOW.';
    
    INSERT INTO public.marketplace_risk_events (user_id, event_type, risk_level, risk_score, metadata)
    VALUES (v_sender_id, 'PAYMENT_LINK_ATTEMPT', 'critical', 90, jsonb_build_object('content_preview', left(p_content, 50)));
    
  ELSIF v_risk_result.level = 'high' THEN
    v_moderation_status := 'redacted';
    v_redacted_content := '[Contact details hidden]. Please continue through MITHAS GLOW for protected booking.';
    
    INSERT INTO public.marketplace_risk_events (user_id, event_type, risk_level, risk_score, metadata)
    VALUES (v_sender_id, 'PHONE_ATTEMPT', 'high', 75, jsonb_build_object('content_preview', left(p_content, 50)));
    
  ELSIF v_risk_result.level = 'medium' THEN
    v_moderation_status := 'approved';
    v_redacted_content := p_content; 
    
    INSERT INTO public.marketplace_risk_events (user_id, event_type, risk_level, risk_score, metadata)
    VALUES (v_sender_id, 'SOCIAL_CONTACT_ATTEMPT', 'medium', 40, jsonb_build_object('content_preview', left(p_content, 50)));
    
  ELSE
    v_moderation_status := 'approved';
    v_redacted_content := p_content;
  END IF;

  -- Insert message if not blocked
  IF v_moderation_status != 'blocked' THEN
    INSERT INTO public.messages (conversation_id, sender_id, content, content_risk_level, content_categories, moderation_status, redacted_content)
    VALUES (p_conversation_id, v_sender_id, p_content, v_risk_result.level, v_risk_result.categories, v_moderation_status, v_redacted_content)
    RETURNING id INTO v_message_id;
    
    UPDATE public.conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = p_conversation_id;
    
    RETURN QUERY SELECT true, v_message_id, v_risk_result.level, v_moderation_status, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, NULL::UUID, v_risk_result.level, v_moderation_status, 'Message blocked due to policy violation';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER: Update conversation timestamp on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();
