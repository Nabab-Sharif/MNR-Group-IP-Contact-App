ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS can_copy_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_print_ext boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_print_phone boolean NOT NULL DEFAULT false;

UPDATE public.access_codes SET can_copy_email = true, can_send_email = true, can_print_ext = true, can_print_phone = true WHERE role IN ('admin','sub_admin');