-- 1. Remove permissive public write policies
DROP POLICY IF EXISTS "Allow inserts on offices" ON public.offices;
DROP POLICY IF EXISTS "Allow updates on offices" ON public.offices;
DROP POLICY IF EXISTS "Allow deletes on offices" ON public.offices;

DROP POLICY IF EXISTS "Allow inserts on departments" ON public.departments;
DROP POLICY IF EXISTS "Allow updates on departments" ON public.departments;
DROP POLICY IF EXISTS "Allow deletes on departments" ON public.departments;

DROP POLICY IF EXISTS "Allow inserts on phone_entries" ON public.phone_entries;
DROP POLICY IF EXISTS "Allow updates on phone_entries" ON public.phone_entries;
DROP POLICY IF EXISTS "Allow deletes on phone_entries" ON public.phone_entries;

DROP POLICY IF EXISTS "Allow inserts on access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "Allow updates on access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "Allow deletes on access_codes" ON public.access_codes;

DROP POLICY IF EXISTS "Anyone can insert edit logs" ON public.entry_edit_logs;
DROP POLICY IF EXISTS "Anyone can update edit logs" ON public.entry_edit_logs;
DROP POLICY IF EXISTS "Anyone can delete edit logs" ON public.entry_edit_logs;

REVOKE INSERT, UPDATE, DELETE ON public.offices FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.departments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.phone_entries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.access_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.entry_edit_logs FROM anon, authenticated;

-- 2. Profiles: no public exposure of emails / employee ids
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
REVOKE SELECT ON public.profiles FROM anon;

-- 3. Internal SECURITY DEFINER helpers must not be callable from the API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_by_employee_id(text) FROM anon, authenticated, PUBLIC;

-- 4. Single audited write gateway that verifies the access code server-side
CREATE OR REPLACE FUNCTION public.access_code_write(
  _code text,
  _table text,
  _action text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Any valid code may refresh its own activity timestamp
  IF _action = 'touch' THEN
    UPDATE public.access_codes SET last_active = now() WHERE id = v_id;
    RETURN NULL;
  END IF;

  IF _table NOT IN ('offices','departments','phone_entries','access_codes','entry_edit_logs') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _action NOT IN ('insert','update','delete') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_role NOT IN ('admin','sub_admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  -- Only full admins may manage access codes
  IF _table = 'access_codes' AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  -- Bulk operations are only allowed on the notification log
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

  ELSE -- delete
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
$$;

REVOKE ALL ON FUNCTION public.access_code_write(text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.access_code_write(text, text, text, jsonb, uuid) TO anon, authenticated;

-- 5. Realtime: stop broadcasting sensitive profile rows
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;