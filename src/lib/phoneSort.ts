import { PhoneEntry } from '@/types/phone';

const naturalExtensionCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const byCreated = (a: PhoneEntry, b: PhoneEntry) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

const firstNumber = (value?: string | null) => {
  const match = (value || '').trim().match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

const byExtensionNumber = (a: PhoneEntry, b: PhoneEntry) => {
  const aExt = (a.extension || '').trim();
  const bExt = (b.extension || '').trim();
  const numberDiff = firstNumber(aExt) - firstNumber(bExt);

  if (numberDiff !== 0) return numberDiff;

  const naturalDiff = naturalExtensionCollator.compare(aExt, bExt);
  if (naturalDiff !== 0) return naturalDiff;

  return byCreated(a, b);
};

export const sortPhoneEntriesByExtension = (entries: PhoneEntry[]) => {
  const withExt = entries.filter(e => e.extension && e.extension.trim() !== '');
  const withoutExt = entries.filter(e => !e.extension || e.extension.trim() === '');

  return [
    ...withExt.sort(byExtensionNumber),
    ...withoutExt.sort(byCreated),
  ];
};