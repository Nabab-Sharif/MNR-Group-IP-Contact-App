import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'phone_directory_access_code';

export type WritableTable =
  | 'offices'
  | 'departments'
  | 'phone_entries'
  | 'access_codes'
  | 'entry_edit_logs'
  | 'office_locations';

function currentCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * All privileged writes go through a server-side function that verifies the
 * access code and the caller's role before touching any table. The client has
 * no direct INSERT/UPDATE/DELETE rights.
 */
export async function secureWrite<T = any>(
  table: WritableTable,
  action: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown> | null = null,
  id: string | null = null,
): Promise<{ data: T | null; error: string | null }> {
  const code = currentCode();
  if (!code) return { data: null, error: 'Not authorized' };

  const { data, error } = await supabase.rpc('access_code_write' as any, {
    _code: code,
    _table: table,
    _action: action,
    _payload: (payload ?? {}) as any,
    _id: id,
  });

  if (error) {
    return { data: null, error: error.message.includes('Access denied') ? 'Not authorized' : error.message };
  }
  return { data: (data as T) ?? null, error: null };
}

/** Refreshes last_active for the currently stored access code. */
export async function touchAccessCode(code?: string) {
  const value = code || currentCode();
  if (!value) return;
  try {
    await supabase.rpc('access_code_write' as any, {
      _code: value,
      _table: 'access_codes',
      _action: 'touch',
      _payload: {},
      _id: null,
    });
  } catch {
    /* non-critical */
  }
}
