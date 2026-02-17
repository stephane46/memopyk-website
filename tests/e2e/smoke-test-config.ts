// Staging base URL
export const STAGING_URL = 'https://memopyk.memopyk.com';

// Output directories
export const SMOKE_OUTPUT_DIR = 'test-results/smoke-test';
export const ADMIN_SCREENSHOTS_DIR = `${SMOKE_OUTPUT_DIR}/admin`;
export const PUBLIC_SCREENSHOTS_DIR = `${SMOKE_OUTPUT_DIR}/public`;
export const REPORT_DIR = SMOKE_OUTPUT_DIR;

// Problematic text patterns to scan for
export const BAD_PATTERNS = [
  'undefined',
  'null',
  'NaN',
  '[object Object]',
  'Error:',
  'Cannot read prop',
  'is not a function',
  'Failed to fetch',
  'Network Error',
  'Internal Server Error',
  '500',
  '404',
];

// These patterns are OK in certain contexts — don't flag them
export const PATTERN_EXCEPTIONS: Record<string, string[]> = {
  'undefined': ['if undefined', 'is undefined', 'when undefined', 'non défini', 'not defined'],
  'null': ['nullable', 'non-null', 'null safety', 'null check', 'annulled'],
  '500': ['2500', '1500', '€500', '$500', '500px', '500ms', '5000', 'caractères', 'caracteres', 'remaining', 'restants'],
  '404': ['test-404'],
  'NaN': ['nana', 'banana', 'financing', 'financement', 'gouvernance'],
};

// Admin sections — COMPLETE list from AdminPage.tsx menuCategories
export const ADMIN_SECTIONS = {
  // Direct link sections (top-level sidebar items)
  directLinks: [
    { id: 'analytics-new', label: 'Analytics', sidebarClick: 'Analytics' },
    { id: 'blog', label: 'Blog Hub', sidebarClick: 'Blog' },
    { id: 'seo', label: 'SEO', sidebarClick: 'SEO' },
  ],
  // Collapsible sections with children
  collapsible: [
    {
      category: 'Partenaires',
      children: [
        { id: 'travel-agencies', label: 'Agences de Voyage' },
        { id: 'partners', label: 'Annuaire Pro' },
      ],
    },
    {
      category: 'Contenu Site',
      children: [
        { id: 'hero-management', label: 'Vidéos Hero' },
        { id: 'gallery', label: 'Galerie Vidéos' },
        { id: 'faq', label: 'FAQ' },
        { id: 'why-memopyk', label: 'Pourquoi MEMOPYK' },
        { id: 'cta', label: 'Boutons CTA' },
        { id: 'legal-docs', label: 'Documents Légaux' },
      ],
    },
    {
      category: 'Système',
      children: [
        { id: 'ai-context', label: 'AI Context' },
        { id: 'cache', label: 'Cache' },
      ],
    },
  ],
};

// Blog Hub internal tabs (inside ContentProductionHub)
// Note: 'tab-ai-creator' is a sub-flow within Posts tab, not a top-level tab
export const BLOG_HUB_TABS = [
  { testId: 'tab-planner', label: 'Planner' },
  { testId: 'tab-topics', label: 'Planned Posts' },
  { testId: 'tab-keywords', label: 'Keywords' },
  { testId: 'tab-posts', label: 'Posts' },
  { testId: 'tab-images', label: 'Image Bank' },
];

// Analytics sub-tabs (inside AnalyticsNewDashboard)
export const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live' },
  { id: 'trends', label: 'Trends' },
  { id: 'geo', label: 'Geography' },
  { id: 'blog', label: 'Blog' },
  { id: 'video', label: 'Video' },
  { id: 'cta', label: 'CTA' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'exclusions', label: 'Exclusions' },
  { id: 'fallback', label: 'Diagnostics' },
];

// Public pages to test (both languages)
export const PUBLIC_PAGES = {
  fr: [
    { path: '/fr-FR', label: 'Homepage FR' },
    { path: '/fr-FR/blog', label: 'Blog Index FR' },
    { path: '/fr-FR/annuaire-pro', label: 'Partner Directory FR' },
    { path: '/fr-FR/annuaire-pro/devenir', label: 'Partner Intake FR' },
    { path: '/fr-FR/travel-upload', label: 'Travel Upload FR' },
    { path: '/fr-FR/gallery', label: 'Gallery FR' },
    { path: '/fr-FR/contact', label: 'Contact FR' },
    { path: '/fr-FR/legal/privacy-policy', label: 'Privacy Policy FR' },
    { path: '/fr-FR/legal/terms-of-service', label: 'Terms of Service FR' },
    { path: '/fr-FR/legal/cookie-policy', label: 'Cookie Policy FR' },
  ],
  en: [
    { path: '/en-US', label: 'Homepage EN' },
    { path: '/en-US/blog', label: 'Blog Index EN' },
    { path: '/en-US/directory-pro', label: 'Partner Directory EN' },
    { path: '/en-US/directory-pro/join', label: 'Partner Intake EN' },
    { path: '/en-US/travel-upload', label: 'Travel Upload EN' },
    { path: '/en-US/gallery', label: 'Gallery EN' },
    { path: '/en-US/contact', label: 'Contact EN' },
    { path: '/en-US/legal/privacy-policy', label: 'Privacy Policy EN' },
    { path: '/en-US/legal/terms-of-service', label: 'Terms of Service EN' },
    { path: '/en-US/legal/cookie-policy', label: 'Cookie Policy EN' },
  ],
};
