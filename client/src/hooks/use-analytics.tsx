import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { sendPageView } from '../lib/analytics';

export const useAnalytics = () => {
  const [location] = useLocation();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      // Let GA's default first page_view happen from index.html
      firstLoad.current = false;
      return;
    }
    sendPageView(); // fire on route changes
  }, [location]);
};