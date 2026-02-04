/**
 * Verify UI Labels - Captures screenshots of actual UI to verify tab labels
 * Part A of the naive-user test fix
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_URL = 'https://memopyk.memopyk.com';
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'docs', 'testing', 'screenshots');

async function main() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('=== Verifying UI Labels ===\n');
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Step 1: Screenshot the login screen
    console.log('1. Capturing login screen...');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'login-screen.png'),
      fullPage: false
    });
    console.log('   Saved: login-screen.png');

    // Capture login form details
    const loginFormDetails = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        type: b.type,
        className: b.className
      }));
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name
      }));
      return { buttons, inputs };
    });
    console.log('   Login form details:', JSON.stringify(loginFormDetails, null, 2));

    // Step 2: Log in - using correct password from auth helper
    console.log('\n2. Logging in...');
    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordField.fill('memopyk2025admin');

      // Click Access Admin Panel button (using role selector like auth helper)
      const accessBtn = page.getByRole('button', { name: /access admin/i });
      if (await accessBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   Found Access Admin Panel button, clicking...');
        await accessBtn.click();
      }
      await page.waitForTimeout(3000);

      // Wait for sidebar to confirm login
      const sidebar = page.locator('.bg-gray-900.fixed');
      if (await sidebar.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('   Login successful - sidebar visible');
      } else {
        console.log('   Login may have failed - sidebar not visible');
      }
    }

    // Check if we're logged in by looking for admin content
    const currentUrl = page.url();
    console.log(`   Current URL after login: ${currentUrl}`);

    // Step 3: Navigate to Blog Hub and capture tab bar
    console.log('\n3. Navigating to Blog Hub...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=blog`);
    await page.waitForTimeout(3000);

    // Screenshot the full Blog Hub
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'blog-hub-full.png'),
      fullPage: false
    });
    console.log('   Saved: blog-hub-full.png');

    // Try to capture just the tab bar area
    const tabBar = page.locator('[role="tablist"], .tab-bar, .tabs').first();
    if (await tabBar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabBar.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'blog-hub-tabs-only.png')
      });
      console.log('   Saved: blog-hub-tabs-only.png');
    }

    // Extract all tab labels from the page
    const tabLabels = await page.evaluate(() => {
      // Look for tab-like elements
      const tabs: string[] = [];

      // Method 1: Look for role="tab"
      document.querySelectorAll('[role="tab"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text) tabs.push(text);
      });

      // Method 2: Look for buttons in tab-like containers
      if (tabs.length === 0) {
        document.querySelectorAll('button').forEach(btn => {
          const text = btn.textContent?.trim();
          // Filter for tab-like buttons (in the Blog Hub area)
          if (text && (
            text.includes('Post') ||
            text.includes('Topic') ||
            text.includes('Keyword') ||
            text.includes('Image') ||
            text.includes('Planner') ||
            text.includes('Create') ||
            text.includes('AI')
          )) {
            tabs.push(text);
          }
        });
      }

      return tabs;
    });

    console.log('\n   Tab labels found on page:');
    tabLabels.forEach((label, i) => {
      console.log(`   ${i + 1}. "${label}"`);
    });

    // Also capture all buttons for reference
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent?.trim())
        .filter(t => t && t.length < 50);
    });

    console.log('\n   All buttons on page:');
    allButtons.slice(0, 30).forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn}"`);
    });

    // Step 4: Navigate to Posts tab specifically
    console.log('\n4. Clicking on Posts-related tab...');
    const postsTab = page.locator('button:has-text("Posts")').first();
    if (await postsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      const postsTabText = await postsTab.textContent();
      console.log(`   Found Posts tab with text: "${postsTabText}"`);
      await postsTab.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'posts-tab-view.png'),
        fullPage: false
      });
      console.log('   Saved: posts-tab-view.png');
    }

    // Step 5: Look for date picker to verify French/English
    console.log('\n5. Looking for date picker...');
    const datePickerBtn = page.locator('button:has-text("date"), button:has-text("Date"), button:has-text("Choisir")').first();
    if (await datePickerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const datePickerText = await datePickerBtn.textContent();
      console.log(`   Date picker button text: "${datePickerText}"`);
    } else {
      console.log('   Date picker not visible on current screen');
    }

    console.log('\n=== Verification Complete ===');

  } catch (error) {
    console.error('Error:', error);
    // Save error screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
