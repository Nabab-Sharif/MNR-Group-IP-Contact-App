import { supabase } from '@/integrations/supabase/client';
import { store } from './index';
import { setData, setHydrated, setSyncing } from './dataSlice';
import { loadDataCache, saveDataCache, isOnline, mergeById, patchDataCache, subscribeDataCache } from '@/lib/offlineDb';
import type { Office, Department, PhoneEntry } from '@/types/phone';

let started = false;

/** Load IndexedDB cache into Redux before the first paint so data is instantly available. */
export async function hydrateStore() {
  try {
    const cached = await loadDataCache();
    if (cached) {
      store.dispatch(setData({
        offices: (cached.offices || []) as Office[],
        depts: (cached.depts || []) as Department[],
        entries: (cached.entries || []) as PhoneEntry[],
      }));
      return;
    }
  } catch {
    // ignore — fall through to network
  }
  store.dispatch(setHydrated(true));
}

async function fetchAll() {
  const [officesRes, deptsRes, entriesRes] = await Promise.all([
    supabase.from('offices').select('*').order('created_at', { ascending: true }),
    supabase.from('departments').select('*').order('created_at', { ascending: true }),
    supabase.from('phone_entries').select('*').order('created_at', { ascending: true }),
  ]);
  return {
    offices: (officesRes.data || []) as Office[],
    depts: (deptsRes.data || []) as Department[],
    entries: (entriesRes.data || []) as PhoneEntry[],
  };
}

/** Silent background refresh: merges only changed rows, never blocks the UI. */
export async function syncFromNetwork() {
  if (!isOnline()) return;
  store.dispatch(setSyncing(true));
  try {
    const incoming = await fetchAll();
    const prev = store.getState().data;
    const officesMerge = mergeById(prev.offices as any, incoming.offices as any);
    const deptsMerge = mergeById(prev.depts as any, incoming.depts as any);
    const entriesMerge = mergeById(prev.entries as any, incoming.entries as any);
    if (!officesMerge.changed && !deptsMerge.changed && !entriesMerge.changed) return;
    await saveDataCache(officesMerge.merged, deptsMerge.merged, entriesMerge.merged);
  } catch {
    // silent
  } finally {
    store.dispatch(setSyncing(false));
  }
}

/** Wire IndexedDB cache changes + realtime into the store. Safe to call once. */
export function startDataSync() {
  if (started) return;
  started = true;

  // Any cache write (local mutation, realtime patch, background sync) updates Redux.
  subscribeDataCache(cache => {
    store.dispatch(setData({
      offices: (cache.offices || []) as Office[],
      depts: (cache.depts || []) as Department[],
      entries: (cache.entries || []) as PhoneEntry[],
    }));
  });

  const onRealtime = (table: 'offices' | 'departments' | 'phone_entries') => (payload: any) => {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const row = eventType === 'DELETE' ? payload.old : payload.new;
    patchDataCache(table, eventType, row);
  };

  supabase.channel('rt-offices').on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, onRealtime('offices')).subscribe();
  supabase.channel('rt-departments').on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, onRealtime('departments')).subscribe();
  supabase.channel('rt-entries').on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, onRealtime('phone_entries')).subscribe();

  syncFromNetwork();
  window.addEventListener('online', () => syncFromNetwork());
}
