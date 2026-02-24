/**
 * Date utility functions for MEMOPYK application
 * All dates should be formatted as "dd mmm yyyy" throughout the application
 */

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const monthNamesFr = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Format date to "dd mmm yyyy" format (e.g., "29 Jul 2025")
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Format date and time to "dd mmm yyyy, HH:mm" format
 * @param date - Date object or ISO string
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const dateStr = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${dateStr}, ${hours}:${minutes}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  
  return formatDate(d);
}

/**
 * Format date as dd/mm/yy (e.g., "25/12/25")
 * Standard display format across admin UI.
 * @param date - Date object, ISO string, or YYYY-MM-DD string
 * @returns Formatted date string like "25/12/25"
 */
export function fmtDDMMYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : date;
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Format date as dd/mm (e.g., "25/12") — for compact contexts like week labels.
 */
export function fmtDDMM(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : date;
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Format date for legal documents in the required format (e.g., "08 August 2025" or "08 août 2025")
 * @param date - Date object or ISO string
 * @param language - Language code ('en' or 'fr')
 * @returns Formatted date string
 */
export function formatLegalDate(date: Date | string, language: 'en' | 'fr' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return language === 'fr' ? 'Date inconnue' : 'Unknown date';
  }
  
  const day = d.getDate().toString().padStart(2, '0');
  const monthNames_en = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = language === 'fr' ? monthNamesFr[d.getMonth()] : monthNames_en[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}