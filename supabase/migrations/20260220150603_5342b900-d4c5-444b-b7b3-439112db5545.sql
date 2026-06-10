
-- Add office_id and department_id to access_codes
ALTER TABLE public.access_codes
ADD COLUMN office_id uuid REFERENCES public.offices(id) ON DELETE SET NULL,
ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
