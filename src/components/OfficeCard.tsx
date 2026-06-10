import { Users, Phone, Layers } from 'lucide-react';
import { PhoneEntry, Department } from '@/types/phone';
import logo from '@/assets/logo.jpg';
import { sortPhoneEntriesByExtension } from '@/lib/phoneSort';

interface OfficeCardProps {
  office: {
    id: string;
    name: string;
    description?: string | null;
    departmentCount: number;
    entryCount: number;
    previewEntries: PhoneEntry[];
  };
  onClick: () => void;
  onEntryClick?: (entry: PhoneEntry) => void;
  showAll?: boolean;
  departments?: Department[];
  isSearching?: boolean;
}

const OfficeCard = ({ office, onClick, onEntryClick, showAll = false, departments = [], isSearching = false }: OfficeCardProps) => {
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || '';
  if (office.entryCount === 0) return null;

  const withExt = office.previewEntries.filter(e => e.extension && e.extension.trim() !== '');
  const sortedEntries = sortPhoneEntriesByExtension(office.previewEntries);

  const entriesToShow = showAll ? sortedEntries : sortedEntries.slice(0, 5);
  const deptCount = new Set(office.previewEntries.map(e => e.department_id)).size;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-orange-400 dark:border-orange-500 flex flex-col p-6 cursor-pointer group min-h-80 hover:shadow-xl hover:border-orange-500 dark:hover:border-orange-400 transition-all"
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
        <img src={logo} alt="MNR Group" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate flex-1">{office.name}</h3>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-5 flex-wrap">
        <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
          <Phone className="w-3 h-3 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{withExt.length}</span>
          <span className="text-[10px]">Ext</span>
        </span>
        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
          <Users className="w-3 h-3 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{office.previewEntries.length}</span>
          <span className="text-[10px]">Emp</span>
        </span>
        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
          <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{deptCount}</span>
          <span className="text-[10px]">Dept</span>
        </span>
      </div>

      <div className="space-y-2 w-full">
        {entriesToShow.map((entry) => {
          const hasExt = entry.extension && entry.extension.trim() !== '';
          if (!isSearching && !hasExt) return null;
          const deptName = getDeptName(entry.department_id);
          const entryContent = (
            <>
              {hasExt ? (
                <span className="text-orange-600 dark:text-orange-400 font-bold text-sm min-w-[40px] bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded text-center">{entry.extension}</span>
              ) : (
                <span className="ext-inactive font-bold text-sm min-w-[40px] px-2 py-1 rounded text-center hidden"></span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{entry.name}</p>
                {entry.designation && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{entry.designation}</p>
                )}
                {deptName && (
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">{deptName}</p>
                )}
              </div>
            </>
          );

          return onEntryClick ? (
            <button
              key={entry.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEntryClick(entry);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-left transition-colors hover:border-orange-400 dark:border-orange-800 dark:bg-orange-900/10 dark:hover:border-orange-500"
            >
              {entryContent}
            </button>
          ) : (
            <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 transition-colors hover:border-orange-400 dark:hover:border-orange-500">
              {entryContent}
            </div>
          );
        })}
      </div>

      {!showAll && !isSearching && withExt.length > 5 && (
        <p className="text-orange-600 dark:text-orange-400 text-sm mt-3 font-semibold">
          +{withExt.length - 5} more extensions
        </p>
      )}
      {!showAll && isSearching && sortedEntries.length > 5 && (
        <p className="text-orange-600 dark:text-orange-400 text-sm mt-3 font-semibold">
          +{sortedEntries.length - 5} more results
        </p>
      )}
    </div>
  );
};

export default OfficeCard;
