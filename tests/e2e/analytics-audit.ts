/**
 * Analytics Dashboard Comprehensive Audit
 *
 * This script performs a systematic audit of ALL tabs, filters, and data sources
 * in the Analytics Dashboard and generates detailed reports.
 *
 * Run: npx tsx tests/e2e/analytics-audit.ts
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  url: 'https://memopyk.memopyk.com',
  adminUrl: 'https://memopyk.memopyk.com/admin',
  password: 'memopyk2025admin',
  viewport: { width: 1920, height: 1080 },
  screenshotsDir: path.join(__dirname, 'screenshots', 'analytics-audit'),
  reportsDir: path.join(__dirname, '..', '..', 'docs', 'analytics'),
  timeout: 60000,
  waitAfterAction: 3000,
};

// Tab definitions matching AnalyticsNewTabNavigation.tsx
const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview', description: 'Main dashboard with KPIs and data source toggle' },
  { id: 'live', label: 'Live View', description: 'Real-time visitor tracking' },
  { id: 'trends', label: 'Trends', description: 'Traffic trends over time' },
  { id: 'video', label: 'Video', description: 'Video performance analytics' },
  { id: 'geo', label: 'Geo', description: 'Geographic distribution' },
  { id: 'cta', label: 'CTA', description: 'Call-to-action tracking' },
  { id: 'blog', label: 'Blog', description: 'Blog post analytics' },
  { id: 'clarity', label: 'Clarity', description: 'Microsoft Clarity integration' },
  { id: 'fallback', label: 'Fallback', description: 'Diagnostics and error handling' },
  { id: 'exclusions', label: 'Exclusions', description: 'IP exclusion management' },
];

const DATE_PRESETS = ['today', 'yesterday', '7d', '30d', '90d', 'custom'] as const;
const LANGUAGES = ['all', 'en', 'fr'] as const;
const COUNTRIES = ['all', 'France', 'United States', 'Canada', 'United Kingdom', 'Germany'] as const;
const DATA_SOURCES = ['ga4', 'memopyk'] as const;

// Rating definitions
type TabRating = 'WORKING' | 'PARTIAL' | 'PLACEHOLDER' | 'BROKEN' | 'EMPTY';

interface TabResult {
  id: string;
  label: string;
  rating: TabRating;
  hasContent: boolean;
  hasKpis: boolean;
  hasCharts: boolean;
  hasTables: boolean;
  consoleErrors: string[];
  apiCalls: string[];
  screenshot: string;
  notes: string[];
  timestamp: string;
}

interface FilterResult {
  filter: string;
  value: string;
  applied: boolean;
  screenshot: string;
  kpiValues?: Record<string, string>;
  notes: string[];
}

interface DataSourceResult {
  source: string;
  kpiValues: Record<string, string>;
  screenshot: string;
  notes: string[];
}

interface ApiHealthResult {
  endpoint: string;
  status: number;
  responseTime: number;
  hasData: boolean;
  error?: string;
}

interface AuditResults {
  timestamp: string;
  duration: number;
  config: typeof CONFIG;
  tabs: TabResult[];
  dataSources: DataSourceResult[];
  dateFilters: FilterResult[];
  languageFilters: FilterResult[];
  countryFilters: FilterResult[];
  apiHealth: ApiHealthResult[];
  summary: {
    totalTabs: number;
    workingTabs: number;
    partialTabs: number;
    placeholderTabs: number;
    brokenTabs: number;
    emptyTabs: number;
    totalConsoleErrors: number;
    totalApiCalls: number;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// BROWSER SETUP
// ============================================================================

async function setupBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MEMOPYK-Audit-Bot',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  return { browser, context, page };
}

// ============================================================================
// LOGIN
// ============================================================================

async function loginToAdmin(page: Page): Promise<boolean> {
  log('Logging into admin panel...');
  try {
    await page.goto(CONFIG.adminUrl);

    // Handle cookie consent if present
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptBtn.click();
      log('Accepted cookie consent');
    }

    // Enter password
    await page.getByLabel(/password/i).fill(CONFIG.password);
    await page.getByRole('button', { name: /access admin/i }).click();

    // Wait for sidebar to confirm login
    await page.waitForSelector('.bg-gray-900.fixed', { timeout: 15000 });
    log('Login successful');
    return true;
  } catch (error) {
    log(`Login failed: ${error}`);
    return false;
  }
}

// ============================================================================
// NAVIGATION
// ============================================================================

async function navigateToAnalytics(page: Page): Promise<boolean> {
  log('Navigating to Analytics Dashboard...');
  try {
    // Click Analytics in sidebar
    const sidebar = page.locator('.bg-gray-900.fixed');
    await sidebar.getByText('Analytics', { exact: true }).click();

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="analytics-new-dashboard"]', { timeout: 10000 });
    await sleep(2000); // Let content settle
    log('Analytics Dashboard loaded');
    return true;
  } catch (error) {
    // Try direct navigation
    log('Sidebar navigation failed, trying direct URL...');
    try {
      await page.goto(`${CONFIG.adminUrl}?section=analytics`);
      await page.waitForSelector('[data-testid="analytics-new-dashboard"]', { timeout: 10000 });
      await sleep(2000);
      log('Analytics Dashboard loaded via direct URL');
      return true;
    } catch (e) {
      log(`Failed to navigate to Analytics: ${e}`);
      return false;
    }
  }
}

// ============================================================================
// PHASE 1: TAB WALKTHROUGH
// ============================================================================

async function auditTabs(page: Page, consoleErrors: string[], apiCalls: string[]): Promise<TabResult[]> {
  log('=== PHASE 1: Tab Walkthrough ===');
  const results: TabResult[] = [];

  for (const tab of ANALYTICS_TABS) {
    log(`Auditing tab: ${tab.label}`);
    const tabErrors: string[] = [];
    const tabApiCalls: string[] = [];
    const notes: string[] = [];

    // Clear console errors for this tab
    const errorsBefore = consoleErrors.length;
    const apiCallsBefore = apiCalls.length;

    try {
      // Click tab
      const tabButton = page.locator(`[data-testid="tab-${tab.id}"]`);
      if (await tabButton.isVisible({ timeout: 3000 })) {
        await tabButton.click();
        await sleep(CONFIG.waitAfterAction);
      } else {
        notes.push('Tab button not found');
      }

      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotsDir, `tab-${tab.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Collect errors for this tab
      tabErrors.push(...consoleErrors.slice(errorsBefore));
      tabApiCalls.push(...apiCalls.slice(apiCallsBefore));

      // Check for content indicators
      const hasContent = await page.locator('.analytics-new-container').count() > 0 ||
                         await page.locator('[class*="space-y"]').first().isVisible().catch(() => false);

      // Check for KPI cards
      const hasKpis = await page.locator('[class*="KpiCard"], [class*="kpi"], [data-testid*="kpi"]').count() > 0 ||
                      await page.locator('text=/\\d+[%]?|\\d+h|\\d+min|\\d+s/').count() > 2;

      // Check for charts
      const hasCharts = await page.locator('svg, canvas, [class*="chart"], [class*="Chart"]').count() > 0;

      // Check for tables
      const hasTables = await page.locator('table, [class*="table"], [role="grid"]').count() > 0;

      // Check for placeholder content
      const isPlaceholder = await page.locator('text=/coming soon|placeholder|not yet|integration|will be/i').count() > 0;

      // Check for empty state
      const isEmpty = await page.locator('text=/no data|no results|empty|nothing to show/i').count() > 0;

      // Check for error state
      const hasError = await page.locator('text=/error|failed|something went wrong/i').count() > 0 ||
                       tabErrors.length > 0;

      // Determine rating
      let rating: TabRating;
      if (hasError && !hasContent) {
        rating = 'BROKEN';
        notes.push('Error state detected');
      } else if (isPlaceholder) {
        rating = 'PLACEHOLDER';
        notes.push('Placeholder content detected');
      } else if (isEmpty && !hasKpis && !hasCharts && !hasTables) {
        rating = 'EMPTY';
        notes.push('No data content found');
      } else if (hasKpis || hasCharts || hasTables) {
        rating = tabErrors.length > 0 ? 'PARTIAL' : 'WORKING';
        if (hasKpis) notes.push('Has KPI cards');
        if (hasCharts) notes.push('Has charts');
        if (hasTables) notes.push('Has tables');
      } else if (hasContent) {
        rating = 'PARTIAL';
        notes.push('Has content but limited features');
      } else {
        rating = 'EMPTY';
      }

      results.push({
        id: tab.id,
        label: tab.label,
        rating,
        hasContent,
        hasKpis,
        hasCharts,
        hasTables,
        consoleErrors: tabErrors,
        apiCalls: tabApiCalls,
        screenshot: `tab-${tab.id}.png`,
        notes,
        timestamp: new Date().toISOString(),
      });

      log(`  ${tab.label}: ${rating} (KPIs: ${hasKpis}, Charts: ${hasCharts}, Tables: ${hasTables})`);

    } catch (error) {
      log(`  Error auditing ${tab.label}: ${error}`);
      results.push({
        id: tab.id,
        label: tab.label,
        rating: 'BROKEN',
        hasContent: false,
        hasKpis: false,
        hasCharts: false,
        hasTables: false,
        consoleErrors: [`Audit error: ${error}`],
        apiCalls: [],
        screenshot: '',
        notes: [`Audit failed: ${error}`],
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

// ============================================================================
// HELPER: Navigate to Overview Tab
// ============================================================================

async function ensureOverviewTab(page: Page): Promise<boolean> {
  log('Ensuring Overview tab is active...');

  // First, try clicking the tab directly
  try {
    const overviewTab = page.locator('[data-testid="tab-overview"]');
    await overviewTab.waitFor({ state: 'visible', timeout: 5000 });
    await overviewTab.click();
    await sleep(3000);
    log('Overview tab clicked successfully');
    return true;
  } catch (e) {
    log(`Direct tab click failed: ${e}`);
  }

  // If that fails, try reloading the page
  try {
    log('Reloading Analytics page...');
    await page.goto(`${CONFIG.adminUrl}?section=analytics`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="analytics-new-dashboard"]', { timeout: 15000 });
    await sleep(3000);

    // Click overview tab after reload
    const overviewTab = page.locator('[data-testid="tab-overview"]');
    await overviewTab.waitFor({ state: 'visible', timeout: 5000 });
    await overviewTab.click();
    await sleep(3000);
    log('Overview tab loaded after reload');
    return true;
  } catch (e) {
    log(`Reload also failed: ${e}`);
    return false;
  }
}

// ============================================================================
// PHASE 2: DATA SOURCE TOGGLE
// ============================================================================

async function auditDataSources(page: Page): Promise<DataSourceResult[]> {
  log('=== PHASE 2: Data Source Toggle ===');
  const results: DataSourceResult[] = [];

  // Navigate to Overview tab first and wait for content to load
  const navSuccess = await ensureOverviewTab(page);
  if (!navSuccess) {
    log('Could not navigate to Overview tab for data source testing');
    return [{
      source: 'ga4',
      kpiValues: {},
      screenshot: '',
      notes: ['Failed to navigate to Overview tab'],
    }, {
      source: 'memopyk',
      kpiValues: {},
      screenshot: '',
      notes: ['Failed to navigate to Overview tab'],
    }];
  }

  for (const source of DATA_SOURCES) {
    log(`Testing data source: ${source.toUpperCase()}`);
    const notes: string[] = [];

    try {
      // Find and toggle data source using the switch component
      const toggle = page.locator('[data-testid="toggle-data-source"]');
      if (await toggle.isVisible({ timeout: 5000 })) {
        // Get current state - switch is "checked" when memopyk is selected
        const isCurrentlyMemopyk = await toggle.getAttribute('data-state') === 'checked';
        const needsToggle = (source === 'memopyk' && !isCurrentlyMemopyk) ||
                           (source === 'ga4' && isCurrentlyMemopyk);

        if (needsToggle) {
          await toggle.click();
          await sleep(CONFIG.waitAfterAction);
          notes.push(`Toggled to ${source.toUpperCase()}`);
        } else {
          notes.push(`Already on ${source.toUpperCase()}`);
        }
      } else {
        notes.push('Data source toggle not found');
      }

      // Capture KPI values from the Overview KPIs section
      const kpiValues: Record<string, string> = {};

      // Try to extract visible KPI values from the Overview
      const kpiCards = await page.locator('.grid > div, [class*="Card"]').all();
      for (let i = 0; i < Math.min(kpiCards.length, 10); i++) {
        const text = await kpiCards[i].textContent();
        if (text && text.length > 5) {
          kpiValues[`kpi_${i}`] = text.trim().substring(0, 200);
        }
      }

      // Also try to capture specific KPI values
      const activeUsersText = await page.locator('[data-testid="active-users-badge"]').textContent().catch(() => '');
      if (activeUsersText) {
        kpiValues['active_users'] = activeUsersText.trim();
      }

      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotsDir, `datasource-${source}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      results.push({
        source,
        kpiValues,
        screenshot: `datasource-${source}.png`,
        notes,
      });

      log(`  ${source.toUpperCase()}: Captured ${Object.keys(kpiValues).length} KPIs`);

    } catch (error) {
      log(`  Error testing ${source}: ${error}`);
      results.push({
        source,
        kpiValues: {},
        screenshot: '',
        notes: [`Error: ${error}`],
      });
    }
  }

  return results;
}

// ============================================================================
// PHASE 3: DATE RANGE FILTERS
// ============================================================================

async function auditDateFilters(page: Page): Promise<FilterResult[]> {
  log('=== PHASE 3: Date Range Filters ===');
  const results: FilterResult[] = [];

  // Ensure we're on Overview tab first (filters are visible there)
  await ensureOverviewTab(page);

  for (const preset of DATE_PRESETS) {
    if (preset === 'custom') {
      // Handle custom date range separately
      log(`Testing date filter: Custom (Jan 1-31 2026)`);
      try {
        const customBtn = page.locator('[data-testid="filter-preset-custom"]');
        if (await customBtn.isVisible({ timeout: 3000 })) {
          await customBtn.click();
          await sleep(1000);

          // Set custom start date
          const startInput = page.locator('[data-testid="filter-custom-start"]');
          if (await startInput.isVisible({ timeout: 2000 })) {
            await startInput.fill('01/01/2026');
          }

          // Set custom end date
          const endInput = page.locator('[data-testid="filter-custom-end"]');
          if (await endInput.isVisible({ timeout: 2000 })) {
            await endInput.fill('31/01/2026');
          }

          await sleep(CONFIG.waitAfterAction);

          const screenshotPath = path.join(CONFIG.screenshotsDir, `date-custom.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          results.push({
            filter: 'date',
            value: 'custom (Jan 1-31 2026)',
            applied: true,
            screenshot: `date-custom.png`,
            notes: ['Custom date range applied'],
          });
        }
      } catch (error) {
        log(`  Error with custom date: ${error}`);
        results.push({
          filter: 'date',
          value: 'custom',
          applied: false,
          screenshot: '',
          notes: [`Error: ${error}`],
        });
      }
    } else {
      log(`Testing date filter: ${preset}`);
      try {
        const presetBtn = page.locator(`[data-testid="filter-preset-${preset}"]`);
        if (await presetBtn.isVisible({ timeout: 3000 })) {
          await presetBtn.click();
          await sleep(CONFIG.waitAfterAction);

          const screenshotPath = path.join(CONFIG.screenshotsDir, `date-${preset}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          results.push({
            filter: 'date',
            value: preset,
            applied: true,
            screenshot: `date-${preset}.png`,
            notes: [],
          });

          log(`  ${preset}: Applied successfully`);
        } else {
          results.push({
            filter: 'date',
            value: preset,
            applied: false,
            screenshot: '',
            notes: ['Button not found'],
          });
        }
      } catch (error) {
        log(`  Error with ${preset}: ${error}`);
        results.push({
          filter: 'date',
          value: preset,
          applied: false,
          screenshot: '',
          notes: [`Error: ${error}`],
        });
      }
    }
  }

  return results;
}

// ============================================================================
// PHASE 4: LANGUAGE/COUNTRY FILTERS
// ============================================================================

async function auditLanguageFilters(page: Page): Promise<FilterResult[]> {
  log('=== PHASE 4a: Language Filters ===');
  const results: FilterResult[] = [];

  // Ensure we're on Overview tab first (filters are visible there)
  await ensureOverviewTab(page);

  for (const lang of LANGUAGES) {
    log(`Testing language filter: ${lang.toUpperCase()}`);
    try {
      const langBtn = page.locator(`[data-testid="filter-language-${lang}"]`);
      if (await langBtn.isVisible({ timeout: 3000 })) {
        await langBtn.click();
        await sleep(CONFIG.waitAfterAction);

        const screenshotPath = path.join(CONFIG.screenshotsDir, `lang-${lang}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        results.push({
          filter: 'language',
          value: lang,
          applied: true,
          screenshot: `lang-${lang}.png`,
          notes: [],
        });

        log(`  ${lang.toUpperCase()}: Applied successfully`);
      } else {
        results.push({
          filter: 'language',
          value: lang,
          applied: false,
          screenshot: '',
          notes: ['Button not found'],
        });
      }
    } catch (error) {
      log(`  Error with ${lang}: ${error}`);
      results.push({
        filter: 'language',
        value: lang,
        applied: false,
        screenshot: '',
        notes: [`Error: ${error}`],
      });
    }
  }

  return results;
}

async function auditCountryFilters(page: Page): Promise<FilterResult[]> {
  log('=== PHASE 4b: Country Filters ===');
  const results: FilterResult[] = [];

  // Ensure we're on Overview tab first (filters are visible there)
  await ensureOverviewTab(page);

  for (const country of COUNTRIES) {
    log(`Testing country filter: ${country}`);
    try {
      // Open country dropdown
      const countryTrigger = page.locator('[data-testid="filter-country"]');
      if (await countryTrigger.isVisible({ timeout: 3000 })) {
        await countryTrigger.click();
        await sleep(500);

        // Select country option
        const countryOption = page.locator(`[role="option"]:has-text("${country}")`).first();
        if (await countryOption.isVisible({ timeout: 2000 })) {
          await countryOption.click();
          await sleep(CONFIG.waitAfterAction);

          const screenshotPath = path.join(CONFIG.screenshotsDir, `country-${sanitizeFilename(country)}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          results.push({
            filter: 'country',
            value: country,
            applied: true,
            screenshot: `country-${sanitizeFilename(country)}.png`,
            notes: [],
          });

          log(`  ${country}: Applied successfully`);
        } else {
          // Click away to close dropdown
          await page.keyboard.press('Escape');
          results.push({
            filter: 'country',
            value: country,
            applied: false,
            screenshot: '',
            notes: ['Option not found in dropdown'],
          });
        }
      } else {
        results.push({
          filter: 'country',
          value: country,
          applied: false,
          screenshot: '',
          notes: ['Country dropdown not found'],
        });
      }
    } catch (error) {
      log(`  Error with ${country}: ${error}`);
      await page.keyboard.press('Escape').catch(() => {});
      results.push({
        filter: 'country',
        value: country,
        applied: false,
        screenshot: '',
        notes: [`Error: ${error}`],
      });
    }
  }

  return results;
}

// ============================================================================
// PHASE 5: API HEALTH CHECK
// ============================================================================

async function checkApiHealth(page: Page): Promise<ApiHealthResult[]> {
  log('=== PHASE 6: API Health Check ===');
  const results: ApiHealthResult[] = [];

  const endpoints = [
    '/api/admin/analytics/overview',
    '/api/admin/analytics/kpis',
    '/api/admin/analytics/sessions',
    '/api/admin/analytics/video-stats',
    '/api/admin/analytics/geographic',
    '/api/admin/analytics/realtime',
    '/api/admin/analytics/trends',
    '/api/admin/analytics/exclusions',
    '/api/ga4/realtime',
    '/api/ga4/kpis',
  ];

  for (const endpoint of endpoints) {
    log(`Testing endpoint: ${endpoint}`);
    try {
      const startTime = Date.now();
      const response = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          const text = await res.text();
          let data = null;
          try { data = JSON.parse(text); } catch {}
          return {
            status: res.status,
            ok: res.ok,
            hasData: data !== null && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0),
          };
        } catch (e) {
          return { status: 0, ok: false, hasData: false, error: String(e) };
        }
      }, `${CONFIG.url}${endpoint}`);
      const responseTime = Date.now() - startTime;

      results.push({
        endpoint,
        status: response.status,
        responseTime,
        hasData: response.hasData,
        error: response.error,
      });

      log(`  ${endpoint}: ${response.status} (${responseTime}ms, hasData: ${response.hasData})`);
    } catch (error) {
      results.push({
        endpoint,
        status: 0,
        responseTime: 0,
        hasData: false,
        error: String(error),
      });
    }
  }

  return results;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(results: AuditResults): string {
  const { tabs, dataSources, dateFilters, languageFilters, countryFilters, apiHealth, summary } = results;

  let md = `# Analytics Dashboard Audit Report

**Generated:** ${results.timestamp}
**Duration:** ${(results.duration / 1000).toFixed(1)} seconds
**URL:** ${CONFIG.url}

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Tabs | ${summary.totalTabs} |
| Working | ${summary.workingTabs} |
| Partial | ${summary.partialTabs} |
| Placeholder | ${summary.placeholderTabs} |
| Broken | ${summary.brokenTabs} |
| Empty | ${summary.emptyTabs} |
| Console Errors | ${summary.totalConsoleErrors} |
| API Calls Captured | ${summary.totalApiCalls} |

---

## Tab Audit Results

| Tab | Rating | KPIs | Charts | Tables | Notes |
|-----|--------|------|--------|--------|-------|
`;

  for (const tab of tabs) {
    const ratingEmoji = {
      'WORKING': '✅',
      'PARTIAL': '⚠️',
      'PLACEHOLDER': '🔲',
      'BROKEN': '❌',
      'EMPTY': '⬜',
    }[tab.rating];

    md += `| ${tab.label} | ${ratingEmoji} ${tab.rating} | ${tab.hasKpis ? '✓' : '✗'} | ${tab.hasCharts ? '✓' : '✗'} | ${tab.hasTables ? '✓' : '✗'} | ${tab.notes.slice(0, 2).join(', ')} |\n`;
  }

  md += `
---

## Data Source Toggle (Overview Tab)

| Source | KPIs Captured | Notes |
|--------|---------------|-------|
`;

  for (const ds of dataSources) {
    md += `| ${ds.source.toUpperCase()} | ${Object.keys(ds.kpiValues).length} | ${ds.notes.join(', ')} |\n`;
  }

  md += `
---

## Date Range Filters

| Preset | Applied | Screenshot |
|--------|---------|------------|
`;

  for (const df of dateFilters) {
    md += `| ${df.value} | ${df.applied ? '✅' : '❌'} | ${df.screenshot || 'N/A'} |\n`;
  }

  md += `
---

## Language Filters

| Language | Applied | Screenshot |
|----------|---------|------------|
`;

  for (const lf of languageFilters) {
    md += `| ${lf.value.toUpperCase()} | ${lf.applied ? '✅' : '❌'} | ${lf.screenshot || 'N/A'} |\n`;
  }

  md += `
---

## Country Filters

| Country | Applied | Screenshot |
|---------|---------|------------|
`;

  for (const cf of countryFilters) {
    md += `| ${cf.value} | ${cf.applied ? '✅' : '❌'} | ${cf.screenshot || 'N/A'} |\n`;
  }

  md += `
---

## API Health Check

| Endpoint | Status | Response Time | Has Data |
|----------|--------|---------------|----------|
`;

  for (const api of apiHealth) {
    const statusEmoji = api.status >= 200 && api.status < 300 ? '✅' : api.status >= 400 ? '❌' : '⚠️';
    md += `| ${api.endpoint} | ${statusEmoji} ${api.status} | ${api.responseTime}ms | ${api.hasData ? '✓' : '✗'} |\n`;
  }

  md += `
---

## Detailed Tab Analysis

`;

  for (const tab of tabs) {
    md += `### ${tab.label} (${tab.rating})

- **Screenshot:** \`${tab.screenshot}\`
- **Has KPIs:** ${tab.hasKpis ? 'Yes' : 'No'}
- **Has Charts:** ${tab.hasCharts ? 'Yes' : 'No'}
- **Has Tables:** ${tab.hasTables ? 'Yes' : 'No'}
- **Console Errors:** ${tab.consoleErrors.length}
- **Notes:** ${tab.notes.join(', ') || 'None'}

`;
  }

  md += `
---

## Screenshots

All screenshots saved to: \`tests/e2e/screenshots/analytics-audit/\`

---

*Generated by Analytics Audit Script v1.0*
`;

  return md;
}

function generateHtmlReport(results: AuditResults): string {
  const { tabs, dataSources, dateFilters, languageFilters, countryFilters, apiHealth, summary } = results;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Dashboard Audit Report</title>
  <style>
    :root {
      --green: #22c55e;
      --yellow: #eab308;
      --red: #ef4444;
      --blue: #3b82f6;
      --gray: #6b7280;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f9fafb;
      color: #111827;
    }
    h1, h2, h3 { color: #1f2937; }
    .header {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .header h1 { color: white; margin: 0 0 1rem 0; }
    .meta { opacity: 0.9; font-size: 0.9rem; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .summary-card .value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--blue);
    }
    .summary-card .label { color: var(--gray); font-size: 0.85rem; }
    .summary-card.working .value { color: var(--green); }
    .summary-card.broken .value { color: var(--red); }
    .summary-card.partial .value { color: var(--yellow); }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f3f4f6; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-working { background: #dcfce7; color: #166534; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .badge-placeholder { background: #e5e7eb; color: #374151; }
    .badge-broken { background: #fee2e2; color: #991b1b; }
    .badge-empty { background: #f3f4f6; color: #6b7280; }
    .check { color: var(--green); }
    .cross { color: var(--red); }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .section h2 { margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .screenshot-card {
      background: #f3f4f6;
      border-radius: 8px;
      overflow: hidden;
    }
    .screenshot-card img {
      width: 100%;
      height: auto;
      display: block;
    }
    .screenshot-card .caption {
      padding: 0.5rem;
      font-size: 0.85rem;
      color: var(--gray);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Dashboard Audit Report</h1>
    <div class="meta">
      <strong>Generated:</strong> ${results.timestamp}<br>
      <strong>Duration:</strong> ${(results.duration / 1000).toFixed(1)} seconds<br>
      <strong>URL:</strong> ${CONFIG.url}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${summary.totalTabs}</div>
      <div class="label">Total Tabs</div>
    </div>
    <div class="summary-card working">
      <div class="value">${summary.workingTabs}</div>
      <div class="label">Working</div>
    </div>
    <div class="summary-card partial">
      <div class="value">${summary.partialTabs}</div>
      <div class="label">Partial</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.placeholderTabs}</div>
      <div class="label">Placeholder</div>
    </div>
    <div class="summary-card broken">
      <div class="value">${summary.brokenTabs}</div>
      <div class="label">Broken</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.emptyTabs}</div>
      <div class="label">Empty</div>
    </div>
  </div>

  <div class="section">
    <h2>Tab Audit Results</h2>
    <table>
      <thead>
        <tr>
          <th>Tab</th>
          <th>Rating</th>
          <th>KPIs</th>
          <th>Charts</th>
          <th>Tables</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${tabs.map(tab => `
        <tr>
          <td><strong>${tab.label}</strong></td>
          <td><span class="badge badge-${tab.rating.toLowerCase()}">${tab.rating}</span></td>
          <td>${tab.hasKpis ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          <td>${tab.hasCharts ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          <td>${tab.hasTables ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          <td>${tab.notes.slice(0, 2).join(', ')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Data Source Toggle</h2>
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>KPIs Captured</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${dataSources.map(ds => `
        <tr>
          <td><strong>${ds.source.toUpperCase()}</strong></td>
          <td>${Object.keys(ds.kpiValues).length}</td>
          <td>${ds.notes.join(', ')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Date Range Filters</h2>
    <table>
      <thead>
        <tr>
          <th>Preset</th>
          <th>Applied</th>
          <th>Screenshot</th>
        </tr>
      </thead>
      <tbody>
        ${dateFilters.map(df => `
        <tr>
          <td><strong>${df.value}</strong></td>
          <td>${df.applied ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          <td>${df.screenshot || 'N/A'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Language & Country Filters</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <table>
        <thead>
          <tr>
            <th>Language</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          ${languageFilters.map(lf => `
          <tr>
            <td><strong>${lf.value.toUpperCase()}</strong></td>
            <td>${lf.applied ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          ${countryFilters.map(cf => `
          <tr>
            <td><strong>${cf.value}</strong></td>
            <td>${cf.applied ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>API Health Check</h2>
    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Status</th>
          <th>Response Time</th>
          <th>Has Data</th>
        </tr>
      </thead>
      <tbody>
        ${apiHealth.map(api => `
        <tr>
          <td><code>${api.endpoint}</code></td>
          <td>${api.status >= 200 && api.status < 300 ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'} ${api.status}</td>
          <td>${api.responseTime}ms</td>
          <td>${api.hasData ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <footer style="text-align: center; color: var(--gray); padding: 2rem 0;">
    Generated by Analytics Audit Script v1.0
  </footer>
</body>
</html>`;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAudit(): Promise<void> {
  const startTime = Date.now();
  log('Starting Analytics Dashboard Audit...');

  // Ensure directories exist
  ensureDir(CONFIG.screenshotsDir);
  ensureDir(CONFIG.reportsDir);

  let browser: Browser | null = null;
  const consoleErrors: string[] = [];
  const apiCalls: string[] = [];

  try {
    // Setup browser
    const { browser: b, context, page } = await setupBrowser();
    browser = b;

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for API calls
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    // Login
    const loginSuccess = await loginToAdmin(page);
    if (!loginSuccess) {
      throw new Error('Login failed');
    }

    // Navigate to Analytics
    const navSuccess = await navigateToAnalytics(page);
    if (!navSuccess) {
      throw new Error('Failed to navigate to Analytics Dashboard');
    }

    // Take initial screenshot
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'initial-state.png'),
      fullPage: false
    });

    // Run audit phases
    const tabResults = await auditTabs(page, consoleErrors, apiCalls);
    const dataSourceResults = await auditDataSources(page);
    const dateFilterResults = await auditDateFilters(page);
    const languageFilterResults = await auditLanguageFilters(page);
    const countryFilterResults = await auditCountryFilters(page);
    const apiHealthResults = await checkApiHealth(page);

    // Calculate summary
    const summary = {
      totalTabs: tabResults.length,
      workingTabs: tabResults.filter(t => t.rating === 'WORKING').length,
      partialTabs: tabResults.filter(t => t.rating === 'PARTIAL').length,
      placeholderTabs: tabResults.filter(t => t.rating === 'PLACEHOLDER').length,
      brokenTabs: tabResults.filter(t => t.rating === 'BROKEN').length,
      emptyTabs: tabResults.filter(t => t.rating === 'EMPTY').length,
      totalConsoleErrors: consoleErrors.length,
      totalApiCalls: apiCalls.length,
    };

    // Compile results
    const results: AuditResults = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      config: CONFIG,
      tabs: tabResults,
      dataSources: dataSourceResults,
      dateFilters: dateFilterResults,
      languageFilters: languageFilterResults,
      countryFilters: countryFilterResults,
      apiHealth: apiHealthResults,
      summary,
    };

    // Generate reports
    log('Generating reports...');

    // JSON report
    const jsonPath = path.join(CONFIG.screenshotsDir, 'audit-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    log(`JSON report saved: ${jsonPath}`);

    // Markdown report
    const mdReport = generateMarkdownReport(results);
    const mdPath = path.join(CONFIG.reportsDir, 'ANALYTICS_AUDIT_REPORT.md');
    fs.writeFileSync(mdPath, mdReport);
    log(`Markdown report saved: ${mdPath}`);

    // HTML report
    const htmlReport = generateHtmlReport(results);
    const htmlPath = path.join(CONFIG.reportsDir, 'ANALYTICS_AUDIT_REPORT.html');
    fs.writeFileSync(htmlPath, htmlReport);
    log(`HTML report saved: ${htmlPath}`);

    // Print summary
    log('');
    log('=== AUDIT COMPLETE ===');
    log(`Duration: ${(results.duration / 1000).toFixed(1)} seconds`);
    log(`Total Tabs: ${summary.totalTabs}`);
    log(`  Working: ${summary.workingTabs}`);
    log(`  Partial: ${summary.partialTabs}`);
    log(`  Placeholder: ${summary.placeholderTabs}`);
    log(`  Broken: ${summary.brokenTabs}`);
    log(`  Empty: ${summary.emptyTabs}`);
    log(`Console Errors: ${summary.totalConsoleErrors}`);
    log(`API Calls: ${summary.totalApiCalls}`);
    log('');
    log('Reports generated:');
    log(`  - ${jsonPath}`);
    log(`  - ${mdPath}`);
    log(`  - ${htmlPath}`);
    log(`  - Screenshots: ${CONFIG.screenshotsDir}/`);

  } catch (error) {
    log(`AUDIT FAILED: ${error}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the audit
runAudit();
