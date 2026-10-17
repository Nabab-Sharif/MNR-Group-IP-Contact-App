import { useMemo } from 'react';
import { Department } from '@/types/phone';
import { patchDataCache } from '@/lib/offlineDb';
import { useAppSelector } from '@/store';
import { syncFromNetwork } from '@/store/dataSync';
import { secureWrite } from '@/lib/secureWrite';

export function useDepartments(officeId?: string) {
  const allDepts = useAppSelector(s => s.data.depts);
  const hydrated = useAppSelector(s => s.data.hydrated);

  const departments = useMemo(
    () => (officeId ? allDepts.filter(d => d.office_id === officeId) : allDepts),
    [allDepts, officeId]
  );

  const create = async (office_id: string, name: string, description?: string, created_by_code_id?: string | null, is_emergency = false) => {
    const { data, error } = await secureWrite('departments', 'insert', {
      office_id,
      name,
      description: description ?? null,
      created_by_code_id: created_by_code_id || null,
      is_emergency,
    });
    if (data) await patchDataCache('departments', 'INSERT', data);
    return { error };
  };

  const update = async (id: string, updates: Partial<Department>) => {
    const { data, error } = await secureWrite('departments', 'update', updates as Record<string, unknown>, id);
    if (data) await patchDataCache('departments', 'UPDATE', data);
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await secureWrite('departments', 'delete', null, id);
    if (!error) await patchDataCache('departments', 'DELETE', { id });
    return { error };
  };

  return { departments, loading: !hydrated, create, update, remove, refetch: syncFromNetwork };
}
