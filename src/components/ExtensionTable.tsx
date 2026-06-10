import { useState, useMemo } from 'react';
import { PhoneEntry, Department } from '@/types/phone';
import { Phone as PhoneIcon, Mail, MessageCircle, Copy, Check, Link2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sortPhoneEntriesByExtension } from '@/lib/phoneSort';

interface ExtensionTableProps {
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

const ExtensionTable = ({ entries, title, departments = [] }: ExtensionTableProps) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

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
        <div className="header-gradient px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
          <div className="relative">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white">{title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs sm:text-sm text-white font-semibold">
                <Users className="w-3 h-3" />
                {entries.length} Emp
              </span>
              <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs sm:text-sm text-white font-semibold">
                <PhoneIcon className="w-3 h-3" />
                {entries.filter(e => e.extension && e.extension.trim() !== '').length} Ext
              </span>
            </div>
          </div>
        </div>
        
        {/* Desktop Card View */}
        <div className="hidden md:block p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-card text-card-foreground rounded-2xl border-2 p-4 hover:shadow-2xl transition-all duration-300 group flex flex-col h-full"
                style={{ borderColor: 'hsl(var(--accent) / 0.4)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-border">
                  {renderExtensionBadge(entry)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{entry.name}</p>
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

                <div className="space-y-2 mt-auto pt-2">
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
                    <div className="space-y-1">
                      {entry.phone && (
                        <div className="flex items-center gap-2 group/phone bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-2 py-1.5 border border-green-100 dark:border-green-800">
                          <PhoneIcon className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <button onClick={() => handleCopy(entry.phone, 'phone')} className="flex-1 text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 text-left truncate" title="Click to copy">{entry.phone}</button>
                          <button onClick={() => handleCopy(entry.phone, 'phone')} className="opacity-0 group-hover/phone:opacity-100 transition-opacity p-1 hover:bg-green-200 dark:hover:bg-green-700 rounded" title="Copy phone">
                            {copiedItem === `phone-${entry.phone}` ? <Check className="w-3 h-3 text-green-600 dark:text-green-400" /> : <Copy className="w-3 h-3 text-slate-500 dark:text-slate-500" />}
                          </button>
                        </div>
                      )}
                      {entry.email && (
                        <div className="flex items-center gap-2 group/email bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg px-2 py-1.5 border border-blue-100 dark:border-blue-800">
                          <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <button onClick={() => handleCopy(entry.email, 'email')} className="flex-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 truncate text-left" title="Click to copy">{entry.email}</button>
                          <a href={getEmailLink(entry.email)} target={entry.email.includes('@gmail.') ? '_blank' : undefined} rel={entry.email.includes('@gmail.') ? 'noopener noreferrer' : undefined} className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" title="Open email">
                            <Link2 className="w-3 h-3" />
                          </a>
                          <button onClick={() => handleCopy(entry.email, 'email')} className="opacity-0 group-hover/email:opacity-100 transition-opacity p-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded flex-shrink-0" title="Copy email">
                            {copiedItem === `email-${entry.email}` ? <Check className="w-3 h-3 text-green-600 dark:text-green-400" /> : <Copy className="w-3 h-3 text-slate-500 dark:text-slate-500" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {sortedEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-card text-card-foreground rounded-2xl border-2 p-3 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                style={{ borderColor: 'hsl(var(--accent) / 0.4)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-border">
                  {renderExtensionBadge(entry)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{entry.name}</p>
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

                <div className="space-y-1.5 mt-auto pt-2">
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
                  {entry.phone && (
                    <div className="flex items-center gap-1.5 group/phone bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg px-2 py-1 border border-green-100 dark:border-green-800">
                      <PhoneIcon className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <button onClick={() => handleCopy(entry.phone, 'phone')} className="flex-1 text-xs text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 text-left truncate" title="Click to copy">{entry.phone}</button>
                      <button onClick={() => handleCopy(entry.phone, 'phone')} className="p-0.5 hover:bg-green-200 dark:hover:bg-green-700 rounded" title="Copy">
                        {copiedItem === `phone-${entry.phone}` ? <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                      </button>
                    </div>
                  )}
                  {entry.email && (
                    <div className="flex items-center gap-1.5 group/email bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg px-2 py-1 border border-blue-100 dark:border-blue-800">
                      <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <button onClick={() => handleCopy(entry.email, 'email')} className="flex-1 text-xs text-blue-600 dark:text-blue-400 font-medium truncate text-left" title="Click to copy">{entry.email}</button>
                      <a href={getEmailLink(entry.email)} target={entry.email.includes('@gmail.') ? '_blank' : undefined} className="flex-shrink-0 text-blue-600 dark:text-blue-400 transition-colors" title="Open email">
                        <Link2 className="w-3 h-3" />
                      </a>
                      <button onClick={() => handleCopy(entry.email, 'email')} className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-700 rounded flex-shrink-0" title="Copy">
                        {copiedItem === `email-${entry.email}` ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
