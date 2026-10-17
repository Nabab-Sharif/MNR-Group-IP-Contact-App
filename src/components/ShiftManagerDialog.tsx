import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { todayBD, formatBDDate } from '@/lib/newFlags';

interface Props {
  mode: 'day' | 'night' | null;
  onClose: () => void;
  entries: any[];
  onUpdate: (id: string, patch: any) => Promise<any> | any;
}

export default function ShiftManagerDialog({ mode, onClose, entries, onUpdate }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!mode) return;
    const cur = entries.filter(e => e.shift === mode);
    setSelected(new Set(cur.map(e => e.id)));
    setFrom(cur[0]?.shift_from || todayBD());
    setTo(cur[0]?.shift_to || '');
  }, [mode, entries]);

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const save = async () => {
    if (!mode) return;
    if (from && to && to < from) { toast.error('শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না'); return; }
    setSaving(true);
    const jobs = entries.flatMap(e => {
      const want = selected.has(e.id);
      if (want && (e.shift !== mode || (e.shift_from || '') !== from || (e.shift_to || '') !== to))
        return [onUpdate(e.id, { shift: mode, shift_from: from || null, shift_to: to || null })];
      if (!want && e.shift === mode) return [onUpdate(e.id, { shift: null, shift_from: null, shift_to: null })];
      return [];
    });
    await Promise.all(jobs);
    setSaving(false);
    toast.success(mode === 'day' ? 'Day shift আপডেট হয়েছে' : 'Night shift আপডেট হয়েছে');
    onClose();
  };

  const Icon = mode === 'day' ? Sun : Moon;

  return (
    <Dialog open={!!mode} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" /> {mode === 'day' ? 'Day' : 'Night'} Shift — যাদের টিক দিবেন
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium">From
            <input type="date" value={from} onChange={ev => setFrom(ev.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium">To
            <input type="date" value={to} min={from || undefined} onChange={ev => setTo(ev.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
          </label>
        </div>
        <p className={`text-xs rounded-md px-2 py-1.5 border ${mode === 'day' ? 'border-amber-500 bg-amber-500/10' : 'border-indigo-500 bg-indigo-500/10'}`}>
          ✅ Ready: {formatBDDate(from || null)} থেকে {to ? formatBDDate(to) : 'অনির্দিষ্ট'} পর্যন্ত {mode === 'day' ? 'Day' : 'Night'} shift
        </p>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border border border-border rounded-lg">
          {entries.length === 0 && <p className="p-4 text-sm text-muted-foreground">কোনো user নেই</p>}
          {entries.map(e => (
            <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggle(e.id)}
                className={`w-4 h-4 ${mode === 'day' ? 'accent-amber-500' : 'accent-indigo-600'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.name}</div>
                {e.designation && <div className="text-xs text-muted-foreground truncate">{e.designation}</div>}
                {e.shift && e.shift_to && <div className="text-[10px] text-muted-foreground">{e.shift === 'day' ? 'Day' : 'Night'}: {formatBDDate(e.shift_from)} – {formatBDDate(e.shift_to)}</div>}
              </div>
              <div className="flex gap-1 text-[10px] font-semibold">
                <span className={`px-1.5 py-0.5 rounded border ${e.shift === 'day' ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300' : 'border-border text-muted-foreground'}`}>Day</span>
                <span className={`px-1.5 py-0.5 rounded border ${e.shift === 'night' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'border-border text-muted-foreground'}`}>Night</span>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
