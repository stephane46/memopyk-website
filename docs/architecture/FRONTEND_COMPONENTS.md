# Frontend Components — Component Tree & Reuse Analysis

**Generated:** 2026-02-09
**Branch:** staging
**Method:** Automated code analysis of `client/src/`

---

## Summary

| Category | Count |
|----------|-------|
| Page components | 17 |
| Admin components (`components/admin/`) | 68 |
| Admin components (`admin/`) | 15 + 12 analyticsNew |
| Shared/UI components (`components/ui/`) | 42 |
| Shared components (`components/` top-level) | 8 |
| Custom hooks (`hooks/`) | 12 |
| Utility modules (`lib/`) | 11 |
| State stores/contexts | 7 (1 Zustand + 6 React Context) |
| Dead code candidates (0 imports) | 26 admin + 13 UI |
| Large files (>500 lines) | 43 |

---

## 1. Route Map

**Router:** Wouter (lightweight alternative to React Router)
**Pattern:** Language prefix routing (`/fr-FR/...`, `/en-US/...`)
**Admin:** Tab-based via `?tab=` query parameter

### Public Pages

| URL Path | Component | File | Key Imports |
|----------|-----------|------|-------------|
| `/` | Redirect | App.tsx | LanguageContext detects browser lang → redirect |
| `/language` | LanguageSelectionPage | pages/LanguageSelectionPage.tsx | useLanguage, useLocation |
| `/:lang` | HomePage | pages/HomePage.tsx | HeroVideoSection, KeyVisualSection, HowItWorksCondensed, WhyMemopykSection, GallerySection, FAQSection, CtaSection, SEO |
| `/:lang/blog` | BlogIndexPage | pages/BlogIndexPage.tsx | useQuery, tag filtering, pagination |
| `/:lang/blog/:slug` | BlogPostPage | pages/BlogPostPage.tsx | PostBlocks, NewsletterSignup, TagCloud, GalleryComponent, RelatedPosts, ScrollTracker |
| `/:lang/blog/search` | SearchResultsPage | pages/SearchResultsPage.tsx | SearchBar, pagination, sorting |
| `/:lang/legal/:docType` | LegalDocumentPage | pages/LegalDocumentPage.tsx | useQuery, htmlSanitizer, formatLegalDate |
| `/:lang/gallery` | GallerySectionWrapper | components/sections/GallerySectionWrapper.tsx | GallerySection |
| `/:lang/contact` | Placeholder | App.tsx inline | "Coming Soon" |
| `/:lang/travel-upload` | TravelUploadPortalPage | pages/TravelUploadPortalPage.tsx | Agency code validation, form fields |
| `/fr-FR/annuaire-pro` | PartnerDirectoryFR | pages/PartnerDirectoryFR.tsx | MapContainer, Leaflet, MarkerClusterGroup |
| `/fr-FR/annuaire-pro/devenir` | PartnerIntakeFR | pages/PartnerIntakeFR.tsx | useForm, zodResolver, PartnerIntakeSchema |
| `/en-US/directory-pro` | PartnerDirectoryEN | pages/PartnerDirectoryEN.tsx | MapContainer, Leaflet, MarkerClusterGroup |
| `/en-US/directory-pro/join` | PartnerIntakeEN | pages/PartnerIntakeEN.tsx | useForm, zodResolver, PartnerIntakeSchema |
| `*` | NotFoundPage | pages/not-found.tsx | 404 card |

### Alternate Routes (same components)

| URL | Redirects To / Renders |
|-----|----------------------|
| `/fr-FR/carnetdevoyage31` | Redirect → `/fr-FR/travel-upload` |
| `/en-US/carnetdevoyage31` | Redirect → `/en-US/travel-upload` |
| `/fr-FR/devenir/partenaire` | PartnerIntakeFR (alternate) |
| `/en-US/become/partner` | PartnerIntakeEN (alternate) |

### Test Pages

| URL | Component | Purpose |
|-----|-----------|---------|
| `/gv` | SimpleVideoPlayer | Placeholder (page cleared) |
| `/gv2` | GV2Page | Video caching comparison test |
| `/test-gallery-video` | TestGalleryVideo | Gallery video proxy test |

### Admin Dashboard

| URL | Component | Auth |
|-----|-----------|------|
| `/:lang/admin*` | AdminPage (via AdminRoute wrapper) | localStorage password check |

**Admin tab navigation** — all via `?tab=` parameter. See ADMIN_SECTIONS.md for full mapping.

### Routing Features

- **Language detection:** LanguageContext auto-detects browser language, redirects `/` and `/admin`
- **Protected routes:** AdminRoute checks `memopyk_admin_authenticated` in localStorage
- **Error boundaries:** Partner directory routes wrapped in MapErrorBoundary for Leaflet stability
- **No lazy loading:** All pages eagerly imported in App.tsx
- **Layout wrapper:** All public routes wrapped in Layout component (header/footer/mobile menu)

---

## 2. Admin Component Inventory

### `client/src/components/admin/` (68 files)

Sorted alphabetically. **Bold** = actively imported. Regular = 0 imports (dead code candidate).

| File | Purpose | ~Lines | Imports | Status |
|------|---------|--------|---------|--------|
| AdminCountryNamesCard.tsx | Country name mappings card | 296 | 0 | Dead |
| AnalyticsCleanupCard.tsx | Old analytics data cleanup UI | 259 | 0 | Dead |
| AnalyticsControls.tsx | Date range picker for analytics | 127 | 0 | Dead (legacy) |
| AnalyticsCtaPerformanceCard.tsx | CTA performance tracking card | 175 | 0 | Dead (legacy) |
| AnalyticsDailyOverviewCard.tsx | Daily sessions/visitors chart | 292 | 0 | Dead (legacy) |
| AnalyticsGeoDistributionCard.tsx | Geographic distribution chart | 205 | 0 | Dead (legacy) |
| AnalyticsVideoPerformanceCard.tsx | Video watch milestones card | 300 | 0 | Dead (legacy) |
| AnalyticsWorldMapCard.tsx | World map with session data | 424 | 0 | Dead (legacy) |
| **AsyncState.tsx** | Loading/error/empty state wrapper | 56 | 2 | Active |
| **BlogPostCreatorModal.tsx** | Create post modal with tags/status | 571 | 3 | Active |
| BlogTagPicker.tsx | Checkbox dropdown for blog tags | 274 | 0 | Dead |
| **ClearCacheButton.tsx** | Clear GA4 cache with feedback | 69 | 1 | Active |
| ColumnHeaderWithTooltip.tsx | Table header with tooltip | 23 | 0 | Dead |
| **ContentProductionHub.tsx** | Blog Hub wrapper (5 workflow tabs) | 260 | 2 | Active |
| **ContentProductionKeywords.tsx** | Keywords table with filters | 887 | 5 | Active |
| **ContentProductionPlanner.tsx** | Content calendar planner | 1080 | 4 | Active |
| **ContentProductionTopics.tsx** | Topics list with CRUD | 1007 | 2 | Active |
| **CountryFlag.tsx** | Country flag SVG renderer | 463 | 3 | Active |
| **CtaManagement.tsx** | CTA button CRUD | 289 | 3 | Active |
| **DeploymentManagement.tsx** | Deployment status + controls | 633 | 2 | Active |
| **DirectUpload.tsx** | File upload (Cloudinary) | 358 | 1 | Active |
| ErrorBlock.tsx | Error message + retry | 24 | 0 | Dead |
| ExportPdfControls.tsx | PDF export controls | 45 | 0 | Dead |
| ExportRangeControls.tsx | Date range export picker | 113 | 0 | Dead |
| ExportTopVideosCSV.tsx | CSV export for top videos | 36 | 0 | Dead |
| **FAQManagement.tsx** | FAQ CRUD (older version) | 671 | 2 | Superseded |
| FAQManagementTest.tsx | Test/incomplete FAQ version | 10 | 0 | Dead |
| **FAQManagementWorking.tsx** | FAQ CRUD (production) | 917 | 1 | Active |
| **FlipCard.tsx** | Animated flip card | 480 | 1 | Active |
| **FormatBadgeManager.tsx** | Content format badges CRUD | 581 | 1 | Active |
| FunnelChart.tsx | Funnel visualization | 38 | 0 | Dead |
| GA4AnalyticsSection.tsx | Legacy analytics section | 522 | 0 | Dead (legacy) |
| **GalleryManagement.tsx** | Gallery CRUD (older version) | 1730 | 3 | Superseded |
| GalleryManagementNew.tsx | Gallery CRUD (current) | 2598 | 0 | Active (imported by AdminPage inline) |
| **GlobalComparisonBar.tsx** | Period comparison toggle | 39 | 2 | Active |
| GlobalFilterBar.tsx | Global analytics filter UI | 306 | 0 | Dead (legacy) |
| **GlobalFilterContext.tsx** | React context for analytics filters | 91 | 5 | Active (legacy) |
| **HelpButton.tsx** | Help system trigger button | 61 | 5 | Active |
| **HelpDrawer.tsx** | Collapsible help sidebar | 121 | 2 | Active |
| **HelpFlowViewer.tsx** | Step-by-step help flow viewer | 116 | 2 | Active |
| **ImageBankManager.tsx** | Image upload + management | 1156 | 2 | Active |
| ImageCropper.tsx | Image crop/resize tool | 548 | 0 | Dead |
| ImageCropperEasyCrop.tsx | EasyCrop-based cropper | 334 | 0 | Dead |
| ImageCropperLibrary.tsx | Library-based cropper | 178 | 0 | Dead |
| ImageCropperNew.tsx | Modern crop implementation | 387 | 0 | Dead |
| **ImageLabelPicker.tsx** | Image label/category selector | 279 | 1 | Active |
| **IpExclusionsManager.tsx** | IP exclusion management | 692 | 1 | Active |
| **KeywordDeleteDialog.tsx** | Keyword deletion dialog | 103 | 2 | Active |
| **KeywordFormModal.tsx** | Keyword create/edit form | 331 | 2 | Active |
| **KpiStrip.tsx** | KPI indicator strip | 47 | 1 | Active |
| **LegalDocumentManagement.tsx** | Legal docs CRUD | 430 | 1 | Active |
| **MultiSelectFilter.tsx** | Excel-style multi-select dropdown | 179 | 1 | Active |
| PartnersManagement.tsx | Partners CRUD (older) | 445 | 0 | Dead (superseded) |
| **PartnersManagementEnhanced.tsx** | Partners with map integration | 1187 | 2 | Active |
| **PerformanceTestDashboard.tsx** | Performance testing dashboard | 847 | 1 | Active |
| RangeContext.tsx | Date range context | 12 | 0 | Dead (legacy) |
| RealtimePanel.tsx | Real-time visitor panel | 147 | 0 | Dead (legacy) |
| RecentActivityPanel.tsx | Recent analytics activity | 234 | 0 | Dead (legacy) |
| **SeoManagement.tsx** | SEO metadata editor | 1092 | 2 | Active |
| SessionReplaysCard.tsx | Session replay viewer | 125 | 0 | Dead |
| SimpleImageCropper.tsx | Minimal image crop | 283 | 0 | Dead |
| **SystemTestDashboard.tsx** | System health diagnostics | 727 | 1 | Active |
| **TopicDeleteDialog.tsx** | Topic deletion dialog | 120 | 2 | Active |
| **TopicFormModal.tsx** | Topic create/edit form | 654 | 2 | Active |
| **TopVideosColumns.tsx** | Video performance columns | 75 | 1 | Active |
| TopVideosSection.tsx | Top videos section | 45 | 0 | Dead |
| TopVideosTable.tsx | Top videos table | 70 | 0 | Dead |
| TravelAgencyCodesAdmin.tsx | Travel agency codes | 442 | 0 | Active (imported inline by AdminPage) |
| TravelUploadsAdmin.tsx | Travel upload interface | 559 | 0 | Active (imported inline by AdminPage) |
| TrendChart.tsx | Trend line chart | 70 | 0 | Dead |
| TrendingGraphs.tsx | Trending metrics graphs | 581 | 0 | Dead (legacy) |
| **VideoCacheStatus.tsx** | Video cache monitor | 580 | 1 | Active |
| **VideoPerformanceCard.tsx** | Video metrics card | 373 | 2 | Active |
| WhyMemopykManagement.tsx | Why MEMOPYK CRUD | 527 | 0 | Active (imported inline by AdminPage) |

### `client/src/admin/` (15 files)

| File | Purpose | ~Lines | Imports |
|------|---------|--------|---------|
| **AIContextManager.tsx** | Brand Brain AI context editor | 255 | 2 |
| **BlogAICreator.tsx** | AI-powered blog post generation | 668 | 2 |
| **BlogEditor.tsx** | Full blog post editor | 561 | 3 |
| **BlogHeroImageUpload.tsx** | Hero image upload for blog | 236 | 1 |
| **BlogManagement.tsx** | Blog management hub | 167 | 1 |
| **BlogManagePosts.tsx** | Blog posts list with CRUD | 701 | 3 |
| **BlogTagManagement.tsx** | Blog tag create/edit | 253 | 2 |
| **BlogTagSelector.tsx** | Blog tag multi-select | 93 | 1 |
| **CreatePostLanding.tsx** | Post creation entry (manual vs AI) | 134 | 1 |
| **HeroImageUpload.tsx** | Generic hero image uploader | 101 | 1 |
| **HtmlEditor.tsx** | TinyMCE rich HTML editor | 448 | 2 |
| **PublishedAtPicker.tsx** | Publication date/time picker | 185 | 1 |
| **StatusSelector.tsx** | Post status dropdown | 73 | 1 |
| **TagManagementModal.tsx** | Tag management modal | 198 | 1 |
| **TranslationAssistant.tsx** | AI-powered translation helper | 437 | 2 |

### `client/src/admin/analyticsNew/` (12 files)

| File | Purpose | ~Lines | Imports |
|------|---------|--------|---------|
| **AnalyticsNewBlog.tsx** | Blog analytics dashboard | 767 | 2 |
| **AnalyticsNewCta.tsx** | CTA analytics view | 528 | 2 |
| **AnalyticsNewDashboard.tsx** | Main analytics dashboard | 195 | 2 |
| **AnalyticsNewGeo.tsx** | Geographic analytics | 652 | 2 |
| **AnalyticsNewGlobalFilters.tsx** | Global filter controls | 76 | 2 |
| **AnalyticsNewKpiCard.tsx** | KPI metric card | 190 | 2 |
| **AnalyticsNewLiveView.tsx** | Real-time visitor tracking | 698 | 2 |
| **AnalyticsNewLoadingStates.tsx** | Loading skeleton states | 67 | 2 |
| **AnalyticsNewOverview.tsx** | Overview metrics | 184 | 2 |
| **AnalyticsNewTabNavigation.tsx** | Analytics tab navigation | 181 | 2 |
| **AnalyticsNewTrends.tsx** | Trend analysis | 653 | 2 |
| **AnalyticsNewVideo.tsx** | Video analytics | 132 | 2 |

---

## 3. Shared/UI Component Inventory

### `client/src/components/ui/` (42 files)

#### Heavily Reused (5+ imports)

| File | Purpose | Imports |
|------|---------|---------|
| button.tsx | Button with variant styles | 94 |
| card.tsx | Card container (Header, Content, Footer, Title, Description) | 66 |
| badge.tsx | Badge with semantic colors | 54 |
| input.tsx | Text input field | 45 |
| label.tsx | Form label (Radix UI) | 32 |
| select.tsx | Select dropdown (Group, Value, Trigger, Content, Item) | 28 |
| skeleton.tsx | Loading placeholder | 21 |
| textarea.tsx | Textarea field | 19 |
| switch.tsx | Toggle switch | 18 |

#### Moderately Used (2-4 imports)

| File | Purpose | Imports |
|------|---------|---------|
| tabs.tsx | Tab navigation | 7 |
| tooltip.tsx | Tooltip (Provider, Trigger, Content) | 6 |
| form.tsx | React Hook Form integration | 5 |
| checkbox.tsx | Checkbox with indeterminate state | 5 |
| toast.tsx | Toast notification hook | 3 |
| alert-dialog.tsx | Confirmation dialog | 3 |
| calendar.tsx | Date picker calendar | 3 |
| dialog.tsx | Modal dialog | 3 |
| popover.tsx | Popover | 3 |
| progress.tsx | Progress bar | 3 |
| rich-text-editor.tsx | Rich text editor | 3 |
| separator.tsx | Divider | 3 |
| table.tsx | Table (Header, Body, Row, Cell) | 3 |
| command.tsx | Command palette / searchable menu | 2 |
| LazyImage.tsx | Lazy loading image with intersection observer | 2 |
| CookieBanner.tsx | Cookie consent banner | 2 |

#### Lightly Used (1 import)

| File | Purpose | Imports |
|------|---------|---------|
| accordion.tsx | Accordion | 1 |
| collapsible.tsx | Collapsible section | 1 |
| dropdown-menu.tsx | Dropdown menu | 1 |
| sheet.tsx | Side sheet/drawer | 1 |
| toaster.tsx | Toast container | 1 |
| RoundedPeelCorner.tsx | Decorative paper peel effect | 1 |

#### Dead Code (0 imports)

| File | Purpose |
|------|---------|
| alert.tsx | Alert component |
| avatar.tsx | Avatar component |
| breadcrumb.tsx | Breadcrumb navigation |
| carousel.tsx | Image carousel |
| chart.tsx | Chart/graph components |
| CookieSettings.tsx | Cookie settings dialog |
| drawer.tsx | Drawer component |
| hover-card.tsx | Hover tooltip card |
| pagination.tsx | Pagination component |
| sidebar.tsx | Sidebar layout |
| SparkleEffect.tsx | Animated sparkle effect |
| toggle.tsx | Toggle button |

### `client/src/components/` (top-level shared, 8 files)

| File | Purpose | Imports |
|------|---------|---------|
| Layout.tsx | Main layout wrapper (header/footer/mobile menu) | 1 |
| AdminRoute.tsx | Auth guard for admin routes | 1 |
| ErrorBoundary.tsx | Error boundary with refresh | 2 |
| SEO.tsx | SEO head management (Helmet + Supabase) | 1 |
| SessionTracker.tsx | Session tracking / analytics events | 1 |
| RelatedPosts.tsx | Related blog posts section | 1 |
| ClarityRouteListener.tsx | Clarity analytics route tracking | 1 |
| MapErrorBoundary.tsx | Map-specific error boundary | 0 |

---

## 4. Hooks Inventory

### `client/src/hooks/` (12 hooks)

| File | Hook | Purpose | Usage |
|------|------|---------|-------|
| use-toast.ts | `useToast` | Toast notification system with auto-dismiss | 2 |
| useHelp.ts | `useHelp` | Fetch help screens/flows from `/api/help` | 3 |
| useKpis.ts | `useKpis` | KPI data with period comparison (React Query) | 4 |
| useTopVideos.ts | `useTopVideos` | Top 10 videos from GA4 | 3 |
| useFormValidation.ts | `useFormValidation` | react-hook-form + Zod wrapper | 3 |
| useDeviceOrientation.ts | `useDeviceOrientation` | Portrait/landscape detection | 2 |
| useFunnel.ts | `useFunnel` | Video funnel data (plays/halfway/completions) | 1 |
| useGA4VideoAnalytics.ts | `useGA4VideoAnalytics` | All GA4 analytics data (React Query) | 1 |
| useIntersectionObserver.ts | `useIntersectionObserver` | Element visibility with threshold | 1 |
| useNetworkStatus.ts | `useNetworkStatus` | Online/offline + connection details | 1 |
| useTrend.ts | `useTrend` | Daily trend data from `/api/ga4/trend` | 1 |
| useVideoAnalytics.ts | `useVideoAnalytics` | Local video view/session tracking | 1 |

---

## 5. Utils/Lib Inventory

### `client/src/lib/` (11 modules)

| File | Key Exports | Purpose | Usage |
|------|-------------|---------|-------|
| **queryClient.ts** | `queryClient`, `getQueryFn`, `apiRequest`, `adminFetch`, `getAdminAuthHeaders` | React Query config + API helpers | **113** |
| **utils.ts** | `cn`, `formatCluster`, `DEPLOYMENT_VERSION` | Tailwind class merging, formatting | **113** |
| date-utils.ts | `formatDate`, `formatDateTime`, `getRelativeTime`, `formatLegalDate` | Date formatting utilities | 2 |
| analytics.ts | `initGA`, `sendPageView`, `trackEvent`, `trackVideoStart/Progress/Complete`, `trackCtaClick`, `fireGA` | GA4 event tracking (mostly deprecated) | 2 |
| imageUtils.ts | `rewriteBodyImages` | Blog image responsive delivery via CDN | 1 |
| withFilters.ts | `withFilters` | Build filtered analytics API URLs | 1 |
| performance-thresholds.ts | `TIME_THRESHOLDS`, `getTimeStatus`, `humanBytes`, `getPayloadSize` | Performance analysis utilities | 0 |
| sanitize-html.ts | `htmlSanitizer` | DOMPurify config for safe HTML rendering | 0 (imported directly) |
| lang.ts | `toBase`, `sameLang` | Language normalization (en-US → en) | 0 |
| export-utils.ts | `downloadCSV`, `downloadPDF`, `formatDateForFilename` | CSV/PDF export utilities | 0 |
| readGa4.ts | `readGa4Ids` | Extract GA4 client/session IDs from cookies | 0 |

> Note: sanitize-html.ts shows 0 imports via filename grep but is imported by path (`@/lib/sanitize-html`) in FAQ, Legal, and Blog components.

---

## 6. State Stores & Contexts

### Zustand Store (1)

| File | Store | Purpose | Consumers |
|------|-------|---------|-----------|
| `admin/analyticsNew/analyticsNewFilters.store.ts` | `useAnalyticsNewFilters` | Central analytics filter state (date presets, language, country, video, data source). Paris timezone. localStorage persistence. | AnalyticsNewDashboard, GlobalFilters, Blog, Trends, Overview, Video, GA4AnalyticsSection, useGA4VideoAnalytics, useKpis, useTopVideos |

### React Contexts (6)

| File | Context | Purpose | Consumers |
|------|---------|---------|-----------|
| `contexts/LanguageContext.tsx` | `LanguageProvider` / `useLanguage` | FR/EN detection from URL, browser lang, translation helper `t()`. localStorage. | App, Layout, all localized pages, SEO, LanguageSwitcher |
| `contexts/AuthContext.tsx` | `AuthProvider` / `useAuth` | Admin authentication state (token, login/logout, remember-me). localStorage or sessionStorage. | AdminPage, AdminLogin, protected routes |
| `contexts/HelpContext.tsx` | `HelpProvider` / `useHelp` | Help panel open/close state, current route. localStorage. | HelpButton, HelpDrawer, HelpFlowViewer, Layout, admin components |
| `components/admin/GlobalFilterContext.tsx` | `GlobalFilterProvider` | Analytics filter state (date, language, source, device, country, comparison). localStorage. Legacy. | AnalyticsDashboard, VideoPerformanceCard, CtaCard, GeoCard, GlobalFilterBar, ExportPdf |
| `components/admin/RangeContext.tsx` | `RangeProvider` | Simple date range (from/to). Legacy. | AnalyticsControls, legacy analytics components |
| `analytics/FiltersContext.tsx` | `FiltersProvider` / `useDashboardFilters` | Dashboard filter state with URL sync (start, end, locale). | Analytics dashboard pages, data viz components |

---

## 7. Dead Code Candidates

### Admin Components with 0 Imports (26 files, ~7,500 lines)

**Legacy Analytics (replaced by analyticsNew/):**

| File | Lines |
|------|-------|
| AdminCountryNamesCard.tsx | 296 |
| AnalyticsCleanupCard.tsx | 259 |
| AnalyticsControls.tsx | 127 |
| AnalyticsCtaPerformanceCard.tsx | 175 |
| AnalyticsDailyOverviewCard.tsx | 292 |
| AnalyticsGeoDistributionCard.tsx | 205 |
| AnalyticsVideoPerformanceCard.tsx | 300 |
| AnalyticsWorldMapCard.tsx | 424 |
| GA4AnalyticsSection.tsx | 522 |
| GlobalFilterBar.tsx | 306 |
| RangeContext.tsx | 12 |
| RealtimePanel.tsx | 147 |
| RecentActivityPanel.tsx | 234 |
| SessionReplaysCard.tsx | 125 |
| TrendingGraphs.tsx | 581 |

**Duplicate/Superseded Implementations:**

| File | Lines | Superseded By |
|------|-------|---------------|
| PartnersManagement.tsx | 445 | PartnersManagementEnhanced.tsx |
| ImageCropper.tsx | 548 | Not used (4 cropper variants exist) |
| ImageCropperEasyCrop.tsx | 334 | Not used |
| ImageCropperLibrary.tsx | 178 | Not used |
| ImageCropperNew.tsx | 387 | Not used |
| SimpleImageCropper.tsx | 283 | Not used |
| FAQManagementTest.tsx | 10 | FAQManagementWorking.tsx |

**Other Unused:**

| File | Lines |
|------|-------|
| BlogTagPicker.tsx | 274 |
| ColumnHeaderWithTooltip.tsx | 23 |
| ErrorBlock.tsx | 24 |
| ExportPdfControls.tsx | 45 |
| ExportRangeControls.tsx | 113 |
| ExportTopVideosCSV.tsx | 36 |
| FunnelChart.tsx | 38 |
| TopVideosSection.tsx | 45 |
| TopVideosTable.tsx | 70 |
| TrendChart.tsx | 70 |

### UI Components with 0 Imports (13 files)

| File | Purpose |
|------|---------|
| alert.tsx | Alert component |
| avatar.tsx | Avatar component |
| breadcrumb.tsx | Breadcrumb navigation |
| carousel.tsx | Image carousel |
| chart.tsx | Chart/graph components |
| CookieSettings.tsx | Cookie settings dialog |
| drawer.tsx | Drawer component |
| hover-card.tsx | Hover tooltip card |
| pagination.tsx | Pagination component |
| sidebar.tsx | Sidebar layout (771 lines) |
| SparkleEffect.tsx | Animated sparkle effect |
| toggle.tsx | Toggle button |

---

## 8. Large Files (>500 lines)

Files that may benefit from splitting:

| File | Lines | Category | Recommendation |
|------|-------|----------|---------------|
| GalleryManagementNew.tsx | 2,598 | Admin | Split upload, grid, and modal into sub-components |
| AdminPage.tsx | 2,223 | Page | Extract hero management into own component file |
| GalleryManagement.tsx | 1,730 | Admin (legacy) | Delete — superseded by GalleryManagementNew |
| GallerySection.tsx | 1,247 | Section | Split rendering, filtering, and video player |
| VisitorFocusedKpis.tsx | 1,195 | Analytics | Extract KPI cards and sparklines |
| PartnersManagementEnhanced.tsx | 1,187 | Admin | Separate form, map, and table |
| ImageBankManager.tsx | 1,156 | Admin | Split upload, organization, and preview |
| PartnerDirectoryEN.tsx | 1,109 | Page | Extract map, filters, and partner cards |
| SeoManagement.tsx | 1,092 | Admin | Separate form sections |
| ContentProductionPlanner.tsx | 1,080 | Admin | Split calendar and drag-drop |
| ContentProductionTopics.tsx | 1,007 | Admin | Extract filter system and form modal |
| PartnerIntakeFR.tsx | 995 | Page | Extract form sections |
| PartnerIntakeEN.tsx | 989 | Page | Extract form sections |
| FAQManagementWorking.tsx | 917 | Admin | Extract accordion and editor |
| PartnerDirectoryFR.tsx | 904 | Page | Extract map, filters, and partner cards |
| ContentProductionKeywords.tsx | 887 | Admin | Split filter panel and table |
| PerformanceTestDashboard.tsx | 847 | Admin | Extract test sections |
| VideoOverlay.tsx | 793 | Section | Separate controls and layout |
| sidebar.tsx (ui) | 771 | UI (dead) | Delete — 0 imports |
| AnalyticsNewBlog.tsx | 767 | Analytics | Split metrics and trends |
| SystemTestDashboard.tsx | 727 | Admin | Extract test panels |
| BlogManagePosts.tsx | 701 | Admin | Split list, filters, and bulk actions |
| AnalyticsNewLiveView.tsx | 698 | Analytics | Extract events and visitor feed |
| IpExclusionsManager.tsx | 692 | Admin | Separate table and form |
| FAQManagement.tsx | 671 | Admin (legacy) | Consider deleting — superseded |
| BlogAICreator.tsx | 668 | Admin | Split prompt builder and preview |
| TopicFormModal.tsx | 654 | Admin | Extract form sections |
| AnalyticsNewTrends.tsx | 653 | Analytics | Separate charts and comparison logic |
| AnalyticsNewGeo.tsx | 652 | Analytics | Extract visualization and filters |
| DeploymentManagement.tsx | 633 | Admin | Split status and controls |
| useFilteredReports.ts | 617 | Hook | Extract transforms and caching |
| TrendingGraphs.tsx | 581 | Admin (dead) | Delete — 0 imports |
| FormatBadgeManager.tsx | 581 | Admin | Extract editor and preview |
| VideoCacheStatus.tsx | 580 | Admin | Split stats and actions |
| BlogPostCreatorModal.tsx | 571 | Admin | Extract editor and metadata |
| Layout.tsx | 570 | Shared | Extract header, footer, sidebar |
| BlogEditor.tsx | 561 | Admin | Split toolbar and content |
| TravelUploadsAdmin.tsx | 559 | Admin | Extract upload interface |
| ImageCropper.tsx | 548 | Admin (dead) | Delete — 0 imports |
| AnalyticsNewCta.tsx | 528 | Analytics | Split metrics and comparison |
| WhyMemopykManagement.tsx | 527 | Admin | Extract editor and preview |
| BlogPostPage.tsx | 526 | Page | Extract hero, content, sidebar |
| GA4AnalyticsSection.tsx | 522 | Admin (dead) | Delete — 0 imports |

---

## 9. Pattern Inconsistencies

### API Call Patterns

Admin components use **three competing patterns** for data fetching:

| Pattern | Components Using | Description |
|---------|-----------------|-------------|
| `adminFetch()` + `apiRequest()` | SeoManagement, ContentProductionTopics, ContentProductionKeywords, BlogManagePosts, BlogAICreator | Older manual pattern |
| `useQuery()` + `apiRequest()` | CtaManagement, FAQManagementWorking, DeploymentManagement, GalleryManagement, ImageBankManager | React Query pattern |
| Raw `fetch()` | WhyMemopykManagement, TravelUploadsAdmin, TravelAgencyCodesAdmin | Direct fetch (bypasses auth helpers) |

**Recommendation:** Standardize on `useQuery()` with `adminFetch()` wrapper.

### Auth Patterns

| Pattern | Where Used |
|---------|-----------|
| `adminFetch()` (includes auth headers) | Most blog/content components |
| Raw `fetch()` with manual `getAdminToken()` | Travel uploads, travel agency codes |
| Hardcoded `'admin-token-temp'` | SeoManagement (line 117) |
| No auth at all | Legal document routes (CRITICAL) |

### Form Patterns

| Pattern | Components |
|---------|-----------|
| react-hook-form + Zod | FAQManagementWorking, PartnerIntake, SeoManagement, TopicFormModal |
| Manual state management | WhyMemopykManagement, CtaManagement, GalleryManagementNew |
| TanStack mutation helpers | ContentProductionKeywords, BlogManagePosts |

### Duplicate Component Sets

| Category | Files | Recommendation |
|----------|-------|---------------|
| Image Croppers | ImageCropper, ImageCropperEasyCrop, ImageCropperLibrary, ImageCropperNew, SimpleImageCropper | Keep one, delete 4 |
| FAQ Management | FAQManagement, FAQManagementTest, FAQManagementWorking | Keep Working, delete 2 |
| Gallery Management | GalleryManagement, GalleryManagementNew | Keep New, delete old |
| Partners Management | PartnersManagement, PartnersManagementEnhanced | Keep Enhanced, delete old |
| Hero Image Upload | BlogHeroImageUpload, HeroImageUpload | Consolidate into one |
| Analytics Filters | GlobalFilterContext, RangeContext, FiltersContext, analyticsNewFilters.store | Keep Zustand store, delete 3 legacy contexts |
