-- ============================================================
-- PHASE 1: GLOW CHAT EXTENSIONS
-- Non-destructive, backward-compatible database migration
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CONVERSATIONS TABLE EXTENSION
-- ============================================================

-- Add mode column with default
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'artist';

-- Add metadata column
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing conversations: booking conversations become 'artist' mode
UPDATE public.conversations
SET mode = 'artist'
WHERE booking_id IS NOT NULL AND mode = 'artist';

-- Ensure any rows that might have been inserted without booking_id get artist mode
-- (This is a safety measure since the default is already 'artist')
UPDATE public.conversations
SET mode = 'artist'
WHERE mode IS NULL;

-- Add CHECK constraint for mode values
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_mode_check 
CHECK (mode IN ('artist', 'contact', 'messenger'));

-- Add CHECK constraint for mode + booking_id consistency
-- artist: booking_id IS NOT NULL
-- contact: booking_id IS NULL
-- messenger: booking_id IS NULL
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_mode_booking_consistency
CHECK (
  (mode = 'artist' AND booking_id IS NOT NULL) OR
  (mode = 'contact' AND booking_id IS NULL) OR
  (mode = 'messenger' AND booking_id IS NULL)
);

-- ============================================================
-- 2. UNIQUE CONSTRAINT MIGRATION
-- ============================================================

-- Drop the old unnamed UNIQUE constraint and recreate with proper name
-- The existing constraint is: UNIQUE(customer_id, artist_id, status)
-- We need to replace it with: UNIQUE(customer_id, artist_id, mode, status)

-- First, drop the existing inline unique constraint by recreating the table structure
-- Since the constraint was unnamed, we need to identify it properly
-- In PostgreSQL, inline UNIQUE constraints get system-generated names
-- We'll use a dynamic approach to find and drop it

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the existing unique constraint on (customer_id, artist_id, status)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.conversations'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.conversations'::regclass AND attname = 'customer_id'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.conversations'::regclass AND attname = 'artist_id'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.conversations'::regclass AND attname = 'status')
    ];
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.conversations DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Add the new unique constraint including mode
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_customer_artist_mode_status_unique 
UNIQUE(customer_id, artist_id, mode, status);

-- ============================================================
-- 3. CREATE message_media TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  thumbnail_path TEXT,
  dimensions JSONB,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add CHECK constraint for media_type validation
ALTER TABLE public.message_media
ADD CONSTRAINT message_media_type_check
CHECK (media_type IN ('image', 'video', 'audio', 'document'));

-- Index on message_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_media_message_id 
ON public.message_media(message_id);

-- ============================================================
-- 4. CREATE chat_blocks TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure users cannot block themselves
  CONSTRAINT chat_blocks_self_block_check CHECK (blocker_id <> blocked_id),
  
  -- Prevent duplicate block relationships
  CONSTRAINT chat_blocks_unique_pair UNIQUE(blocker_id, blocked_id)
);

-- Index for efficient blocking lookups
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocker 
ON public.chat_blocks(blocker_id);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked 
ON public.chat_blocks(blocked_id);

-- ============================================================
-- 5. CREATE chat_reports TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  
  -- Status validation
  CONSTRAINT chat_reports_status_check 
  CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed'))
);

-- Indexes for report management
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter 
ON public.chat_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_chat_reports_target 
ON public.chat_reports(target_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_reports_status 
ON public.chat_reports(status, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation 
ON public.chat_reports(conversation_id);

-- ============================================================
-- 6. CREATE contact_sync TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_hash TEXT NOT NULL,
  contact_name TEXT,
  matched_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- IMPORTANT: contact_hash must be SHA-256 (64 hex characters)
  CONSTRAINT contact_sync_hash_format 
  CHECK (length(contact_hash) = 64 AND contact_hash ~ '^[a-f0-9]+$')
);

-- Index for contact matching lookups
CREATE INDEX IF NOT EXISTS idx_contact_sync_contact_hash 
ON public.contact_sync(contact_hash);

CREATE INDEX IF NOT EXISTS idx_contact_sync_user 
ON public.contact_sync(user_id);

-- Prevent duplicate contact hashes for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_sync_user_hash_unique 
ON public.contact_sync(user_id, contact_hash);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_contact_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_sync_updated_at ON public.contact_sync;
CREATE TRIGGER trigger_update_contact_sync_updated_at
  BEFORE UPDATE ON public.contact_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_sync_updated_at();

-- ============================================================
-- 7. CREATE chat_followers TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Users cannot follow themselves
  CONSTRAINT chat_followers_self_follow_check CHECK (follower_id <> following_id),
  
  -- Status validation
  CONSTRAINT chat_followers_status_check 
  CHECK (status IN ('pending', 'accepted')),
  
  -- Prevent duplicate follow relationships
  CONSTRAINT chat_followers_unique_pair UNIQUE(follower_id, following_id)
);

-- Indexes for follower/following lookups
CREATE INDEX IF NOT EXISTS idx_chat_followers_following_status 
ON public.chat_followers(following_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_followers_follower_status 
ON public.chat_followers(follower_id, status);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_chat_followers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_followers_updated_at ON public.chat_followers;
CREATE TRIGGER trigger_update_chat_followers_updated_at
  BEFORE UPDATE ON public.chat_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_followers_updated_at();

-- ============================================================
-- 8. ADDITIONAL INDEXES FOR CONVERSATIONS AND MESSAGES
-- ============================================================

-- Index for conversations by mode and updated_at
CREATE INDEX IF NOT EXISTS idx_conversations_mode_updated 
ON public.conversations(mode, updated_at DESC);

-- Composite index for messages filtering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read_sender 
ON public.messages(conversation_id, is_read, sender_id);

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_followers ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- message_media RLS Policies
-- Users can access media ONLY when they have access to the parent message/conversation
-- -------------------------------------------------------------

CREATE POLICY "Users view media in own conversations" 
ON public.message_media
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_media.message_id
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
  )
);

CREATE POLICY "Users insert media in own conversations" 
ON public.message_media
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_media.message_id
      AND m.sender_id = auth.uid()
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
  )
);

CREATE POLICY "Users delete own media" 
ON public.message_media
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_media.message_id
      AND m.sender_id = auth.uid()
      AND (c.customer_id = auth.uid() OR c.artist_id = auth.uid())
  )
);

-- -------------------------------------------------------------
-- chat_blocks RLS Policies
-- Users can create/read/delete only their own block relationships
-- -------------------------------------------------------------

CREATE POLICY "Users view own blocks" 
ON public.chat_blocks
FOR SELECT 
USING (blocker_id = auth.uid());

CREATE POLICY "Users create own blocks" 
ON public.chat_blocks
FOR INSERT 
WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users delete own blocks" 
ON public.chat_blocks
FOR DELETE 
USING (blocker_id = auth.uid());

-- -------------------------------------------------------------
-- chat_reports RLS Policies
-- Users can create reports as themselves
-- Users cannot edit/delete arbitrary reports
-- Admins can resolve reports
-- -------------------------------------------------------------

CREATE POLICY "Users view own reports" 
ON public.chat_reports
FOR SELECT 
USING (reporter_id = auth.uid());

CREATE POLICY "Admins view all reports" 
ON public.chat_reports
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND account_type = 'admin'
  )
);

CREATE POLICY "Users create reports" 
ON public.chat_reports
FOR INSERT 
WITH CHECK (reporter_id = auth.uid());

-- Only admins can update reports (resolve/dismiss)
CREATE POLICY "Admins resolve reports" 
ON public.chat_reports
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND account_type = 'admin'
  )
);

-- Only admins can delete reports
CREATE POLICY "Admins delete reports" 
ON public.chat_reports
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND account_type = 'admin'
  )
);

-- -------------------------------------------------------------
-- contact_sync RLS Policies
-- Users can access only their own contact-sync records
-- NEVER expose another user's contact hashes
-- -------------------------------------------------------------

CREATE POLICY "Users view own contacts" 
ON public.contact_sync
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users insert own contacts" 
ON public.contact_sync
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own contacts" 
ON public.contact_sync
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users delete own contacts" 
ON public.contact_sync
FOR DELETE 
USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- chat_followers RLS Policies
-- Users can manage only relationships where they are the follower
-- The target user may accept/reject requests
-- -------------------------------------------------------------

CREATE POLICY "Users view all follower relationships" 
ON public.chat_followers
FOR SELECT 
USING (
  follower_id = auth.uid() OR following_id = auth.uid()
);

CREATE POLICY "Users create follow requests" 
ON public.chat_followers
FOR INSERT 
WITH CHECK (follower_id = auth.uid());

-- Followers can cancel their own pending requests
CREATE POLICY "Followers cancel own requests" 
ON public.chat_followers
FOR DELETE 
USING (follower_id = auth.uid() AND status = 'pending');

-- Both parties can update the relationship (for accept/reject)
CREATE POLICY "Users update own follower relationships" 
ON public.chat_followers
FOR UPDATE 
USING (
  follower_id = auth.uid() OR following_id = auth.uid()
)
WITH CHECK (
  -- Follower can only change status to 'pending' or cancel
  (follower_id = auth.uid() AND status IN ('pending')) OR
  -- Following user can accept or reject
  (following_id = auth.uid() AND status IN ('pending', 'accepted'))
);

-- ============================================================
-- 10. EXISTING RLS PRESERVATION
-- ============================================================

-- Verify existing RLS policies on conversations and messages remain intact
-- These were created in phase3b_messaging_protection.sql and should not be modified

-- ============================================================
-- VALIDATION QUERIES (Comments for manual verification)
-- ============================================================

-- 1. Existing conversations remain readable:
--    SELECT * FROM public.conversations LIMIT 10;

-- 2. Existing booking conversations have mode='artist':
--    SELECT COUNT(*) FROM public.conversations WHERE booking_id IS NOT NULL AND mode = 'artist';

-- 3. Artist conversation requires booking_id (constraint enforced):
--    INSERT INTO public.conversations (customer_id, artist_id, mode) VALUES (...,'artist'); -- Should fail

-- 4. Contact conversation cannot have booking_id (constraint enforced):
--    INSERT INTO public.conversations (customer_id, artist_id, mode, booking_id) VALUES (...,'contact', some_id); -- Should fail

-- 5. Messenger conversation cannot have booking_id (constraint enforced):
--    INSERT INTO public.conversations (customer_id, artist_id, mode, booking_id) VALUES (...,'messenger', some_id); -- Should fail

-- 6. Invalid mode is rejected (constraint enforced):
--    INSERT INTO public.conversations (customer_id, artist_id, mode, booking_id) VALUES (...,'invalid', some_id); -- Should fail

-- 7. Multiple modes can exist between the same users:
--    After migration, same customer_id + artist_id can have different mode values

-- 8. message_media respects parent message access (RLS enforced)

-- 9. contact_sync is isolated by user (RLS enforced)

-- 10. chat_blocks are isolated by blocker (RLS enforced)

-- 11. chat_reports cannot be manipulated by arbitrary users (RLS enforced)

-- 12. Follower relationships enforce valid statuses (constraint enforced)

-- 13. Existing process_message_with_enforcement() remains unchanged
--     This function was not modified in this migration

COMMIT;
