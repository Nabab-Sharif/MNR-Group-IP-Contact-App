import { Phone, Users, ChevronRight } from 'lucide-react';
import { PhoneEntry } from '@/types/phone';
import { sortPhoneEntriesByExtension } from '@/lib/phoneSort';

interface DepartmentCardProps {
  department: {
    id: string;
    name: string;
    entries: PhoneEntry[];
  };
  onClick: () => void;
}

const DepartmentCard = ({ department, onClick }: DepartmentCardProps) => {
  if (department.entries.length === 0) return null;

  const withExt = department.entries.filter(e => e.extension && e.extension.trim() !== '');
  const sorted = sortPhoneEntriesByExtension(department.entries);

  const displayEntries = sorted.slice(0, 4);
  const remaining = sorted.length - 4;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-green-300 dark:border-green-600 hover:shadow-lg hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 hover:-translate-y-1 p-5 cursor-pointer group"
    >
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{department.name}</h3>
      </div>

      {/* Stats: Ext and Emp */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
          <Phone className="w-3 h-3 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{withExt.length}</span>
          <span className="text-[10px] text-slate-500">Ext</span>
        </span>
        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
          <Users className="w-3 h-3 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{department.entries.length}</span>
          <span className="text-[10px] text-slate-500">Emp</span>
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        {displayEntries.map(entry => {
          const hasExt = entry.extension && entry.extension.trim() !== '';
          return (
            <div key={entry.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 hover:border-green-400 dark:hover:border-green-500 transition-colors">
              {hasExt ? (
                <span className="text-green-700 dark:text-green-400 font-bold text-xs min-w-[36px] bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-center">{entry.extension}</span>
              ) : (
                <span className="ext-inactive min-w-[36px] px-1.5 py-0.5 rounded text-center text-xs font-bold hidden"></span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-50 truncate">{entry.name}</p>
                {entry.designation && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{entry.designation}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <p className="text-green-600 dark:text-green-400 text-xs font-semibold mb-2">+{remaining} more</p>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
      </div>
    </div>
  );
};

export default DepartmentCard;
