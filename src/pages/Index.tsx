import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OfficeCard from '@/components/OfficeCard';
import SearchBar, { SearchSuggestion } from '@/components/SearchBar';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllData } from '@/hooks/useAllData';
import { useToast } from '@/hooks/use-toast';
import { PhoneEntry } from '@/types/phone';
import { Building2, X, Copy, Mail, Users, Printer, Phone, Sparkles, Siren } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sortPhoneEntriesByExtension } from '@/lib/phoneSort';
import { isNewExtActive, isNewPhoneActive } from '@/lib/newFlags';



const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { permissions } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('all');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showNewPhoneOnly, setShowNewPhoneOnly] = useState(false);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') ?? '');
    setSelectedOffices(params.getAll('office'));
    setSelectedDeptName(params.get('dept') ?? 'all');
    setShowNewOnly(params.get('new') === '1');
    setShowNewPhoneOnly(params.get('newPhone') === '1');
    setShowEmergencyOnly(params.get('emergency') === '1');
    setHasRestoredFromUrl(true);
  }, [location.search]);

  useEffect(() => {
    if (!hasRestoredFromUrl) return;

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (selectedOffices.length > 0) {
      selectedOffices.forEach(id => params.append('office', id));
    }
    if (selectedDeptName !== 'all') params.set('dept', selectedDeptName);
    if (showNewOnly) params.set('new', '1');
    if (showNewPhoneOnly) params.set('newPhone', '1');
    if (showEmergencyOnly) params.set('emergency', '1');

    const nextSearch = params.toString();
    const currentSearch = location.search.replace(/^\?/, '');
    if (nextSearch === currentSearch) return;

    navigate({ pathname: '/', search: nextSearch ? `?${nextSearch}` : '' }, { replace: false });
  }, [search, selectedOffices, selectedDeptName, showNewOnly, showNewPhoneOnly, showEmergencyOnly, hasRestoredFromUrl, location.search, navigate]);

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

  const emergencyDeptIds = useMemo(
    () => new Set(departments.filter(d => (d as any).is_emergency).map(d => d.id)),
    [departments]
  );

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

    if (showNewOnly) {
      filteredEntries = filteredEntries.filter(entry => isNewExtActive(entry as any));
    }

    if (showNewPhoneOnly) {
      filteredEntries = filteredEntries.filter(entry => isNewPhoneActive(entry as any));
    }

    if (showEmergencyOnly) {
      filteredEntries = filteredEntries.filter(entry => emergencyDeptIds.has(entry.department_id));
    }

    return {
      ...office,
      previewEntries: filteredEntries,
      entryCount: filteredEntries.length,
    };
  }).filter(office => office.entryCount > 0);

  const hasFilters = search.trim() !== '' || selectedOffices.length > 0 || selectedDeptName !== 'all' || showNewOnly || showNewPhoneOnly || showEmergencyOnly;

  const newExtCount = useMemo(
    () => entries.filter(e => isNewExtActive(e as any)).length,
    [entries]
  );

  const newPhoneCount = useMemo(
    () => entries.filter(e => isNewPhoneActive(e as any)).length,
    [entries]
  );

  const emergencyCount = useMemo(
    () => entries.filter(e => emergencyDeptIds.has(e.department_id)).length,
    [entries, emergencyDeptIds]
  );

  const visibleEntries = useMemo(
    () => finalOffices.flatMap(o => o.previewEntries),
    [finalOffices]
  );

  const visibleEmails = useMemo(() => {
    const seen = new Map<string, string>();
    visibleEntries.forEach(e => {
      const mail = (e.email || '').trim();
      if (mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        const key = mail.toLowerCase();
        if (!seen.has(key)) seen.set(key, mail);
      }
    });
    return Array.from(seen.values());
  }, [visibleEntries]);

  const handleCopyEmails = async () => {
    if (visibleEmails.length === 0) {
      toast({ title: 'No emails found', description: 'None of the filtered users have an email address.' });
      return;
    }
    const text = visibleEmails.join('; ');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast({ title: 'Emails copied', description: `${visibleEmails.length} unique email address${visibleEmails.length > 1 ? 'es' : ''} copied to clipboard.` });
  };

  const handleSendEmail = () => {
    if (visibleEmails.length === 0) {
      toast({ title: 'No emails found', description: 'None of the filtered users have an email address.' });
      return;
    }
    window.location.href = `mailto:${visibleEmails.join(';')}`;
  };

  const handleCopyPhones = async () => {
    const phones: string[] = [];
    const seen = new Set<string>();
    visibleEntries.forEach(e => {
      const p = (e.phone || '').trim();
      if (p) {
        const key = p;
        if (!seen.has(key)) {
          seen.add(key);
          phones.push(p);
        }
      }
    });
    if (phones.length === 0) {
      toast({ title: 'No phone numbers found', description: 'None of the filtered users have a phone number.' });
      return;
    }
    const text = phones.join('; ');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast({ title: 'Phone numbers copied', description: `${phones.length} phone number${phones.length > 1 ? 's' : ''} copied to clipboard.` });
  };

  const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

  const openPrintWindow = (html: string) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Allow popups to print the directory.' });
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const buildSheetHtml = (
    title: string,
    valueHeader: string,
    scope: string,
    total: number,
    blocks: { office: string; rows: { value: string; name: string; designation: string; department: string }[] }[]
  ) => {
    const blockHtml = blocks.map(b => `
<section class="block">
  <h2>${esc(b.office)}</h2>
  <table>
    <thead><tr><th class="sl">Sl.No</th><th class="ext">${esc(valueHeader)}</th><th>User</th></tr></thead>
    <tbody>
      ${b.rows.map((r, i) => `<tr><td class="sl">${i + 1}</td><td class="ext">${esc(r.value)}</td><td><span class="nm">${esc(r.name)}</span>${r.designation ? `<span class="ds">, ${esc(r.designation)}</span>` : ''}${r.department ? `<span class="dp"> (${esc(r.department)})</span>` : ''}</td></tr>`).join('')}
    </tbody>
  </table>
</section>`).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff}
  body{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:6.5px}
  #sheet{width:210mm;height:297mm;padding:6mm;display:flex;flex-direction:column;overflow:hidden}
  header{text-align:center;margin-bottom:0.4em}
  header h1{font-size:2em;margin:0;font-weight:bold}
  header .sub{font-size:1.5em;font-weight:bold;margin-top:0.15em}
  header .addr{font-size:1.05em;margin-top:0.15em}
  .scope{font-size:1em;color:#334155;text-align:center;margin-bottom:0.6em}
  .grid{flex:1 1 auto;min-height:0;column-count:3;column-gap:6px;column-fill:auto;overflow:hidden}
  .block{break-inside:avoid;page-break-inside:avoid;display:inline-block;width:100%;margin-bottom:0.8em}
  .block h2{font-size:1.35em;text-align:center;margin:0 0 0.25em;font-weight:bold;text-decoration:underline}
  table{width:100%;border-collapse:collapse;font-size:1em;table-layout:fixed}
  th,td{border:1px solid #000;padding:0 2px;line-height:1.25;text-align:left;overflow:hidden;word-wrap:break-word}
  th{background:#dbeafe;text-align:center}
  td.sl,td.ext{text-align:center}
  th.sl,td.sl{width:2.6em}
  th.ext,td.ext{width:var(--vw,4.2em)}
  .ds{font-style:italic}
  .dp{color:#334155}
  @page{margin:0;size:A4 portrait}
  @media print{html,body{height:auto}#sheet{page-break-after:avoid;page-break-inside:avoid}}
</style></head><body>
<div id="sheet" style="--vw:${valueHeader === 'Phone' ? '7.5em' : '4.2em'}">
<header>
  <h1>MNR Group</h1>
  <div class="sub">${esc(title)}</div>
  <div class="addr">Head Office: House # 668, Road # 08, DOHS Baridhara, Dhaka-1206</div>
</header>
<div class="scope">${esc(scope)} &nbsp;|&nbsp; Total: ${total} &nbsp;|&nbsp; ${new Date().toLocaleString()}</div>
<div class="grid" id="grid">${blockHtml}</div>
</div>
<script>
window.onload=function(){
  var grid=document.getElementById('grid');
  // Shrink the base font size until every block flows inside the 3 columns
  // of the single A4 sheet (no second page).
  var f=9, guard=0;
  document.body.style.fontSize=f+'px';
  while(grid.scrollHeight>grid.clientHeight+1 && f>2.4 && guard<120){
    f-=0.15;guard++;
    document.body.style.fontSize=f+'px';
  }
  setTimeout(function(){window.print();},120);
}
<\/script>
</body></html>`;
  };



  const handlePrint = (kind: 'extension' | 'phone') => {
    const deptById = new Map(departments.map(d => [d.id, d]));
    const isExt = kind === 'extension';

    const blocks = finalOffices.map(office => {
      const source = isExt
        ? sortPhoneEntriesByExtension(office.previewEntries.filter(e => (e.extension || '').trim() !== ''))
        : office.previewEntries.filter(e => (e.phone || '').trim() !== '');
      const rows = source.map(e => ({
        value: ((isExt ? e.extension : e.phone) || '').trim(),
        name: e.name,
        designation: e.designation || '',
        department: deptById.get(e.department_id)?.name || '',
      }));
      return { office: office.name, rows };
    }).filter(b => b.rows.length > 0);

    const total = blocks.reduce((sum, b) => sum + b.rows.length, 0);
    if (total === 0) {
      toast({
        title: 'Nothing to print',
        description: isExt ? 'No extension numbers in the current filter.' : 'No phone numbers in the current filter.',
      });
      return;
    }

    const scope = [
      selectedOffice ? `Unit/Office: ${selectedOffice.name}` : 'Unit/Office: All',
      `Department: ${selectedDeptName === 'all' ? 'All' : selectedDeptName}`,
      search.trim() ? `Search: ${search.trim()}` : '',
    ].filter(Boolean).join(' | ');

    openPrintWindow(buildSheetHtml(
      isExt ? 'Listing of IP Phone Extension' : 'Listing of Phone Numbers',
      isExt ? 'Ext. No' : 'Phone',
      scope,
      total,
      blocks,
    ));
  };




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
    setShowNewOnly(false);
    setShowNewPhoneOnly(false);
    setShowEmergencyOnly(false);
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

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-4">
        <div className="mb-6 sm:mb-8">
          <div className="rounded-2xl p-2 sm:p-3 relative">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-1.5 lg:overflow-visible">
              <div className="w-full sm:flex-none sm:w-80 lg:w-72 lg:flex-shrink-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search</label>
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  suggestions={suggestions}
                  enableVoiceSearch
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

              <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-1.5 lg:justify-start lg:flex-shrink-0">
                <div className="flex flex-row flex-wrap gap-2 items-end lg:flex-nowrap lg:gap-1.5 lg:flex-shrink-0">
                  <div className="flex-1 min-w-0 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none sm:w-48 lg:w-48">
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

                  <div className="flex-1 min-w-0 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none sm:w-48 lg:w-48">
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

                </div>

                <div className="flex flex-row flex-wrap gap-1.5 items-end lg:flex-nowrap lg:gap-1.5 lg:flex-shrink-0">

                  {newExtCount > 0 && (
                    <div className="flex min-w-0 flex-1 items-end sm:flex-none">
                      <Button
                        variant={showNewOnly ? 'default' : 'outline'}
                        className="h-8 w-full min-w-0 rounded-lg px-1.5 text-[10px] whitespace-nowrap sm:h-9 sm:w-auto sm:px-3 sm:text-xs lg:h-10 lg:px-1.5 lg:text-[11px]"
                        onClick={() => setShowNewOnly(v => !v)}
                        title="Show only newly added extensions"
                      >
                        <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">New Ext</span>
                        <span className="ml-1 rounded px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{newExtCount}</span>
                      </Button>
                    </div>
                  )}

                  {newPhoneCount > 0 && (
                    <div className="flex min-w-0 flex-1 items-end sm:flex-none">
                      <Button
                        variant={showNewPhoneOnly ? 'default' : 'outline'}
                        className="h-8 w-full min-w-0 rounded-lg px-1.5 text-[10px] whitespace-nowrap sm:h-9 sm:w-auto sm:px-3 sm:text-xs lg:h-10 lg:px-1.5 lg:text-[11px]"
                        onClick={() => setShowNewPhoneOnly(v => !v)}
                        title="Show only users with newly added phone numbers"
                      >
                        <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">New Staff</span>
                        <span className="ml-1 rounded px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{newPhoneCount}</span>
                      </Button>
                    </div>
                  )}

                  {emergencyCount > 0 && (
                    <div className="flex items-end">
                      <Button
                        variant={showEmergencyOnly ? 'default' : 'outline'}
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={() => setShowEmergencyOnly(v => !v)}
                        title="Show only emergency department contacts"
                      >
                        <Siren className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1 text-red-600" />
                        <span className="hidden sm:inline">Emergency Call</span>
                        <span className="ml-1 rounded px-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{emergencyCount}</span>
                      </Button>
                    </div>
                  )}

                  {hasFilters && (
                    <Button
                      variant="outline"
                      className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 sm:px-3 lg:px-1.5 whitespace-nowrap flex-shrink-0"
                      onClick={handleClearFilters}
                    >
                      <X className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    </Button>
                  )}
                  <div className="flex flex-nowrap items-center justify-start gap-1.5 lg:overflow-visible lg:justify-end lg:flex-shrink-0">
                    {permissions.copyEmail && (
                      <Button
                        variant="outline"
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={handleCopyEmails}
                        title="Copy all emails (semicolon separated)"
                      >
                        <Copy className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Copy Emails</span>
                      </Button>
                    )}
                    {permissions.copyPhone && (
                      <Button
                        variant="outline"
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={handleCopyPhones}
                        title="Copy all phone numbers (semicolon separated)"
                      >
                        <Copy className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Copy Phones</span>
                      </Button>
                    )}
                    {permissions.printExt && (
                      <Button
                        variant="outline"
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={() => handlePrint('extension')}
                        title="Print extension list for current filter"
                      >
                        <Printer className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Ext Print</span>
                      </Button>
                    )}
                    {permissions.printPhone && (
                      <Button
                        variant="outline"
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={() => handlePrint('phone')}
                        title="Print phone list for current filter"
                      >
                        <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Phone Print</span>
                      </Button>
                    )}
                    {permissions.sendEmail && (
                      <Button
                        variant="outline"
                        className="h-8 sm:h-9 lg:h-10 text-xs lg:text-[11px] rounded-lg px-2 sm:px-3 lg:px-1.5 whitespace-nowrap"
                        onClick={handleSendEmail}
                        title="Open mail client with these recipients"
                      >
                        <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Send Email</span>
                      </Button>
                    )}
                    {(permissions.copyEmail || permissions.sendEmail) && (
                      <span className="hidden sm:inline-flex items-center gap-1 h-8 sm:h-9 px-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <Users className="w-3.5 h-3.5" />
                        {visibleEmails.length}/{visibleEntries.length}
                      </span>
                    )}
                  </div>
                </div>
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
                {finalOffices.map((office, index) => (
                  <OfficeCard
                    key={office.id}
                    office={office}
                    animationIndex={index}
                    onClick={() => navigateToOffice(office.id, office.previewEntries)}
                    onEntryClick={(entry) => navigateToEntry(office.id, office.previewEntries, entry)}
                    showAll={selectedDeptName !== 'all' || showNewOnly || showNewPhoneOnly || showEmergencyOnly}
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
              {finalOffices.map((office, index) => (
                <OfficeCard
                  key={office.id}
                  office={office}
                  animationIndex={index}
                  onClick={() => navigateToOffice(office.id, office.previewEntries)}
                  onEntryClick={(entry) => navigateToEntry(office.id, office.previewEntries, entry)}
                  showAll={selectedDeptName !== 'all' || showNewOnly || showNewPhoneOnly || showEmergencyOnly || selectedOffices.length === 1}
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
