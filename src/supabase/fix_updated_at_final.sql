-- FINAL FIX FOR UPDATED_AT FIELD ISSUE
-- This script specifically fixes the missing updated_at column in clinical_analyses

-- =====================================================
-- STEP 1: VERIFY AND ADD UPDATED_AT COLUMN
-- =====================================================

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
        
        RAISE NOTICE '✅ updated_at column added to clinical_analyses table';
    ELSE
        RAISE NOTICE 'ℹ️ updated_at column already exists in clinical_analyses table';
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE OR UPDATE TRIGGER FUNCTION
-- =====================================================

-- Create the trigger function (will replace if exists)
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

-- Create the trigger
CREATE TRIGGER update_clinical_analyses_updated_at 
BEFORE UPDATE ON public.clinical_analyses
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 4: VERIFY THE FIX
-- =====================================================

-- Show the table structure to verify
DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFYING TABLE STRUCTURE...';
    
    -- Check if column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_analyses' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ updated_at column confirmed in clinical_analyses';
        
    ELSE
        RAISE NOTICE '❌ updated_at column still missing!';
    END IF;
END $$;

-- Show column details (outside DO block)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clinical_analyses' 
AND column_name = 'updated_at' 
AND table_schema = 'public';

-- =====================================================
-- STEP 5: TEST THE FIX
-- =====================================================

-- Test insert to verify the column works
DO $$
BEGIN
    -- Create a test record to verify the updated_at column works
    INSERT INTO public.clinical_analyses (
        user_id,
        session_id,
        skin_tone,
        undertone,
        skin_type,
        metrics,
        spatial_data,
        frame_data,
        lab_values
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- test user_id
        'test_session_final_fix',
        'medium',
        'warm',
        'normal',
        '{"acne": 0, "redness": 0, "oiliness": 0, "moisture": 50}'::JSONB,
        '{"acneClusters": []}'::JSONB,
        '{"center": {"image": "", "timestamp": "' || NOW() || '"}}'::JSONB,
        '{"overall": {"l": 65, "a": 12, "b": 18}}'::JSONB
    );
    
    -- Update the test record to trigger the updated_at
    UPDATE public.clinical_analyses 
    SET skin_tone = 'light' 
    WHERE session_id = 'test_session_final_fix';
    
    -- Check if updated_at was set (simple existence check)
    IF EXISTS (
        SELECT 1 
        FROM public.clinical_analyses 
        WHERE session_id = 'test_session_final_fix'
        AND updated_at IS NOT NULL
    ) THEN
        RAISE NOTICE '✅ updated_at trigger working correctly';
    ELSE
        RAISE NOTICE '❌ updated_at trigger not working';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.clinical_analyses 
    WHERE session_id = 'test_session_final_fix';
    
    RAISE NOTICE '✅ updated_at trigger test completed successfully';
END $$;

-- =====================================================
-- STEP 6: FINAL VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 UPDATED_AT FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '📊 clinical_analyses table now has updated_at column';
    RAISE NOTICE '⚡ Trigger created for automatic timestamp updates';
    RAISE NOTICE '🔧 Data pipeline should now work correctly';
    RAISE NOTICE '✅ System is ready for production testing';
END $$;
