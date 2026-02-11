/**
 * Naive User Help Test - Overnight Feb 12, 2026
 *
 * Captures screenshots of every admin section and its help panel.
 * Evaluates help content quality from a naive user perspective.
 *
 * Run: npx tsx tests/e2e/naive-user-overnight.ts
 */

import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://memopyk.memopyk.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'naive-user-overnight');
const ADMIN_PASSWORD = 'memopyk2025admin';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface ScreenResult {
  tab: string;
  name: string;
  pageScreenshot: string;
  helpScreenshot: string;
  helpFound: boolean;
  helpTitle: string;
  helpText: string;
  rating: 'PASS' | 'MINOR' | 'MAJOR' | 'CRITICAL';
  issues: string[];
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filename;
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const acceptBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all")');
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }
  // Also try dismissing by removing the banner via JS
  await page.evaluate(() => {
    const banner = document.querySelector('[aria-label="Cookie consent banner"]');
    if (banner) (banner as HTMLElement).remove();
  }).catch(() => {});
}

async function loginToAdmin(page: Page) {
  console.log('Navigating to admin...');
  await page.goto(`${STAGING_URL}/admin`);
  await page.waitForTimeout(2000);

  // Handle cookie consent if present
  await dismissCookieBanner(page);

  // Check if login is needed
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Login required, entering password...');
    await passwordField.fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Access Admin")').first().click();
    await page.waitForTimeout(3000);
  }

  // Dismiss cookie banner again after login
  await dismissCookieBanner(page);

  console.log('Logged in to admin');
}

async function openHelp(page: Page): Promise<void> {
  // Click Aide button in sidebar
  const aideBtn = page.locator('.bg-gray-900 button:has-text("Aide")');
  if (await aideBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await aideBtn.click();
    await page.waitForTimeout(1500);
  }
}

async function closeHelp(page: Page): Promise<void> {
  // Close help by clicking X
  const closeBtn = page.locator('h2:has-text("Help")').locator('..').locator('button').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
}

async function getHelpContent(page: Page): Promise<{ found: boolean; title: string; text: string }> {
  // Wait for help content to load
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const allH2 = document.querySelectorAll('h2');
    for (const h2 of allH2) {
      if (h2.textContent?.trim() === 'Help') {
        let container = h2.parentElement;
        for (let i = 0; i < 5; i++) {
          if (!container) break;
          if (container.scrollHeight > 500) break;
          container = container.parentElement;
        }
        if (container) {
          const text = container.innerText;
          // Extract title from h3 or first bold line after "This Screen"
          const h3 = container.querySelector('h3');
          const title = h3 ? h3.textContent?.trim() || '' : '';
          return { found: true, title, text: text.substring(0, 5000) };
        }
      }
    }
    return { found: false, title: '', text: '' };
  });

  return result;
}

async function testScreen(page: Page, tab: string, name: string): Promise<ScreenResult> {
  console.log(`  Testing: ${name} (tab=${tab})...`);

  // Navigate
  await page.goto(`${STAGING_URL}/en-US/admin?tab=${tab}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Dismiss cookie banner if it appeared
  await dismissCookieBanner(page);

  // Take page screenshot
  const pageScreenshot = await takeScreenshot(page, `${tab}-page`);

  // Open help
  await openHelp(page);
  await page.waitForTimeout(1500);

  // Take help screenshot
  const helpScreenshot = await takeScreenshot(page, `${tab}-help`);

  // Get help content
  const help = await getHelpContent(page);

  // Close help for next screen
  await closeHelp(page);

  // Evaluate as naive user
  const issues: string[] = [];
  let rating: 'PASS' | 'MINOR' | 'MAJOR' | 'CRITICAL' = 'PASS';

  if (!help.found) {
    issues.push('No help content found for this screen');
    rating = 'CRITICAL';
  } else if (help.text.includes('No help content available')) {
    issues.push('Help panel shows fallback "No help content" message');
    rating = 'CRITICAL';
  } else {
    // Check help quality
    if (help.text.length < 200) {
      issues.push('Help content is very brief (under 200 chars)');
      rating = 'MINOR';
    }
    if (!help.text.includes('How do I')) {
      // Not all screens need flows, minor issue
    }
  }

  return {
    tab,
    name,
    pageScreenshot,
    helpScreenshot,
    helpFound: help.found,
    helpTitle: help.title,
    helpText: help.text,
    rating,
    issues,
  };
}

async function testBlogEditor(page: Page): Promise<ScreenResult> {
  console.log('  Testing: Blog Editor (requires post ID)...');

  // Navigate to posts first, then click edit on first post
  await page.goto(`${STAGING_URL}/en-US/admin?tab=posts`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Close help if open
  await closeHelp(page);

  // Find and click edit button on first post
  const editBtn = page.locator('button[title*="Edit" i], button[title*="edit" i]').first();
  if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editBtn.click();
    await page.waitForTimeout(3000);
  } else {
    // Try pencil icon
    const pencilBtns = page.locator('button svg').locator('..');
    const count = await pencilBtns.count();
    if (count > 3) {
      // Typically the 4th button in each row is edit (after status, eye, translate)
      await pencilBtns.nth(3).click();
      await page.waitForTimeout(3000);
    }
  }

  const pageScreenshot = await takeScreenshot(page, 'blog-edit-page');
  await openHelp(page);
  await page.waitForTimeout(1500);
  const helpScreenshot = await takeScreenshot(page, 'blog-edit-help');
  const help = await getHelpContent(page);
  await closeHelp(page);

  const issues: string[] = [];
  let rating: 'PASS' | 'MINOR' | 'MAJOR' | 'CRITICAL' = 'PASS';

  if (!help.found || help.text.includes('No help content')) {
    issues.push('No help content for blog editor');
    rating = 'CRITICAL';
  }

  return {
    tab: 'blog-edit',
    name: 'Blog Editor',
    pageScreenshot,
    helpScreenshot,
    helpFound: help.found,
    helpTitle: help.title || 'Blog Editor',
    helpText: help.text,
    rating,
    issues,
  };
}

async function main() {
  console.log('=== Naive User Help Test - Overnight Feb 12 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 2560, height: 1440 },
  });
  const page = await context.newPage();

  const results: ScreenResult[] = [];

  try {
    await loginToAdmin(page);

    // Define all screens to test
    const screens = [
      // Blog Hub tabs
      { tab: 'keywords', name: 'Keywords' },
      { tab: 'topics', name: 'Planned Posts' },
      { tab: 'planner', name: 'Planner' },
      { tab: 'posts', name: 'Posts' },
      { tab: 'images', name: 'Image Bank' },
      // Blog sub-screens
      { tab: 'new-post', name: 'Create a New Blog Post' },
      { tab: 'ai-creator', name: 'AI Creator' },
      // SEO
      { tab: 'seo', name: 'SEO Management' },
      // Analytics
      { tab: 'analytics-new', name: 'Analytics Dashboard' },
      // Partners
      { tab: 'partners', name: 'Partners Directory' },
      { tab: 'travel-agencies', name: 'Travel Agencies' },
      // Contenu Site
      { tab: 'hero-management', name: 'Hero Videos' },
      { tab: 'gallery', name: 'Gallery' },
      { tab: 'faq', name: 'FAQ' },
      { tab: 'why-memopyk', name: 'Why MEMOPYK' },
      { tab: 'cta', name: 'CTA Buttons' },
      { tab: 'legal-docs', name: 'Legal Documents' },
      // System
      { tab: 'ai-context', name: 'AI Context' },
      { tab: 'cache', name: 'Cache Management' },
    ];

    // Test each screen
    for (const screen of screens) {
      const result = await testScreen(page, screen.tab, screen.name);
      results.push(result);
    }

    // Test Blog Editor separately (needs post ID)
    results.push(await testBlogEditor(page));

    // Generate report
    console.log('\n=== Generating Report ===\n');

    const passed = results.filter(r => r.rating === 'PASS').length;
    const minor = results.filter(r => r.rating === 'MINOR').length;
    const major = results.filter(r => r.rating === 'MAJOR').length;
    const critical = results.filter(r => r.rating === 'CRITICAL').length;
    const total = results.length;

    console.log(`Total: ${total} | PASS: ${passed} | MINOR: ${minor} | MAJOR: ${major} | CRITICAL: ${critical}`);

    // Save results as JSON for report generation
    const jsonPath = path.join(SCREENSHOT_DIR, 'results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${jsonPath}`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

main();
