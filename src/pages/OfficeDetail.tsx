import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DepartmentCard from '@/components/DepartmentCard';
import ExtensionTable from '@/components/ExtensionTable';
import SearchBar, { SearchSuggestion } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, X } from 'lucide-react';
import { useOfficeDetail } from '@/hooks/useOfficeDetail';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

const OfficeDetail = () => {
  const { officeId } = useParams<{ officeId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const { office, departments } = useOfficeDetail(officeId);

  const filteredDepts = useMemo(() => {
    let result = departments;
    if (departmentFilter !== 'all') {
      result = result.filter(d => d.id === departmentFilter);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.map(d => ({
      ...d,
      entries: d.entries.filter(e =>
        e.extension.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q)
      ),
    })).filter(d => d.entries.length > 0 || d.name.toLowerCase().includes(q));
  }, [departments, search, departmentFilter]);

  const searchResultEntries = useMemo(() => {
    if (!search.trim()) return [];
    return filteredDepts.flatMap(d => d.entries);
  }, [filteredDepts, search]);

  const suggestions: SearchSuggestion[] = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const sugg: SearchSuggestion[] = [];

    // Add department suggestions
    departments.forEach(dept => {
      if (dept.name.toLowerCase().includes(q)) {
        sugg.push({
          id: `dept-${dept.id}`,
          label: dept.name,
          sublabel: office?.name,
          type: 'department',
          value: dept.name,
        });
      }
    });

    // Add entry suggestions
    departments.forEach(dept => {
      dept.entries.forEach(entry => {
        if (
          entry.name.toLowerCase().includes(q) ||
          entry.extension.toLowerCase().includes(q) ||
          (entry.designation || '').toLowerCase().includes(q)
        ) {
          sugg.push({
            id: `entry-${entry.id}`,
            label: entry.name,
            sublabel: office?.name,
            department: dept.name,
            designation: entry.designation,
            extension: entry.extension,
            type: 'person',
            value: entry.name,
          });
        }
      });
    });

    return sugg.slice(0, 10); // Limit to 10 suggestions
  }, [search, departments, office]);

  const selectedDept = selectedDeptId ? filteredDepts.find(d => d.id === selectedDeptId) : null;
  const selectedEntryEntries = useMemo(() => {
    if (!selectedEntryId) return [];
    return departments.flatMap(d => d.entries.filter(e => e.id === selectedEntryId));
  }, [departments, selectedEntryId]);
  const selectedEntry = selectedEntryEntries[0] ?? null;

  useEffect(() => {
    const deptParam = searchParams.get('dept');
    setSelectedDeptId(deptParam);

    const qParam = searchParams.get('q');
    setSearch(qParam ?? '');

    const entryParam = searchParams.get('entry');
    setSelectedEntryId(entryParam);
  }, [searchParams, departments]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSelectedEntryId(null);
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'department') {
      const deptId = suggestion.id.replace('dept-', '');
      setSelectedDeptId(deptId);
      setSearch('');
      setSelectedEntryId(null);
    } else if (suggestion.type === 'person') {
      const entryId = suggestion.id.replace('entry-', '');
      setSelectedEntryId(entryId);
      setSearch('');
    }
  };

  const handleBack = () => {
    if (selectedEntryId) {
      setSelectedEntryId(null);
      return;
    }
    if (selectedDeptId) {
      setSelectedDeptId(null);
      return;
    }
    navigate('/');
  };

  useSwipeNavigation({ onSwipeRight: handleBack });

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header />
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-50 truncate">
                {office?.name || ''}
                {selectedDept && <span className="text-slate-500 dark:text-slate-400 font-normal"> / {selectedDept.name}</span>}
                {selectedEntry && <span className="text-slate-500 dark:text-slate-400 font-normal"> / {selectedEntry.name}</span>}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="back-button text-white p-1 sm:p-2 lg:p-3 h-auto flex-shrink-0 transition-all duration-300 rounded-lg shadow-lg hover:shadow-xl hover:scale-110"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </Button>
          </div>

          <div className="flex items-end justify-end gap-2">
            <div className="flex items-end gap-2 ml-auto">
              <div className="w-48 sm:w-64 lg:w-80">
                <SearchBar value={search} onChange={handleSearchChange} placeholder="Search..." suggestions={suggestions} onSelectSuggestion={handleSelectSuggestion} />
              </div>

              {!selectedDept && !selectedEntry && (
                <div className="w-28 sm:w-36">
                  <Select value={departmentFilter} onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setSelectedEntryId(null);
                  }}>
                    <SelectTrigger className="h-8 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent align="end" className="w-44">
                      <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Depts</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(search.trim() !== '' || departmentFilter !== 'all' || selectedEntryId) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-2"
                  onClick={() => { setSearch(''); setDepartmentFilter('all'); setSelectedEntryId(null); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {selectedEntry ? (
          <ExtensionTable entries={selectedEntryEntries} title={selectedEntry.name} departments={departments} />
        ) : selectedDept ? (
          <ExtensionTable entries={selectedDept.entries} title={selectedDept.name} departments={departments} />
        ) : search.trim() ? (
          <ExtensionTable entries={searchResultEntries} title={`Search results for "${search}"`} departments={departments} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredDepts.map(dept => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                onClick={() => setSelectedDeptId(dept.id)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OfficeDetail;
