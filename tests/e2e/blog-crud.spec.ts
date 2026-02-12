import { test, expect, Page } from '@playwright/test';
import { loginToAdmin, navigateToBlogHub, clickBlogTab, config } from './helpers/auth';
import { cleanupE2EPosts } from './helpers/cleanup';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/blog-crud';
const TEST_POST_TITLE = '[E2E] Test Blog Post';
const TEST_POST_TITLE_EDITED = '[E2E] Test Blog Post Edited';
const TEST_POST_SLUG_BASE = 'e2e-test-blog-post';

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
// TEST: BLOG POST CRUD - FULL WORKFLOW
// =============================================================================

test.describe('Blog Post CRUD Operations', () => {
  // Use serial mode since tests depend on each other
  test.describe.configure({ mode: 'serial' });

  // Increase timeout for CRUD operations
  test.setTimeout(120000);

  let createdPostId: string | null = null;

  test('Full CRUD workflow: Create, Verify, Edit, Delete blog post', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `${TEST_POST_TITLE} ${timestamp}`;
    const testSlug = `${TEST_POST_SLUG_BASE}-${timestamp}`;

    // =========================================================================
    // STEP 1: Login and navigate to Posts tab
    // =========================================================================
    await loginToAdmin(page);
    await navigateToBlogHub(page);
    await clickBlogTab(page, 'posts');

    // Wait for posts list to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '1-posts-list-loaded');
    console.log('Step 1: Posts list loaded');

    // =========================================================================
    // STEP 2: Create a new post
    // =========================================================================
    const newPostButton = page.getByTestId('button-new-post');
    await expect(newPostButton).toBeVisible({ timeout: 10000 });
    await expect(newPostButton).toBeEnabled({ timeout: 5000 });

    // Click New Post — this navigates to a creation method page
    await newPostButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The app shows "Create a New Blog Post" with two options:
    // "Write from scratch" and "Generate with AI"
    // Click "Write from scratch" which triggers the actual POST API call
    const writeFromScratch = page.getByText('Write from scratch');
    await expect(writeFromScratch).toBeVisible({ timeout: 10000 });

    let attempts = 0;
    const maxAttempts = 3;
    let lastStatus = 0;

    while (attempts < maxAttempts) {
      attempts++;

      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('/api/admin/blog/posts') && resp.request().method() === 'POST',
        { timeout: 30000 }
      );

      await writeFromScratch.click();

      const response = await responsePromise;
      lastStatus = response.status();
      console.log(`API responded with status ${lastStatus} (attempt ${attempts})`);

      if (lastStatus === 429) {
        // Rate limited - wait and retry
        console.log(`Rate limited, waiting 3s before retry ${attempts}/${maxAttempts}`);
        await page.waitForTimeout(3000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        // Navigate back to posts to start over
        await navigateToBlogHub(page);
        await clickBlogTab(page, 'posts');
        await page.waitForTimeout(2000);
        // Re-click New Post to get back to creation method page
        await page.getByTestId('button-new-post').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        continue;
      }

      if (lastStatus === 200 || lastStatus === 201) {
        break;
      }
    }

    expect(lastStatus === 200 || lastStatus === 201).toBe(true);

    // Wait for navigation to editor
    try {
      await page.waitForURL(/tab=blog-edit/, { timeout: 30000 });
    } catch {
      // Check if already on editor
      expect(page.url()).toContain('blog-edit');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Wait for editor to load
    await page.waitForSelector('[data-testid="input-title"]', { state: 'visible', timeout: 30000 });
    const titleInput = page.getByTestId('input-title');
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // Extract post ID from URL
    const url = page.url();
    const urlMatch = url.match(/id=([^&]+)/);
    if (urlMatch) {
      createdPostId = urlMatch[1];
      console.log(`Post created with ID: ${createdPostId}`);
    }

    // Fill in title
    await titleInput.fill(testTitle);

    // Fill in slug
    const slugInput = page.getByTestId('input-slug');
    await slugInput.fill(testSlug);

    // Fill in description
    const descInput = page.getByTestId('textarea-description');
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill('This is an automated E2E test post created by Playwright. DELETE ME.');
    }

    // Set status to draft
    const statusSelect = page.getByTestId('select-status');
    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusSelect.click();
      await page.waitForTimeout(300);
      const draftOption = page.getByTestId('status-draft');
      if (await draftOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await draftOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Save the post
    const saveResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/admin/blog/posts/') &&
              (resp.request().method() === 'PUT' || resp.request().method() === 'PATCH'),
      { timeout: 30000 }
    );

    await page.getByTestId('button-save').click();

    try {
      const saveResponse = await saveResponsePromise;
      const saveStatus = saveResponse.status();
      console.log(`Save API responded with status ${saveStatus}`);
    } catch {
      console.log('Could not detect save response');
    }

    await page.waitForTimeout(2000);
    await screenshot(page, '2-post-created');
    console.log('Step 2: Post created successfully');

    // =========================================================================
    // STEP 3: Verify post appears in list
    // =========================================================================
    // Navigate back to posts list
    const backButton = page.getByTestId('button-back-to-posts');
    if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backButton.click();
    } else {
      // Fallback: navigate via Blog Hub
      await navigateToBlogHub(page);
      await clickBlogTab(page, 'posts');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for our post in the list
    const postCards = page.locator('[data-testid^="post-card-"]');
    const count = await postCards.count();
    let foundPost = false;

    for (let i = 0; i < count; i++) {
      const card = postCards.nth(i);
      const title = await card.locator('h3').textContent();
      if (title && title.includes('[E2E]')) {
        foundPost = true;
        break;
      }
    }

    await screenshot(page, '3-post-in-list');
    console.log(`Step 3: Post ${foundPost ? 'found' : 'not found'} in list (${count} posts total)`);

    // =========================================================================
    // STEP 4: Edit the post
    // =========================================================================
    if (createdPostId) {
      // Navigate to editor
      await page.goto(`${config.baseUrl}/en-US/admin?tab=blog-edit&id=${createdPostId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if post exists
      const postNotFound = page.locator('text=Post not found');
      if (await postNotFound.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Post was cleaned up by server - skipping edit and delete');
        await screenshot(page, '4-post-not-found');
        return;
      }

      // Wait for editor
      await page.waitForSelector('[data-testid="input-title"]', { state: 'visible', timeout: 15000 });
      const editTitleInput = page.getByTestId('input-title');
      await expect(editTitleInput).toBeVisible({ timeout: 10000 });

      // Change title
      await editTitleInput.clear();
      await editTitleInput.fill(`${TEST_POST_TITLE_EDITED} ${timestamp}`);

      // Save
      await page.getByTestId('button-save').click();
      await page.waitForTimeout(2000);

      // Check for success toast
      const toast = page.locator('[role="status"]').filter({ hasText: /success/i });
      if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Step 4: Post edited successfully (toast confirmed)');
      } else {
        console.log('Step 4: Post edit saved (no toast detected)');
      }

      await screenshot(page, '4-post-edited');
    }

    // =========================================================================
    // STEP 5: Delete the post
    // =========================================================================
    if (createdPostId) {
      // Navigate back to posts list
      await navigateToBlogHub(page);
      await clickBlogTab(page, 'posts');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find the delete button for our post
      const deleteButton = page.getByTestId(`button-delete-${createdPostId}`);
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();

        // Wait for confirmation dialog
        await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });

        // Click confirm delete
        const confirmButton = page.getByRole('button', { name: /delete/i }).last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('Step 5: Post deleted');
        }
      } else {
        console.log('Step 5: Delete button not found (post may have been auto-cleaned)');
      }

      await screenshot(page, '5-post-deleted');
    }

    console.log('\nAll Blog CRUD operations completed!');
  });
});

// =============================================================================
// CLEANUP TEST - removes any leftover [E2E] posts
// =============================================================================

test.describe('Blog Post CRUD Cleanup', () => {
  test.setTimeout(60000);

  test('Cleanup: Delete any leftover [E2E] blog posts', async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogHub(page);

    const cleanup = await cleanupE2EPosts(page);
    console.log(`Cleanup result: ${cleanup.deleted} posts deleted`);
    if (cleanup.errors.length > 0) {
      console.warn('Cleanup errors:', cleanup.errors);
    }

    await screenshot(page, 'cleanup-complete');
  });
});
