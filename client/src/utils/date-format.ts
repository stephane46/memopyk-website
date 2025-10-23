/**
 * French date formatting utilities for MEMOPYK analytics
 * Converts dates to French format: "16 Août 2025, 18:21"
 */

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Format a date to French format: "16 Août 2025, 18:21"
 * @param date - Date object or date string
 * @returns Formatted French date string
 */
export function formatFrenchDateTime(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Date invalide';
  }

  const day = d.getDate();
  const month = FRENCH_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Format a date to French date only: "16 Août 2025"
 * @param date - Date object or date string
 * @returns Formatted French date string without time
 */
export function formatFrenchDate(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Date invalide';
  }

  const day = d.getDate();
  const month = FRENCH_MONTHS[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Legacy function for backward compatibility - uses French formatting
 * @param date - Date object or date string
 * @returns Formatted French date string
 */
export function toLocaleFrenchString(date: Date | string | number): string {
  return formatFrenchDateTime(date);
}