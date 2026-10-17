// Helpers for "New Ext" / "New Phone" flags with optional date ranges (Bangladesh time)

export const todayBD = (): string => {
  const now = new Date();
  const bd = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60000);
  const y = bd.getFullYear();
  const m = String(bd.getMonth() + 1).padStart(2, '0');
  const d = String(bd.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatBDDate = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const inRange = (from?: string | null, to?: string | null): boolean => {
  const today = todayBD();
  if (from && today < from) return false;
  if (to && today > to) return false;
  return true;
};

type FlagEntry = {
  is_new?: boolean | null;
  new_ext_from?: string | null;
  new_ext_to?: string | null;
  new_ext_date?: string | null;
  is_new_phone?: boolean | null;
  new_phone_from?: string | null;
  new_phone_to?: string | null;
};

/** True when the entry is flagged as a new extension and today falls within its date range. */
export const isNewExtActive = (e: FlagEntry | null | undefined): boolean => {
  if (!e?.is_new) return false;
  return inRange(e.new_ext_from ?? e.new_ext_date ?? null, e.new_ext_to ?? null);
};

/** True when the entry is flagged as a new phone and today falls within its date range. */
export const isNewPhoneActive = (e: FlagEntry | null | undefined): boolean => {
  if (!e?.is_new_phone) return false;
  return inRange(e.new_phone_from ?? null, e.new_phone_to ?? null);
};

/** True only after a configured end date has passed. */
export const isNewExtExpired = (e: FlagEntry | null | undefined): boolean => {
  const to = e?.new_ext_to;
  return !!e?.is_new && !!to && todayBD() > to;
};

export const isNewPhoneExpired = (e: FlagEntry | null | undefined): boolean => {
  const to = e?.new_phone_to;
  return !!e?.is_new_phone && !!to && todayBD() > to;
};
