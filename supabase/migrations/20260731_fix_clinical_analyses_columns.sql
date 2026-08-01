-- Fix clinical_analyses table: Add missing overall_skin_health_score and updated_at columns
-- This resolves the "record 'new' has no field 'updated_at'" error and health score mismatch

-- =====================================================
-- STEP 1: ADD overall_skin_health_score COLUMN
-- =====================================================

ALTER TABLE public.clinical_analyses
ADD COLUMN IF NOT EXISTS overall_skin_health_score INTEGER;

-- =====================================================
-- STEP 2: ADD updated_at COLUMN IF MISSING
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_analyses' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.clinical_analyses 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE '✅ updated_at column added to clinical_analyses table';
    ELSE
        RAISE NOTICE 'ℹ️ updated_at column already exists in clinical_analyses table';
    END IF;
END $$;

-- =====================================================
-- STEP 3: ENSURE TRIGGER FUNCTION EXISTS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: CREATE TRIGGER FOR CLINICAL_ANALYSES
-- =====================================================

DROP TRIGGER IF EXISTS update_clinical_analyses_updated_at ON public.clinical_analyses;

CREATE TRIGGER update_clinical_analyses_updated_at 
BEFORE UPDATE ON public.clinical_analyses
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: ADD INDEX FOR HEALTH SCORE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clinical_analyses_health_score 
ON public.clinical_analyses(overall_skin_health_score DESC);

-- =====================================================
-- STEP 6: VERIFY THE FIX
-- =====================================================

DO $$
DECLARE
    col_exists BOOLEAN;
    score_exists BOOLEAN;
BEGIN
    -- Check updated_at column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_analyses' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) INTO col_exists;
    
    -- Check overall_skin_health_score column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_analyses' 
        AND column_name = 'overall_skin_health_score' 
        AND table_schema = 'public'
    ) INTO score_exists;
    
    IF col_exists AND score_exists THEN
        RAISE NOTICE '✅ clinical_analyses table fix completed successfully';
        RAISE NOTICE '📊 Columns verified: updated_at, overall_skin_health_score';
        RAISE NOTICE '⚡ Trigger configured for automatic timestamp updates';
        RAISE NOTICE '🔧 Save pipeline should now work correctly';
    ELSE
        IF NOT col_exists THEN
            RAISE WARNING '❌ updated_at column still missing!';
        END IF;
        IF NOT score_exists THEN
            RAISE WARNING '❌ overall_skin_health_score column still missing!';
        END IF;
    END IF;
END $$;
