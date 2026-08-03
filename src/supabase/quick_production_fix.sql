-- QUICK PRODUCTION FIX - Just the policy fix
-- Run this to fix the "policy already exists" error

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own glow journeys" ON glow_journeys;
DROP POLICY IF EXISTS "Users can manage own gamification" ON user_gamification;

-- Recreate policies
CREATE POLICY "Users can manage own glow journeys" ON glow_journeys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own gamification" ON user_gamification
  FOR ALL USING (user_id = auth.uid());

DO $$
BEGIN
    RAISE NOTICE '✅ Policy fix applied successfully';
END $$;
