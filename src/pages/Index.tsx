import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OfficeCard from '@/components/OfficeCard';
import SearchBar, { SearchSuggestion } from '@/components/SearchBar';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllData } from '@/hooks/useAllData';
import { PhoneEntry } from '@/types/phone';
import { Building2, X } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('all');

  const { offices, departments, entries, loading } = useAllData(search, 'all');

  const selectedOffice = selectedOffices.length === 1
    ? offices.find(o => o.id === selectedOffices[0])
    : null;

  const uniqueDeptNames = selectedOffice
    ? Array.from(new Set(
        departments
          .filter(d => selectedOffice.previewEntries.some(e => e.department_id === d.id))
          .map(d => d.name)
      )).sort()
    : Array.from(new Set(departments.map(d => d.name))).sort();

  const matchingDeptIds = selectedDeptName !== 'all'
    ? departments.filter(d => d.name === selectedDeptName).map(d => d.id)
    : [];

  const filteredOffices = selectedOffices.length === 0
    ? offices
    : offices.filter(office => selectedOffices.includes(office.id));

  const finalOffices = filteredOffices.map(office => {
    let filteredEntries = office.previewEntries;

    if (selectedDeptName !== 'all') {
      filteredEntries = filteredEntries.filter(entry => matchingDeptIds.includes(entry.department_id));
    }

    return {
      ...office,
      previewEntries: filteredEntries,
      entryCount: filteredEntries.length,
    };
  }).filter(office => office.entryCount > 0);

  const hasFilters = search.trim() !== '' || selectedOffices.length > 0 || selectedDeptName !== 'all';

  // Build search suggestions from all data
  const suggestions: SearchSuggestion[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const result: SearchSuggestion[] = [];
    const seen = new Set<string>();

    // Offices
    offices.forEach(o => {
      if (o.name.toLowerCase().includes(q) && !seen.has(`o-${o.id}`)) {
        seen.add(`o-${o.id}`);
        result.push({ id: `o-${o.id}`, label: o.name, sublabel: 'Office', type: 'office', value: o.name });
      }
    });

    // Departments (unique by name)
    const deptNames = new Set<string>();
    departments.forEach(d => {
      if (d.name.toLowerCase().includes(q) && !deptNames.has(d.name)) {
        deptNames.add(d.name);
        result.push({ id: `d-${d.name}`, label: d.name, sublabel: 'Department', type: 'department', value: d.name });
      }
    });

    const deptById = new Map(departments.map(d => [d.id, d]));
    const officeById = new Map(offices.map(o => [o.id, o]));

    // People & extensions from the live entries cache
    entries.forEach(e => {
        const key = `e-${e.id}`;
        if (seen.has(key)) return;
        const nameMatch = e.name.toLowerCase().includes(q);
        const extMatch = e.extension.toLowerCase().includes(q);
        const desigMatch = (e.designation || '').toLowerCase().includes(q);
        if (nameMatch || extMatch || desigMatch) {
          seen.add(key);
          const dept = deptById.get(e.department_id);
          const office = dept ? officeById.get(dept.office_id) : undefined;
          result.push({
            id: key,
            label: e.name,
            sublabel: office?.name,
            designation: e.designation || undefined,
            department: dept?.name || undefined,
            extension: e.extension && e.extension.trim() !== '' ? e.extension : undefined,
            type: extMatch && !nameMatch ? 'extension' : 'person',
            value: nameMatch || desigMatch ? e.name : e.extension,
          });
        }
    });

    return result;
  }, [search, offices, departments, entries]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedOffices([]);
    setSelectedDeptName('all');
  };

  const handleDeptFilterClick = (deptName: string) => {
    if (deptName === 'all') {
      setSelectedDeptName('all');
      return;
    }
    setSelectedDeptName(deptName);
  };

  const buildOfficeQueryString = (officeEntries: PhoneEntry[], entry?: PhoneEntry) => {
    const params = new URLSearchParams();
    const deptId = entry?.department_id ?? (
      selectedDeptName !== 'all'
        ? departments.find(d => d.name === selectedDeptName && officeEntries.some(e => e.department_id === d.id))?.id
        : null
    );

    if (deptId) params.set('dept', deptId);
    if (search.trim()) params.set('q', search.trim());
    if (entry) params.set('entry', entry.id);

    return params.toString();
  };

  const navigateToOffice = (officeId: string, officeEntries: PhoneEntry[]) => {
    const qs = buildOfficeQueryString(officeEntries);
    navigate(`/office/${officeId}${qs ? `?${qs}` : ''}`);
  };

  const navigateToEntry = (officeId: string, officeEntries: PhoneEntry[], entry: PhoneEntry) => {
    const qs = buildOfficeQueryString(officeEntries, entry);
    navigate(`/office/${officeId}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="rounded-2xl p-2 sm:p-3 relative">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="w-full sm:flex-none sm:w-80 lg:w-96">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search</label>
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  suggestions={suggestions}
                  onSelectSuggestion={(s) => {
                    if (s.type === 'office') {
                      const office = offices.find(o => o.name === s.value);
                      if (office) setSelectedOffices([office.id]);
                      setSearch('');
                    } else if (s.type === 'department') {
                      setSelectedDeptName(s.value);
                      setSearch('');
                    } else {
                      setSearch(s.value);
                    }
                  }}
                />
              </div>

              <div className="flex flex-row gap-2 items-end justify-end sm:contents">
              <div className="flex-1 sm:flex-none sm:w-48 lg:w-60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Office</label>
                <Select value={selectedOffices.length === 1 ? selectedOffices[0] : 'all'} onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedOffices([]);
                  } else {
                    setSelectedOffices([value]);
                  }
                  setSelectedDeptName('all');
                }}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent align="start" className="min-w-[180px] sm:w-60 lg:w-72">
                    <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Offices</SelectItem>
                    {offices.map(office => (
                      <SelectItem key={office.id} value={office.id} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 sm:flex-none sm:w-48 lg:w-60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dept</label>
                <Select value={selectedDeptName} onValueChange={handleDeptFilterClick}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent align="start" className="min-w-[180px] sm:w-60 lg:w-72">
                    <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Depts</SelectItem>
                    {uniqueDeptNames.map(name => (
                      <SelectItem key={name} value={name} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="outline"
                  className="h-8 sm:h-9 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 sm:px-3 whitespace-nowrap flex-shrink-0"
                  onClick={handleClearFilters}
                >
                  <X className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </Button>
              )}
              </div>
            </div>
          </div>
        </div>

        {selectedOffices.length === 0 && (
          <>
            {finalOffices.length === 0 && !loading ? (
              <div className="text-center py-16 sm:py-20">
                <div className="inline-block p-3 sm:p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-3 sm:mb-4">
                  <Building2 className="w-8 sm:w-12 h-8 sm:h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">No offices found</p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {finalOffices.map(office => (
                  <OfficeCard
                    key={office.id}
                    office={office}
                    onClick={() => navigateToOffice(office.id, office.previewEntries)}
                    onEntryClick={(entry) => navigateToEntry(office.id, office.previewEntries, entry)}
                    showAll={selectedDeptName !== 'all'}
                    departments={departments}
                    isSearching={search.trim() !== ''}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {selectedOffices.length === 1 && finalOffices.length > 0 && (
          <div>
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-slate-50">{finalOffices.length}</span> office
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {finalOffices.map(office => (
                <OfficeCard
                  key={office.id}
                  office={office}
                  onClick={() => navigateToOffice(office.id, office.previewEntries)}
                  onEntryClick={(entry) => navigateToEntry(office.id, office.previewEntries, entry)}
                  showAll={selectedDeptName !== 'all' || selectedOffices.length === 1}
                  departments={departments}
                  isSearching={search.trim() !== ''}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
