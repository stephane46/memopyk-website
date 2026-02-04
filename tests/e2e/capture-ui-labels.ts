/**
 * Capture screenshots of UI elements to verify exact labels
 */

import { chromium } from 'playwright';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://memopyk.memopyk.com';

async function main() {
  console.log('Capturing UI screenshots for help content verification...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Navigate to admin
    console.log('1. Navigating to admin login...');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await page.waitForTimeout(2000);

    // Login
    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordField.fill('memopyk2024');
      // Find the actual login button
      const loginBtn = page.locator('button:has-text("Access Admin Panel")');
      if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginBtn.click();
      } else {
        // Try other possible button texts
        await page.click('button[type="submit"]');
      }
      await page.waitForTimeout(3000);
    }

    // Navigate to Blog Hub
    console.log('2. Navigating to Blog Hub...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=blog`);
    await page.waitForTimeout(3000);

    // Screenshot 1: Blog Hub tabs
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'help-validation', 'ui-blog-hub-tabs.png'),
      fullPage: false
    });
    console.log('   Captured: Blog Hub tabs');

    // Screenshot 2: Posts list with action icons
    const postsTab = page.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postsTab.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'help-validation', 'ui-posts-list-icons.png'),
      fullPage: false
    });
    console.log('   Captured: Posts list with icons');

    // Screenshot 3: Blog Editor (open a post)
    const editBtn = page.locator('button[title*="Edit"], button:has(svg)').first();
    // Just capture what we have
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'help-validation', 'ui-posts-actions.png'),
      fullPage: true
    });
    console.log('   Captured: Posts actions area');

    console.log('\nScreenshots captured successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();
