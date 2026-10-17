import { useNavigate } from 'react-router-dom';
import { Bell, Pencil, Plus, Trash2, User, Clock, X, CheckCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntryLogs, EntryEditLog } from '@/hooks/useEntryLogs';
import { useAllData } from '@/hooks/useAllData';
import { todayBD, formatBDDate } from '@/lib/newFlags';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEntryAdminRoute } from '@/lib/shiftNotifications';

const tomorrowBD = (): string => {
  const d = new Date(`${todayBD()}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const fieldLabels: Record<string, string> = {
  extension: 'Extension',
  name: 'Name',
  designation: 'Designation',
  phone: 'Phone',
  email: 'Email',
  status: 'Status',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const ActionIcon = ({ action }: { action: string }) => {
  if (action === 'create') return <Plus className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />;
  if (action === 'delete') return <Trash2 className="w-3.5 h-3.5 text-destructive" />;
  return <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
};

const NotificationBell = ({ enabled }: { enabled: boolean }) => {
  const navigate = useNavigate();
  const { accessCode, isSuperAdmin } = useAuth();
  const showLogs = enabled && isSuperAdmin;
  const { logs: rawLogs, unreadCount: rawUnread, markAsRead, markAllAsRead, remove, clearAll } = useEntryLogs(showLogs);
  const logs = showLogs ? rawLogs : [];
  const unreadCount = showLogs ? rawUnread : 0;
  const { entries: allEntries, departments } = useAllData();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tomorrow = tomorrowBD();
  const today = todayBD();
  const scoped = isSuperAdmin ? allEntries : allEntries.filter((e: any) => {
    if (accessCode?.department_id) return e.department_id === accessCode.department_id;
    if (accessCode?.office_id) {
      const d = departments.find((x: any) => x.id === e.department_id);
      return d?.office_id === accessCode.office_id;
    }
    return false;
  });
  const shiftEnding = enabled ? scoped.filter((e: any) => e.shift && e.shift !== 'none' && e.shift_to === tomorrow) : [];
  const shiftEndToday = enabled ? scoped.filter((e: any) => e.shift && e.shift !== 'none' && e.shift_to === today) : [];
  const totalBadge = unreadCount + shiftEnding.length + shiftEndToday.length;

  if (!enabled) return null;

  const handleRowClick = (log: EntryEditLog) => {
    if (!log.is_read) markAsRead(log.id);
    setExpandedId(expandedId === log.id ? null : log.id);
  };

  const handleOpenEntry = (e: React.MouseEvent, log: EntryEditLog) => {
    e.stopPropagation();
    if (!log.is_read) markAsRead(log.id);
    const route = getEntryAdminRoute({
      id: log.entry_id,
      department_id: log.department_id,
      office_id: log.office_id,
      name: log.entry_snapshot?.name,
      extension: log.entry_snapshot?.extension,
    }, departments, {
      office_id: accessCode?.office_id,
      department_id: accessCode?.department_id,
    });
    if (!route) return;
    navigate(route);
    setOpen(false);
  };

  const handleOpenShiftEntry = (entry: any) => {
    const scope = {
      office_id: accessCode?.office_id,
      department_id: accessCode?.department_id,
    };
    const route = getEntryAdminRoute(entry, departments, scope);
    if (!route) return;
    navigate(route);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-slate-900 dark:text-slate-50 hover:bg-primary-foreground/10"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(94vw,400px)] max-w-[94vw] p-0 z-[60]"
      >
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="font-bold text-foreground text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => markAllAsRead()}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Read all
              </Button>
            )}
            {logs.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive" onClick={() => clearAll()}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[70vh]">
          {shiftEnding.length > 0 && (
            <div className="border-b border-amber-500/40 bg-amber-500/10 px-3 sm:px-4 py-2.5">
              <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                ⏰ Shift আগামীকাল শেষ হবে ({shiftEnding.length} জন)
              </p>
              <ul className="mt-1 space-y-1 text-[11px] text-foreground">
                {shiftEnding.map((e: any) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenShiftEntry(e)}
                      className="w-full text-left rounded-md px-1.5 py-1 hover:bg-amber-100/70 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      {e.name} — {e.shift === 'day' ? 'Day' : 'Night'} · {formatBDDate(e.shift_from)} থেকে {formatBDDate(e.shift_to)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shiftEndToday.length > 0 && (
            <div className="border-b border-destructive/40 bg-destructive/10 px-3 sm:px-4 py-2.5">
              <p className="text-[13px] font-semibold text-destructive">
                🔔 Shift আজ শেষ হচ্ছে ({shiftEndToday.length} জন)
              </p>
              <ul className="mt-1 space-y-1 text-[11px] text-foreground">
                {shiftEndToday.map((e: any) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenShiftEntry(e)}
                      className="w-full text-left rounded-md px-1.5 py-1 hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      {e.name} — {e.shift === 'day' ? 'Day' : 'Night'} · {formatBDDate(e.shift_from)} থেকে {formatBDDate(e.shift_to)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {logs.length === 0 ? (
            shiftEnding.length + shiftEndToday.length > 0 ? null :
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map(log => {
                const entryName = log.entry_snapshot?.name || 'Entry';
                const ext = log.entry_snapshot?.extension;
                const actionLabel = log.action === 'create' ? 'added' : log.action === 'delete' ? 'deleted' : 'edited';
                const changedFields = log.changes ? Object.keys(log.changes) : [];
                const isExpanded = expandedId === log.id;

                return (
                  <div key={log.id} className={`flex items-start ${!log.is_read ? 'bg-primary/5' : ''}`}>
                    <button
                      onClick={(e) => handleOpenEntry(e, log)}
                      className="flex-1 min-w-0 text-left px-3 sm:px-4 py-2.5 hover:bg-muted/60 transition-colors flex gap-2.5 items-start"
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <ActionIcon action={log.action} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-foreground leading-tight">
                          <span className="font-semibold">{log.editor_label || log.editor_code || 'Sub Admin'}</span>{' '}
                          <span className="text-muted-foreground">{actionLabel}</span>{' '}
                          <span className="font-medium">{entryName}</span>
                          {ext && <span className="text-muted-foreground"> · ext {ext}</span>}
                        </p>
                        {changedFields.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            Changed: {changedFields.map(f => fieldLabels[f] || f).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTime(log.created_at)}</span>
                          <span className="ml-auto text-primary font-medium">Open entry</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 px-2 py-2.5">
                      {!log.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                      <button
                        type="button"
                        onClick={() => handleRowClick(log)}
                        className="text-muted-foreground hover:text-primary p-0.5"
                        aria-label={isExpanded ? 'Hide notification details' : 'Show notification details'}
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(log.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-3 sm:px-4 pb-3 -mt-1">
                        <div className="rounded-lg border bg-card overflow-hidden">
                          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-2.5 border-b">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-[13px] truncate">{log.editor_label || 'Sub Admin'}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">ID: {log.editor_code || '—'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 space-y-2 text-[11px]">
                            <div className="flex items-start gap-2">
                              <ActionIcon action={log.action} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground capitalize">{log.action}d entry</p>
                                <p className="text-muted-foreground truncate">{entryName}{ext ? ` (ext ${ext})` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground">{formatFullDate(log.created_at)}</p>
                                <p className="text-muted-foreground">{formatTime(log.created_at)}</p>
                              </div>
                            </div>
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="pt-2 border-t">
                                <p className="font-semibold text-foreground mb-1.5">Changes</p>
                                <div className="space-y-1.5">
                                  {Object.entries(log.changes).map(([field, change]) => (
                                    <div key={field} className="bg-muted/50 rounded p-1.5">
                                      <p className="font-medium text-foreground text-[10px]">{fieldLabels[field] || field}</p>
                                      <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                                        <span className="line-through text-muted-foreground break-all">{String(change.from || '—')}</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="text-foreground font-medium break-all">{String(change.to || '—')}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(log.department_id || log.office_id) && (
                              <Button
                                size="sm"
                                className="w-full h-8 text-[11px] mt-1"
                                onClick={(e) => handleOpenEntry(e, log)}
                              >
                                Open entry <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
