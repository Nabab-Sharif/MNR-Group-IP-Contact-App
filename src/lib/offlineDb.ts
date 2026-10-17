import Dexie, { type Table } from 'dexie';

// Database class
class AppDatabase extends Dexie {
  session!: Table<any, string>;
  cache_store!: Table<any, string>;

  constructor() {
    super('phone_directory_offline');
    this.version(2).stores({
      session: '', // out-of-line keys
      cache_store: '', // out-of-line keys
    });
  }
}

const db = new AppDatabase();
const DATA_CACHE_MARKER = 'phone_directory_has_data_cache';
export const DATA_CACHE_UPDATED_EVENT = 'phone-directory-data-cache-updated';

export type DataCache = { offices: any[]; depts: any[]; entries: any[]; ts?: number };

function byCreatedAt(a: any, b: any) {
  const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
  return aTime - bTime;
}

function emitDataCacheChanged(cache: DataCache) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DataCache>(DATA_CACHE_UPDATED_EVENT, { detail: cache }));
}

export function subscribeDataCache(listener: (cache: DataCache) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<DataCache>).detail);
  window.addEventListener(DATA_CACHE_UPDATED_EVENT, handler);
  return () => window.removeEventListener(DATA_CACHE_UPDATED_EVENT, handler);
}

export function hasDataCacheMarker(): boolean {
  try {
    return localStorage.getItem(DATA_CACHE_MARKER) === 'true';
  } catch {
    return false;
  }
}

// Session management
export async function saveSession(accessCode: any) {
  await db.session.put(accessCode, 'current_user');
  const known = (await db.session.get('known_codes')) || [];
  const idx = known.findIndex((k: any) => k.code === accessCode.code);
  if (idx === -1) {
    known.push(accessCode);
  } else {
    known[idx] = { ...known[idx], ...accessCode };
  }
  await db.session.put(known, 'known_codes');
}

export async function loadSession() {
  return (await db.session.get('current_user')) || null;
}

export async function findKnownCode(code: string) {
  const known = (await db.session.get('known_codes')) || [];
  return known.find((k: any) => k.code === code && k.is_active) || null;
}

export async function clearSession() {
  await db.session.delete('current_user');
}

// Data cache
export async function saveDataCache(offices: any[], depts: any[], entries: any[], options: { notify?: boolean } = {}) {
  const cache = {
    offices: [...offices].sort(byCreatedAt),
    depts: [...depts].sort(byCreatedAt),
    entries: [...entries].sort(byCreatedAt),
    ts: Date.now(),
  };
  await db.cache_store.put(cache, 'cached_data');
  try {
    localStorage.setItem(DATA_CACHE_MARKER, 'true');
  } catch {
    // Ignore storage failures
  }
  if (options.notify !== false) emitDataCacheChanged(cache);
}

export async function loadDataCache(): Promise<DataCache | null> {
  const cached = (await db.cache_store.get('cached_data')) || null;
  if (!cached) {
    try {
      localStorage.removeItem(DATA_CACHE_MARKER);
    } catch {
      // Ignore storage failures.
    }
  }
  return cached;
}

/**
 * Conflict-free merge: only update items that actually changed.
 * Returns merged arrays and a boolean indicating if anything changed.
 */
export function mergeById<T extends { id: string; updated_at?: string }>(
  existing: T[],
  incoming: T[]
): { merged: T[]; changed: boolean } {
  const existingMap = new Map(existing.map(item => [item.id, item]));
  let changed = false;

  // Update or add incoming items
  for (const item of incoming) {
    const old = existingMap.get(item.id);
    if (!old) {
      // New item
      existingMap.set(item.id, item);
      changed = true;
    } else if (old.updated_at !== item.updated_at || JSON.stringify(old) !== JSON.stringify(item)) {
      // Changed item
      existingMap.set(item.id, item);
      changed = true;
    }
  }

  // Detect deletions
  const incomingIds = new Set(incoming.map(i => i.id));
  for (const id of existingMap.keys()) {
    if (!incomingIds.has(id)) {
      existingMap.delete(id);
      changed = true;
    }
  }

  return { merged: Array.from(existingMap.values()).sort(byCreatedAt), changed };
}

export async function patchDataCache(
  table: 'offices' | 'departments' | 'phone_entries',
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  row: any,
) {
  if (!row?.id) return null;
  const cached = await loadDataCache();
  const current: DataCache = cached || { offices: [], depts: [], entries: [] };
  const key = table === 'departments' ? 'depts' : table === 'phone_entries' ? 'entries' : 'offices';
  const list = current[key] || [];
  let changed = false;
  let nextList = list;

  if (eventType === 'DELETE') {
    nextList = list.filter(item => item.id !== row.id);
    changed = nextList.length !== list.length;
  } else {
    const idx = list.findIndex(item => item.id === row.id);
    if (idx === -1) {
      nextList = [...list, row];
      changed = true;
    } else if (list[idx]?.updated_at !== row.updated_at || JSON.stringify(list[idx]) !== JSON.stringify(row)) {
      nextList = list.map(item => (item.id === row.id ? row : item));
      changed = true;
    }
  }

  if (!changed) return null;

  const nextCache: DataCache = {
    offices: key === 'offices' ? nextList : current.offices,
    depts: key === 'depts' ? nextList : current.depts,
    entries: key === 'entries' ? nextList : current.entries,
  };
  await saveDataCache(nextCache.offices, nextCache.depts, nextCache.entries);
  return nextCache;
}

// Check online status
export function isOnline(): boolean {
  return navigator.onLine;
}
