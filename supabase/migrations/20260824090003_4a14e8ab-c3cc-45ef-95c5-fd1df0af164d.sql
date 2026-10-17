ALTER TABLE public.phone_entries ADD COLUMN IF NOT EXISTS new_ext_date date;

-- Backfill existing new extensions with their creation date for consistency
UPDATE public.phone_entries
SET new_ext_date = COALESCE(created_at::date, now()::date)
WHERE is_new = true AND new_ext_date IS NULL;
