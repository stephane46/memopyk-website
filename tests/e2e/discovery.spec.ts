import { test, expect } from '@playwright/test';
import { loginToAdmin, navigateToBlogHub, clickBlogTab, config } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load testid-map.json for expected testids
const testidMapPath = path.join(__dirname, 'testid-map.json');
const testidMap = JSON.parse(fs.readFileSync(testidMapPath, 'utf-8'));

// Tabs to discover (in order)
const TABS = ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images'] as const;
type TabName = typeof TABS[number];

interface TabDiscovery {
  url: string;
  loaded: boolean;
  screenshot: string;
  headings: string[];
  counters: Record<string, string>;
  testidsFound: string[];
  testidsExpected: string[];
  testidsMissing: string[];
  testidsExtra: string[];
  errors: string[];
}

interface DiscoveryResult {
  timestamp: string;
  baseUrl: string;
  tabs: Record<string, TabDiscovery>;
  summary: {
    tabsLoaded: number;
    tabsFailed: number;
    totalTestidsFound: number;
    totalTestidsMissing: number;
  };
}

// Ensure output directory exists
const outputDir = path.join(process.cwd(), 'test-results', 'discovery');

/**
 * Write discovery results to JSON and MD files
 */
function writeResults(result: DiscoveryResult): void {
  try {
    // Calculate summary
    let totalFound = 0;
    let totalMissing = 0;
    let loaded = 0;
    let failed = 0;

    for (const tab of Object.values(result.tabs)) {
      totalFound += tab.testidsFound.length;
      totalMissing += tab.testidsMissing.length;
      if (tab.loaded) loaded++;
      else failed++;
    }

    result.summary = {
      tabsLoaded: loaded,
      tabsFailed: failed,
      totalTestidsFound: totalFound,
      totalTestidsMissing: totalMissing,
    };

    // Write discovery.json
    const jsonPath = path.join(outputDir, 'discovery.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

    // Generate discovery.md
    generateMarkdownReport(result);

    console.log(`✅ Discovery results written to ${outputDir}`);
  } catch (error) {
    console.error('Failed to write discovery results:', error);
  }
}

test.describe('Blog Hub Discovery Runner', () => {
  // Increase timeout for this test suite (3 minutes)
  test.setTimeout(180000);

  let discoveryResult: DiscoveryResult;

  test.beforeAll(() => {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Initialize discovery result
    discoveryResult = {
      timestamp: new Date().toISOString(),
      baseUrl: config.baseUrl,
      tabs: {},
      summary: {
        tabsLoaded: 0,
        tabsFailed: 0,
        totalTestidsFound: 0,
        totalTestidsMissing: 0,
      },
    };
  });

  test.afterAll(() => {
    // Results are written during test execution now
    // This is just a safety net
    writeResults(discoveryResult);
  });

  test('Login and discover all Blog Hub tabs', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 2560, height: 1440 });

    try {
      // Login
      await loginToAdmin(page);
      await navigateToBlogHub(page);

      // Discover each tab
      for (const tabName of TABS) {
        console.log(`Discovering tab: ${tabName}`);
        const tabResult = await discoverTab(page, tabName);
        discoveryResult.tabs[tabName] = tabResult;
        console.log(`Tab ${tabName}: ${tabResult.loaded ? 'loaded' : 'failed'}`);
      }
    } finally {
      // Write results even if test times out or fails partway
      writeResults(discoveryResult);
    }

    // Verify all tabs loaded (soft assertion - report but don't fail)
    const failedTabs = TABS.filter(t => !discoveryResult.tabs[t]?.loaded);
    if (failedTabs.length > 0) {
      console.warn(`⚠️ Some tabs failed to load: ${failedTabs.join(', ')}`);
    }

    // Only fail if login or Blog Hub itself failed
    expect(Object.keys(discoveryResult.tabs).length).toBeGreaterThan(0);
  });
});

async function discoverTab(page: any, tabName: TabName): Promise<TabDiscovery> {
  const result: TabDiscovery = {
    url: '',
    loaded: false,
    screenshot: `tab-${tabName}.png`,
    headings: [],
    counters: {},
    testidsFound: [],
    testidsExpected: [],
    testidsMissing: [],
    testidsExtra: [],
    errors: [],
  };

  try {
    // Check if tab exists before clicking
    const tabSelector = page.getByTestId(`tab-${tabName}`);
    const tabExists = await tabSelector.isVisible({ timeout: 5000 }).catch(() => false);

    if (!tabExists) {
      result.errors.push(`Tab 'tab-${tabName}' not found on page (may not be deployed yet)`);
      return result;
    }

    // Click the tab
    await clickBlogTab(page, tabName);

    // Get current URL
    result.url = page.url();

    // Wait for content to stabilize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshotPath = path.join(outputDir, result.screenshot);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Collect headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    result.headings = headings.map((h: string) => h.trim()).filter((h: string) => h.length > 0);

    // Collect counters (badges, counts visible on page)
    const badges = await page.locator('[class*="badge"], .text-sm.text-gray-500').allTextContents();
    badges.forEach((badge: string, i: number) => {
      const trimmed = badge.trim();
      if (/\d/.test(trimmed)) {
        result.counters[`counter_${i}`] = trimmed;
      }
    });

    // Collect all visible data-testid values
    const elements = await page.locator('[data-testid]').all();
    for (const el of elements) {
      const testid = await el.getAttribute('data-testid');
      if (testid && await el.isVisible()) {
        result.testidsFound.push(testid);
      }
    }

    // Get expected testids from testid-map.json
    const screenKey = tabName === 'ai-creator' ? 'ai-creator' : tabName;
    const screenData = testidMap.screens[screenKey];
    if (screenData) {
      result.testidsExpected = screenData.existingTestIds || [];
    }

    // Also add hub testids for the tab itself
    const hubTestids = testidMap.screens.hub?.existingTestIds || [];
    const tabTestid = `tab-${tabName}`;
    if (hubTestids.includes(tabTestid)) {
      result.testidsExpected.push(tabTestid);
    }

    // Compare found vs expected (handling dynamic {id} patterns)
    result.testidsMissing = findMissingTestids(result.testidsExpected, result.testidsFound);
    result.testidsExtra = result.testidsFound.filter(
      found => !matchesAnyPattern(found, result.testidsExpected)
    );

    // Check for error states
    const errorElements = await page.locator('.text-red-500, .text-destructive, [role="alert"]').allTextContents();
    result.errors = errorElements.map((e: string) => e.trim()).filter((e: string) => e.length > 0);

    result.loaded = true;
  } catch (error: any) {
    result.errors.push(`Failed to discover tab: ${error.message}`);
    result.loaded = false;

    // Still try to take a screenshot of the error state
    try {
      const errorScreenshot = path.join(outputDir, `tab-${tabName}-error.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      result.screenshot = `tab-${tabName}-error.png`;
    } catch {
      // Ignore screenshot error
    }
  }

  return result;
}

/**
 * Find testids that are expected but not found (handling {id} patterns)
 */
function findMissingTestids(expected: string[], found: string[]): string[] {
  const missing: string[] = [];

  for (const exp of expected) {
    // Skip patterns with {id} placeholders - these are templates, not actual testids
    if (exp.includes('{')) continue;

    // Check if this exact testid was found
    if (!found.includes(exp)) {
      missing.push(exp);
    }
  }

  return missing;
}

/**
 * Check if a testid matches any pattern (including {id} templates)
 */
function matchesAnyPattern(testid: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.includes('{')) {
      // Convert pattern to regex: button-view-{id} -> button-view-.*
      const regex = new RegExp('^' + pattern.replace(/\{[^}]+\}/g, '.*') + '$');
      if (regex.test(testid)) return true;
    } else {
      if (pattern === testid) return true;
    }
  }
  return false;
}

/**
 * Generate discovery.md from results
 */
function generateMarkdownReport(result: DiscoveryResult): void {
  const lines: string[] = [];

  lines.push('# Blog Hub Discovery Report');
  lines.push('');
  lines.push(`**Date:** ${new Date(result.timestamp).toLocaleDateString()}`);
  lines.push(`**Time:** ${new Date(result.timestamp).toLocaleTimeString()}`);
  lines.push(`**URL:** ${result.baseUrl}`);
  lines.push(`**Result:** ${result.summary.tabsLoaded}/${TABS.length} tabs loaded ${result.summary.tabsFailed === 0 ? '✅' : '⚠️'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Tab details
  for (const tabName of TABS) {
    const tab = result.tabs[tabName];
    if (!tab) continue;

    lines.push(`## ${tabName.charAt(0).toUpperCase() + tabName.slice(1).replace('-', ' ')}`);
    lines.push('');
    lines.push(`- **Status:** ${tab.loaded ? '✅ Loaded' : '❌ Failed'}`);
    lines.push(`- **Screenshot:** [${tab.screenshot}](./${tab.screenshot})`);
    lines.push(`- **URL:** ${tab.url}`);
    lines.push(`- **Headings:** ${tab.headings.slice(0, 5).join(', ') || 'None found'}`);

    if (Object.keys(tab.counters).length > 0) {
      lines.push(`- **Counters:** ${Object.values(tab.counters).slice(0, 5).join(', ')}`);
    }

    const foundCount = tab.testidsFound.length;
    const expectedStatic = tab.testidsExpected.filter(t => !t.includes('{')).length;
    lines.push(`- **Test IDs Found:** ${foundCount}`);
    lines.push(`- **Static TestIDs Expected:** ${expectedStatic}`);

    if (tab.testidsMissing.length > 0) {
      lines.push(`- **Missing TestIDs:** ⚠️ ${tab.testidsMissing.join(', ')}`);
    }

    if (tab.errors.length > 0) {
      lines.push(`- **Errors:** ❌ ${tab.errors.join(', ')}`);
    }

    lines.push('');
  }

  // Summary table
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Tab | Status | TestIDs Found | Issues |');
  lines.push('|-----|--------|---------------|--------|');

  for (const tabName of TABS) {
    const tab = result.tabs[tabName];
    if (!tab) {
      lines.push(`| ${tabName} | ❌ Not found | - | Tab discovery failed |`);
      continue;
    }

    const status = tab.loaded ? '✅' : '❌';
    const issues = [
      ...(tab.testidsMissing.length > 0 ? [`${tab.testidsMissing.length} missing testids`] : []),
      ...(tab.errors.length > 0 ? [`${tab.errors.length} errors`] : []),
    ].join(', ') || 'none';

    lines.push(`| ${tabName} | ${status} | ${tab.testidsFound.length} | ${issues} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by discovery.spec.ts at ${result.timestamp}*`);

  // Write file
  const mdPath = path.join(outputDir, 'discovery.md');
  fs.writeFileSync(mdPath, lines.join('\n'));
}
