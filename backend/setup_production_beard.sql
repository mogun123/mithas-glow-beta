-- ═══════════════════════════════════════════════════════════════════════════
-- MITHASGLOW - Production Beard Styles Setup
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Inspect table structure to understand required columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'beard_styles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add model_3d_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'model_3d_url'
  ) THEN
    ALTER TABLE public.beard_styles ADD COLUMN model_3d_url TEXT;
  END IF;
END $$;

-- Step 3: Make all optional columns nullable
DO $$
BEGIN
  -- Make preview_image nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'preview_image' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beard_styles ALTER COLUMN preview_image DROP NOT NULL;
  END IF;
  
  -- Make min_jaw_width nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'min_jaw_width' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beard_styles ALTER COLUMN min_jaw_width DROP NOT NULL;
  END IF;
  
  -- Make max_jaw_width nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'max_jaw_width' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beard_styles ALTER COLUMN max_jaw_width DROP NOT NULL;
  END IF;
  
  -- Make min_cheekbone_width nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'min_cheekbone_width' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beard_styles ALTER COLUMN min_cheekbone_width DROP NOT NULL;
  END IF;
  
  -- Make max_cheekbone_width nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beard_styles' AND column_name = 'max_cheekbone_width' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.beard_styles ALTER COLUMN max_cheekbone_width DROP NOT NULL;
  END IF;
END $$;

-- Step 4: Truncate existing beard_styles table
TRUNCATE TABLE public.beard_styles CASCADE;

-- Step 5: Insert production beard style with full public URL
-- Using minimal required columns to avoid constraint errors
INSERT INTO public.beard_styles (
  id,
  name,
  style_name,
  category,
  density_level,
  tone,
  model_path,
  model_3d_url,
  alpha_mask_url,
  density_map_url,
  strand_map_url,
  beard_texture_url,
  normal_map_url,
  thumbnail_url,
  preview_image,
  description,
  premium,
  weighted_score,
  active,
  min_jaw_width,
  max_jaw_width,
  min_cheekbone_width,
  max_cheekbone_width
) VALUES (
  'prod-001',
  'Original Goatee',
  'Original Goatee',
  'beard',
  3,
  'medium',
  'beard_3d_model_free.glb',  -- Storage path in beard-assets bucket
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/beard_3d_model_free.glb',  -- Full public URL
  '',  -- Optional textures - can be added later
  '',
  '',
  '',
  '',
  '',
  '',  -- thumbnail_url
  NULL,  -- preview_image
  'Production beard model for AR try-on - FILE NOT UPLOADED TO STORAGE YET',
  false,
  0.9,
  false,  -- Set to false until GLB file is uploaded to Supabase storage
  NULL,  -- min_jaw_width
  NULL,  -- max_jaw_width
  NULL,  -- min_cheekbone_width
  NULL   -- max_cheekbone_width
);

-- Step 6: Verify insertion
SELECT * FROM public.beard_styles WHERE active = true;
