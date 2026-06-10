import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  const create = async (code: string, label: string, role: 'admin' | 'user' | 'sub_admin', office_id?: string | null, department_id?: string | null) => {
    const { error } = await supabase.from('access_codes').insert({ code, label, role: role as any, office_id: office_id || null, department_id: department_id || null });
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<AccessCode>) => {
    const { error } = await supabase.from('access_codes').update(updates).eq('id', id);
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('access_codes').delete().eq('id', id);
    return { error: error?.message || null };
  };

  return { codes, loading, create, update, remove, refetch: fetch };
}
