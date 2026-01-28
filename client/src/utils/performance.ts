/**
 * Performance Monitoring Utility
 * MEMOPYK - Phase 5 Task 4
 * 
 * Tracks Core Web Vitals and page performance metrics
 */

import { trackEvent } from './analytics';

// Type definitions for Web Vitals
interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Initialize Core Web Vitals monitoring
 * Tracks LCP, CLS, INP, and FID
 */
export const initPerformanceMonitoring = (): void => {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  trackLCP();

  // Track Cumulative Layout Shift (CLS)
  trackCLS();

  // Track Interaction to Next Paint (INP)
  trackINP();

  // Track First Input Delay (FID) - fallback for older browsers
  trackFID();

  console.log('📊 Performance monitoring initialized');
};

/**
 * Track Largest Contentful Paint (LCP)
 * Measures loading performance - should be < 2.5s
 */
const trackLCP = (): void => {
  if (!('PerformanceObserver' in window)) return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      const lcpValue = Math.round(lastEntry.renderTime || lastEntry.loadTime);
      const rating = lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor';

      // Send to GA4
      trackEvent('core_web_vital', {
        vital_type: 'LCP',
        vital_value: lcpValue,
        vital_unit: 'ms',
        vital_rating: rating,
        page_name: document.title,
        page_path: window.location.pathname,
      });

      // Send to backend for database storage
      sendPerformanceToBackend({
        lcp_value: lcpValue,
        lcp_rating: rating,
      });

      console.log(`⚡ LCP: ${lcpValue}ms (${rating})`);
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.error('LCP tracking error:', error);
  }
};

/**
 * Track Cumulative Layout Shift (CLS)
 * Measures visual stability - should be < 0.1
 */
const trackCLS = (): void => {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let clsEntries: any[] = [];

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
    });

    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Report CLS when page is hidden (user navigates away)
    const reportCLS = () => {
      const finalCLS = parseFloat(clsValue.toFixed(3));
      const rating = finalCLS < 0.1 ? 'good' : finalCLS < 0.25 ? 'needs-improvement' : 'poor';

      if (finalCLS > 0) {
        trackEvent('core_web_vital', {
          vital_type: 'CLS',
          vital_value: finalCLS,
          vital_unit: 'score',
          vital_rating: rating,
          page_name: document.title,
          page_path: window.location.pathname,
        });

        sendPerformanceToBackend({
          cls_value: finalCLS,
          cls_rating: rating,
        });

        console.log(`📐 CLS: ${finalCLS} (${rating})`);
      }
    };

    // Report when user leaves the page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    // Also report on page unload
    window.addEventListener('pagehide', reportCLS);
  } catch (error) {
    console.error('CLS tracking error:', error);
  }
};

/**
 * Track Interaction to Next Paint (INP)
 * Measures responsiveness - should be < 200ms
 */
const trackINP = (): void => {
  if (!('PerformanceObserver' in window)) return;

  let worstINP = 0;

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        // Track the worst (longest) interaction
        if (entry.duration > worstINP) {
          worstINP = entry.duration;
        }
      }
    });

    // Observe event timing entries
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });

    // Report INP when page is hidden
    const reportINP = () => {
      if (worstINP > 0) {
        const inpValue = Math.round(worstINP);
        const rating = inpValue < 200 ? 'good' : inpValue < 500 ? 'needs-improvement' : 'poor';

        trackEvent('core_web_vital', {
          vital_type: 'INP',
          vital_value: inpValue,
          vital_unit: 'ms',
          vital_rating: rating,
          page_name: document.title,
          page_path: window.location.pathname,
        });

        sendPerformanceToBackend({
          inp_value: inpValue,
          inp_rating: rating,
        });

        console.log(`⚡ INP: ${inpValue}ms (${rating})`);
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportINP();
      }
    });

    window.addEventListener('pagehide', reportINP);
  } catch (error) {
    console.error('INP tracking error:', error);
  }
};

/**
 * Track First Input Delay (FID)
 * Measures interactivity - should be < 100ms
 * Fallback for browsers that don't support INP
 */
const trackFID = (): void => {
  if (!('PerformanceObserver' in window)) return;

  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        const fidValue = Math.round(entry.processingStart - entry.startTime);
        const rating = fidValue < 100 ? 'good' : fidValue < 300 ? 'needs-improvement' : 'poor';

        trackEvent('core_web_vital', {
          vital_type: 'FID',
          vital_value: fidValue,
          vital_unit: 'ms',
          vital_rating: rating,
          page_name: document.title,
          page_path: window.location.pathname,
        });

        sendPerformanceToBackend({
          fid_value: fidValue,
          fid_rating: rating,
        });

        console.log(`⚡ FID: ${fidValue}ms (${rating})`);

        // Only measure FID once
        fidObserver.disconnect();
      }
    });

    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    console.error('FID tracking error:', error);
  }
};

/**
 * Track page load performance metrics
 * Measures DNS, TCP, TTFB, DOM rendering, etc.
 */
export const trackPageLoadMetrics = (): void => {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    // Wait a bit for all metrics to be available
    setTimeout(() => {
      try {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (!perfData) {
          console.warn('Navigation timing not available');
          return;
        }

        const metrics = {
          dns_time: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
          tcp_time: Math.round(perfData.connectEnd - perfData.connectStart),
          ttfb: Math.round(perfData.responseStart - perfData.requestStart),
          dom_interactive: Math.round(perfData.domInteractive - perfData.fetchStart),
          dom_complete: Math.round(perfData.domComplete - perfData.fetchStart),
          page_load_time: Math.round(perfData.loadEventEnd - perfData.fetchStart),
          resource_count: performance.getEntriesByType('resource').length,
          transfer_size: Math.round((perfData.transferSize || 0) / 1024), // KB
        };

        // Send to GA4
        trackEvent('page_load_metrics', {
          page_name: document.title,
          page_path: window.location.pathname,
          ...metrics,
        });

        // Send to backend
        sendPerformanceToBackend(metrics);

        console.log('📊 Page load metrics:', metrics);
      } catch (error) {
        console.error('Page load metrics error:', error);
      }
    }, 0);
  });
};

/**
 * Send performance metrics to backend for database storage
 */
const sendPerformanceToBackend = async (metrics: Record<string, any>): Promise<void> => {
  try {
    const performanceData = {
      page_name: document.title,
      page_path: window.location.pathname,
      device_type: getDeviceType(),
      browser_name: getBrowserName(),
      connection_type: getConnectionType(),
      ...metrics,
    };

    // Send to backend (non-blocking)
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(performanceData),
      keepalive: true,
    }).catch((err) => {
      console.debug('[Performance] Backend logging failed (non-critical):', err);
    });
  } catch (error) {
    console.debug('[Performance] Error sending to backend:', error);
  }
};

/**
 * Get device type from user agent
 */
const getDeviceType = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
};

/**
 * Get browser name from user agent
 */
const getBrowserName = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
  return 'Other';
};

/**
 * Get connection type from Network Information API
 */
const getConnectionType = (): string => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return 'unknown';
  return connection.effectiveType || connection.type || 'unknown';
};

/**
 * Manual performance mark (for custom measurements)
 */
export const markPerformance = (markName: string): void => {
  if (typeof window === 'undefined' || !window.performance) return;
  
  try {
    performance.mark(markName);
  } catch (error) {
    console.error('Performance mark error:', error);
  }
};

/**
 * Measure time between two performance marks
 */
export const measurePerformance = (measureName: string, startMark: string, endMark: string): number | null => {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName)[0];
    return Math.round(measure.duration);
  } catch (error) {
    console.error('Performance measure error:', error);
    return null;
  }
};
