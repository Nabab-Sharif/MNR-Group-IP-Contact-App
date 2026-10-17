import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureWrite } from '@/lib/secureWrite';

export interface AccessCode {
  id: string;
  code: string;
  label: string | null;
  role: 'admin' | 'user' | 'sub_admin';
  is_active: boolean;
  created_at: string;
  last_active: string | null;
  office_id: string | null;
  department_id: string | null;
  can_copy_email: boolean;
  can_send_email: boolean;
  can_print_ext: boolean;
  can_print_phone: boolean;
  can_copy_phone: boolean;
  can_view_location: boolean;
}


export function useAccessCodes() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('access_codes').select('*').order('created_at');
    if (data) setCodes(data as AccessCode[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('access-codes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_codes' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const create = async (
    code: string,
    label: string,
    role: 'admin' | 'user' | 'sub_admin',
    office_id?: string | null,
    department_id?: string | null,
    permissions?: Partial<Pick<AccessCode, 'can_copy_email' | 'can_send_email' | 'can_print_ext' | 'can_print_phone' | 'can_copy_phone' | 'can_view_location'>>,
  ) => {
    const { error } = await secureWrite('access_codes', 'insert', {
      code,
      label,
      role,
      office_id: office_id || null,
      department_id: department_id || null,
      can_copy_email: permissions?.can_copy_email ?? false,
      can_send_email: permissions?.can_send_email ?? false,
      can_print_ext: permissions?.can_print_ext ?? false,
      can_print_phone: permissions?.can_print_phone ?? false,
      can_copy_phone: permissions?.can_copy_phone ?? false,
      can_view_location: permissions?.can_view_location ?? false,
    });
    if (!error) fetch();
    return { error };
  };


  const update = async (id: string, updates: Partial<AccessCode>) => {
    const { error } = await secureWrite('access_codes', 'update', updates as Record<string, unknown>, id);
    if (!error) fetch();
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await secureWrite('access_codes', 'delete', null, id);
    if (!error) fetch();
    return { error };
  };

  return { codes, loading, create, update, remove, refetch: fetch };
}
