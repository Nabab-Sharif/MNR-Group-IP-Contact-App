import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PhoneEntry } from '@/types/phone';
import { loadDataCache, saveDataCache, isOnline, patchDataCache, subscribeDataCache, DataCache } from '@/lib/offlineDb';

// Module-level cache that persists across component mounts in the same session
let entriesMemoryCache: PhoneEntry[] | null = null;

export function usePhoneEntries(departmentId?: string) {
  const [entries, setEntries] = useState<PhoneEntry[]>(() => 
    entriesMemoryCache ? 
      (departmentId ? entriesMemoryCache.filter(e => e.department_id === departmentId) : entriesMemoryCache) 
      : []
  );
  const [loading, setLoading] = useState(!entriesMemoryCache && isOnline());
  const departmentIdRef = useRef(departmentId);

  const applyEntries = useCallback((allEntries: PhoneEntry[]) => {
    entriesMemoryCache = allEntries;
    const filtered = departmentIdRef.current ? allEntries.filter(e => e.department_id === departmentIdRef.current) : allEntries;
    setEntries(filtered);
    setLoading(false);
  }, []);

  useEffect(() => {
    departmentIdRef.current = departmentId;
  }, [departmentId]);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('phone_entries').select('*').order('created_at', { ascending: true });
    if (data) {
      const cached = await loadDataCache();
      if (cached) {
        await saveDataCache(cached.offices, cached.depts, data);
      }
      applyEntries(data);
    }
    setLoading(false);
  }, [applyEntries]);

  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      // If memory cache is already populated and we're not filtering by department, skip everything
      if (entriesMemoryCache && !departmentId) {
        if (isMounted) {
          setEntries(entriesMemoryCache);
          setLoading(false);
        }
        return;
      }

      try {
        // Try to load from IndexedDB first
        const cached = await loadDataCache();
        if (cached && cached.entries.length > 0) {
          if (!isMounted) return;
          applyEntries(cached.entries);
          console.log('✅ Phone entries loaded from IndexedDB cache (instant)');
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
        console.log('🔄 First visit: entries fetched from Supabase');
      }
    };

    loadEntries();

    const unsubscribeCache = subscribeDataCache((cache: DataCache) => applyEntries(cache.entries as PhoneEntry[]));

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`entries-${departmentId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, payload => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = eventType === 'DELETE' ? payload.old : payload.new;
        patchDataCache('phone_entries', eventType, row);
      })
      .subscribe();

    return () => {
      isMounted = false;
      unsubscribeCache();
      supabase.removeChannel(channel);
    };
  }, [fetch, departmentId, applyEntries]);

  const create = async (entry: { department_id: string; extension: string; name: string; designation?: string; phone?: string; email?: string; status?: string; created_by_code_id?: string | null }) => {
    const { data, error } = await supabase.from('phone_entries').insert(entry as any).select().single();
    if (data) await patchDataCache('phone_entries', 'INSERT', data);
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<PhoneEntry>) => {
    const { data, error } = await supabase.from('phone_entries').update(updates).eq('id', id).select().single();
    if (data) await patchDataCache('phone_entries', 'UPDATE', data);
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('phone_entries').delete().eq('id', id);
    if (!error) await patchDataCache('phone_entries', 'DELETE', { id });
    return { error: error?.message || null };
  };

  return { entries, loading, create, update, remove, refetch: fetch };
}
