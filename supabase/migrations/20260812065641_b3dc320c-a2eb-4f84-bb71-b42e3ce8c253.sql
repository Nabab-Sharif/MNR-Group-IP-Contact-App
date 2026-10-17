ALTER TABLE public.phone_entries ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS can_copy_phone boolean NOT NULL DEFAULT false;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS can_view_location boolean NOT NULL DEFAULT false;