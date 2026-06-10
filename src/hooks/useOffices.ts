import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office } from '@/types/phone';
import { loadDataCache, saveDataCache, isOnline, patchDataCache, subscribeDataCache, DataCache } from '@/lib/offlineDb';

// Module-level cache that persists across component mounts in the same session
let officesMemoryCache: Office[] | null = null;

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>(() => officesMemoryCache || []);
  const [loading, setLoading] = useState(!officesMemoryCache && isOnline());

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('offices').select('*').order('created_at', { ascending: true });
    if (data) {
      officesMemoryCache = data;
      setOffices(data);
      // Save to IndexedDB for persistence
      const cached = await loadDataCache();
      if (cached) {
        await saveDataCache(data, cached.depts, cached.entries);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadOffices = async () => {
      // If memory cache is already populated, skip everything
      if (officesMemoryCache) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Try to load from IndexedDB first
        const cached = await loadDataCache();
        if (cached && cached.offices.length > 0) {
          if (!isMounted) return;
          officesMemoryCache = cached.offices;
          setOffices(cached.offices);
          setLoading(false);
          console.log('✅ Offices loaded from IndexedDB cache (instant)');
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
        console.log('🔄 First visit: offices fetched from Supabase');
      }
    };

    loadOffices();

    const unsubscribeCache = subscribeDataCache((cache: DataCache) => {
      officesMemoryCache = cache.offices as Office[];
      setOffices(officesMemoryCache);
      setLoading(false);
    });

    // Subscribe to realtime changes
    const channel = supabase
      .channel('offices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, payload => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = eventType === 'DELETE' ? payload.old : payload.new;
        patchDataCache('offices', eventType, row);
      })
      .subscribe();

    return () => {
      isMounted = false;
      unsubscribeCache();
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  const create = async (name: string, description?: string, created_by_code_id?: string | null) => {
    const { data, error } = await supabase.from('offices').insert({ name, description, created_by_code_id: created_by_code_id || null } as any).select().single();
    if (data) await patchDataCache('offices', 'INSERT', data);
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<Office>) => {
    const { data, error } = await supabase.from('offices').update(updates).eq('id', id).select().single();
    if (data) await patchDataCache('offices', 'UPDATE', data);
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('offices').delete().eq('id', id);
    if (!error) await patchDataCache('offices', 'DELETE', { id });
    return { error: error?.message || null };
  };

  return { offices, loading, create, update, remove, refetch: fetch };
}
