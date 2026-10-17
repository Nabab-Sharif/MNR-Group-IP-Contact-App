import { useMemo } from 'react';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { useAppSelector } from '@/store';
import { syncFromNetwork } from '@/store/dataSync';

interface OfficeWithStats extends Office {
  departmentCount: number;
  entryCount: number;
  previewEntries: PhoneEntry[];
}

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bdepartment\b/g, '')
    .replace(/\bdept\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function buildOfficeStats(
  allOffices: Office[],
  allDepts: Department[],
  allEntries: PhoneEntry[],
  search?: string,
  statusFilter?: string
): OfficeWithStats[] {
  let entries = [...allEntries];
  if (statusFilter && statusFilter !== 'all') entries = entries.filter(e => e.status === statusFilter);

  if (search?.trim()) {
    const q = normalizeSearch(search);
    const matchingDeptIds = new Set(allDepts.filter(d => normalizeSearch(d.name).includes(q)).map(d => d.id));

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
    if (search?.trim()) {
      const q = search.toLowerCase();
      const matchesSearch =
        office.name.toLowerCase().includes(q) ||
        officeDepts.some(d => d.name.toLowerCase().includes(q)) ||
        ents.length > 0;
      if (!matchesSearch) return null;
    }
    return { ...office, departmentCount: officeDepts.length, entryCount: ents.length, previewEntries: ents };
  }).filter(Boolean) as OfficeWithStats[];
}

export function useAllData(search?: string, statusFilter?: string) {
  const allOffices = useAppSelector(s => s.data.offices);
  const departments = useAppSelector(s => s.data.depts);
  const entries = useAppSelector(s => s.data.entries);
  const hydrated = useAppSelector(s => s.data.hydrated);

  const offices = useMemo(
    () => buildOfficeStats(allOffices, departments, entries, search, statusFilter),
    [allOffices, departments, entries, search, statusFilter]
  );

  return { offices, departments, entries, loading: !hydrated, refetch: syncFromNetwork };
}
