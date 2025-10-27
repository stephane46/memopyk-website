import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView } from '../config/ga4.config';

export const useAnalytics = () => {
  const [location] = useLocation();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      // Let GA's initial page_view happen from App.tsx initialization
      firstLoad.current = false;
      return;
    }
    
    // Track page views on route changes (SPA navigation)
    // Uses advanced GA4 with geographic tracking and language detection
    trackPageView();
  }, [location]);
};