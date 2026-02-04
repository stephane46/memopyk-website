import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginToAdmin } from './helpers/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot directory
const screenshotDir = path.join(__dirname, 'screenshots/help-validation/posts-ai');

// Ensure screenshot directory exists
function ensureScreenshotDir() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
}

// Helper to capture all visible text elements for documentation
async function capturePageElements(page: any, stepName: string) {
  const elements: any = {
    step: stepName,
    buttons: [],
    inputs: [],
    labels: [],
    selects: [],
    textareas: [],
    headings: [],
  };

  // Capture all buttons
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    const isVisible = await btn.isVisible().catch(() => false);
    if (isVisible && text?.trim()) {
      elements.buttons.push(text.trim());
    }
  }

  // Capture all input labels
  const labels = await page.locator('label').all();
  for (const label of labels) {
    const text = await label.textContent().catch(() => '');
    const isVisible = await label.isVisible().catch(() => false);
    if (isVisible && text?.trim()) {
      elements.labels.push(text.trim());
    }
  }

  // Capture all select elements (dropdown triggers)
  const selects = await page.locator('[role="combobox"], select').all();
  for (const select of selects) {
    const text = await select.textContent().catch(() => '');
    const isVisible = await select.isVisible().catch(() => false);
    if (isVisible && text?.trim()) {
      elements.selects.push(text.trim());
    }
  }

  // Capture headings
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  for (const heading of headings) {
    const text = await heading.textContent().catch(() => '');
    const isVisible = await heading.isVisible().catch(() => false);
    if (isVisible && text?.trim()) {
      elements.headings.push(text.trim());
    }
  }

  return elements;
}

// Sample valid JSON for testing (complete structure matching prompt requirements)
const sampleAIJson = {
  title: "How to Preserve Family Memories with Video",
  slug: "preserve-family-memories-video-e2e-test",
  language: "en-US",
  status: "draft",
  published_at: null,
  description: "Learn how to preserve precious family memories through video digitization and organization with expert tips.",
  hero_caption: null,
  content: "<h2>Introduction</h2><p>Family videos are precious treasures that capture moments we never want to forget. In our digital age, preserving these memories has never been more important - or easier.</p><h2>Why Video Matters</h2><p>Unlike photos, videos capture movement, sound, and emotion in ways that bring memories to life. A child's first laugh, a wedding toast, or a family gathering - these moments deserve to be preserved.</p><h2>Tips for Preservation</h2><p>Here are some practical tips for preserving your family videos:</p><ul><li>Digitize old VHS and camcorder tapes before they degrade</li><li>Back up to multiple cloud storage services</li><li>Create organized folders by year and event</li><li>Add metadata and descriptions while memories are fresh</li></ul><h2>Conclusion</h2><p>Start preserving your family memories today. Every moment matters, and with the right approach, these treasures can last for generations.</p>",
  read_time_minutes: 4,
  image: null,
  seo: {
    title: "How to Preserve Family Memories with Video | MEMOPYK",
    description: "Learn expert tips for preserving family videos and memories through digitization and organization.",
    og_image: null
  },
  tags: ["family", "memories", "video"],
  author: null,
  is_featured: false,
  featured_order: null,
  assets_manifest: []
};

test.describe('AI Creator (Posts AI) Full Walkthrough', () => {
  test('Document entire workflow with screenshots', async ({ page }) => {
    ensureScreenshotDir();

    const report: any[] = [];

    // Step 1: Login and navigate to AI Creator
    await loginToAdmin(page);

    // Navigate to Blog Hub first, then AI Creator tab
    const sidebar = page.locator('.bg-gray-900.fixed');
    await sidebar.getByText('Blog').click();
    await page.waitForLoadState('networkidle');

    // Click the Posts (AI) tab
    await page.getByTestId('tab-ai-creator').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot 1: Initial state
    await page.screenshot({
      path: path.join(screenshotDir, '01-initial-state.png'),
      fullPage: true
    });

    let elements = await capturePageElements(page, '01-initial-state');
    report.push(elements);
    console.log('Step 1 - Initial State:', JSON.stringify(elements, null, 2));

    // Step 2: Fill in the topic
    const topicInput = page.getByTestId('input-topic');
    await topicInput.fill('How to preserve family memories with video');

    // Step 3: Set language to English (check current value first)
    const languageSelect = page.getByTestId('select-language');
    const currentLanguage = await languageSelect.textContent();
    console.log('Current language value:', currentLanguage);

    // Only change if not already English
    if (!currentLanguage?.includes('English')) {
      await languageSelect.click();
      await page.waitForTimeout(500);

      // Screenshot the dropdown options
      await page.screenshot({
        path: path.join(screenshotDir, '02-language-dropdown.png'),
        fullPage: true
      });

      // Try to select English using SelectItem
      const englishOption = page.locator('[role="option"]').filter({ hasText: 'English' });
      if (await englishOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await englishOption.click();
      } else {
        // Press Escape to close dropdown if option not found
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
    } else {
      console.log('Language already set to English, skipping dropdown');
    }

    // Step 4: Fill SEO keywords (optional field)
    const seoInput = page.getByTestId('input-seo-keywords');
    if (await seoInput.isVisible()) {
      await seoInput.fill('family memories, video preservation, digitization');
    }

    // Screenshot 3: After filling fields
    await page.screenshot({
      path: path.join(screenshotDir, '03-fields-filled.png'),
      fullPage: true
    });

    elements = await capturePageElements(page, '03-fields-filled');
    report.push(elements);
    console.log('Step 3 - Fields Filled:', JSON.stringify(elements, null, 2));

    // Step 5: Click "Generate AI Prompt"
    const generateButton = page.getByTestId('button-generate-prompt');
    const generateButtonText = await generateButton.textContent();
    console.log('Generate button text:', generateButtonText);

    await generateButton.click();
    await page.waitForTimeout(1000);

    // Screenshot 4: After generating prompt
    await page.screenshot({
      path: path.join(screenshotDir, '04-prompt-generated.png'),
      fullPage: true
    });

    elements = await capturePageElements(page, '04-prompt-generated');
    report.push(elements);
    console.log('Step 4 - Prompt Generated:', JSON.stringify(elements, null, 2));

    // Step 6: Get the generated prompt text
    const promptTextarea = page.getByTestId('textarea-generated-prompt');
    const generatedPrompt = await promptTextarea.inputValue();

    // Save prompt to file
    fs.writeFileSync(
      path.join(screenshotDir, 'generated-prompt.txt'),
      generatedPrompt
    );
    console.log('Generated prompt saved to file');

    // Step 7: Check for copy button
    const copyButton = page.getByTestId('button-copy-prompt');
    const copyButtonText = await copyButton.textContent();
    console.log('Copy button text:', copyButtonText);

    // Screenshot 5: Highlight copy button area
    await page.screenshot({
      path: path.join(screenshotDir, '05-copy-button-visible.png'),
      fullPage: true
    });

    // Step 8: Paste sample JSON into the response field
    const jsonTextarea = page.getByTestId('textarea-ai-json');
    await jsonTextarea.fill(JSON.stringify(sampleAIJson, null, 2));
    await page.waitForTimeout(500);

    // Screenshot 6: JSON pasted
    await page.screenshot({
      path: path.join(screenshotDir, '06-json-pasted.png'),
      fullPage: true
    });

    elements = await capturePageElements(page, '06-json-pasted');
    report.push(elements);
    console.log('Step 6 - JSON Pasted:', JSON.stringify(elements, null, 2));

    // Step 9: Check for Auto-Fix button
    const autofixButton = page.getByTestId('button-autofix');
    if (await autofixButton.isVisible()) {
      const autofixText = await autofixButton.textContent();
      console.log('Auto-fix button text:', autofixText);
    }

    // Step 10: Click "Validate & Edit Content"
    const validateButton = page.getByTestId('button-validate');
    const validateButtonText = await validateButton.textContent();
    console.log('Validate button text:', validateButtonText);

    await validateButton.click();
    await page.waitForTimeout(1500);

    // Screenshot 7: After validation (edit mode)
    await page.screenshot({
      path: path.join(screenshotDir, '07-edit-mode.png'),
      fullPage: true
    });

    elements = await capturePageElements(page, '07-edit-mode');
    report.push(elements);
    console.log('Step 7 - Edit Mode:', JSON.stringify(elements, null, 2));

    // Step 11: Check what's visible in edit mode
    const postTitleInput = page.getByTestId('input-post-title');
    if (await postTitleInput.isVisible()) {
      const titleValue = await postTitleInput.inputValue();
      console.log('Post title in edit mode:', titleValue);
    }

    // Step 12: Look for Save button
    const saveButton = page.getByTestId('button-submit-to-supabase');
    if (await saveButton.isVisible()) {
      const saveButtonText = await saveButton.textContent();
      console.log('Save button text:', saveButtonText);

      // Screenshot 8: Before save
      await page.screenshot({
        path: path.join(screenshotDir, '08-before-save.png'),
        fullPage: true
      });

      // Click save
      await saveButton.click();

      // Wait for navigation or response
      await page.waitForTimeout(3000);

      // Screenshot 9: After save (should be Blog Editor)
      await page.screenshot({
        path: path.join(screenshotDir, '09-after-save.png'),
        fullPage: true
      });

      // Check if we're in Blog Editor
      const currentUrl = page.url();
      console.log('URL after save:', currentUrl);

      elements = await capturePageElements(page, '09-after-save');
      report.push(elements);
      console.log('Step 9 - After Save:', JSON.stringify(elements, null, 2));
    }

    // Save full report
    fs.writeFileSync(
      path.join(screenshotDir, 'walkthrough-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n=== WALKTHROUGH COMPLETE ===');
    console.log('Screenshots saved to:', screenshotDir);
    console.log('Report saved to: walkthrough-report.json');
  });
});
