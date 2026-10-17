import { useMemo } from 'react';
import { PhoneEntry } from '@/types/phone';
import { patchDataCache } from '@/lib/offlineDb';
import { useAppSelector } from '@/store';
import { syncFromNetwork } from '@/store/dataSync';
import { secureWrite } from '@/lib/secureWrite';

export function usePhoneEntries(departmentId?: string) {
  const allEntries = useAppSelector(s => s.data.entries);
  const hydrated = useAppSelector(s => s.data.hydrated);

  const entries = useMemo(
    () => (departmentId ? allEntries.filter(e => e.department_id === departmentId) : allEntries),
    [allEntries, departmentId]
  );

  const create = async (entry: { department_id: string; extension: string; name: string; designation?: string; phone?: string; email?: string; location?: string; status?: string; is_new?: boolean; new_ext_date?: string | null; new_ext_from?: string | null; new_ext_to?: string | null; is_new_phone?: boolean; new_phone_date?: string | null; new_phone_from?: string | null; new_phone_to?: string | null; created_by_code_id?: string | null; shift?: string | null }) => {
    const { data, error } = await secureWrite('phone_entries', 'insert', entry as Record<string, unknown>);
    if (data) await patchDataCache('phone_entries', 'INSERT', data);
    return { error };
  };

  const update = async (id: string, updates: Partial<PhoneEntry>) => {
    const { data, error } = await secureWrite('phone_entries', 'update', updates as Record<string, unknown>, id);
    if (data) await patchDataCache('phone_entries', 'UPDATE', data);
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await secureWrite('phone_entries', 'delete', null, id);
    if (!error) await patchDataCache('phone_entries', 'DELETE', { id });
    return { error };
  };

  return { entries, loading: !hydrated, create, update, remove, refetch: syncFromNetwork };
}
