import { test } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import { STAGING_URL, ADMIN_SECTIONS, BLOG_HUB_TABS, ANALYTICS_TABS, ADMIN_SCREENSHOTS_DIR } from './smoke-test-config';
import { SmokeResult, takeScreenshot, scanForBadText, checkPageHealth, waitForPageReady, setupConsoleCapture, ensureDir } from './smoke-test-utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Admin Smoke Test', () => {
  test.setTimeout(300000); // 5 minutes total

  test('Visit all 29 admin screens and capture issues', async ({ page }) => {
    const results: SmokeResult[] = [];

    // Ensure output directory exists
    ensureDir(ADMIN_SCREENSHOTS_DIR);

    // Login first
    console.log('Logging in to admin...');
    await loginToAdmin(page);
    await page.waitForTimeout(2000); // Let sidebar settle

    // ========================================
    // 1. MAIN ADMIN SECTIONS (13 sections)
    // ========================================

    // Direct link sections (3)
    for (const section of ADMIN_SECTIONS.directLinks) {
      await testMainSection(page, results, section.id, section.label);
    }

    // Collapsible sections (10)
    for (const category of ADMIN_SECTIONS.collapsible) {
      for (const section of category.children) {
        await testMainSection(page, results, section.id, section.label);
      }
    }

    // ========================================
    // 2. BLOG HUB INTERNAL TABS (6 tabs)
    // ========================================

    // Navigate to Blog Hub first
    console.log('\n=== BLOG HUB TABS ===');
    const blogUrl = `${STAGING_URL}/en-US/admin?tab=blog`;
    await page.goto(blogUrl, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    for (const tab of BLOG_HUB_TABS) {
      await testBlogTab(page, results, tab.testId, tab.label);
    }

    // ========================================
    // 3. ANALYTICS SUB-TABS (10 tabs)
    // ========================================

    console.log('\n=== ANALYTICS TABS ===');
    for (const tab of ANALYTICS_TABS) {
      await testAnalyticsTab(page, results, tab.id, tab.label);
    }

    // ========================================
    // Write results JSON
    // ========================================

    const outputPath = path.join('test-results', 'smoke-test', 'admin-results.json');
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\n=== SMOKE TEST COMPLETE ===`);
    console.log(`Total screens tested: ${results.length}`);
    console.log(`PASS: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`WARN: ${results.filter(r => r.status === 'WARN').length}`);
    console.log(`FAIL: ${results.filter(r => r.status === 'FAIL').length}`);
    console.log(`ERROR: ${results.filter(r => r.status === 'ERROR').length}`);
    console.log(`Results written to: ${outputPath}`);
  });
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Test a main admin section by URL navigation
 */
async function testMainSection(page: any, results: SmokeResult[], sectionId: string, label: string) {
  const startTime = Date.now();
  const url = `${STAGING_URL}/en-US/admin?tab=${sectionId}`;
  const consoleErrors: string[] = [];

  console.log(`\nTesting: ${label} (${sectionId})`);

  try {
    // Set up console capture before navigation
    setupConsoleCapture(page).forEach((err: string) => consoleErrors.push(err));

    // Navigate to section
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPageReady(page);

    const loadTimeMs = Date.now() - startTime;

    // Take screenshot
    const screenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `${sectionId}`);

    // Scan for bad text
    const badTextFound = await scanForBadText(page);

    // Check for missing elements (section-specific)
    const missingElements = await checkMissingElements(page, sectionId);

    // Check page health
    const healthIssues = await checkPageHealth(page);
    missingElements.push(...healthIssues);

    // Determine status
    let status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR' = 'PASS';
    if (badTextFound.length > 0 || missingElements.length > 0) {
      status = 'FAIL';
    } else if (consoleErrors.length > 0) {
      status = 'WARN';
    }

    results.push({
      id: sectionId,
      label,
      url,
      status,
      screenshot,
      loadTimeMs,
      badTextFound,
      consoleErrors,
      missingElements,
      notes: [],
    });

    console.log(`  Status: ${status}, Load: ${loadTimeMs}ms, Issues: ${badTextFound.length + missingElements.length + consoleErrors.length}`);
  } catch (error: any) {
    // Navigation or load failure
    const loadTimeMs = Date.now() - startTime;
    const errorScreenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `${sectionId}-error`).catch(() => 'error.png');

    results.push({
      id: sectionId,
      label,
      url,
      status: 'ERROR',
      screenshot: errorScreenshot,
      loadTimeMs,
      badTextFound: [],
      consoleErrors,
      missingElements: [],
      notes: [`Failed to load: ${error.message}`],
    });

    console.log(`  Status: ERROR - ${error.message}`);
  }
}

/**
 * Test a Blog Hub internal tab by clicking test ID
 */
async function testBlogTab(page: any, results: SmokeResult[], testId: string, label: string) {
  const startTime = Date.now();
  const consoleErrors: string[] = [];

  console.log(`\nTesting Blog Tab: ${label} (${testId})`);

  try {
    // Set up console capture
    setupConsoleCapture(page).forEach((err: string) => consoleErrors.push(err));

    // Wait a bit for tab to be available (they might lazy load)
    await page.waitForTimeout(500);

    // Try to find the tab (it might be out of viewport)
    const tab = page.getByTestId(testId);
    const tabExists = await tab.count().then(c => c > 0);

    if (!tabExists) {
      throw new Error(`Tab ${testId} not found in DOM`);
    }

    // Scroll the tab into view before clicking
    await tab.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});

    // Click tab with timeout
    await tab.click({ timeout: 10000 });
    await waitForPageReady(page, 10000);

    const loadTimeMs = Date.now() - startTime;
    const url = page.url();

    // Take screenshot
    const screenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `blog-${testId}`);

    // Scan for bad text
    const badTextFound = await scanForBadText(page);

    // Check for missing elements (tab-specific)
    const missingElements = await checkBlogTabElements(page, testId);

    // Check page health
    const healthIssues = await checkPageHealth(page);
    missingElements.push(...healthIssues);

    // Determine status
    let status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR' = 'PASS';
    if (badTextFound.length > 0 || missingElements.length > 0) {
      status = 'FAIL';
    } else if (consoleErrors.length > 0) {
      status = 'WARN';
    }

    results.push({
      id: `blog-${testId}`,
      label: `Blog Hub - ${label}`,
      url,
      status,
      screenshot,
      loadTimeMs,
      badTextFound,
      consoleErrors,
      missingElements,
      notes: [],
    });

    console.log(`  Status: ${status}, Load: ${loadTimeMs}ms, Issues: ${badTextFound.length + missingElements.length + consoleErrors.length}`);
  } catch (error: any) {
    const loadTimeMs = Date.now() - startTime;
    const errorScreenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `blog-${testId}-error`).catch(() => 'error.png');
    const url = page.url();

    results.push({
      id: `blog-${testId}`,
      label: `Blog Hub - ${label}`,
      url,
      status: 'ERROR',
      screenshot: errorScreenshot,
      loadTimeMs,
      badTextFound: [],
      consoleErrors,
      missingElements: [],
      notes: [`Failed to load tab: ${error.message}`],
    });

    console.log(`  Status: ERROR - ${error.message}`);
  }
}

/**
 * Test an Analytics sub-tab by URL navigation
 */
async function testAnalyticsTab(page: any, results: SmokeResult[], tabId: string, label: string) {
  const startTime = Date.now();
  const url = `${STAGING_URL}/en-US/admin?tab=analytics-new&an_tab=${tabId}`;
  const consoleErrors: string[] = [];

  console.log(`\nTesting Analytics Tab: ${label} (${tabId})`);

  try {
    // Set up console capture
    setupConsoleCapture(page).forEach((err: string) => consoleErrors.push(err));

    // Navigate to analytics tab
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPageReady(page);

    const loadTimeMs = Date.now() - startTime;

    // Take screenshot
    const screenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `analytics-${tabId}`);

    // Scan for bad text
    const badTextFound = await scanForBadText(page);

    // Check for missing elements (tab-specific)
    const missingElements = await checkAnalyticsTabElements(page, tabId);

    // Check page health
    const healthIssues = await checkPageHealth(page);
    missingElements.push(...healthIssues);

    // Determine status
    let status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR' = 'PASS';
    if (badTextFound.length > 0 || missingElements.length > 0) {
      status = 'FAIL';
    } else if (consoleErrors.length > 0) {
      status = 'WARN';
    }

    results.push({
      id: `analytics-${tabId}`,
      label: `Analytics - ${label}`,
      url,
      status,
      screenshot,
      loadTimeMs,
      badTextFound,
      consoleErrors,
      missingElements,
      notes: [],
    });

    console.log(`  Status: ${status}, Load: ${loadTimeMs}ms, Issues: ${badTextFound.length + missingElements.length + consoleErrors.length}`);
  } catch (error: any) {
    const loadTimeMs = Date.now() - startTime;
    const errorScreenshot = await takeScreenshot(page, ADMIN_SCREENSHOTS_DIR, `analytics-${tabId}-error`).catch(() => 'error.png');

    results.push({
      id: `analytics-${tabId}`,
      label: `Analytics - ${label}`,
      url,
      status: 'ERROR',
      screenshot: errorScreenshot,
      loadTimeMs,
      badTextFound: [],
      consoleErrors,
      missingElements: [],
      notes: [`Failed to load tab: ${error.message}`],
    });

    console.log(`  Status: ERROR - ${error.message}`);
  }
}

/**
 * Check for section-specific missing elements
 * Focus on checking that the component LOADED and has visible content,
 * not on specific CSS classes that might change.
 */
async function checkMissingElements(page: any, sectionId: string): Promise<string[]> {
  const missing: string[] = [];

  try {
    // Get main content area text (excluding sidebar)
    const mainContent = await page.locator('main, [role="main"], .admin-content').innerText().catch(() => '');
    const hasSubstantialContent = mainContent.trim().length > 50;

    if (!hasSubstantialContent) {
      missing.push('Main content area appears empty or too short');
      return missing; // If no content, don't bother with specific checks
    }

    switch (sectionId) {
      case 'faq':
        // Just check that there are interactive elements (accordion buttons)
        const accordionCount = await page.locator('button, [role="button"]').count();
        if (accordionCount < 3) {
          missing.push('Too few interactive elements for FAQ page');
        }
        break;

      case 'gallery':
        // Check for any form elements (upload/edit controls)
        const hasFormElements = await page.locator('form, input, button').count() > 0;
        if (!hasFormElements) {
          missing.push('No form or controls found in gallery');
        }
        break;

      case 'hero-management':
        // Check for table or card-based content
        const hasContent = await page.locator('table, [class*="card"], form').count() > 0;
        if (!hasContent) {
          missing.push('No content structure found in hero management');
        }
        break;

      case 'partners':
        // Check for Mapbox canvas OR any form/buttons (might be loading or admin mode)
        const mapCanvas = await page.locator('canvas.mapboxgl-canvas').count();
        const hasControls = await page.locator('button, form, input').count() > 0;
        if (mapCanvas === 0 && !hasControls) {
          missing.push('Mapbox map or admin controls not found');
        }
        break;

      case 'cta':
        // Check for buttons or form elements (management UI)
        const hasCtaControls = await page.locator('table, ul, ol, button, form').count() > 0;
        if (!hasCtaControls) {
          missing.push('No controls or data structure found in CTA management');
        }
        break;

      case 'why-memopyk':
        // Check for any input/textarea fields OR buttons (editing interface)
        const editableFields = await page.locator('input, textarea').count();
        const whyMemopykButtons = await page.locator('button').count();
        if (editableFields === 0 && whyMemopykButtons === 0) {
          missing.push('No editable fields or controls in Why MEMOPYK');
        }
        break;

      case 'legal-docs':
        // Check for buttons and select elements (document management)
        const controlCount = await page.locator('button, select').count();
        if (controlCount === 0) {
          missing.push('No controls found in legal docs');
        }
        break;

      case 'seo':
        // Check for multiple input fields
        const seoFields = await page.locator('input, textarea').count();
        if (seoFields < 3) {
          missing.push('Too few form fields in SEO section');
        }
        break;

      case 'cache':
        // Check for buttons (cache clear/refresh controls)
        const buttons = await page.locator('button').count();
        if (buttons === 0) {
          missing.push('No control buttons found in cache section');
        }
        break;

      case 'travel-agencies':
        // Check for tab structure
        const tabs = await page.locator('[role="tab"], [role="tablist"] button').count();
        if (tabs === 0) {
          missing.push('No tab structure found in travel agencies');
        }
        break;

      case 'ai-context':
        // Check for any form fields OR buttons (Brand Brain entries)
        const brandBrainFields = await page.locator('input, textarea').count();
        const brandBrainButtons = await page.locator('button').count();
        if (brandBrainFields === 0 && brandBrainButtons === 0) {
          missing.push('No form fields or controls in AI Context');
        }
        break;

      default:
        // For sections we don't have specific checks for, just verify content exists
        break;
    }
  } catch (error) {
    // If element check fails, don't crash — just note it
    missing.push(`Failed to check elements: ${error}`);
  }

  return missing;
}

/**
 * Check for Blog Hub tab-specific elements
 */
async function checkBlogTabElements(page: any, testId: string): Promise<string[]> {
  const missing: string[] = [];

  try {
    switch (testId) {
      case 'tab-posts':
        // Check for posts table OR empty state message
        const postRows = await page.locator('table tbody tr').count();
        const hasTable = await page.locator('table').count() > 0;
        const hasControls = await page.locator('button, input').count() > 0;
        if (postRows === 0 && !hasTable && !hasControls) {
          missing.push('No posts table or controls found');
        }
        break;

      case 'tab-keywords':
        // Check for keyword count badge
        const bodyText = await page.locator('body').innerText();
        const hasKeywordCount = /\d+\s*(keywords?|mots-clés?)/i.test(bodyText);
        if (!hasKeywordCount) {
          missing.push('Keyword count not displayed');
        }
        break;

      case 'tab-topics':
        // Check for topics (may be empty, that's OK)
        break;

      case 'tab-planner':
        // Check for calendar or planner view
        const plannerView = await page.locator('[class*="calendar"], [class*="planner"]').count();
        if (plannerView === 0) {
          // Planner might use generic containers, so just warn if nothing visible
          const anyContent = await page.locator('main, [role="main"]').count();
          if (anyContent === 0) {
            missing.push('No planner content visible');
          }
        }
        break;

      case 'tab-ai-creator':
        // Check for AI creator form or controls
        const aiControls = await page.locator('button, input, textarea').count();
        if (aiControls === 0) {
          missing.push('No AI Creator controls found');
        }
        break;

      case 'tab-images':
        // Check for image bank (may be empty)
        break;
    }
  } catch (error) {
    missing.push(`Failed to check tab elements: ${error}`);
  }

  return missing;
}

/**
 * Check for Analytics tab-specific elements
 */
async function checkAnalyticsTabElements(page: any, tabId: string): Promise<string[]> {
  const missing: string[] = [];

  try {
    // All analytics tabs should have some kind of chart or data display
    const dataViz = await page.locator('canvas, svg, [class*="chart"], [class*="graph"]').count();
    const dataTable = await page.locator('table').count();

    if (dataViz === 0 && dataTable === 0) {
      // Check if there's a "no data" message instead
      const bodyText = await page.locator('body').innerText();
      const hasNoDataMessage = bodyText.toLowerCase().includes('no data') ||
                               bodyText.toLowerCase().includes('aucune donnée') ||
                               bodyText.toLowerCase().includes('pas de données');

      if (!hasNoDataMessage) {
        missing.push('No data visualization or table found');
      }
    }
  } catch (error) {
    missing.push(`Failed to check analytics elements: ${error}`);
  }

  return missing;
}
