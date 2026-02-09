import "./index.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

import { AdminRoute } from './components/AdminRoute';
import { LanguageSelectionPage } from './pages/LanguageSelectionPage';
import { LegalDocumentPage } from './pages/LegalDocumentPage';
import TestGalleryVideo from './pages/TestGalleryVideo';
import SimpleVideoPlayer from './pages/SimpleVideoPlayer';
import GV2Page from './pages/GV2Page';
import NotFoundPage from './pages/not-found';
import BlogIndexPage from './pages/BlogIndexPage';
import BlogPostPage from './pages/BlogPostPage';
import SearchResultsPage from './pages/SearchResultsPage';
import PartnerIntakeFR from './pages/PartnerIntakeFR';
import PartnerIntakeEN from './pages/PartnerIntakeEN';
import React, { Suspense } from 'react';
const PartnerDirectoryFR = React.lazy(() => import('./pages/PartnerDirectoryFR'));
const PartnerDirectoryEN = React.lazy(() => import('./pages/PartnerDirectoryEN'));
import TravelUploadPortalPage from './pages/TravelUploadPortalPage';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { CookieBanner } from '@/components/ui/CookieBanner';
import GallerySectionWrapper from './components/sections/GallerySectionWrapper';
import ClarityRouteListener from './components/ClarityRouteListener';
import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { initGA4, trackPageView } from '@/config/ga4.config';
import { initTestMode } from '@/lib/analytics';
import { initPerformanceMonitoring, trackPageLoadMetrics } from '@/utils/performance';
import { SessionTracker } from '@/components/SessionTracker';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';

// Routes configured for gallery
// Language-specific upload system v1.0.82 ready

function AnalyticsRouter() {
  // Track page views when routes change
  useAnalytics();

  return (
    <>
      <Route path="/language" component={LanguageSelectionPage} />

      <Layout>
        <Switch>
          {/* Test Routes - Handle these first, before redirects */}
          <Route path="/gv" component={SimpleVideoPlayer} />
          <Route path="/gv2" component={GV2Page} />
          <Route path="/test-gallery-video" component={TestGalleryVideo} />

          {/* Root redirects - Let LanguageContext handle browser detection */}
          <Route path="/" component={() => {
            // LanguageContext will handle browser language detection and redirect
            return null;
          }} />
          <Route path="/admin/*" component={() => {
            // LanguageContext will handle browser language detection and redirect to appropriate admin
            return null;
          }} />

          {/* Admin Routes - before localized routes */}
          <Route path="/fr-FR/admin*" component={AdminRoute} />
          <Route path="/en-US/admin*" component={AdminRoute} />

          {/* Travel Upload Portal Routes */}
          <Route path="/fr-FR/travel-upload" component={TravelUploadPortalPage} />
          <Route path="/en-US/travel-upload" component={TravelUploadPortalPage} />
          {/* Legacy redirects for old URL */}
          <Route path="/fr-FR/carnetdevoyage31">{() => { window.location.href = '/fr-FR/travel-upload'; return null; }}</Route>
          <Route path="/en-US/carnetdevoyage31">{() => { window.location.href = '/en-US/travel-upload'; return null; }}</Route>

          {/* Gallery Routes */}
          <Route path="/fr-FR/gallery" component={GallerySectionWrapper} />
          <Route path="/en-US/gallery" component={GallerySectionWrapper} />

          {/* Contact Routes */}
          <Route path="/fr-FR/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Bientôt Disponible</div></div>} />
          <Route path="/en-US/contact" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-500">Contact Coming Soon</div></div>} />

          {/* Test Routes - Localized versions */}
          <Route path="/fr-FR/gv" component={SimpleVideoPlayer} />
          <Route path="/en-US/gv" component={SimpleVideoPlayer} />
          <Route path="/fr-FR/gv2" component={GV2Page} />
          <Route path="/en-US/gv2" component={GV2Page} />

          {/* Legal Document Routes */}
          <Route path="/fr-FR/legal/:docType" component={LegalDocumentPage} />
          <Route path="/en-US/legal/:docType" component={LegalDocumentPage} />

          {/* Blog Routes */}
          <Route path="/fr-FR/blog/search" component={SearchResultsPage} />
          <Route path="/en-US/blog/search" component={SearchResultsPage} />
          <Route path="/fr-FR/blog/:slug" component={BlogPostPage} />
          <Route path="/en-US/blog/:slug" component={BlogPostPage} />
          <Route path="/fr-FR/blog" component={BlogIndexPage} />
          <Route path="/en-US/blog" component={BlogIndexPage} />

          {/* Partner Routes */}
          <Route path="/fr-FR/annuaire-pro/devenir" component={PartnerIntakeFR} />
          <Route path="/fr-FR/devenir/partenaire" component={PartnerIntakeFR} />
          <Route path="/fr-FR/annuaire-pro">
            {() => (
              <MapErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
                  <PartnerDirectoryFR />
                </Suspense>
              </MapErrorBoundary>
            )}
          </Route>
          <Route path="/en-US/directory-pro/join" component={PartnerIntakeEN} />
          <Route path="/en-US/become/partner" component={PartnerIntakeEN} />
          <Route path="/en-US/directory-pro">
            {() => (
              <MapErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
                  <PartnerDirectoryEN />
                </Suspense>
              </MapErrorBoundary>
            )}
          </Route>

          {/* Homepage Routes - MUST be last (most general) */}
          <Route path="/fr-FR" component={HomePage} />
          <Route path="/en-US" component={HomePage} />
        </Switch>
      </Layout>
    </>
  );
}

function App() {
  // Initialize GA4 and test mode on app load (EXCLUDE admin pages)
  useEffect(() => {
    const isAdminPage = window.location.pathname.includes('/admin');

    // Global unhandled promise rejection handler to prevent runtime error modal
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Handle all unhandled rejections to prevent runtime error modal on mobile
      console.warn('🚫 Unhandled rejection handled gracefully:', event.reason);
      event.preventDefault(); // Prevent any unhandled rejection from causing runtime error modal
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if (!isAdminPage) {
      // Initialize GA4 only for public pages using centralized config
      initGA4();

      // Track initial page view
      trackPageView();

      // Initialize test mode
      const isTestMode = initTestMode();
      if (isTestMode) {
        console.log('🔍 Test mode active - all GA4 events will include debug_mode=true');
      }

      // Initialize performance monitoring (Core Web Vitals)
      initPerformanceMonitoring();
      trackPageLoadMetrics();

      console.log('✅ GA4 Analytics initialized with enhanced geographic tracking');
    } else {
      // Check if this is the analytics dashboard which needs GA4 for data fetching
      const urlParams = new URLSearchParams(window.location.search);
      const isAnalyticsDashboard = urlParams.has('an_tab'); // Analytics tabs use an_tab parameter
      console.log('🔍 PATH DEBUG:', {
        pathname: window.location.pathname,
        search: window.location.search,
        an_tab: urlParams.get('an_tab'),
        isAnalyticsDashboard,
        isAdminPage: window.location.pathname.includes('/admin')
      });

      if (isAnalyticsDashboard) {
        console.log('📊 Analytics dashboard detected - enabling GA4 for data access');
        // Initialize GA4 for analytics dashboard data access
        initGA4();
        trackPageView();

        const isTestMode = initTestMode();
        if (isTestMode) {
          console.log('🔍 Test mode active - all GA4 events will include debug_mode=true');
        }
      } else {
        // Do not initialize GA4 on other admin pages - completely disabled
        console.log('🚫 Admin page detected - GA4 completely disabled');
      }
    }

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionTracker />
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <ClarityRouteListener />
            <AnalyticsRouter />
            <CookieBanner />
          </Router>
        </LanguageProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
