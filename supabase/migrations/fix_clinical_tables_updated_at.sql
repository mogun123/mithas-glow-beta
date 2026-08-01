-- =====================================================
-- CRITICAL FIX: Add updated_at column to clinical tables
-- Resolves: "record 'new' has no field 'updated_at'" error
-- =====================================================

-- Step 1: Add overall_skin_health_score column to clinical_analyses
ALTER TABLE public.clinical_analyses
ADD COLUMN IF NOT EXISTS overall_skin_health_score INTEGER;

-- Step 2: Add updated_at column to clinical_analyses if missing
ALTER TABLE public.clinical_analyses
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Add updated_at column to clinical_metrics_history if missing
ALTER TABLE public.clinical_metrics_history
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 4: Create the trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers on all clinical tables
DROP TRIGGER IF EXISTS update_clinical_analyses_updated_at ON public.clinical_analyses;
CREATE TRIGGER update_clinical_analyses_updated_at
BEFORE UPDATE ON public.clinical_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinical_metrics_history_updated_at ON public.clinical_metrics_history;
CREATE TRIGGER update_clinical_metrics_history_updated_at
BEFORE UPDATE ON public.clinical_metrics_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Verify the fix - show columns for both tables
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('clinical_analyses', 'clinical_metrics_history')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
