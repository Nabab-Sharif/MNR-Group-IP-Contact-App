import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { saveDataCache, loadDataCache, isOnline, hasDataCacheMarker, mergeById, patchDataCache, subscribeDataCache, DataCache } from '@/lib/offlineDb';

interface OfficeWithStats extends Office {
  departmentCount: number;
  entryCount: number;
  previewEntries: PhoneEntry[];
}

function buildOfficeStats(allOffices: Office[], allDepts: Department[], allEntries: PhoneEntry[], search?: string, statusFilter?: string): OfficeWithStats[] {
  let entries = [...allEntries];
  if (statusFilter && statusFilter !== 'all') entries = entries.filter(e => e.status === statusFilter);

  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .replace(/\bdepartment\b/g, '')
      .replace(/\bdept\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const deptNameMap = new Map<string, string>();
  allDepts.forEach(d => deptNameMap.set(d.id, d.name));

  if (search?.trim()) {
    const q = normalizeSearch(search);
    const matchingDeptIds = new Set(
      allDepts.filter(d => normalizeSearch(d.name).includes(q)).map(d => d.id)
    );

    if (matchingDeptIds.size > 0) {
      entries = entries.filter(e => matchingDeptIds.has(e.department_id));
    } else {
      entries = entries.filter(e =>
        e.extension.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q)
      );
    }
  }

  const deptToOffice = new Map<string, string>();
  allDepts.forEach(d => deptToOffice.set(d.id, d.office_id));

  const officeEntries = new Map<string, PhoneEntry[]>();
  entries.forEach(e => {
    const officeId = deptToOffice.get(e.department_id);
    if (officeId) {
      if (!officeEntries.has(officeId)) officeEntries.set(officeId, []);
      officeEntries.get(officeId)!.push(e);
    }
  });

  return allOffices.map(office => {
    const officeDepts = allDepts.filter(d => d.office_id === office.id);
    const ents = officeEntries.get(office.id) || [];
    let matchesSearch = true;
    if (search?.trim()) {
      const q = search.toLowerCase();
      matchesSearch = office.name.toLowerCase().includes(q) || officeDepts.some(d => d.name.toLowerCase().includes(q)) || ents.length > 0;
    }
    if (!matchesSearch && search?.trim()) return null;
    return { ...office, departmentCount: officeDepts.length, entryCount: ents.length, previewEntries: ents };
  }).filter(Boolean) as OfficeWithStats[];
}

// Module-level in-memory cache — survives across component mounts in the same session
let memoryCache: { offices: Office[]; depts: Department[]; entries: PhoneEntry[] } | null = null;

export function useAllData(search?: string, statusFilter?: string) {
  const [offices, setOffices] = useState<OfficeWithStats[]>(() =>
    memoryCache ? buildOfficeStats(memoryCache.offices, memoryCache.depts, memoryCache.entries, search, statusFilter) : []
  );
  const [departments, setDepartments] = useState<Department[]>(() => memoryCache?.depts || []);
  const [entries, setEntries] = useState<PhoneEntry[]>(() => memoryCache?.entries || []);
  const [loading, setLoading] = useState(!memoryCache);
  const [allowNetworkSync, setAllowNetworkSync] = useState(isOnline());
  const rawDataRef = useRef<{ offices: Office[]; depts: Department[]; entries: PhoneEntry[] } | null>(memoryCache);
  const isCheckingCacheRef = useRef(true);
  const didInitialNetworkSyncRef = useRef(false);
  const searchRef = useRef(search);
  const statusFilterRef = useRef(statusFilter);

  const applyCache = useCallback((cache: DataCache) => {
    const nextCache = { offices: cache.offices as Office[], depts: cache.depts as Department[], entries: cache.entries as PhoneEntry[] };
    memoryCache = nextCache;
    rawDataRef.current = nextCache;
    setDepartments(nextCache.depts);
    setEntries(nextCache.entries);
    setOffices(buildOfficeStats(nextCache.offices, nextCache.depts, nextCache.entries, searchRef.current, statusFilterRef.current));
    setLoading(false);
  }, []);

  useEffect(() => {
    searchRef.current = search;
    statusFilterRef.current = statusFilter;
  }, [search, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // If memory cache is hit, show instantly and keep realtime/background sync alive
      if (memoryCache) {
        if (isMounted) {
          isCheckingCacheRef.current = false;
          setLoading(false);
          setAllowNetworkSync(isOnline());
        }
        return;
      }

      try {
        const cached = await loadDataCache();
        if (cached && cached.offices.length > 0) {
          if (!isMounted) return;
          isCheckingCacheRef.current = false;
          applyCache(cached);
          setAllowNetworkSync(isOnline());
          console.log('✅ IndexedDB data found — instant display, realtime sync enabled silently');
          return;
        }
      } catch (err) {
        console.error('IndexedDB load failed:', err);
      }

      if (!isMounted) return;
      isCheckingCacheRef.current = false;

      if (!isOnline()) {
        if (!isMounted) return;
        setAllowNetworkSync(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [officesRes, deptsRes, entriesRes] = await Promise.all([
          supabase.from('offices').select('*').order('created_at', { ascending: true }),
          supabase.from('departments').select('*').order('created_at', { ascending: true }),
          supabase.from('phone_entries').select('*').order('created_at', { ascending: true }),
        ]);

        const allOffices = officesRes.data || [];
        const allDepts = deptsRes.data || [];
        const allEntries = entriesRes.data || [];

        await saveDataCache(allOffices, allDepts, allEntries);

        if (!isMounted) return;
        applyCache({ offices: allOffices, depts: allDepts, entries: allEntries });
        setAllowNetworkSync(true);
        console.log('🔄 First visit: fetched from backend & saved to IndexedDB');
      } catch {
        if (!isMounted) return;
        console.log('⚠️ Backend fetch failed');
        setAllowNetworkSync(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [applyCache]);

  useEffect(() => subscribeDataCache(applyCache), [applyCache]);

  useEffect(() => {
    if (rawDataRef.current) {
      const { offices: allOffices, depts, entries } = rawDataRef.current;
      setOffices(buildOfficeStats(allOffices, depts, entries, search, statusFilter));
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const handleOnline = () => setAllowNetworkSync(true);
    const handleOffline = () => setAllowNetworkSync(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncFromNetwork = useCallback(async () => {
    if (!allowNetworkSync || !isOnline()) return;

    try {
      const [officesRes, deptsRes, entriesRes] = await Promise.all([
        supabase.from('offices').select('*').order('created_at', { ascending: true }),
        supabase.from('departments').select('*').order('created_at', { ascending: true }),
        supabase.from('phone_entries').select('*').order('created_at', { ascending: true }),
      ]);

      const incomingOffices = officesRes.data || [];
      const incomingDepts = deptsRes.data || [];
      const incomingEntries = entriesRes.data || [];

      const prev = rawDataRef.current || { offices: [], depts: [], entries: [] };
      const officesMerge = mergeById(prev.offices, incomingOffices);
      const deptsMerge = mergeById(prev.depts, incomingDepts);
      const entriesMerge = mergeById(prev.entries, incomingEntries);

      if (!officesMerge.changed && !deptsMerge.changed && !entriesMerge.changed) return;

      const allOffices = officesMerge.merged;
      const allDepts = deptsMerge.merged;
      const allEntries = entriesMerge.merged;

      await saveDataCache(allOffices, allDepts, allEntries);
      applyCache({ offices: allOffices, depts: allDepts, entries: allEntries });
    } catch {
      // Silent fail
    }
  }, [allowNetworkSync, applyCache]);

  useEffect(() => {
    if (!allowNetworkSync || !isOnline()) return;

    if (!didInitialNetworkSyncRef.current) {
      didInitialNetworkSyncRef.current = true;
      syncFromNetwork();
    }

    const applyRealtimeChange = async (table: 'offices' | 'departments' | 'phone_entries', payload: any) => {
      const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
      const row = eventType === 'DELETE' ? payload.old : payload.new;
      await patchDataCache(table, eventType, row);
    };

    const ch1 = supabase.channel('all-offices').on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, payload => applyRealtimeChange('offices', payload)).subscribe();
    const ch2 = supabase.channel('all-depts').on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, payload => applyRealtimeChange('departments', payload)).subscribe();
    const ch3 = supabase.channel('all-entries').on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, payload => applyRealtimeChange('phone_entries', payload)).subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [allowNetworkSync, syncFromNetwork]);

  return { offices, departments, entries, loading, refetch: syncFromNetwork };
}
