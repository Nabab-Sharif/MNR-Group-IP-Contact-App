import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/phone';
import { loadDataCache, saveDataCache, isOnline, patchDataCache, subscribeDataCache, DataCache } from '@/lib/offlineDb';

// Module-level cache that persists across component mounts in the same session
let departmentsMemoryCache: Department[] | null = null;

export function useDepartments(officeId?: string) {
  const [departments, setDepartments] = useState<Department[]>(() => 
    departmentsMemoryCache ? 
      (officeId ? departmentsMemoryCache.filter(d => d.office_id === officeId) : departmentsMemoryCache) 
      : []
  );
  const [loading, setLoading] = useState(!departmentsMemoryCache && isOnline());

  const fetch = useCallback(async () => {
    let q = supabase.from('departments').select('*').order('created_at', { ascending: true });
    if (officeId) q = q.eq('office_id', officeId);
    const { data } = await q;
    if (data) {
      if (!officeId) {
        // Only cache full list, not filtered lists
        departmentsMemoryCache = data;
        // Save to IndexedDB for persistence
        const cached = await loadDataCache();
        if (cached) {
          await saveDataCache(cached.offices, data, cached.entries);
        }
      }
      setDepartments(data);
    }
    setLoading(false);
  }, [officeId]);

  useEffect(() => {
    let isMounted = true;

    const loadDepts = async () => {
      // If memory cache is already populated and we're not filtering by office, skip everything
      if (departmentsMemoryCache && !officeId) {
        if (isMounted) {
          setDepartments(departmentsMemoryCache);
          setLoading(false);
        }
        return;
      }

      try {
        // Try to load from IndexedDB first
        const cached = await loadDataCache();
        if (cached && cached.depts.length > 0) {
          if (!isMounted) return;
          departmentsMemoryCache = cached.depts;
          const filtered = officeId ? cached.depts.filter(d => d.office_id === officeId) : cached.depts;
          setDepartments(filtered);
          setLoading(false);
          console.log('✅ Departments loaded from IndexedDB cache (instant)');
          return;
        }
      } catch (err) {
        console.error('IndexedDB load failed:', err);
      }

      // If offline or no cache, load from Supabase
      if (!isOnline()) {
        if (!isMounted) return;
        setLoading(false);
        return;
      }

      if (isMounted) setLoading(true);
      await fetch();
      if (isMounted) {
        console.log('🔄 First visit: departments fetched from Supabase');
      }
    };

    loadDepts();

    const unsubscribeCache = subscribeDataCache((cache: DataCache) => {
      departmentsMemoryCache = cache.depts as Department[];
      const filtered = officeId ? departmentsMemoryCache.filter(d => d.office_id === officeId) : departmentsMemoryCache;
      setDepartments(filtered);
      setLoading(false);
    });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`departments-${officeId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, payload => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = eventType === 'DELETE' ? payload.old : payload.new;
        patchDataCache('departments', eventType, row);
      })
      .subscribe();

    return () => {
      isMounted = false;
      unsubscribeCache();
      supabase.removeChannel(channel);
    };
  }, [fetch, officeId]);

  const create = async (office_id: string, name: string, description?: string, created_by_code_id?: string | null) => {
    const { data, error } = await supabase.from('departments').insert({ office_id, name, description, created_by_code_id: created_by_code_id || null } as any).select().single();
    if (data) await patchDataCache('departments', 'INSERT', data);
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<Department>) => {
    const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();
    if (data) await patchDataCache('departments', 'UPDATE', data);
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) await patchDataCache('departments', 'DELETE', { id });
    return { error: error?.message || null };
  };

  return { departments, loading, create, update, remove, refetch: fetch };
}
