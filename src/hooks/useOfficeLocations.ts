import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureWrite } from '@/lib/secureWrite';
import type { Tables } from '@/integrations/supabase/types';

export type OfficeLocation = Tables<'office_locations'>;

/** Locations belonging to an office (used for the entry Location dropdown). */
export function useOfficeLocations(officeId?: string) {
  const [all, setAll] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('office_locations')
      .select('*')
      .order('created_at', { ascending: true });
    setAll((data || []) as OfficeLocation[]);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const locations = useMemo(
    () => (officeId ? all.filter(l => l.office_id === officeId) : all),
    [all, officeId]
  );

  const create = async (office_id: string, name: string, created_by_code_id?: string | null) => {
    const { error } = await secureWrite('office_locations', 'insert', {
      office_id,
      name,
      created_by_code_id: created_by_code_id || null,
    });
    if (!error) await refetch();
    return { error };
  };

  const update = async (id: string, name: string) => {
    const { error } = await secureWrite('office_locations', 'update', { name }, id);
    if (!error) await refetch();
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await secureWrite('office_locations', 'delete', null, id);
    if (!error) await refetch();
    return { error };
  };

  return { locations, allLocations: all, loading, create, update, remove, refetch };
}
