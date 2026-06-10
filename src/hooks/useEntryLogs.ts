import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EntryEditLog {
  id: string;
  entry_id: string | null;
  department_id: string | null;
  office_id: string | null;
  editor_code_id: string | null;
  editor_label: string | null;
  editor_code: string | null;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { from: any; to: any }> | null;
  entry_snapshot: any;
  is_read: boolean;
  created_at: string;
}

export function useEntryLogs(enabled: boolean = true) {
  const [logs, setLogs] = useState<EntryEditLog[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('entry_edit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchLogs();
    const channel = supabase
      .channel('entry_edit_logs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_edit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchLogs]);

  const markAsRead = async (id: string) => {
    await supabase.from('entry_edit_logs').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    await supabase.from('entry_edit_logs').update({ is_read: true }).eq('is_read', false);
  };

  const remove = async (id: string) => {
    await supabase.from('entry_edit_logs').delete().eq('id', id);
  };

  const clearAll = async () => {
    await supabase.from('entry_edit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  };

  const unreadCount = logs.filter(l => !l.is_read).length;

  return { logs, loading, unreadCount, markAsRead, markAllAsRead, remove, clearAll, refetch: fetchLogs };
}

export async function logEntryEdit(params: {
  entry_id: string | null;
  department_id: string | null;
  office_id: string | null;
  editor_code_id: string | null;
  editor_label: string | null;
  editor_code: string | null;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, { from: any; to: any }> | null;
  entry_snapshot?: any;
}) {
  try {
    await supabase.from('entry_edit_logs').insert({
      entry_id: params.entry_id,
      department_id: params.department_id,
      office_id: params.office_id,
      editor_code_id: params.editor_code_id,
      editor_label: params.editor_label,
      editor_code: params.editor_code,
      action: params.action,
      changes: params.changes ?? null,
      entry_snapshot: params.entry_snapshot ?? null,
    } as any);
  } catch (err) {
    console.error('Failed to log entry edit:', err);
  }
}

export function diffEntries(before: any, after: any): Record<string, { from: any; to: any }> {
  const fields = ['extension', 'name', 'designation', 'phone', 'email', 'status'];
  const out: Record<string, { from: any; to: any }> = {};
  for (const f of fields) {
    const a = before?.[f] ?? null;
    const b = after?.[f] ?? null;
    if ((a || '') !== (b || '')) out[f] = { from: a, to: b };
  }
  return out;
}
