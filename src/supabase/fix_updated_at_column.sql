-- FIX UPDATED_AT COLUMN FOR CLINICAL_ANALYSES TABLE
-- This script adds the missing updated_at column and creates the trigger

-- =====================================================
-- STEP 1: ADD MISSING UPDATED_AT COLUMN
-- =====================================================

-- Check if updated_at column exists and add it if missing
DO $$
BEGIN
    -- Check if updated_at column exists in clinical_analyses table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_analyses' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.clinical_analyses 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'updated_at column added to clinical_analyses table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in clinical_analyses table';
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE OR UPDATE TRIGGER FUNCTION
-- =====================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: CREATE TRIGGER FOR CLINICAL_ANALYSES
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_clinical_analyses_updated_at ON public.clinical_analyses;

-- Create trigger for clinical_analyses table
CREATE TRIGGER update_clinical_analyses_updated_at 
BEFORE UPDATE ON public.clinical_analyses
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 4: VERIFY THE FIX
-- =====================================================

-- Verify the column was added
DO $$
BEGIN
    RAISE NOTICE '✅ UPDATED_AT COLUMN FIX COMPLETE';
    RAISE NOTICE '📊 clinical_analyses table now has updated_at column';
    RAISE NOTICE '⚡ Trigger created for automatic updated_at management';
    RAISE NOTICE '🎯 Data pipeline should now work correctly';
END $$;

-- Show final verification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clinical_analyses' 
AND table_schema = 'public'
AND column_name = 'updated_at';
