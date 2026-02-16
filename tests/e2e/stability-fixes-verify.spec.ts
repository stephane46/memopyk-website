import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'stability-fixes');

const SCREENS = [
  { slug: 'planned-posts', route: '/en-US/admin?tab=topics' },
  { slug: 'image-bank', route: '/en-US/admin?tab=images' },
  { slug: 'ai-context', route: '/en-US/admin?tab=ai-context' },
  { slug: 'faq', route: '/en-US/admin?tab=faq' },
  { slug: 'gallery', route: '/en-US/admin?tab=gallery' },
  { slug: 'hero-management', route: '/en-US/admin?tab=hero-management' },
  { slug: 'why-memopyk', route: '/en-US/admin?tab=why-memopyk' },
  { slug: 'legal-docs', route: '/en-US/admin?tab=legal-docs' },
  { slug: 'seo', route: '/en-US/admin?tab=seo' },
  { slug: 'blog-hub', route: '/en-US/admin?tab=blog' },
];

test('Save verification screenshots for all 10 stability-fix screens', async ({ browser }) => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Create a fresh context without X-E2E-Token to avoid CORS font errors
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const page = await context.newPage();

  // Login
  await page.goto('https://memopyk.memopyk.com/admin');
  await page.waitForTimeout(2000);

  // Dismiss cookie banner if present
  const cookieAccept = page.locator('button:has-text("Accept"), button:has-text("Accepter"), [aria-label="Cookie consent banner"] button').first();
  if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieAccept.click();
    await page.waitForTimeout(500);
  }

  const pwInput = page.locator('input[type="password"]');
  if (await pwInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwInput.fill('memopyk2025admin');
    await page.locator('button:has-text("Login"), button:has-text("Sign"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
  }

  // Dismiss cookie banner again if it reappears after login
  if (await cookieAccept.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieAccept.click();
    await page.waitForTimeout(500);
  }

  for (const screen of SCREENS) {
    // Navigate
    await page.goto(`https://memopyk.memopyk.com${screen.route}`);
    await page.waitForTimeout(2000);

    // Open help drawer
    const aideBtn = page.locator('text=Aide').first();
    if (await aideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aideBtn.click();
      await page.waitForTimeout(2000);
    }

    // Screenshot with help open
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `verify-${screen.slug}.png`),
      fullPage: false
    });

    // Close help
    const closeBtn = page.locator('.fixed.right-0 button').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Don't click close as it might navigate away; just continue
    }
  }

  await context.close();
});
