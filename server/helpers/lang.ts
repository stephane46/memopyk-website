/**
 * Language normalization helpers
 * Handles both BCP-47 full form (en-US, fr-FR) and base codes (en, fr)
 */

export const toBase = (l?: string): string =>
  (l ?? '').toLowerCase().split('-')[0];

export const sameLang = (a?: string, b?: string): boolean =>
  toBase(a) === toBase(b);

/**
 * Creates language filter that accepts both full and base forms
 * Example: "en-US" will match both "en-US" and "en"
 */
export const languageFilter = (locale: string): string => {
  const base = toBase(locale);
  const full = locale;
  return `filter[_or][0][language][_eq]=${full}&filter[_or][1][language][_eq]=${base}`;
};
