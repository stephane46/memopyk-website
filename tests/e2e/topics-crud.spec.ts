import { test, expect, Page } from '@playwright/test';
import { loginToAdmin, navigateToBlogHub, clickBlogTab } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/topics-crud';
const TEST_TOPIC_TITLE = 'Playwright Test Topic - DELETE ME';
const TEST_TOPIC_EDITED = 'Playwright Test Topic EDITED - DELETE ME';
const TEST_KEYWORD = 'playwright test keyword';

// =============================================================================
// HELPERS
// =============================================================================

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function waitForToast(page: Page, textMatch: RegExp | string): Promise<void> {
  const toast = page.locator('[data-sonner-toast], [role="status"]').filter({ hasText: textMatch });
  await expect(toast).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// TEST: TOPICS CRUD - FULL WORKFLOW
// =============================================================================

test.describe('Topics CRUD Operations', () => {
  test('Full CRUD workflow: Create, Edit, Delete topic', async ({ page }) => {
    // =========================================================================
    // STEP 1: Login and navigate to Topics
    // =========================================================================
    await loginToAdmin(page);
    await navigateToBlogHub(page);
    await clickBlogTab(page, 'topics');

    // Wait for topics list to load
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Topics (')).toBeVisible();
    await screenshot(page, '1-topics-list-loaded');
    console.log('✅ Step 1: Topics list loaded');

    // =========================================================================
    // STEP 2: Create a new topic
    // =========================================================================
    await page.getByTestId('button-new-topic').click();

    // Wait for TopicFormModal to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: 'New Topic' })).toBeVisible();

    // Fill in required fields
    await dialog.getByTestId('input-title').fill(TEST_TOPIC_TITLE);
    await page.waitForTimeout(500); // Wait for slug auto-generation

    // Verify slug was auto-generated
    const slugInput = dialog.getByTestId('input-slug');
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toContain('playwright-test-topic');

    // Category - select first option
    await dialog.getByTestId('select-category').click();
    await page.waitForTimeout(300);
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(300);

    // Type - select first option
    await dialog.getByTestId('select-type').click();
    await page.waitForTimeout(300);
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(300);

    // Primary Keyword
    await dialog.getByTestId('input-primary-keyword').fill(TEST_KEYWORD);

    // Click Save/Create button
    await dialog.getByTestId('button-save').click();

    // Wait for toast success message
    await waitForToast(page, /created|success/i);

    // Wait for modal to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Search for the created topic
    await page.getByTestId('input-search').fill(TEST_TOPIC_TITLE);
    await page.waitForTimeout(1000);

    // Verify topic appears in the list
    await expect(page.getByText(TEST_TOPIC_TITLE)).toBeVisible({ timeout: 5000 });
    await screenshot(page, '2-topics-create-success');
    console.log('✅ Step 2: Topic created successfully');

    // =========================================================================
    // STEP 3: Edit the topic
    // =========================================================================
    // Find and expand the topic accordion
    const topicRow = page.locator('[data-testid^="topic-"]').filter({ hasText: TEST_TOPIC_TITLE });
    await topicRow.locator('button').first().click(); // Click the accordion trigger
    await page.waitForTimeout(500);

    // Find and click the Edit button
    const editButton = page.locator('button[data-testid^="button-edit-topic"]').first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for TopicFormModal in edit mode
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 5000 });
    await expect(editDialog.getByRole('heading', { name: 'Edit Topic' })).toBeVisible();

    // Change title
    const titleInput = editDialog.getByTestId('input-title');
    await titleInput.clear();
    await titleInput.fill(TEST_TOPIC_EDITED);

    // Click Save/Update button
    await editDialog.getByTestId('button-save').click();

    // Wait for toast success message
    await waitForToast(page, /updated|success/i);

    // Wait for modal to close
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });

    // Search for updated topic
    await page.getByTestId('input-search').clear();
    await page.getByTestId('input-search').fill(TEST_TOPIC_EDITED);
    await page.waitForTimeout(1000);

    // Verify updated title shows
    await expect(page.getByText(TEST_TOPIC_EDITED)).toBeVisible({ timeout: 5000 });
    await screenshot(page, '3-topics-edit-success');
    console.log('✅ Step 3: Topic edited successfully');

    // =========================================================================
    // STEP 4: Delete the topic
    // =========================================================================
    // Find and expand the edited topic
    const editedTopicRow = page.locator('[data-testid^="topic-"]').filter({ hasText: TEST_TOPIC_EDITED });
    await editedTopicRow.locator('button').first().click(); // Click accordion trigger
    await page.waitForTimeout(500);

    // Find and click the Delete button
    const deleteButton = page.locator('button[data-testid^="button-delete-topic"]').first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // Wait for TopicDeleteDialog confirmation
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Delete Topic' })).toBeVisible();

    // Verify the dialog shows the topic title
    await expect(page.getByRole('alertdialog').getByText(TEST_TOPIC_EDITED)).toBeVisible();

    // Click "Delete Topic" confirmation button
    await page.getByRole('button', { name: /delete topic/i }).click();

    // Wait for toast success message
    await waitForToast(page, /deleted|success/i);

    // Wait for dialog to close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });

    // Verify topic is gone from the list
    await page.waitForTimeout(1000);
    const topicGone = page.locator('[data-testid^="topic-"]').filter({ hasText: TEST_TOPIC_EDITED });
    await expect(topicGone).not.toBeVisible({ timeout: 5000 });
    await screenshot(page, '4-topics-delete-success');
    console.log('✅ Step 4: Topic deleted successfully');

    console.log('\n✅ All CRUD operations completed successfully!');
  });
});

// =============================================================================
// CLEANUP TEST - runs to clean up any leftover test topics
// =============================================================================

test.describe('Topics CRUD Cleanup', () => {
  test('Cleanup: Delete any leftover test topics', async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogHub(page);
    await clickBlogTab(page, 'topics');
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });

    // Search for test topics
    await page.getByTestId('input-search').fill('DELETE ME');
    await page.waitForTimeout(1000);

    // Try to delete any found test topics
    let attempts = 0;
    while (attempts < 5) {
      const topicRow = page.locator('[data-testid^="topic-"]').filter({ hasText: 'DELETE ME' }).first();

      if (!await topicRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('No more test topics to clean up');
        break;
      }

      // Expand and delete
      await topicRow.locator('button').first().click();
      await page.waitForTimeout(500);

      const deleteButton = page.locator('button[data-testid^="button-delete-topic"]').first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        const confirmButton = page.getByRole('button', { name: /delete topic/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
          await page.waitForTimeout(1500);
        }
      }

      attempts++;
    }
  });
});
