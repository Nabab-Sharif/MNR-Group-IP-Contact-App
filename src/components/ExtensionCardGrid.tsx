import { useState } from 'react';
import { PhoneEntry, Department } from '@/types/phone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone as PhoneIcon, Mail, User, Briefcase, Hash, MessageCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExtensionCardGridProps {
  entries: PhoneEntry[];
  title: string;
  departments?: Department[];
}

const formatPhoneForWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('880')) return '88' + cleaned;
  return cleaned;
};

const getEmailLink = (email: string): string => {
  if (email.includes('@outlook.') || email.includes('@hotmail.') || email.includes('@live.'))
    return `https://outlook.live.com/mail/0/compose?to=${encodeURIComponent(email)}`;
  if (email.includes('@gmail.'))
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  return `mailto:${email}`;
};

const ExtensionCardGrid = ({ entries, title, departments = [] }: ExtensionCardGridProps) => {
  const [selected, setSelected] = useState<PhoneEntry | null>(null);

  const getDepartmentName = (departmentId: string): string => {
    return departments.find(d => d.id === departmentId)?.name || '';
  };

  return (
    <>
      <div className="extension-card-grid-section mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="bg-white dark:bg-slate-700 rounded-2xl border-2 border-orange-200 dark:border-orange-700 p-3 cursor-pointer hover:border-orange-400 dark:hover:border-orange-400 hover:shadow-xl transition-all duration-300 group flex flex-col"
            >
              <div className="mb-2">
                <div className="inline-block bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                  {entry.extension}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-50 leading-snug line-clamp-2 flex-1">{entry.name}</p>
              {entry.designation && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{entry.designation}</p>
              )}
              {entry.email && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">{entry.email}</p>
              )}
              {getDepartmentName(entry.department_id) && (
                <div className="inline-block mt-2 px-1.5 py-0.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-md">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-200 line-clamp-1">{getDepartmentName(entry.department_id)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50 text-xl">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                    <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Extension</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{selected.extension}</p>
                  </div>
                </div>
                {selected.designation && (
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-lg">
                      <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Designation</p>
                      <p className="font-medium text-slate-900 dark:text-slate-50">{selected.designation}</p>
                    </div>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                      <PhoneIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Phone</p>
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`tel:${selected.phone}`} className="font-medium text-green-600 dark:text-green-400 hover:underline text-sm">Call</a>
                        <span className="text-slate-400">•</span>
                        <a href={`https://wa.me/${formatPhoneForWhatsApp(selected.phone)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline text-sm flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                        </a>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{selected.phone}</p>
                    </div>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Email</p>
                      <div className="flex items-center gap-2">
                        <a href={getEmailLink(selected.email)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm truncate">{selected.email}</a>
                        <a href={getEmailLink(selected.email)} target={selected.email.includes('@gmail.') ? '_blank' : undefined} rel={selected.email.includes('@gmail.') ? 'noopener noreferrer' : undefined} className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                          <Link2 className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selected.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'}`}>{selected.status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExtensionCardGrid;
