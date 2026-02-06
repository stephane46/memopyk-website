import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const DEPLOYMENT_VERSION = "2.0.0-clean-rebuild";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format snake_case cluster names for display
 * Preserves acronyms (VHS, FR, EN) and title-cases regular words
 *
 * Examples:
 * - 'gift_retirement' → 'Gift Retirement'
 * - 'vhs_legacy' → 'VHS Legacy'
 * - 'gift_celebration_fr' → 'Gift Celebration FR'
 * - 'direct_service' → 'Direct Service'
 */
export function formatCluster(cluster: string): string {
  if (!cluster) return '';

  // Known acronyms to preserve in uppercase
  const acronyms = ['vhs', 'fr', 'en', 'seo', 'diy', 'usb', 'dvd', 'cd'];

  return cluster
    .split('_')
    .map(word => {
      const lower = word.toLowerCase();
      if (acronyms.includes(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
