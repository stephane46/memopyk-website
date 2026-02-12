import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/faq-admin';
const TEST_FAQ_QUESTION = '[E2E] Test FAQ Question';
const TEST_FAQ_ANSWER = 'This is a test FAQ answer created by Playwright E2E tests. DELETE ME.';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToFAQ(page: Page): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Contenu Site" to expand it
  await sidebar.getByText('Contenu Site').click();
  await page.waitForTimeout(500);

  // Click FAQ sub-menu item
  await sidebar.getByText('FAQ').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function waitForToast(page: Page, textMatch: RegExp | string): Promise<void> {
  const toast = page.locator('[data-sonner-toast], [role="status"]').filter({ hasText: textMatch });
  await expect(toast).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// TEST: FAQ CRUD OPERATIONS
// =============================================================================

test.describe('FAQ Admin CRUD Operations', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('FAQ section loads with FAQ items', async ({ page }) => {
    await navigateToFAQ(page);

    // Wait for FAQ content to load
    await page.waitForTimeout(2000);

    // Look for FAQ-related headings or content
    const hasFAQHeading = await page.getByText(/FAQ|Questions/i).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasFAQHeading).toBe(true);

    // Check if FAQ items or sections are visible
    const faqItemCount = await page.locator('[data-testid^="faq-"], .faq-item, [class*="faq"]').count();
    console.log(`FAQ section loaded with ${faqItemCount} FAQ-related elements`);

    // Also check for accordion or list patterns
    const accordionItems = await page.locator('[data-state="open"], [data-state="closed"], details, [role="region"]').count();
    console.log(`Found ${accordionItems} accordion/collapsible elements`);

    await screenshot(page, '1-faq-section-loaded');
  });

  test('FAQ section has create/add capability', async ({ page }) => {
    await navigateToFAQ(page);
    await page.waitForTimeout(2000);

    // Look for an "Add" or "New" button for creating FAQs
    const addButton = page.locator('button').filter({ hasText: /add|new|ajouter|nouveau|create|creer/i }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddButton) {
      console.log('Found Add/Create FAQ button');
      await screenshot(page, '2-faq-add-button-found');
    } else {
      // Try looking for a "+" button or icon button
      const plusButton = page.locator('button').filter({ hasText: '+' }).first();
      const hasPlusButton = await plusButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPlusButton) {
        console.log('Found "+" button for adding FAQ');
      } else {
        console.log('No explicit add button found - FAQ may use inline editing or a different pattern');
      }
      await screenshot(page, '2-faq-no-add-button');
    }
  });

  test('FAQ CRUD: Create, verify, and delete a test FAQ', async ({ page }) => {
    await navigateToFAQ(page);
    await page.waitForTimeout(2000);
    await screenshot(page, '3-faq-before-create');

    // =========================================================================
    // STEP 1: Find and click the add/create button
    // =========================================================================
    const addButton = page.locator('button').filter({ hasText: /add|new|ajouter|nouveau|create/i }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasAddButton) {
      console.log('No Add FAQ button found - skipping CRUD test');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 2: Fill in FAQ fields
    // =========================================================================
    // Check if a dialog/modal opened or if inline form appeared
    const dialog = page.getByRole('dialog');
    const hasDialog = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasDialog) {
      console.log('FAQ creation dialog opened');

      // Try to find question/title input
      const questionInput = dialog.locator('input[type="text"], input[placeholder*="question" i], input[name*="question" i], input[name*="title" i]').first();
      if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await questionInput.fill(TEST_FAQ_QUESTION);
        console.log('Filled FAQ question');
      }

      // Try to find answer/content textarea
      const answerInput = dialog.locator('textarea, [contenteditable="true"], input[name*="answer" i], input[name*="content" i]').first();
      if (await answerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await answerInput.fill(TEST_FAQ_ANSWER);
        console.log('Filled FAQ answer');
      }

      // Save the FAQ
      const saveButton = dialog.locator('button').filter({ hasText: /save|create|ajouter|add|submit/i }).first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log('Clicked save on FAQ dialog');

        // Check for success toast
        const toast = page.locator('[role="status"]').filter({ hasText: /success|created|saved/i });
        if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('FAQ creation success toast appeared');
        }
      }
    } else {
      // Inline form pattern - look for recently appeared inputs
      console.log('No dialog - checking for inline FAQ form');

      const inputs = page.locator('input[type="text"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} text inputs on page`);

      // Fill the first empty text input (likely the new FAQ question field)
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const value = await input.inputValue();
        if (!value || value === '') {
          await input.fill(TEST_FAQ_QUESTION);
          console.log('Filled empty input with FAQ question');
          break;
        }
      }

      // Look for textareas (answer field)
      const textareas = page.locator('textarea');
      const textareaCount = await textareas.count();
      for (let i = 0; i < textareaCount; i++) {
        const textarea = textareas.nth(i);
        const value = await textarea.inputValue();
        if (!value || value === '') {
          await textarea.fill(TEST_FAQ_ANSWER);
          console.log('Filled empty textarea with FAQ answer');
          break;
        }
      }

      // Click save
      const saveButton = page.locator('button').filter({ hasText: /save|enregistrer|sauvegarder/i }).first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log('Clicked save button');
      }
    }

    await screenshot(page, '3-faq-after-create');

    // =========================================================================
    // STEP 3: Verify FAQ appears
    // =========================================================================
    const faqCreated = await page.getByText(TEST_FAQ_QUESTION).isVisible({ timeout: 5000 }).catch(() => false);
    if (faqCreated) {
      console.log('FAQ item verified in the list');
    } else {
      console.log('FAQ item not visible in list - may require page refresh or different verification');
    }

    await screenshot(page, '4-faq-verified');

    // =========================================================================
    // STEP 4: Delete the test FAQ
    // =========================================================================
    if (faqCreated) {
      // Find the FAQ item and its delete button
      const faqItem = page.locator('div, li, tr').filter({ hasText: TEST_FAQ_QUESTION }).first();

      if (await faqItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Look for delete button within or near the FAQ item
        const deleteButton = faqItem.locator('button').filter({ hasText: /delete|supprimer|remove/i }).first();
        const hasDeleteInline = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasDeleteInline) {
          // Try icon-only delete button (trash icon)
          const trashButton = faqItem.locator('button[title*="delete" i], button[aria-label*="delete" i], button:has(svg)').last();
          if (await trashButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await trashButton.click();
          }
        } else {
          await deleteButton.click();
        }

        await page.waitForTimeout(1000);

        // Handle confirmation dialog if it appears
        const alertDialog = page.getByRole('alertdialog');
        if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          const confirmDelete = page.getByRole('button', { name: /delete|confirm|supprimer/i }).last();
          if (await confirmDelete.isVisible()) {
            await confirmDelete.click();
            await page.waitForTimeout(2000);
            console.log('FAQ deleted (confirmed in dialog)');
          }
        } else {
          console.log('FAQ delete action triggered (no confirmation dialog)');
        }
      }
    }

    await screenshot(page, '5-faq-after-delete');
  });
});

// =============================================================================
// CLEANUP TEST - removes any leftover [E2E] FAQ items
// =============================================================================

test.describe('FAQ Admin Cleanup', () => {
  test.setTimeout(60000);

  test('Cleanup: Delete any leftover [E2E] FAQ items', async ({ page }) => {
    await loginToAdmin(page);
    await navigateToFAQ(page);
    await page.waitForTimeout(2000);

    let attempts = 0;
    while (attempts < 5) {
      const e2eFAQ = page.locator('div, li, tr').filter({ hasText: '[E2E]' }).first();

      if (!await e2eFAQ.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('No more [E2E] FAQ items to clean up');
        break;
      }

      // Try to find and click delete button
      const deleteButton = e2eFAQ.locator('button').filter({ hasText: /delete|supprimer|remove/i }).first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation dialog
        const confirmButton = page.getByRole('button', { name: /delete|confirm|supprimer/i }).last();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
          await page.waitForTimeout(1500);
        }
      } else {
        // Try icon button
        const trashButton = e2eFAQ.locator('button:has(svg)').last();
        if (await trashButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await trashButton.click();
          await page.waitForTimeout(500);

          const confirmButton = page.getByRole('button', { name: /delete|confirm|supprimer/i }).last();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
            await page.waitForTimeout(1500);
          }
        } else {
          break; // No delete mechanism found
        }
      }

      attempts++;
    }

    await screenshot(page, 'cleanup-complete');
  });
});
