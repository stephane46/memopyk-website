/**
 * Google Analytics 4 Configuration
 * MEMOPYK Analytics Setup
 * Measurement ID: G-JLRWHE1HV4
 */

// TypeScript declaration for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// GA4 Measurement ID - using environment variable with fallback
export const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_ID || 'G-JLRWHE1HV4';

/**
 * Initialize Google Analytics 4
 * Loads the GA4 script asynchronously and sets up tracking
 */
export function initGA4(): void {
  // Skip initialization in development if needed (optional)
  // if (import.meta.env.DEV) return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Define gtag function
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };

  // Set gtag timestamp
  window.gtag('js', new Date());

  // Configure GA4 with measurement ID
  window.gtag('config', GA4_MEASUREMENT_ID, {
    send_page_view: false, // We'll manually track page views for better control
  });

  // Load GA4 script asynchronously
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  
  // Add script to document
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  console.log('✅ GA4 initialized with Measurement ID:', GA4_MEASUREMENT_ID);
}

/**
 * Track a page view event
 * @param pageTitle - Title of the page
 * @param pageLocation - Full URL
 * @param pagePath - Path portion of URL
 */
export function trackPageView(pageTitle: string, pageLocation: string, pagePath: string): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: pageLocation,
      page_path: pagePath,
    });
    console.log('📊 GA4 Page View:', pagePath);
  }
}

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param eventParams - Additional parameters
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
    console.log('📊 GA4 Event:', eventName, eventParams);
  }
}
