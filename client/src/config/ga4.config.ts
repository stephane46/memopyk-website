/**
 * Google Analytics 4 Configuration
 * MEMOPYK Analytics Setup - Phase 5
 * Measurement ID: G-JLRWHE1HV4
 * 
 * This file serves as the centralized GA4 configuration wrapper,
 * exposing the advanced analytics/ga.ts module with typed interfaces.
 */

import { 
  initGA as initGACore,
  gaReady,
  sendPageView as sendPageViewCore,
  sendVideoProgress,
  sendVideoStart,
  sendVideoComplete,
  trackLanguageMismatch,
  trackConversion,
  trackGeographicBehavior
} from '../analytics/ga';

// TypeScript declaration for gtag (global window interface)
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    __gaSelfTest?: () => Promise<void>;
  }
}

// GA4 Measurement ID - using environment variable with fallback
export const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_ID || import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-JLRWHE1HV4';

/**
 * Initialize Google Analytics 4
 * Wrapper around the advanced analytics/ga.ts module
 * Includes geographic tracking, language mismatch detection, and video analytics
 */
export function initGA4(): Promise<void> | undefined {
  return initGACore(GA4_MEASUREMENT_ID, { 
    debug: import.meta.env.DEV || localStorage.getItem('ga_debug') === '1'
  });
}

/**
 * Wait for GA4 to be fully initialized
 */
export async function waitForGA4Ready(): Promise<void> {
  return gaReady();
}

/**
 * Track a page view event
 * Includes enhanced geographic context, language detection, and expansion opportunity analysis
 */
export async function trackPageView(additionalParams?: Record<string, any>): Promise<void> {
  return sendPageViewCore(additionalParams);
}

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param eventParams - Additional parameters
 */
export async function trackEvent(eventName: string, eventParams?: Record<string, any>): Promise<void> {
  await gaReady();
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      ...eventParams,
      transport_type: 'beacon',
      send_to: GA4_MEASUREMENT_ID
    });
    console.log('📊 GA4 Event:', eventName, eventParams);
  }
}

// Re-export advanced tracking functions
export {
  sendVideoProgress,
  sendVideoStart,
  sendVideoComplete,
  trackLanguageMismatch,
  trackConversion,
  trackGeographicBehavior
};
