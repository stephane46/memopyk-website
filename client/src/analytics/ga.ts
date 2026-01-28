// client/analytics/ga.ts
let gaReadyPromise: Promise<void> | null = null;
let MEASUREMENT_ID = "";

// ✅ ENHANCED LOCALE & GEO DETECTION: Extract comprehensive tracking data
function getLocaleFromURL(): string {
  const path = window.location.pathname;
  if (path.includes('/fr-FR')) return 'fr-FR';
  if (path.includes('/en-US')) return 'en-US';
  return 'unknown';
}

// ✅ NEW: Enhanced tracking data for geographic market analysis
function getTrackingData() {
  const path = window.location.pathname;
  const userLocale = (navigator.language || (navigator as any).userLanguage || 'en-US') as string;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const pageLanguage = getLocaleFromURL(); // Keep existing logic intact
  
  return {
    pageLanguage,
    userLanguage: userLocale,
    languageMatch: (path.includes('/fr-FR') && userLocale.startsWith('fr')) || 
                   (path.includes('/en-US') && userLocale.startsWith('en')),
    timezoneRegion: timezone.split('/')[0], // e.g., "Europe", "America"
    marketSegment: getMarketSegment(userLocale),
    isExpansionOpportunity: !((path.includes('/fr-FR') && userLocale.startsWith('fr')) || 
                              (path.includes('/en-US') && userLocale.startsWith('en')))
  };
}

function getMarketSegment(userLanguage: string): string {
  if (userLanguage.startsWith('fr')) return 'french_speaking_market';
  if (userLanguage.startsWith('en')) return 'english_speaking_market';
  return 'other_language_market';
}

function getMismatchType(pageLanguage: string, userLanguage: string): string {
  if (pageLanguage === 'fr-FR' && userLanguage.startsWith('en')) {
    return 'english_user_viewing_french';
  }
  if (pageLanguage === 'en-US' && userLanguage.startsWith('fr')) {
    return 'french_user_viewing_english';
  }
  return 'other_mismatch';
}

function hasGtagScript(id: string) {
  return !!document.querySelector(`script[src*="gtag/js?id=${id}"]`);
}

function loadGtagScript(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (hasGtagScript(id)) return resolve();
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load gtag.js"));
    document.head.appendChild(s);
  });
}

function shimGtag() {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag =
    (window as any).gtag ||
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureClientIdReady(id: string, attempts = 10): Promise<void> {
  // Resolve when gtag('get', id, 'client_id') returns a value
  for (let i = 0; i < attempts; i++) {
    const v: any = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 1500);
      try {
        (window as any).gtag("get", id, "client_id", (val: any) => {
          clearTimeout(timer);
          resolve(val);
        });
      } catch {
        clearTimeout(timer);
        resolve(undefined);
      }
    });
    if (v) return; // ready!
    await wait(300);
  }
  // Not fatal—continue; events should still flush once lib settles.
}

export function initGA(measurementId: string, opts?: { debug?: boolean }) {
  if (!measurementId) return;
  MEASUREMENT_ID = measurementId;

  if (!gaReadyPromise) {
    gaReadyPromise = (async () => {
      shimGtag();

      // Consent early so events aren't suppressed
      (window as any).gtag("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
        functionality_storage: "granted",
      });

      await loadGtagScript(measurementId);

      // Base config (avoid duplicate page_view)
      (window as any).gtag("js", new Date());
      (window as any).gtag("config", measurementId, {
        send_page_view: false,
        debug_mode:
          !!opts?.debug ||
          /(^|[?&])ga_debug=1/.test(location.search) ||
          localStorage.getItem("ga_debug") === "1",
      });

      // Wait (best-effort) until GA can return a client_id
      await ensureClientIdReady(measurementId);

      // Attach a simple self-test helper
      (window as any).__gaSelfTest = async () => {
        await gaReady();
        (window as any).gtag("event", "video_progress", {
          progress_percent: 25,
          video_id: "SELFTEST.mp4",
          video_title: "Self Test",
          debug_mode: true,
          transport_type: "beacon",
          send_to: MEASUREMENT_ID,
        });
        console.info("[GA] self-test event sent → check GA4 DebugView (video_progress / SELFTEST.mp4)");
      };

      // ✅ PRODUCTION: Enhanced geo-language tracking implemented
    })();
  }
  return gaReadyPromise;
}

export async function gaReady() {
  if (!gaReadyPromise) {
    console.warn("[GA] Analytics not initialized - skipping");
    return Promise.resolve();
  }
  return gaReadyPromise;
}

type EventParams = Record<string, any>;

function sendEvent(name: string, params: EventParams) {
  if (!(window as any).gtag) return;
  
  // ✅ SURGICAL ENHANCEMENT: Add geographic context while preserving existing locale logic
  const trackingData = getTrackingData();
  
  (window as any).gtag("event", name, {
    ...params,
    locale: getLocaleFromURL(), // ✅ PRESERVE existing locale logic for KPIs
    // ✅ NEW: Enhanced geographic & language context (additive only)
    user_language: trackingData.userLanguage,
    language_match: trackingData.languageMatch ? 'match' : 'mismatch',
    market_segment: trackingData.marketSegment,
    expansion_opportunity: trackingData.isExpansionOpportunity ? 'yes' : 'no',
    transport_type: "beacon",
    send_to: MEASUREMENT_ID, // IMPORTANT when multiple configs/GTM exist
  });
}

// Public API

// ✅ SEND PAGE VIEW with enhanced geographic context - called on route changes  
export async function sendPageView(additionalParams?: EventParams) {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  const locale = getLocaleFromURL(); // ✅ PRESERVE existing locale logic for KPIs
  const trackingData = getTrackingData();
  
  // ✅ SECURITY: Filter out KPI-critical fields from additionalParams to prevent accidental override
  const { locale: _, page_path: __, page_title: ___, ...safeAdditionalParams } = additionalParams || {};
  
  (window as any).gtag("event", "page_view", {
    ...safeAdditionalParams, // ✅ Safe additional params first (cannot override critical fields)
    page_path: window.location.pathname + window.location.search, // ✅ KPI-critical: Cannot be overridden
    page_title: document.title, // ✅ KPI-critical: Cannot be overridden  
    locale: locale, // ✅ KPI-critical: Cannot be overridden (PRESERVE existing locale parameter for KPIs)
    // ✅ NEW: Enhanced geographic context (additive only)
    user_language: trackingData.userLanguage,
    language_match: trackingData.languageMatch ? 'match' : 'mismatch',
    market_segment: trackingData.marketSegment,
    expansion_opportunity: trackingData.isExpansionOpportunity ? 'yes' : 'no',
    transport_type: "beacon",
    send_to: MEASUREMENT_ID,
  });
  
  // ✅ NEW: Automatically track language mismatches for expansion analysis
  if (!trackingData.languageMatch) {
    setTimeout(() => trackLanguageMismatch(), 1000); // Delayed to avoid event collision
  }
}

export async function sendVideoProgress(params: EventParams & {
  progress_percent: 10 | 25 | 50 | 75 | 90;
  video_id: string;
  video_title: string;
}) {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  sendEvent("video_progress", params);
}

export async function sendVideoStart(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  sendEvent("video_start", params);
}

export async function sendVideoComplete(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  sendEvent("video_complete", params);
}

// ✅ NEW: Enhanced tracking functions for geographic market analysis

// Track language mismatches for expansion opportunity analysis
export async function trackLanguageMismatch() {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  const trackingData = getTrackingData();
  
  if (!trackingData.languageMatch) {
    (window as any).gtag("event", "language_mismatch", {
      page_language: trackingData.pageLanguage,
      user_language: trackingData.userLanguage,
      user_timezone_region: trackingData.timezoneRegion,
      mismatch_type: getMismatchType(trackingData.pageLanguage, trackingData.userLanguage),
      market_segment: trackingData.marketSegment,
      transport_type: "beacon",
      send_to: MEASUREMENT_ID,
    });
  }
}

// Enhanced conversion tracking with geographic context
export async function trackConversion(eventName: string, conversionData: EventParams = {}) {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  const trackingData = getTrackingData();
  
  (window as any).gtag("event", eventName, {
    locale: trackingData.pageLanguage, // ✅ Keep existing locale logic
    user_language: trackingData.userLanguage,
    language_alignment: trackingData.languageMatch ? 'aligned' : 'misaligned',
    market_segment: trackingData.marketSegment,
    expansion_opportunity: trackingData.isExpansionOpportunity ? 'yes' : 'no',
    transport_type: "beacon",
    send_to: MEASUREMENT_ID,
    ...conversionData,
  });
}

// Track market-specific behaviors for geographic analysis
export async function trackGeographicBehavior() {
  if (!gaReadyPromise) return; // Skip if GA not initialized
  await gaReady();
  const trackingData = getTrackingData();
  
  (window as any).gtag("event", "market_analysis", {
    locale: trackingData.pageLanguage, // ✅ Keep existing locale logic
    user_language: trackingData.userLanguage,
    market_segment: trackingData.marketSegment,
    expansion_opportunity: trackingData.isExpansionOpportunity ? 'yes' : 'no',
    language_match: trackingData.languageMatch ? 'match' : 'mismatch',
    timezone_region: trackingData.timezoneRegion,
    transport_type: "beacon",
    send_to: MEASUREMENT_ID,
  });
}

// ✅ PRODUCTION READY: Enhanced GA4 geographic market analysis successfully implemented
// All existing KPIs preserved while adding comprehensive language/location context for expansion opportunities