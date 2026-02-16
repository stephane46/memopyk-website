/**
 * Stability Check — Comprehensive Help System Quality Pass
 * Captures UI screenshots, help drawer screenshots, help text, and console errors
 * for all 30 admin screens.
 */
import { test as base, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Override to remove X-E2E-Token header that causes CORS issues
const test = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 2560, height: 1440 },
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

const BASE_URL = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'memopyk2025admin';
const SCREENSHOT_BASE = 'tests/e2e/screenshots/stability-check';

const SCREENS = [
  // Group A — Analytics (13)
  { slug: 'analytics-overview', route: '/admin?tab=analytics-new&an_tab=overview', group: 'analytics' },
  { slug: 'analytics-live', route: '/admin?tab=analytics-new&an_tab=live', group: 'analytics' },
  { slug: 'analytics-trends', route: '/admin?tab=analytics-new&an_tab=trends', group: 'analytics' },
  { slug: 'analytics-video', route: '/admin?tab=analytics-new&an_tab=video', group: 'analytics' },
  { slug: 'analytics-geo', route: '/admin?tab=analytics-new&an_tab=geo', group: 'analytics' },
  { slug: 'analytics-cta', route: '/admin?tab=analytics-new&an_tab=cta', group: 'analytics' },
  { slug: 'analytics-blog', route: '/admin?tab=analytics-new&an_tab=blog', group: 'analytics' },
  { slug: 'analytics-clarity', route: '/admin?tab=analytics-new&an_tab=clarity', group: 'analytics' },
  { slug: 'analytics-exclusions', route: '/admin?tab=analytics-new&an_tab=exclusions', group: 'analytics' },
  { slug: 'analytics-fallback', route: '/admin?tab=analytics-new&an_tab=fallback', group: 'analytics' },
  { slug: 'analytics-new', route: '/admin?tab=analytics-new', group: 'analytics' },
  { slug: 'cache', route: '/admin?tab=cache', group: 'analytics' },
  { slug: 'seo', route: '/admin?tab=seo', group: 'analytics' },
  // Group B — Blog/Content (11)
  { slug: 'keywords', route: '/admin?tab=keywords', group: 'content' },
  { slug: 'planned-posts', route: '/admin?tab=topics', group: 'content' },
  { slug: 'planner', route: '/admin?tab=planner', group: 'content' },
  { slug: 'posts', route: '/admin?tab=posts', group: 'content' },
  { slug: 'image-bank', route: '/admin?tab=images', group: 'content' },
  { slug: 'blog-editor', route: '/admin?tab=blog-edit', group: 'content', secondary: true },
  { slug: 'faq', route: '/admin?tab=faq', group: 'content' },
  { slug: 'legal-docs', route: '/admin?tab=legal-docs', group: 'content' },
  { slug: 'cta-buttons', route: '/admin?tab=cta', group: 'content' },
  { slug: 'ai-context', route: '/admin?tab=ai-context', group: 'content' },
  // Group C — Other Admin (7)
  { slug: 'gallery', route: '/admin?tab=gallery', group: 'admin' },
  { slug: 'hero-management', route: '/admin?tab=hero-management', group: 'admin' },
  { slug: 'partners', route: '/admin?tab=partners', group: 'admin' },
  { slug: 'travel-agencies', route: '/admin?tab=travel-agencies', group: 'admin' },
  { slug: 'why-memopyk', route: '/admin?tab=why-memopyk', group: 'admin' },
  { slug: 'ai-creator', route: '/admin?tab=ai-creator', group: 'admin' },
  { slug: 'blog-hub', route: '/admin?tab=blog', group: 'admin' },
];

interface ScreenResult {
  slug: string;
  route: string;
  group: string;
  loaded: boolean;
  consoleErrors: string[];
  helpButtonVisible: boolean;
  helpDrawerOpened: boolean;
  helpTitle: string;
  helpTextLength: number;
  helpText: string;
  screenHeading: string;
  uiScreenshot: string;
  helpScreenshot: string;
  visibleControls: string[];
  timestamp: string;
}

async function loginToAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(3000);

  // Handle cookie consent — click Accept all if visible
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      const text = btns[i].textContent?.trim().toLowerCase() || '';
      if (text.includes('accept all') || text.includes('accepter')) {
        btns[i].click();
        break;
      }
    }
  });
  await page.waitForTimeout(1000);

  // Check if password input exists (means we need to login)
  const needsLogin = await page.locator('input[placeholder*="password"], input[type="password"]').isVisible({ timeout: 3000 }).catch(() => false);

  if (!needsLogin) {
    console.log('No password input found — checking if already logged in');
    return;
  }

  console.log('Password input found — logging in...');

  // Fill password
  await page.locator('input[placeholder*="password"], input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.waitForTimeout(500);

  // Click submit button
  await page.locator('button:has-text("Access Admin"), button:has-text("Accéder")').first().click();

  // Wait for admin panel to load — look for the sidebar "Analytics" link
  try {
    await page.locator('button:has-text("Analytics"), button:has-text("Analytique")').first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('Login SUCCESS — sidebar loaded');
  } catch {
    // Take a debug screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_BASE, 'smoke', 'login-debug.png') });
    console.log('Login may have FAILED — sidebar not detected after 15s');
    // Wait more and try anyway
    await page.waitForTimeout(5000);
  }
}

async function ensureHelpClosed(page: Page): Promise<void> {
  // Check if help panel is open, close it
  const isOpen = await page.evaluate(() => {
    const panel = document.querySelector('.fixed.right-0.top-0.h-full.z-50');
    return panel !== null && panel.classList.contains('translate-x-0');
  });
  if (isOpen) {
    // Click the close button (first button in the panel)
    await page.evaluate(() => {
      const panel = document.querySelector('.fixed.right-0.top-0.h-full.z-50');
      if (panel) {
        const closeBtn = panel.querySelector('button');
        if (closeBtn) (closeBtn as HTMLElement).click();
      }
    });
    await page.waitForTimeout(500);
  }
}

async function openHelpDrawer(page: Page): Promise<boolean> {
  // First ensure it's closed
  await ensureHelpClosed(page);

  // Click the Aide button in sidebar
  const clicked = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      const text = btns[i].textContent?.trim();
      if (text === 'Aide' || text === 'Help') {
        btns[i].click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) return false;

  // Wait for animation
  await page.waitForTimeout(1500);

  // Check if panel opened
  const isOpen = await page.evaluate(() => {
    const panel = document.querySelector('.fixed.right-0.top-0.h-full.z-50');
    return panel !== null && panel.classList.contains('translate-x-0');
  });

  return isOpen;
}

async function extractHelpContent(page: Page): Promise<{ title: string; text: string; length: number; sections: string[] }> {
  return await page.evaluate(() => {
    const panel = document.querySelector('.fixed.right-0.top-0.h-full.z-50');
    if (!panel) return { title: '', text: '', length: 0, sections: [] };

    // Get the help screen title (the H3 after "This Screen")
    const h3s = panel.querySelectorAll('h3');
    let screenTitle = '';
    for (let i = 0; i < h3s.length; i++) {
      const t = h3s[i].textContent?.trim() || '';
      if (t !== 'This Screen' && t !== 'Help' && t !== 'How do I...' && t.length > 2) {
        screenTitle = t;
        break;
      }
    }

    // Get all section headers (h4s)
    const sections: string[] = [];
    panel.querySelectorAll('h4').forEach(h4 => {
      const t = h4.textContent?.trim() || '';
      if (t.length > 0) sections.push(t);
    });

    // Get full text
    const text = panel.textContent?.trim() || '';

    return { title: screenTitle, text, length: text.length, sections };
  });
}

async function captureScreen(page: Page, screen: typeof SCREENS[0]): Promise<ScreenResult> {
  const consoleErrors: string[] = [];
  const result: ScreenResult = {
    slug: screen.slug,
    route: screen.route,
    group: screen.group,
    loaded: false,
    consoleErrors: [],
    helpButtonVisible: false,
    helpDrawerOpened: false,
    helpTitle: '',
    helpTextLength: 0,
    helpText: '',
    screenHeading: '',
    uiScreenshot: '',
    helpScreenshot: '',
    visibleControls: [],
    timestamp: new Date().toISOString(),
  };

  // Set up console error listener
  const errorHandler = (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known noise (favicon, third-party scripts)
      if (!text.includes('favicon') && !text.includes('404 (Not Found)') && !text.includes('ERR_BLOCKED_BY_CLIENT')) {
        consoleErrors.push(text);
      }
    }
  };
  page.on('console', errorHandler);

  try {
    // Ensure help is closed before navigating
    await ensureHelpClosed(page);

    // Navigate to screen — use locale prefix for SPA routing
    const fullUrl = `${BASE_URL}/en-US${screen.route}`;
    if (screen.secondary && screen.slug === 'blog-editor') {
      // Blog editor needs a post — go to posts first
      await page.goto(`${BASE_URL}/en-US/admin?tab=posts`);
      await page.waitForTimeout(3000);
      // Click the first edit pencil icon or post title link
      const editClicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="blog-edit"], button[title*="Edit"], button[aria-label*="Edit"]');
        if (links.length > 0) {
          (links[0] as HTMLElement).click();
          return true;
        }
        const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
        for (const card of cards) {
          const btns = card.querySelectorAll('button');
          for (const btn of btns) {
            if (btn.querySelector('svg') && btn.getBoundingClientRect().width < 50) {
              (btn as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      });
      if (!editClicked) {
        await page.goto(`${BASE_URL}/en-US/admin?tab=blog-edit`);
      }
      await page.waitForTimeout(3000);
    } else {
      await page.goto(fullUrl);
      await page.waitForTimeout(3000);
    }

    // Check if loaded
    result.loaded = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root !== null && root.children.length > 0 && root.innerHTML.length > 500;
    });

    // Capture screen heading
    result.screenHeading = await page.evaluate(() => {
      // Look for the main heading in content area (not sidebar)
      const sidebar = document.querySelector('.bg-gray-900');
      const allHeadings = document.querySelectorAll('h1, h2, h3');
      for (const h of allHeadings) {
        if (sidebar?.contains(h)) continue;
        const text = (h as HTMLElement).textContent?.trim() || '';
        if (text.length > 2 && text.length < 80) return text;
      }
      return '';
    });

    // Capture visible controls
    result.visibleControls = await page.evaluate(() => {
      const controls: string[] = [];
      const sidebar = document.querySelector('.bg-gray-900');
      document.querySelectorAll('button').forEach(btn => {
        if (sidebar?.contains(btn)) return;
        const text = btn.textContent?.trim() || '';
        if (text.length > 1 && text.length < 40 && !controls.includes(`btn:${text}`)) {
          controls.push(`btn:${text}`);
        }
      });
      document.querySelectorAll('[role="tab"], [data-testid*="tab"]').forEach(tab => {
        const text = (tab as HTMLElement).textContent?.trim() || '';
        if (text && text.length < 40) controls.push(`tab:${text}`);
      });
      document.querySelectorAll('select, [role="combobox"]').forEach((sel, i) => {
        controls.push(`select:${sel.getAttribute('aria-label') || `dropdown-${i}`}`);
      });
      document.querySelectorAll('[role="switch"]').forEach((tog, i) => {
        controls.push(`toggle:${tog.getAttribute('aria-label') || `toggle-${i}`}`);
      });
      return controls.slice(0, 25);
    });

    // Screenshot UI
    const uiPath = path.join(SCREENSHOT_BASE, screen.group, `${screen.slug}-ui.png`);
    await page.screenshot({ path: uiPath, fullPage: false });
    result.uiScreenshot = uiPath;

    // Check if Aide button is visible
    result.helpButtonVisible = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (let i = 0; i < btns.length; i++) {
        const text = btns[i].textContent?.trim();
        if (text === 'Aide' || text === 'Help') {
          const rect = btns[i].getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }
      }
      return false;
    });

    // Open help drawer
    const helpOpened = await openHelpDrawer(page);
    result.helpDrawerOpened = helpOpened;

    if (helpOpened) {
      // Wait extra for help content to load from Supabase
      await page.waitForTimeout(2000);

      // Extract help content
      const helpData = await extractHelpContent(page);
      result.helpTitle = helpData.title;
      result.helpText = helpData.text.substring(0, 3000);
      result.helpTextLength = helpData.length;

      // Screenshot help drawer
      const helpPath = path.join(SCREENSHOT_BASE, screen.group, `${screen.slug}-help.png`);
      await page.screenshot({ path: helpPath, fullPage: false });
      result.helpScreenshot = helpPath;

      // Close help drawer
      await ensureHelpClosed(page);
    }

  } catch (err) {
    consoleErrors.push(`SCRIPT ERROR: ${String(err)}`);
  }

  page.off('console', errorHandler);
  result.consoleErrors = consoleErrors;
  return result;
}

test('Stability check — capture all 30 screens', async ({ page }) => {
  test.setTimeout(600_000); // 10 minutes

  // Ensure directories exist
  for (const group of ['analytics', 'content', 'admin', 'smoke']) {
    fs.mkdirSync(path.join(SCREENSHOT_BASE, group), { recursive: true });
  }

  // Login
  await loginToAdmin(page);

  const allResults: ScreenResult[] = [];

  for (const screen of SCREENS) {
    console.log(`[${screen.group}] Testing: ${screen.slug} (${screen.route})`);
    const result = await captureScreen(page, screen);
    allResults.push(result);
    console.log(`  → loaded=${result.loaded}, help=${result.helpDrawerOpened}, heading="${result.screenHeading}", helpTitle="${result.helpTitle}", helpChars=${result.helpTextLength}, errors=${result.consoleErrors.length}`);
  }

  // Save results by group
  for (const group of ['analytics', 'content', 'admin']) {
    const groupResults = allResults.filter(r => r.group === group);
    fs.writeFileSync(
      path.join(SCREENSHOT_BASE, group, 'results.json'),
      JSON.stringify(groupResults, null, 2)
    );
  }

  // Save smoke results
  const smokeResults = allResults.map(r => ({
    slug: r.slug,
    route: r.route,
    loaded: r.loaded,
    consoleErrors: r.consoleErrors,
    helpButtonVisible: r.helpButtonVisible,
    helpDrawerOpened: r.helpDrawerOpened,
  }));
  fs.writeFileSync(
    path.join(SCREENSHOT_BASE, 'smoke', 'results.json'),
    JSON.stringify(smokeResults, null, 2)
  );

  // Save combined results
  fs.writeFileSync(
    path.join(SCREENSHOT_BASE, 'all-results.json'),
    JSON.stringify(allResults, null, 2)
  );

  // Summary
  const loaded = allResults.filter(r => r.loaded).length;
  const helpOk = allResults.filter(r => r.helpDrawerOpened).length;
  const withErrors = allResults.filter(r => r.consoleErrors.length > 0).length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Screens tested: ${allResults.length}/30`);
  console.log(`Loaded: ${loaded}/30`);
  console.log(`Help drawer opened: ${helpOk}/30`);
  console.log(`Screens with console errors: ${withErrors}/30`);

  expect(loaded).toBeGreaterThan(25);
});
