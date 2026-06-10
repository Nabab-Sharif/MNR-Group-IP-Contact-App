
-- Create access_codes table
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text,
  role app_role NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for login check)
CREATE POLICY "Anyone can view access codes" ON public.access_codes FOR SELECT USING (true);
-- Open writes for internal app (auth handled in app layer)
CREATE POLICY "Allow inserts on access_codes" ON public.access_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on access_codes" ON public.access_codes FOR UPDATE USING (true);
CREATE POLICY "Allow deletes on access_codes" ON public.access_codes FOR DELETE USING (true);

-- Update existing write policies to not require Supabase Auth (internal app, access code based)
-- Offices
DROP POLICY IF EXISTS "Admins can insert offices" ON public.offices;
DROP POLICY IF EXISTS "Admins can update offices" ON public.offices;
DROP POLICY IF EXISTS "Admins can delete offices" ON public.offices;
CREATE POLICY "Allow inserts on offices" ON public.offices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on offices" ON public.offices FOR UPDATE USING (true);
CREATE POLICY "Allow deletes on offices" ON public.offices FOR DELETE USING (true);

-- Departments
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;
CREATE POLICY "Allow inserts on departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on departments" ON public.departments FOR UPDATE USING (true);
CREATE POLICY "Allow deletes on departments" ON public.departments FOR DELETE USING (true);

-- Phone entries
DROP POLICY IF EXISTS "Admins can insert phone entries" ON public.phone_entries;
DROP POLICY IF EXISTS "Admins can update phone entries" ON public.phone_entries;
DROP POLICY IF EXISTS "Admins can delete phone entries" ON public.phone_entries;
CREATE POLICY "Allow inserts on phone_entries" ON public.phone_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on phone_entries" ON public.phone_entries FOR UPDATE USING (true);
CREATE POLICY "Allow deletes on phone_entries" ON public.phone_entries FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_codes;

-- Seed default admin access code
INSERT INTO public.access_codes (code, label, role) VALUES ('01838047391', 'Admin', 'admin');
