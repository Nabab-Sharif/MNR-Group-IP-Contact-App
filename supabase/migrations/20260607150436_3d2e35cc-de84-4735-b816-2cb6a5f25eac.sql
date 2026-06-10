
CREATE TABLE public.entry_edit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id uuid,
  department_id uuid,
  office_id uuid,
  editor_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL,
  editor_label text,
  editor_code text,
  action text NOT NULL,
  changes jsonb,
  entry_snapshot jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_edit_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_edit_logs TO authenticated;
GRANT ALL ON public.entry_edit_logs TO service_role;

ALTER TABLE public.entry_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view edit logs" ON public.entry_edit_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert edit logs" ON public.entry_edit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update edit logs" ON public.entry_edit_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete edit logs" ON public.entry_edit_logs FOR DELETE USING (true);

CREATE INDEX idx_entry_edit_logs_created_at ON public.entry_edit_logs (created_at DESC);
CREATE INDEX idx_entry_edit_logs_is_read ON public.entry_edit_logs (is_read);

ALTER PUBLICATION supabase_realtime ADD TABLE public.entry_edit_logs;
