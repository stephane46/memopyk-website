import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginToAdmin, config } from './helpers/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot directory
const screenshotDir = path.join(__dirname, 'screenshots/help-validation/translation-assistant');

// Known translation draft ID from staging database
const TRANSLATION_DRAFT_ID = '2022d612-9a22-48fb-8155-618c944990c7';

function ensureScreenshotDir() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
}

test.describe('Translation Assistant Walkthrough', () => {
  test('Document Translation Assistant workflow', async ({ page }) => {
    ensureScreenshotDir();

    // Login
    await loginToAdmin(page);

    const sidebar = page.locator('.bg-gray-900.fixed');
    await sidebar.getByText('Blog').click();
    await page.waitForLoadState('networkidle');

    // Click Posts (Manual) tab
    await page.getByTestId('tab-posts').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot 1: Posts list showing translate icon
    await page.screenshot({
      path: path.join(screenshotDir, '01-posts-list-with-translate-icon.png'),
      fullPage: true
    });

    // Find and hover over a translate button
    const translateButtons = page.locator('[title="Duplicate for translation"]');
    const firstTranslateBtn = translateButtons.first();

    if (await firstTranslateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstTranslateBtn.hover();
      await page.waitForTimeout(300);

      // Screenshot 2: Translate button on hover
      await page.screenshot({
        path: path.join(screenshotDir, '02-translate-button-highlighted.png'),
        fullPage: true
      });
    }

    // Navigate directly to the translation draft
    console.log('Navigating to translation draft:', TRANSLATION_DRAFT_ID);

    // Get current path prefix (e.g., /en-US)
    const currentUrl = page.url();
    const langMatch = currentUrl.match(/\/(en-US|fr-FR)\//);
    const langPrefix = langMatch ? langMatch[0].slice(0, -1) : '';

    const targetUrl = `${config.baseUrl}${langPrefix}/admin?tab=blog-edit&id=${TRANSLATION_DRAFT_ID}`;
    console.log('Target URL:', targetUrl);

    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Log current URL
    console.log('Current URL:', page.url());

    // Screenshot 3: Blog Editor showing Translation Assistant button
    await page.screenshot({
      path: path.join(screenshotDir, '03-blog-editor-translation-draft.png'),
      fullPage: true
    });

    // Check for Translation Assistant button
    const translationAssistantBtn = page.getByTestId('button-translation-assistant');

    if (await translationAssistantBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const btnText = await translationAssistantBtn.textContent();
      console.log('Translation Assistant button text:', btnText);

      // Hover to highlight
      await translationAssistantBtn.hover();
      await page.waitForTimeout(300);

      // Screenshot 4: Translation Assistant button highlighted
      await page.screenshot({
        path: path.join(screenshotDir, '04-translation-assistant-button.png'),
        fullPage: true
      });

      // Click to open
      await translationAssistantBtn.click();
      await page.waitForTimeout(500);

      // Screenshot 5: Translation Assistant dialog - Step 1
      await page.screenshot({
        path: path.join(screenshotDir, '05-step1-extract.png'),
        fullPage: true
      });

      // Document Step 1 elements
      const extractButton = page.getByTestId('button-extract-text');
      if (await extractButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const extractButtonText = await extractButton.textContent();
        console.log('Step 1 button text:', extractButtonText);

        // Click Extract button
        await extractButton.click();
        await page.waitForTimeout(500);

        // Screenshot 6: Step 2 - Copy prompt
        await page.screenshot({
          path: path.join(screenshotDir, '06-step2-copy-prompt.png'),
          fullPage: true
        });

        // Document Step 2 elements
        const copyPromptBtn = page.getByTestId('button-copy-prompt');
        const nextStepBtn = page.getByTestId('button-next-step');

        if (await copyPromptBtn.isVisible().catch(() => false)) {
          console.log('Step 2 - Copy button:', await copyPromptBtn.textContent());
        }
        if (await nextStepBtn.isVisible().catch(() => false)) {
          console.log('Step 2 - Next button:', await nextStepBtn.textContent());

          // Click Next Step to go to Step 3
          await nextStepBtn.click();
          await page.waitForTimeout(500);

          // Screenshot 7: Step 3 - Paste translation
          await page.screenshot({
            path: path.join(screenshotDir, '07-step3-apply-translation.png'),
            fullPage: true
          });

          // Document Step 3 elements
          const applyBtn = page.getByTestId('button-apply-translation');
          const backBtn = page.getByTestId('button-back');
          const textarea = page.getByTestId('textarea-translated-content');

          console.log('Step 3 - Apply button:', await applyBtn.textContent().catch(() => 'N/A'));
          console.log('Step 3 - Back button:', await backBtn.textContent().catch(() => 'N/A'));
          console.log('Step 3 - Textarea placeholder:', await textarea.getAttribute('placeholder').catch(() => 'N/A'));
        }
      }

      // Close the dialog
      await page.keyboard.press('Escape');

    } else {
      console.log('Translation Assistant button NOT visible - this post may not be a translation draft');

      // Take a screenshot anyway to debug
      await page.screenshot({
        path: path.join(screenshotDir, '03-blog-editor-no-translation-button.png'),
        fullPage: true
      });
    }

    console.log('\n=== TRANSLATION ASSISTANT WALKTHROUGH COMPLETE ===');
    console.log('Screenshots saved to:', screenshotDir);
  });
});
