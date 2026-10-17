import { useState, useMemo } from 'react';
import { PhoneEntry, Department } from '@/types/phone';
import { Phone as PhoneIcon, Mail, MessageCircle, Copy, Check, Link2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sortPhoneEntriesByExtension } from '@/lib/phoneSort';
import ShiftBadge from '@/components/ShiftBadge';
import ContactQrBadge from '@/components/ContactQrBadge';

interface ExtensionTableProps {
  entries: PhoneEntry[];
  title: string;
  departments?: Department[];
  hideHeader?: boolean;
  highlightEntryId?: string | null;
}

const formatPhoneForWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('880')) return '88' + cleaned;
  return cleaned;
};

const getEmailLink = (email: string): string => {
  if (email.includes('@mnr-ext.com') || email.includes('@mnrgroup.com') || email.includes('@mnrgroupbd.com')) {
    return `mailto:${email}`;
  } else if (email.includes('@outlook.') || email.includes('@hotmail.') || email.includes('@live.')) {
    return `https://outlook.live.com/mail/0/compose?to=${encodeURIComponent(email)}`;
  } else if (email.includes('@gmail.')) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  } else {
    return `mailto:${email}`;
  }
};

const ExtensionTable = ({ entries, title, departments = [], hideHeader = false, highlightEntryId = null }: ExtensionTableProps) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [openQrByEntry, setOpenQrByEntry] = useState<Record<string, 'phone' | 'whatsapp' | 'email' | null>>({});

  const sortedEntries = useMemo(() => {
    return sortPhoneEntriesByExtension(entries);
  }, [entries]);

  const getDepartmentName = (departmentId: string): string => {
    return departments.find(d => d.id === departmentId)?.name || 'N/A';
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(`${type}-${text}`);
    toast.success('Copied!');
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const toggleQr = (entryId: string, kind: 'phone' | 'whatsapp' | 'email') => {
    setOpenQrByEntry(prev => {
      const current = prev[entryId];
      return {
        ...prev,
        [entryId]: current === kind ? null : kind,
      };
    });
  };

  const renderExtensionBadge = (entry: PhoneEntry) => {
    const hasExt = entry.extension && entry.extension.trim() !== '';
    if (hasExt) {
      return (
        <div className="px-2.5 py-1.5 rounded-lg flex-shrink-0 shadow-lg text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}>
          <span className="font-bold text-sm block">{entry.extension}</span>
        </div>
      );
    }
    return (
      <div className="ext-inactive px-2.5 py-1.5 rounded-lg flex-shrink-0 hidden">
        <span className="font-bold text-sm block"></span>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
        {!hideHeader && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden bg-transparent">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
            <div className="relative">
              <h2 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/70 px-2 py-0.5 rounded-md text-xs sm:text-sm text-slate-900 dark:text-slate-200 font-semibold">
                  <Users className="w-3 h-3" />
                  {entries.length} Emp
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/70 px-2 py-0.5 rounded-md text-xs sm:text-sm text-slate-900 dark:text-slate-200 font-semibold">
                  <PhoneIcon className="w-3 h-3" />
                  {entries.filter(e => e.extension && e.extension.trim() !== '').length} Ext
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Card View */}
        <div className="hidden md:block p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedEntries.map(entry => {
              const isHighlighted = !!highlightEntryId && entry.id === highlightEntryId;
              return (
                <div
                  key={entry.id}
                  className={`bg-card dark:bg-slate-900 text-card-foreground dark:text-slate-50 rounded-2xl border-2 p-4 hover:shadow-2xl transition-all duration-300 group flex flex-col h-full ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]' : ''}`}
                  style={{ borderColor: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--accent) / 0.4)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-border">
                    {renderExtensionBadge(entry)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight line-clamp-2"><ShiftBadge shift={(entry as any).shift} className="mr-1 align-middle">{entry.name}</ShiftBadge></p>
                      {entry.designation && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.designation}</p>
                      )}
                      {getDepartmentName(entry.department_id) && (
                        <div className="inline-block mt-1 px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--accent) / 0.15)' }}>
                          <p className="text-xs font-semibold line-clamp-1" style={{ color: 'hsl(var(--accent))' }}>{getDepartmentName(entry.department_id)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {entry.phone && (
                      <div className="flex gap-1">
                        <a href={`tel:${entry.phone}`} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-gradient-to-r from-green-600 to-green-500 dark:from-green-700 dark:to-green-600 hover:from-green-700 hover:to-green-600 rounded-lg px-2 py-2 font-semibold transition-all shadow-sm hover:shadow-md">
                          <PhoneIcon className="w-3 h-3" /><span className="text-xs">Call</span>
                        </a>
                        <a href={`https://wa.me/${formatPhoneForWhatsApp(entry.phone)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 hover:from-emerald-600 hover:to-teal-600 rounded-lg px-2 py-2 font-semibold transition-all shadow-sm hover:shadow-md">
                          <MessageCircle className="w-3 h-3" /><span className="text-xs">WA</span>
                        </a>
                      </div>
                    )}
                    {(entry.phone || entry.email) && (
                      <div className="flex items-start gap-2 rounded-xl border border-slate-200/70 p-2 dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {entry.phone && (
                            <div className={`grid items-center gap-2 group/phone bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-2 py-1.5 border border-green-100 dark:border-green-800 ${openQrByEntry[entry.id] === 'phone' ? 'grid-cols-[minmax(0,1fr)_auto]' : openQrByEntry[entry.id] === 'whatsapp' ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)_auto]'}`}>
                              <div className={`flex items-center gap-1.5 flex-shrink-0 ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-start-1 row-start-1' : ''}`}>
                                <ContactQrBadge
                                  name={entry.name}
                                  kind="phone"
                                  value={entry.phone}
                                  size={120}
                                  className="!p-1.5"
                                  isOpen={openQrByEntry[entry.id] === 'phone'}
                                  onToggle={() => toggleQr(entry.id, 'phone')}
                                />
                              </div>
                              <div className={`flex min-w-0 justify-center ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-span-full row-start-2' : ''}`}>
                                <button onClick={() => handleCopy(entry.phone, 'phone')} className="text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 truncate text-center" title="Click to copy">{entry.phone}</button>
                              </div>
                              <div className={`flex items-center gap-1.5 flex-shrink-0 ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-start-2 row-start-1 justify-self-end' : ''}`}>
                                <ContactQrBadge
                                  name={entry.name}
                                  kind="whatsapp"
                                  value={entry.phone}
                                  size={120}
                                  className="!p-1.5"
                                  isOpen={openQrByEntry[entry.id] === 'whatsapp'}
                                  onToggle={() => toggleQr(entry.id, 'whatsapp')}
                                />
                              </div>
                            </div>
                          )}
                          {entry.email && (
                            <div className="flex flex-col gap-2 group/email bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg px-2 py-1.5 border border-blue-100 dark:border-blue-800">
                              <div className="flex items-center justify-center">
                                <ContactQrBadge
                                  name={entry.name}
                                  kind="email"
                                  value={entry.email}
                                  size={120}
                                  className="!p-1.5"
                                  isOpen={openQrByEntry[entry.id] === 'email'}
                                  onToggle={() => toggleQr(entry.id, 'email')}
                                />
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                                <button onClick={() => handleCopy(entry.email, 'email')} className="flex-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 truncate text-left" title="Click to copy">{entry.email}</button>
                                <a href={getEmailLink(entry.email)} target={entry.email.includes('@gmail.') ? '_blank' : undefined} rel={entry.email.includes('@gmail.') ? 'noopener noreferrer' : undefined} className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" title="Open email">
                                  <Link2 className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {sortedEntries.map(entry => {
              const isHighlighted = !!highlightEntryId && entry.id === highlightEntryId;
              return (
                <div
                  key={entry.id}
                  className={`bg-card dark:bg-slate-900 text-card-foreground dark:text-slate-50 rounded-2xl border-2 p-3 hover:shadow-lg transition-all duration-300 group flex flex-col h-full ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]' : ''}`}
                  style={{ borderColor: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--accent) / 0.4)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-border">
                    {renderExtensionBadge(entry)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight line-clamp-2"><ShiftBadge shift={(entry as any).shift} className="mr-1 align-middle">{entry.name}</ShiftBadge></p>
                      {entry.designation && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.designation}</p>
                      )}
                      {getDepartmentName(entry.department_id) && (
                        <div className="inline-block mt-1 px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--accent) / 0.15)' }}>
                          <p className="text-xs font-semibold line-clamp-1" style={{ color: 'hsl(var(--accent))' }}>{getDepartmentName(entry.department_id)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {entry.phone && (
                      <div className="flex gap-1">
                        <a href={`tel:${entry.phone}`} className="flex-1 flex items-center justify-center gap-0.5 text-xs text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg px-1.5 py-2 font-semibold transition-all shadow-sm hover:shadow-md">
                          <PhoneIcon className="w-3 h-3" /><span className="text-xs">Call</span>
                        </a>
                        <a href={`https://wa.me/${formatPhoneForWhatsApp(entry.phone)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-0.5 text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg px-1.5 py-2 font-semibold transition-all shadow-sm hover:shadow-md">
                          <MessageCircle className="w-3 h-3" /><span className="text-xs">WA</span>
                        </a>
                      </div>
                    )}
                    {(entry.phone || entry.email) && (
                      <div className="flex items-start gap-2 rounded-xl border border-slate-200/70 p-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {entry.phone && (
                            <div className={`grid items-center gap-1.5 group/phone bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-2 py-1 border border-green-100 dark:border-green-800 ${openQrByEntry[entry.id] === 'phone' ? 'grid-cols-[minmax(0,1fr)_auto]' : openQrByEntry[entry.id] === 'whatsapp' ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)_auto]'}`}>
                              <div className={`flex items-center gap-1 flex-shrink-0 ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-start-1 row-start-1' : ''}`}>
                                <ContactQrBadge name={entry.name} kind="phone" value={entry.phone} size={120} className="!p-1" isOpen={openQrByEntry[entry.id] === 'phone'} onToggle={() => toggleQr(entry.id, 'phone')} />
                              </div>
                              <div className={`flex min-w-0 justify-center ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-span-full row-start-2' : ''}`}>
                                <button onClick={() => handleCopy(entry.phone, 'phone')} className="text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 text-center truncate" title="Click to copy">{entry.phone}</button>
                              </div>
                              <div className={`flex items-center gap-1 flex-shrink-0 ${openQrByEntry[entry.id] === 'phone' || openQrByEntry[entry.id] === 'whatsapp' ? 'col-start-2 row-start-1 justify-self-end' : ''}`}>
                                <ContactQrBadge name={entry.name} kind="whatsapp" value={entry.phone} size={120} className="!p-1" isOpen={openQrByEntry[entry.id] === 'whatsapp'} onToggle={() => toggleQr(entry.id, 'whatsapp')} />
                              </div>
                            </div>
                          )}
                          {entry.email && (
                            <div className="flex flex-col gap-1.5 group/email bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg px-2 py-1 border border-blue-100 dark:border-blue-800">
                              <div className="flex items-center justify-center">
                                <ContactQrBadge name={entry.name} kind="email" value={entry.email} size={120} className="!p-1" />
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                                <button onClick={() => handleCopy(entry.email, 'email')} className="flex-1 text-xs text-blue-600 dark:text-blue-400 font-medium truncate text-left" title="Click to copy">{entry.email}</button>
                                <a href={getEmailLink(entry.email)} target={entry.email.includes('@gmail.') ? '_blank' : undefined} className="flex-shrink-0 text-blue-600 dark:text-blue-400 transition-colors" title="Open email">
                                  <Link2 className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">
            <PhoneIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No entries found</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ExtensionTable;
