/**
 * Planner Selector Diagnostic
 *
 * Tests multiple selector strategies to find which ones work reliably
 * for the Planner screen elements.
 *
 * Run: npx tsx tests/e2e/planner-selector-diagnostic.ts
 */

import { chromium, Page, Browser, BrowserContext, Locator } from 'playwright';

const STAGING_URL = 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = 'memopyk2025admin';
const VIEWPORT = { width: 1920, height: 1080 };

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SelectorResult {
  selector: string;
  found: boolean;
  count: number;
  tagName?: string;
  textContent?: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  error?: string;
}

async function testSelector(page: Page, name: string, selector: string): Promise<SelectorResult> {
  try {
    const locator = page.locator(selector);
    const count = await locator.count();

    if (count > 0) {
      const first = locator.first();
      const tagName = await first.evaluate(el => el.tagName.toLowerCase());
      const textContent = await first.textContent().catch(() => '');
      const boundingBox = await first.boundingBox();

      return {
        selector,
        found: true,
        count,
        tagName,
        textContent: textContent?.slice(0, 50).trim() || '',
        boundingBox
      };
    } else {
      return { selector, found: false, count: 0 };
    }
  } catch (error) {
    return {
      selector,
      found: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testLocatorWithFilter(page: Page, name: string, description: string, locatorFn: () => Locator): Promise<SelectorResult> {
  try {
    const locator = locatorFn();
    const count = await locator.count();

    if (count > 0) {
      const first = locator.first();
      const tagName = await first.evaluate(el => el.tagName.toLowerCase());
      const textContent = await first.textContent().catch(() => '');
      const boundingBox = await first.boundingBox();

      return {
        selector: description,
        found: true,
        count,
        tagName,
        textContent: textContent?.slice(0, 50).trim() || '',
        boundingBox
      };
    } else {
      return { selector: description, found: false, count: 0 };
    }
  } catch (error) {
    return {
      selector: description,
      found: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function printResult(result: SelectorResult, indent: string = '  ') {
  const status = result.found ? '✅' : '❌';
  console.log(`${indent}${status} ${result.selector}`);
  if (result.found) {
    console.log(`${indent}   Count: ${result.count}, Tag: <${result.tagName}>`);
    if (result.textContent) {
      console.log(`${indent}   Text: "${result.textContent}"`);
    }
    if (result.boundingBox) {
      console.log(`${indent}   Box: (${Math.round(result.boundingBox.x)}, ${Math.round(result.boundingBox.y)}) ${Math.round(result.boundingBox.width)}x${Math.round(result.boundingBox.height)}`);
    }
  } else if (result.error) {
    console.log(`${indent}   Error: ${result.error}`);
  }
}

async function loginToAdmin(page: Page): Promise<void> {
  console.log('\n=== Logging in to admin ===');
  await page.goto(`${STAGING_URL}/en-US/admin`);
  await wait(2000);

  const acceptButton = page.getByRole('button', { name: /accept/i });
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
    await wait(500);
  }

  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  Entering password...');
    await passwordField.fill(ADMIN_PASSWORD);
    const loginBtn = page.getByRole('button', { name: /access admin/i });
    await loginBtn.click();
    await wait(3000);
  }

  await page.waitForSelector('.bg-gray-900', { timeout: 15000 });
  console.log('  ✅ Logged in successfully');
}

async function navigateToPlannerViaSidebar(page: Page): Promise<void> {
  console.log('\n=== Navigating to Planner via sidebar ===');

  const blogLink = page.locator('.bg-gray-900').getByText('Blog', { exact: false }).first();
  await blogLink.click();
  await wait(2000);

  const plannerTab = page.locator('[data-testid="tab-planner"]');
  if (await plannerTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await plannerTab.click();
    console.log('  Clicked tab-planner');
  }

  await wait(2000);
  console.log('  ✅ Navigation complete');
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PLANNER SELECTOR DIAGNOSTIC                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: VIEWPORT });
  const page: Page = await context.newPage();

  try {
    await loginToAdmin(page);
    await navigateToPlannerViaSidebar(page);

    // ═══════════════════════════════════════════════════════════════════
    // DUMP ALL BUTTONS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ ALL BUTTONS ON PAGE ═══');
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons total:`);

    const buttonTexts = await allButtons.allTextContents();
    const uniqueTexts = [...new Set(buttonTexts.filter(t => t.trim()))];
    uniqueTexts.forEach((text, i) => {
      console.log(`  ${i + 1}. "${text.slice(0, 60).trim()}"`);
    });

    // ═══════════════════════════════════════════════════════════════════
    // CALENDAR TABLE SELECTORS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ CALENDAR TABLE SELECTORS ═══');

    const tableSelectors = [
      `page.locator('table').first()`,
      `page.locator('table:has(th)')`,
      `page.locator('table:has(th:has-text("Mon"))')`,
      `page.locator('table:has(th:has-text("Week"))')`,
      `page.locator('[class*="calendar"]')`,
      `page.locator('[class*="grid"]')`,
      `page.locator('[role="grid"]')`,
      `page.locator('[data-testid*="calendar"]')`,
      `page.locator('[data-testid*="planner"]')`,
    ];

    for (const selectorStr of tableSelectors) {
      // Extract the actual selector from the string
      const match = selectorStr.match(/locator\('([^']+)'\)/);
      if (match) {
        const result = await testSelector(page, 'table', match[1]);
        printResult(result);
      }
    }

    // Also check what's in the main content area
    console.log('\n  -- Checking main content structure --');
    const mainContent = page.locator('main, [class*="content"], .mt-6').first();
    if (await mainContent.isVisible({ timeout: 1000 }).catch(() => false)) {
      const html = await mainContent.evaluate(el => el.innerHTML.slice(0, 500));
      console.log(`  Main content preview: ${html.slice(0, 200)}...`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // + (ADD) BUTTON SELECTORS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ + (ADD) BUTTON SELECTORS ═══');

    const plusSelectors = [
      `button:has-text("+")`,
      `button:has-text("＋")`,
      `td button`,
      `td button:first-child`,
      `[data-testid*="add"]`,
      `button:has(svg.lucide-plus)`,
      `button:has(svg[class*="plus"])`,
      `button svg.lucide-plus`,
      `.lucide-plus`,
      `button:has(svg)`,
    ];

    for (const selector of plusSelectors) {
      const result = await testSelector(page, 'plus', selector);
      printResult(result);
    }

    // Check what's inside a td cell
    console.log('\n  -- Checking td cell contents --');
    const firstTd = page.locator('td').first();
    if (await firstTd.isVisible({ timeout: 1000 }).catch(() => false)) {
      const tdHtml = await firstTd.evaluate(el => el.innerHTML);
      console.log(`  First TD innerHTML: ${tdHtml.slice(0, 300)}`);

      const tdChildren = await firstTd.locator('*').count();
      console.log(`  First TD has ${tdChildren} child elements`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TODAY BUTTON SELECTORS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ TODAY BUTTON SELECTORS ═══');

    const todaySelectors = [
      `button:has-text("Today")`,
      `button:text("Today")`,
      `button:text-is("Today")`,
      `button:has-text("Aujourd")`,
      `[data-testid*="today"]`,
    ];

    for (const selector of todaySelectors) {
      const result = await testSelector(page, 'today', selector);
      printResult(result);
    }

    // Also test with filter
    const todayFilterResult = await testLocatorWithFilter(
      page,
      'today',
      `page.locator('button').filter({ hasText: 'Today' })`,
      () => page.locator('button').filter({ hasText: 'Today' })
    );
    printResult(todayFilterResult);

    const todayGetByTextResult = await testLocatorWithFilter(
      page,
      'today',
      `page.getByRole('button', { name: 'Today' })`,
      () => page.getByRole('button', { name: 'Today' })
    );
    printResult(todayGetByTextResult);

    // ═══════════════════════════════════════════════════════════════════
    // TOPICS/POSTS VIEW TOGGLE
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ VIEW TOGGLE SELECTORS ═══');

    const viewSelectors = [
      `button:has-text("Topics")`,
      `button:has-text("Posts")`,
      `[data-testid*="topics"]`,
      `[data-testid*="posts"]`,
      `button:has(svg.lucide-list)`,
      `button:has(svg.lucide-file-text)`,
    ];

    for (const selector of viewSelectors) {
      const result = await testSelector(page, 'view', selector);
      printResult(result);
    }

    // ═══════════════════════════════════════════════════════════════════
    // WEEK NAVIGATION ARROWS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ WEEK NAVIGATION SELECTORS ═══');

    const navSelectors = [
      `button:has(svg.lucide-chevron-left)`,
      `button:has(svg.lucide-chevron-right)`,
      `button:has(svg[class*="chevron"])`,
      `[data-testid*="prev"]`,
      `[data-testid*="next"]`,
    ];

    for (const selector of navSelectors) {
      const result = await testSelector(page, 'nav', selector);
      printResult(result);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELP PANEL CONTENT
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ HELP PANEL DIAGNOSTIC ═══');

    // Try opening help
    console.log('  Attempting to open help panel...');
    const aideButton = page.locator('.bg-gray-900').getByText('Aide', { exact: false }).first();
    if (await aideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aideButton.click();
      await wait(1500);
      console.log('  ✅ Clicked Aide button');
    } else {
      console.log('  ❌ Aide button not found');
    }

    // Check if help panel opened
    const helpPanel = page.locator('.w-80');
    const helpVisible = await helpPanel.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  Help panel visible: ${helpVisible}`);

    if (helpVisible) {
      // Try to find real content
      console.log('  Waiting for help content (attempt 1)...');
      const proseH3 = page.locator('.w-80 .prose h3');
      const contentLoaded1 = await proseH3.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  .w-80 .prose h3 found: ${contentLoaded1}`);

      if (!contentLoaded1) {
        // Try closing and reopening
        console.log('  Trying close and reopen...');
        const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg.lucide-x') }).first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
          await wait(1000);

          await aideButton.click();
          await wait(2000);

          const contentLoaded2 = await proseH3.isVisible({ timeout: 5000 }).catch(() => false);
          console.log(`  After reopen, .w-80 .prose h3 found: ${contentLoaded2}`);
        }
      }

      // Dump help panel contents
      const helpText = await helpPanel.textContent().catch(() => '');
      console.log(`  Help panel text: "${helpText?.slice(0, 200)}..."`);

      // Check specific selectors
      const helpSelectors = [
        `.w-80 h3`,
        `.w-80 .prose h3`,
        `.w-80 .prose`,
        `.w-80 h2:has-text("Help")`,
        `.w-80 p`,
      ];

      for (const selector of helpSelectors) {
        const result = await testSelector(page, 'help', selector);
        printResult(result, '    ');
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DUMP PAGE STRUCTURE
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PAGE STRUCTURE DUMP ═══');

    // Get all data-testid attributes
    const testIds = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid]');
      return Array.from(elements).map(el => ({
        testId: el.getAttribute('data-testid'),
        tag: el.tagName.toLowerCase()
      }));
    });

    console.log(`Found ${testIds.length} elements with data-testid:`);
    testIds.slice(0, 30).forEach(({ testId, tag }) => {
      console.log(`  <${tag} data-testid="${testId}">`);
    });
    if (testIds.length > 30) {
      console.log(`  ... and ${testIds.length - 30} more`);
    }

    // Get table structure if exists
    console.log('\n  -- Table structure --');
    const tables = await page.locator('table').count();
    console.log(`  Tables on page: ${tables}`);

    if (tables > 0) {
      const tableHtml = await page.locator('table').first().evaluate(el => {
        const ths = el.querySelectorAll('th');
        return Array.from(ths).map(th => th.textContent?.trim()).join(' | ');
      });
      console.log(`  Table headers: ${tableHtml}`);
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    DIAGNOSTIC COMPLETE                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
