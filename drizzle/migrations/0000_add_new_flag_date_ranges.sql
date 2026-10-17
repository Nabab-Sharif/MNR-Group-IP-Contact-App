ALTER TABLE public.phone_entries
  ADD COLUMN IF NOT EXISTS new_ext_from date,
  ADD COLUMN IF NOT EXISTS new_ext_to date,
  ADD COLUMN IF NOT EXISTS is_new_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_phone_date date,
  ADD COLUMN IF NOT EXISTS new_phone_from date,
  ADD COLUMN IF NOT EXISTS new_phone_to date;

UPDATE public.phone_entries SET new_ext_from = new_ext_date WHERE is_new = true AND new_ext_from IS NULL;