
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS created_by_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS created_by_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL;
ALTER TABLE public.phone_entries ADD COLUMN IF NOT EXISTS created_by_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL;
