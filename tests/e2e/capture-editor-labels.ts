/**
 * Capture Editor UI Labels - Navigate to Blog Editor to verify date picker and other labels
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
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('=== Capturing Editor UI Labels ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await page.waitForTimeout(2000);

    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordField.fill('memopyk2025admin');
      const accessBtn = page.getByRole('button', { name: /access admin/i });
      if (await accessBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await accessBtn.click();
      }
      await page.waitForTimeout(3000);
    }

    // Wait for sidebar
    const sidebar = page.locator('.bg-gray-900.fixed');
    if (await sidebar.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('   Login successful');
    }

    // Step 2: Navigate to Posts (Manual) tab
    console.log('\n2. Navigating to Posts (Manual)...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=posts`);
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'posts-manual-tab.png'),
      fullPage: false
    });
    console.log('   Saved: posts-manual-tab.png');

    // Step 3: Click New Post button
    console.log('\n3. Clicking New Post...');
    const newPostBtn = page.getByTestId('button-new-post');
    if (await newPostBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newPostBtn.click();
      await page.waitForTimeout(3000);

      // Check if we went to a landing page or directly to editor
      const currentUrl = page.url();
      console.log(`   Current URL after New Post: ${currentUrl}`);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'after-new-post-click.png'),
        fullPage: false
      });
      console.log('   Saved: after-new-post-click.png');
    }

    // Step 4: Navigate to Posts (AI) tab
    console.log('\n4. Navigating to Posts (AI)...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=ai-creator`);
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'posts-ai-tab.png'),
      fullPage: false
    });
    console.log('   Saved: posts-ai-tab.png');

    // Capture all labels on Posts (AI) page
    const aiLabels = await page.evaluate(() => {
      const labels: string[] = [];
      document.querySelectorAll('label').forEach(l => {
        const text = l.textContent?.trim();
        if (text) labels.push(text);
      });
      const buttons: string[] = [];
      document.querySelectorAll('button').forEach(b => {
        const text = b.textContent?.trim();
        if (text && text.length < 50) buttons.push(text);
      });
      return { labels, buttons };
    });
    console.log('   AI Creator labels:', aiLabels.labels);
    console.log('   AI Creator buttons:', aiLabels.buttons.slice(0, 20));

    // Step 5: Navigate to editor with an existing post
    console.log('\n5. Looking for existing post to edit...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=posts`);
    await page.waitForTimeout(2000);

    // Find first edit button
    const editBtn = page.locator('[data-testid^="button-edit-"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'blog-editor-full.png'),
        fullPage: true
      });
      console.log('   Saved: blog-editor-full.png');

      // Capture date picker button text
      const dateBtn = page.getByTestId('button-published-at');
      if (await dateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const dateText = await dateBtn.textContent();
        console.log(`   Date picker button text: "${dateText}"`);
      }

      // Capture all form labels
      const editorLabels = await page.evaluate(() => {
        const labels: string[] = [];
        document.querySelectorAll('label').forEach(l => {
          const text = l.textContent?.trim();
          if (text) labels.push(text);
        });
        return labels;
      });
      console.log('   Editor labels:', editorLabels);
    }

    // Step 6: Open translation draft to see Translation Assistant button
    console.log('\n6. Looking for translation draft...');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=posts`);
    await page.waitForTimeout(2000);

    // Look for any post with "[TRANSLATE" in the title
    const translatePost = page.locator('[data-testid^="post-card-"]').filter({ hasText: /TRANSLATE/i }).first();
    if (await translatePost.isVisible({ timeout: 3000 }).catch(() => false)) {
      const editTranslateBtn = translatePost.locator('[data-testid^="button-edit-"]');
      if (await editTranslateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editTranslateBtn.click();
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'translation-editor.png'),
          fullPage: false
        });
        console.log('   Saved: translation-editor.png');

        // Check for Translation Assistant button
        const transBtn = page.locator('button:has-text("Translation Assistant")');
        if (await transBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   Translation Assistant button found');
          await transBtn.click();
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'translation-assistant-dialog.png'),
            fullPage: false
          });
          console.log('   Saved: translation-assistant-dialog.png');
        }
      }
    } else {
      console.log('   No translation draft found');
    }

    console.log('\n=== Capture Complete ===');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
