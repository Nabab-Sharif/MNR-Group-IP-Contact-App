import { Office } from '@/types/phone';
import { patchDataCache } from '@/lib/offlineDb';
import { useAppSelector } from '@/store';
import { syncFromNetwork } from '@/store/dataSync';
import { secureWrite } from '@/lib/secureWrite';

export function useOffices() {
  const offices = useAppSelector(s => s.data.offices);
  const hydrated = useAppSelector(s => s.data.hydrated);

  const create = async (name: string, description?: string, created_by_code_id?: string | null) => {
    const { data, error } = await secureWrite('offices', 'insert', {
      name,
      description: description ?? null,
      created_by_code_id: created_by_code_id || null,
    });
    if (data) await patchDataCache('offices', 'INSERT', data);
    return { error };
  };

  const update = async (id: string, updates: Partial<Office>) => {
    const { data, error } = await secureWrite('offices', 'update', updates as Record<string, unknown>, id);
    if (data) await patchDataCache('offices', 'UPDATE', data);
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await secureWrite('offices', 'delete', null, id);
    if (!error) await patchDataCache('offices', 'DELETE', { id });
    return { error };
  };

  return { offices, loading: !hydrated, create, update, remove, refetch: syncFromNetwork };
}
