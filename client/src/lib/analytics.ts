// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = "G-JLRWHE1HV4";

// Check if GA developer mode is enabled
function isGaDev(): boolean {
  return /[?#&]ga_dev=1\b/.test(location.href) || localStorage.getItem('ga_dev') === '1';
}

// DISABLED: Initialize Google Analytics - now handled by direct GA4 module
export function initGA(): void {
  console.warn('🚫 DEPRECATED: initGA() from lib/analytics.ts is disabled to prevent conflicts with direct GA4 module');
  // OLD CODE COMMENTED TO PREVENT DUPLICATE SCRIPT LOADING:
  // This function previously loaded GA4 script but caused conflicts when used alongside
  // the new direct GA4 integration. The new module in client/src/analytics/ga.ts handles
  // all GA4 initialization with proper timing and GTM isolation.
}

// Initialize and display test mode branding
export function initTestMode() {
  // Check for test mode via URL parameter and save to localStorage
  if (/[?#&]ga_dev=1\b/.test(location.href)) {
    localStorage.setItem('ga_dev', '1');
  }
  
  // Display test mode branding if active
  if (isGaDev()) {
    console.log('🧪 MEMOPYK Test');
    return true;
  }
  return false;
}

// DISABLED: Track page views on route changes (SPA navigation) 
// ✅ DUPLICATE PAGE VIEW FIX: This function is disabled to prevent duplicate page_view events
// Page views are now handled exclusively by client/src/analytics/ga.ts sendPageView()
export function sendPageView() {
  console.warn('🚫 DEPRECATED: sendPageView() from lib/analytics.ts is disabled to prevent duplicate page_view events');
  console.warn('🔄 Page views are now handled by client/src/analytics/ga.ts sendPageView() function');
  // OLD CODE DISABLED TO PREVENT DUPLICATE PAGE VIEWS:
  // The gtag('config') call below was creating duplicate page_view events alongside
  // the new gtag('event', 'page_view') calls in client/src/analytics/ga.ts
  
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  // DISABLED: Preventing duplicate page_view events
  // if (typeof window === 'undefined' || !window.gtag) return;
  // 
  // const params: any = {
  //   page_path: window.location.pathname + window.location.search,
  //   page_title: document.title,
  // };
  // 
  // // Mark as developer traffic if dev mode is enabled
  // if (isGaDev()) {
  //   params.debug_mode = true;
  // }
  // 
  // window.gtag('config', MEASUREMENT_ID, params);
}

// Track events (legacy)
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    event_category: category,
    event_label: label,
    value: value,
  };
  
  // Mark as developer traffic if dev mode is enabled
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', action, eventParams);
};

// GA4 Standardized Video Events for BigQuery Export
export const trackVideoStart = (videoId: string, videoTitle?: string, locale?: string) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_start', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    debug_mode: isGaDev()
  });
};

export const trackVideoProgress = (videoId: string, progressPercent: number, currentTimeSeconds: number, videoTitle?: string, locale?: string) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_progress', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    current_time: currentTimeSeconds,
    progress_percent: progressPercent,
    debug_mode: isGaDev()
  });
};

export const trackVideoComplete = (videoId: string, watchTimeSeconds: number, videoTitle?: string, locale?: string) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_complete', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    watch_time_seconds: watchTimeSeconds,
    progress_bucket: 90,
    debug_mode: isGaDev()
  });
};

export const trackVideoPause = (videoId: string, progressPercent: number, currentTimeSeconds: number, videoTitle?: string, locale?: string) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_pause', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    current_time: currentTimeSeconds,
    progress_percent: progressPercent,
    debug_mode: isGaDev()
  });
};

// GA4 Standardized CTA Click Events for BigQuery Export
export const trackCtaClick = (ctaId: string, pagePath?: string, locale?: string) => {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) return;
  
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'cta_click', {
    cta_id: ctaId,
    page_path: pagePath || window.location.pathname,
    locale: locale || 'fr-FR',
    debug_mode: isGaDev()
  });
};

// Helper functions for managing developer mode
export function enableDeveloperMode() {
  localStorage.setItem('ga_dev', '1');
  console.log('🧪 GA4 Developer mode enabled - add ?ga_dev=1 to URLs for testing');
}

export function disableDeveloperMode() {
  localStorage.removeItem('ga_dev');
  console.log('🔒 GA4 Developer mode disabled');
}

// Helper to get current stored language
function getStoredLanguage(): string {
  return localStorage.getItem('memopyk-language') || 'fr-FR';
}

// Get current locale for GA4 events
function getCurrentLocale(): string {
  return getStoredLanguage();
}

// GA4 readiness check with retry mechanism
function waitForGA4Ready(maxWaitMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    function checkGA4() {
      if (window.gtag && typeof window.gtag === 'function' && Array.isArray(window.dataLayer)) {
        resolve(true);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        resolve(false);
        return;
      }
      
      // Check again in 50ms
      setTimeout(checkGA4, 50);
    }
    
    checkGA4();
  });
}

// Centralized GA4 fire function with transport reliability and debug HUD support
export function fireGA(eventName: string, params: any = {}) {
  // Don't track on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) {
    console.log('[GA4] SKIPPED - Admin page detected:', window.location.pathname);
    return;
  }
  
  // Enhanced debugging for video events
  const isVideoEvent = ['video_start', 'video_progress', 'video_complete'].includes(eventName);
  if (isVideoEvent) {
    console.log(`🎥 GA4 VIDEO EVENT: ${eventName}`, params);
  }
  
  // Base parameters for all events
  const baseParams = {
    debug_mode: true,              // while we're verifying
    transport_type: 'beacon',      // ensure delivery on close/nav
    ...params
  };
  
  const send = () => {
    if (window.gtag) {
      console.log(`[GA4] Sending ${eventName}`, baseParams);
      window.gtag('event', eventName, baseParams);
      console.log(`[GA4] Sent ${eventName}`);
    } else {
      console.warn(`[GA4] gtag not available for ${eventName}`);
    }
  };
  
  // Handle GA4 readiness
  if (!window.dataLayer || !window.gtag) {
    console.log(`[GA4] Deferring ${eventName} - GA4 not ready, trying in 150ms`);
    setTimeout(send, 150);
  } else {
    send();
  }
}