/**
 * Language normalization helpers (frontend)
 * Handles both BCP-47 full form (en-US, fr-FR) and base codes (en, fr)
 * Mirrors server/helpers/lang.ts for consistency
 */

export const toBase = (l?: string): string =>
  (l ?? '').toLowerCase().split('-')[0];

export const sameLang = (a?: string, b?: string): boolean =>
  toBase(a) === toBase(b);
