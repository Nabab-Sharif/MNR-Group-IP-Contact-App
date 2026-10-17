CREATE TABLE public.office_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_by_code_id uuid REFERENCES public.access_codes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.office_locations TO anon;
GRANT SELECT ON public.office_locations TO authenticated;
GRANT ALL ON public.office_locations TO service_role;

ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view office locations"
ON public.office_locations FOR SELECT USING (true);

CREATE TRIGGER update_office_locations_updated_at
BEFORE UPDATE ON public.office_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.departments ADD COLUMN is_emergency boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.access_code_write(_code text, _table text, _action text, _payload jsonb DEFAULT '{}'::jsonb, _id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_role app_role;
  v_cols text;
  v_vals text;
  v_sql text;
  v_row jsonb;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id, role INTO v_id, v_role
  FROM public.access_codes
  WHERE code = trim(_code) AND is_active = true
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _action = 'touch' THEN
    UPDATE public.access_codes SET last_active = now() WHERE id = v_id;
    RETURN NULL;
  END IF;

  IF _table NOT IN ('offices','departments','phone_entries','access_codes','entry_edit_logs','office_locations') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _action NOT IN ('insert','update','delete') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_role NOT IN ('admin','sub_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _table = 'access_codes' AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _id IS NULL AND _action <> 'insert' AND _table <> 'entry_edit_logs' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _action = 'insert' THEN
    SELECT string_agg(quote_ident(k), ', '), string_agg('r.' || quote_ident(k), ', ')
      INTO v_cols, v_vals
    FROM jsonb_object_keys(COALESCE(_payload, '{}'::jsonb)) AS k;

    IF v_cols IS NULL THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    v_sql := format(
      'INSERT INTO public.%1$I (%2$s) SELECT %3$s FROM jsonb_populate_record(NULL::public.%1$I, $1) AS r RETURNING to_jsonb(public.%1$I.*)',
      _table, v_cols, v_vals);
    EXECUTE v_sql INTO v_row USING _payload;

  ELSIF _action = 'update' THEN
    SELECT string_agg(quote_ident(k), ', '), string_agg('r.' || quote_ident(k), ', ')
      INTO v_cols, v_vals
    FROM jsonb_object_keys(COALESCE(_payload, '{}'::jsonb)) AS k;

    IF v_cols IS NULL THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    IF _id IS NULL THEN
      v_sql := format(
        'UPDATE public.%1$I AS t SET (%2$s) = (SELECT %3$s FROM jsonb_populate_record(NULL::public.%1$I, $1) AS r) RETURNING to_jsonb(t.*)',
        _table, v_cols, v_vals);
      EXECUTE v_sql INTO v_row USING _payload;
    ELSE
      v_sql := format(
        'UPDATE public.%1$I AS t SET (%2$s) = (SELECT %3$s FROM jsonb_populate_record(NULL::public.%1$I, $1) AS r) WHERE t.id = $2 RETURNING to_jsonb(t.*)',
        _table, v_cols, v_vals);
      EXECUTE v_sql INTO v_row USING _payload, _id;
    END IF;

  ELSE
    IF _id IS NULL THEN
      EXECUTE format('DELETE FROM public.%1$I', _table);
      v_row := NULL;
    ELSE
      v_sql := format('DELETE FROM public.%1$I AS t WHERE t.id = $1 RETURNING to_jsonb(t.*)', _table);
      EXECUTE v_sql INTO v_row USING _id;
    END IF;
  END IF;

  RETURN v_row;
END;
$function$;