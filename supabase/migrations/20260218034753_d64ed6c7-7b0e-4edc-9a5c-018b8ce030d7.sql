
-- Add last_active column to track when users last used the app
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS last_active timestamp with time zone DEFAULT NULL;
