-- Enhance cart table with better tracking and persistence
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_created_at ON public.cart(created_at DESC);

-- Add RLS policies for guest users
CREATE POLICY "Guests can view own cart by session"
  ON public.cart FOR SELECT
  USING (auth.uid() = user_id OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id')));

CREATE POLICY "Guests can insert own cart by session"
  ON public.cart FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id')));

CREATE POLICY "Users can update own cart"
  ON public.cart FOR UPDATE
  USING (auth.uid() = user_id OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id')));

CREATE POLICY "Users can delete own cart"
  ON public.cart FOR DELETE
  USING (auth.uid() = user_id OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id')));
