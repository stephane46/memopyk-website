/**
 * Analytics Utility Functions
 * MEMOPYK - Phase 5 Task 2 Event Tracking
 * 
 * Helper functions for consistent event tracking across all components
 */

// Type definitions for event parameters
type EventParams = Record<string, string | number | boolean>;

/**
 * Track a custom event to Google Analytics 4 and backend database
 * @param eventName - Name of the event (e.g., 'button_click', 'form_submit')
 * @param params - Additional event parameters
 */
export const trackEvent = (eventName: string, params: EventParams = {}): void => {
  // Check if window and gtag are available
  if (typeof window === 'undefined' || typeof (window as any).gtag !== 'function') {
    console.warn(`[Analytics] Cannot track event "${eventName}" - gtag not available`);
    return;
  }

  // Don't track on admin pages
  const isAdmin = window.location.pathname.includes('/admin');
  if (isAdmin) {
    console.log(`[Analytics] Event skipped on admin page: ${eventName}`);
    return;
  }

  // Send event to GA4 (frontend tracking)
  try {
    (window as any).gtag('event', eventName, {
      ...params,
      transport_type: 'beacon', // Ensure delivery
    });
    console.log(`📊 [Analytics] Event tracked: ${eventName}`, params);
  } catch (error) {
    console.error(`[Analytics] Error tracking event "${eventName}":`, error);
  }

  // Also send to backend for database logging (async, non-blocking)
  sendEventToBackend(eventName, params);
};

/**
 * Send event to backend API for database logging
 * This runs asynchronously and doesn't block the user experience
 */
const sendEventToBackend = async (eventName: string, params: EventParams): Promise<void> => {
  try {
    // Prepare enriched event data
    const eventData = {
      event_name: eventName,
      event_value: params.value as number || 0,
      currency: params.currency as string || 'EUR',
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      user_language: navigator.language || null,
      user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      // Spread all other params
      ...params,
    };

    // Send to backend (don't await to avoid blocking)
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
      // Use keepalive to ensure request completes even if user navigates away
      keepalive: true,
    }).catch((err) => {
      // Silently fail - backend logging is supplementary to GA4
      console.debug('[Analytics] Backend logging failed (non-critical):', err);
    });
  } catch (error) {
    // Silently catch any errors to avoid disrupting user experience
    console.debug('[Analytics] Error sending event to backend:', error);
  }
};

/**
 * Track button clicks
 * @param buttonText - Text displayed on the button
 * @param buttonId - ID or identifier of the button
 * @param section - Section/area where button is located
 */
export const trackButtonClick = (buttonText: string, buttonId: string, section: string): void => {
  trackEvent('button_click', {
    button_text: buttonText,
    button_id: buttonId,
    section: section,
  });
};

/**
 * Track internal link clicks
 * @param linkUrl - URL being navigated to
 * @param linkText - Text of the link
 * @param pageName - Current page name
 */
export const trackLinkClick = (linkUrl: string, linkText: string, pageName: string): void => {
  trackEvent('link_click', {
    link_url: linkUrl,
    link_text: linkText,
    page_name: pageName,
  });
};

/**
 * Track form submissions
 * @param formName - Name/ID of the form
 * @param formType - Type of form (contact, signup, etc.)
 * @param pageName - Current page name
 */
export const trackFormSubmit = (formName: string, formType: string, pageName?: string): void => {
  trackEvent('form_submit', {
    form_name: formName,
    form_type: formType,
    ...(pageName && { page_name: pageName }),
  });
};

/**
 * Track form errors
 * @param formName - Name/ID of the form
 * @param errorField - Field that had the error
 * @param errorType - Type of error (validation, network, etc.)
 */
export const trackFormError = (formName: string, errorField: string, errorType: string): void => {
  trackEvent('form_error', {
    form_name: formName,
    error_field: errorField,
    error_type: errorType,
  });
};

/**
 * Track scroll engagement
 * Uses flags to ensure each depth is only tracked once per page load
 */
export class ScrollTracker {
  private tracked25 = false;
  private tracked50 = false;
  private tracked75 = false;
  private tracked90 = false;
  private pageName: string;
  private listener: (() => void) | null = null;

  constructor(pageName: string) {
    this.pageName = pageName;
  }

  /**
   * Initialize scroll tracking
   */
  init(): void {
    this.listener = this.handleScroll.bind(this);
    window.addEventListener('scroll', this.listener, { passive: true });
  }

  /**
   * Clean up scroll tracking
   */
  destroy(): void {
    if (this.listener) {
      window.removeEventListener('scroll', this.listener);
      this.listener = null;
    }
  }

  private handleScroll(): void {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    // Guard against zero-length pages
    if (scrollHeight <= 0) return;
    
    const scrollPercent = (window.scrollY / scrollHeight) * 100;

    if (scrollPercent >= 90 && !this.tracked90) {
      trackEvent('scroll_engagement', {
        scroll_percent: 90,
        page_name: this.pageName,
        value: 25,
        currency: 'EUR'
      });
      this.tracked90 = true;
    } else if (scrollPercent >= 75 && !this.tracked75) {
      trackEvent('scroll_engagement', {
        scroll_percent: 75,
        page_name: this.pageName,
      });
      this.tracked75 = true;
    } else if (scrollPercent >= 50 && !this.tracked50) {
      trackEvent('scroll_engagement', {
        scroll_percent: 50,
        page_name: this.pageName,
      });
      this.tracked50 = true;
    } else if (scrollPercent >= 25 && !this.tracked25) {
      trackEvent('scroll_engagement', {
        scroll_percent: 25,
        page_name: this.pageName,
      });
      this.tracked25 = true;
    }
  }
}

/**
 * Track social sharing
 * @param platform - Platform being shared to (facebook, twitter, linkedin, etc.)
 * @param shareUrl - URL being shared
 * @param pageName - Current page name
 */
export const trackShare = (platform: string, shareUrl: string, pageName: string): void => {
  trackEvent('share', {
    share_platform: platform,
    share_url: shareUrl,
    page_name: pageName,
    value: 5,
    currency: 'EUR'
  });
};

/**
 * Track gallery interactions
 */
export const trackGalleryView = (galleryName: string, imageCount: number): void => {
  trackEvent('gallery_view', {
    gallery_name: galleryName,
    image_count: imageCount,
    page_name: 'Gallery',
  });
};

export const trackGalleryImageClick = (imageUrl: string, galleryName: string, position: number): void => {
  trackEvent('gallery_image_click', {
    image_url: imageUrl,
    gallery_name: galleryName,
    position: position,
  });
};

export const trackGalleryFilter = (filterType: string, filterValue: string): void => {
  trackEvent('gallery_filter', {
    filter_type: filterType,
    filter_value: filterValue,
    page_name: 'Gallery',
  });
};

/**
 * Track file downloads
 * @param fileName - Name of the file
 * @param fileType - Type/extension of the file
 */
export const trackDownload = (fileName: string, fileType: string): void => {
  trackEvent('download', {
    file_name: fileName,
    file_type: fileType,
  });
};
