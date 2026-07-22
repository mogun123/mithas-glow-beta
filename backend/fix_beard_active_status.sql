-- ═══════════════════════════════════════════════════════════════════════════
-- MITHASGLOW - Fix Beard Style Active Status
-- Run this in Supabase SQL Editor to deactivate beard styles with missing files
-- ═══════════════════════════════════════════════════════════════════════════

-- Update beard style to inactive since GLB file is not uploaded to storage
UPDATE public.beard_styles
SET active = false,
    description = 'Production beard model for AR try-on - FILE NOT UPLOADED TO STORAGE YET'
WHERE id = 'prod-001';

-- Verify the update
SELECT id, name, active, model_3d_url, description
FROM public.beard_styles
WHERE id = 'prod-001';
