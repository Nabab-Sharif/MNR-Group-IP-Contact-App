import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { loadDataCache, saveDataCache, isOnline, hasDataCacheMarker, mergeById, patchDataCache, subscribeDataCache } from '@/lib/offlineDb';

interface DeptWithEntries extends Department {
  entries: PhoneEntry[];
}

// Module-level in-memory cache per office — instant on revisits in the same session
const officeMemoryCache = new Map<string, { office: Office | null; departments: DeptWithEntries[] }>();

export function useOfficeDetail(officeId?: string) {
  const initial = officeId ? officeMemoryCache.get(officeId) : undefined;
  const [office, setOffice] = useState<Office | null>(initial?.office ?? null);
  const [departments, setDepartments] = useState<DeptWithEntries[]>(initial?.departments ?? []);
  const [loading, setLoading] = useState(!initial);
  const [allowNetworkSync, setAllowNetworkSync] = useState(isOnline());
  const didInitialNetworkSyncRef = useRef(false);

  const buildFromCache = useCallback((cached: { offices: any[]; depts: any[]; entries: any[] }) => {
    if (!officeId) return;
    const off = cached.offices.find((o: any) => o.id === officeId) || null;
    const depts = cached.depts.filter((d: any) => d.office_id === officeId);
    depts.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const entries = cached.entries.filter((e: any) => depts.some((d: any) => d.id === e.department_id));
    const result = depts.map((d: any) => ({
      ...d,
      entries: entries.filter((e: any) => e.department_id === d.id),
    }));
    setOffice(off);
    setDepartments(result);
    officeMemoryCache.set(officeId, { office: off, departments: result });
  }, [officeId]);

  useEffect(() => {
    let isMounted = true;

    if (!officeId) {
      setOffice(null);
      setDepartments([]);
      setAllowNetworkSync(false);
      return;
    }

    // Memory cache hit — skip everything, show instantly
    if (officeMemoryCache.has(officeId)) {
      const cached = officeMemoryCache.get(officeId)!;
      setOffice(cached.office);
      setDepartments(cached.departments);
      setLoading(false);
      setAllowNetworkSync(isOnline());
      return;
    }

    const load = async () => {
      try {
        const cached = await loadDataCache();
        const hasOfficeInCache = cached?.offices?.some((item: any) => item.id === officeId);

        if (cached && hasOfficeInCache) {
          if (!isMounted) return;
          buildFromCache(cached);
          setAllowNetworkSync(isOnline());
          setLoading(false);
          console.log('✅ Office detail loaded from IndexedDB — realtime sync enabled silently');
          return;
        }
      } catch {
        // Silent fail and fallback to backend only if cache is missing
      }

      if (!isOnline()) {
        if (!isMounted) return;
        setAllowNetworkSync(false);
        setLoading(false);
        return;
      }

      try {
        const [officeRes, deptsRes, entriesRes] = await Promise.all([
          supabase.from('offices').select('*').eq('id', officeId).single(),
          supabase.from('departments').select('*').eq('office_id', officeId).order('created_at', { ascending: true }),
          supabase.from('phone_entries').select('*, departments!inner(office_id)').order('created_at', { ascending: true }),
        ]);

        if (!isMounted) return;
        const depts = deptsRes.data || [];
        const allEntries = (entriesRes.data || []) as (PhoneEntry & { departments: { office_id: string } })[];
        const officeEntries = allEntries.filter((entry: any) => entry.departments?.office_id === officeId);
        const result = depts.map(dept => ({
          ...dept,
          entries: officeEntries.filter(entry => entry.department_id === dept.id),
        }));
        setOffice(officeRes.data);
        setDepartments(result);
        officeMemoryCache.set(officeId, { office: officeRes.data, departments: result });
        setAllowNetworkSync(true);
      } catch {
        if (!isMounted) return;
        setAllowNetworkSync(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [officeId, buildFromCache]);

  const fetchNetwork = useCallback(async () => {
    if (!officeId || !allowNetworkSync || !isOnline()) return;

    try {
      const [officesRes, deptsRes, entriesRes] = await Promise.all([
        supabase.from('offices').select('*').order('created_at', { ascending: true }),
        supabase.from('departments').select('*').order('created_at', { ascending: true }),
        supabase.from('phone_entries').select('*').order('created_at', { ascending: true }),
      ]);

      const incomingOffices = officesRes.data || [];
      const incomingDepts = deptsRes.data || [];
      const incomingEntries = entriesRes.data || [];

      // Load existing cache for merge comparison
      const existing = await loadDataCache();
      const prev = existing || { offices: [], depts: [], entries: [] };
      const officesMerge = mergeById(prev.offices, incomingOffices);
      const deptsMerge = mergeById(prev.depts, incomingDepts);
      const entriesMerge = mergeById(prev.entries, incomingEntries);

      if (!officesMerge.changed && !deptsMerge.changed && !entriesMerge.changed) return;

      const allOffices = officesMerge.merged;
      const allDepts = deptsMerge.merged;
      const allEntries = entriesMerge.merged;

      await saveDataCache(allOffices, allDepts, allEntries);

      const currentOffice = allOffices.find(item => item.id === officeId) || null;
      const depts = allDepts.filter(dept => dept.office_id === officeId);
      depts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const result = depts.map(dept => ({
        ...dept,
        entries: allEntries.filter(entry => entry.department_id === dept.id),
      }));

      setOffice(currentOffice);
      setDepartments(result);
      officeMemoryCache.set(officeId, { office: currentOffice, departments: result });
    } catch {
      // Silent fail
    }
  }, [officeId, allowNetworkSync]);

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

  useEffect(() => {
    if (!officeId || !allowNetworkSync || !isOnline()) return;

    if (!didInitialNetworkSyncRef.current) {
      didInitialNetworkSyncRef.current = true;
      fetchNetwork();
    }

    const applyRealtimeChange = async (table: 'offices' | 'departments' | 'phone_entries', payload: any) => {
      const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
      const row = eventType === 'DELETE' ? payload.old : payload.new;
      await patchDataCache(table, eventType, row);
    };

    const ch1 = supabase.channel(`office-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, payload => applyRealtimeChange('offices', payload)).subscribe();
    const ch2 = supabase.channel(`office-depts-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, payload => applyRealtimeChange('departments', payload)).subscribe();
    const ch3 = supabase.channel(`office-entries-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, payload => applyRealtimeChange('phone_entries', payload)).subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetchNetwork, officeId, allowNetworkSync]);

  useEffect(() => {
    if (!officeId) return;
    return subscribeDataCache(cache => buildFromCache(cache));
  }, [officeId, buildFromCache]);

  return { office, departments, loading };
}
