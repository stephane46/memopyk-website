import { test } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import { STAGING_URL, ANALYTICS_TABS, ADMIN_SCREENSHOTS_DIR } from './smoke-test-config';
import { SmokeResult, takeScreenshot, scanForBadText, checkPageHealth, waitForPageReady, setupConsoleCapture, ensureDir } from './smoke-test-utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Admin Smoke Test - Analytics Tabs', () => {
  test.setTimeout(120000); // 2 minutes

  test('Visit all 10 Analytics sub-tabs', async ({ page }) => {
    const results: SmokeResult[] = [];

    // Ensure output directory exists
    ensureDir(ADMIN_SCREENSHOTS_DIR);

    // Login first
    console.log('Logging in to admin...');
    await loginToAdmin(page);
    await page.waitForTimeout(2000);

    // Test all Analytics tabs
    console.log('\n=== ANALYTICS TABS ===');
    for (const tab of ANALYTICS_TABS) {
      await testAnalyticsTab(page, results, tab.id, tab.label);
    }

    // Write results JSON
    const outputPath = path.join('test-results', 'smoke-test', 'admin-analytics-results.json');
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\n=== ANALYTICS SMOKE TEST COMPLETE ===`);
    console.log(`Total tabs tested: ${results.length}`);
    console.log(`PASS: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`WARN: ${results.filter(r => r.status === 'WARN').length}`);
    console.log(`FAIL: ${results.filter(r => r.status === 'FAIL').length}`);
    console.log(`ERROR: ${results.filter(r => r.status === 'ERROR').length}`);
    console.log(`Results written to: ${outputPath}`);
  });
});

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
    await waitForPageReady(page, 15000);

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
