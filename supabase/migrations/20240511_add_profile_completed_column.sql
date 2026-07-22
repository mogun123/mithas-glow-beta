-- Add profile_completed column to profiles table
-- Migration for fixing 406 error during user registration

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed 
ON public.profiles(profile_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.profile_completed IS 'Indicates if user has completed profile setup process';

-- Update existing profiles to have profile_completed = false by default
-- This ensures existing users are prompted to complete their profile
UPDATE public.profiles 
SET profile_completed = false 
WHERE profile_completed IS NULL;
