-- Dedicated scheduled skin scans table.
-- STRICT: Do NOT route these into consultations or bookings.

CREATE TABLE IF NOT EXISTS public.scheduled_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'completed', 'cancelled', 'missed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_scans_user_id
  ON public.scheduled_scans(user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_scans_user_scheduled_at
  ON public.scheduled_scans(user_id, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_scheduled_scans_status
  ON public.scheduled_scans(status);

ALTER TABLE public.scheduled_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scheduled scans" ON public.scheduled_scans;
CREATE POLICY "Users can view own scheduled scans"
  ON public.scheduled_scans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scheduled scans" ON public.scheduled_scans;
CREATE POLICY "Users can insert own scheduled scans"
  ON public.scheduled_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scheduled scans" ON public.scheduled_scans;
CREATE POLICY "Users can update own scheduled scans"
  ON public.scheduled_scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own scheduled scans" ON public.scheduled_scans;
CREATE POLICY "Users can delete own scheduled scans"
  ON public.scheduled_scans FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_scheduled_scans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scheduled_scans_updated_at ON public.scheduled_scans;
CREATE TRIGGER trg_scheduled_scans_updated_at
  BEFORE UPDATE ON public.scheduled_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_scheduled_scans_updated_at();

-- Enable realtime for Events screen subscriptions
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_scans;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_analyses;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.glow_journeys;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
