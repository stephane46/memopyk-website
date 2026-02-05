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
// TEST: TOPICS CRUD
// =============================================================================

test.describe('Topics CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogHub(page);
  });

  test('1. Navigate to Topics tab and verify list loads', async ({ page }) => {
    // Click Topics tab
    await clickBlogTab(page, 'topics');

    // Wait for topics list to load - look for accordion items or the Topics card
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });

    // Verify the Topics card header is visible
    await expect(page.getByText('Topics (')).toBeVisible();

    // Take screenshot
    await screenshot(page, 'topics-list-loaded');
  });

  test('2. Create a new topic', async ({ page }) => {
    await clickBlogTab(page, 'topics');
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });

    // Click "New Topic" button
    await page.getByTestId('button-new-topic').click();

    // Wait for TopicFormModal to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('New Topic')).toBeVisible();

    // Fill in required fields
    // Title
    await page.getByTestId('input-title').fill(TEST_TOPIC_TITLE);
    await page.waitForTimeout(500); // Wait for slug auto-generation

    // Verify slug was auto-generated
    const slugInput = page.getByTestId('input-slug');
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toContain('playwright-test-topic');

    // Category - select first option
    await page.getByTestId('select-category').click();
    await page.getByRole('option').first().click();

    // Type - select first option
    await page.getByTestId('select-type').click();
    await page.getByRole('option').first().click();

    // Primary Keyword
    await page.getByTestId('input-primary-keyword').fill(TEST_KEYWORD);

    // Click Save/Create button
    await page.getByTestId('button-save').click();

    // Wait for toast success message
    await waitForToast(page, /created|success/i);

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify topic appears in the list - search for it
    await page.getByTestId('input-search').fill(TEST_TOPIC_TITLE);
    await page.waitForTimeout(1000);

    // Should see our new topic
    await expect(page.getByText(TEST_TOPIC_TITLE)).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await screenshot(page, 'topics-create-success');
  });

  test('3. Edit the topic', async ({ page }) => {
    await clickBlogTab(page, 'topics');
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });

    // Search for our test topic
    await page.getByTestId('input-search').fill(TEST_TOPIC_TITLE);
    await page.waitForTimeout(1000);

    // Find and expand the topic accordion
    const topicRow = page.locator('[data-testid^="topic-"]').filter({ hasText: TEST_TOPIC_TITLE });
    await topicRow.click();
    await page.waitForTimeout(500);

    // Find and click the Edit button
    const editButton = page.locator(`button[data-testid^="button-edit-topic"]`).first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for TopicFormModal in edit mode
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Topic')).toBeVisible();

    // Change title
    const titleInput = page.getByTestId('input-title');
    await titleInput.clear();
    await titleInput.fill(TEST_TOPIC_EDITED);

    // Click Save/Update button
    await page.getByTestId('button-save').click();

    // Wait for toast success message
    await waitForToast(page, /updated|success/i);

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify updated title shows in list
    await page.getByTestId('input-search').clear();
    await page.getByTestId('input-search').fill(TEST_TOPIC_EDITED);
    await page.waitForTimeout(1000);

    await expect(page.getByText(TEST_TOPIC_EDITED)).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await screenshot(page, 'topics-edit-success');
  });

  test('4. Delete the topic', async ({ page }) => {
    await clickBlogTab(page, 'topics');
    await expect(page.getByTestId('button-new-topic')).toBeVisible({ timeout: 15000 });

    // Search for our edited test topic
    await page.getByTestId('input-search').fill(TEST_TOPIC_EDITED);
    await page.waitForTimeout(1000);

    // Find and expand the topic accordion
    const topicRow = page.locator('[data-testid^="topic-"]').filter({ hasText: TEST_TOPIC_EDITED });
    await topicRow.click();
    await page.waitForTimeout(500);

    // Find and click the Delete button
    const deleteButton = page.locator(`button[data-testid^="button-delete-topic"]`).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // Wait for TopicDeleteDialog confirmation
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Delete Topic')).toBeVisible();

    // Verify the dialog shows the topic title
    await expect(page.getByText(TEST_TOPIC_EDITED)).toBeVisible();

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

    // Take screenshot
    await screenshot(page, 'topics-delete-success');
  });
});

// =============================================================================
// CLEANUP TEST - runs if previous tests failed mid-way
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
      await topicRow.click();
      await page.waitForTimeout(500);

      const deleteButton = page.locator(`button[data-testid^="button-delete-topic"]`).first();
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
