import { useMemo } from 'react';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { useAppSelector } from '@/store';

interface DeptWithEntries extends Department {
  entries: PhoneEntry[];
}

export function useOfficeDetail(officeId?: string) {
  const allOffices = useAppSelector(s => s.data.offices);
  const allDepts = useAppSelector(s => s.data.depts);
  const allEntries = useAppSelector(s => s.data.entries);
  const hydrated = useAppSelector(s => s.data.hydrated);

  const office = useMemo<Office | null>(
    () => (officeId ? allOffices.find(o => o.id === officeId) || null : null),
    [allOffices, officeId]
  );

  const departments = useMemo<DeptWithEntries[]>(() => {
    if (!officeId) return [];
    const depts = allDepts
      .filter(d => d.office_id === officeId)
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return depts.map(d => ({ ...d, entries: allEntries.filter(e => e.department_id === d.id) }));
  }, [allDepts, allEntries, officeId]);

  return { office, departments, loading: !hydrated };
}
