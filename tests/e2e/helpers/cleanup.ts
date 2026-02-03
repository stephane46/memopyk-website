import { Page } from '@playwright/test';
import { clickBlogTab } from './auth';

/**
 * Clean up all E2E test posts (those with [E2E] in the title)
 * Call this in afterAll to remove test data
 */
export async function cleanupE2EPosts(page: Page): Promise<{ deleted: number; errors: string[] }> {
  const result = { deleted: 0, errors: [] as string[] };

  try {
    // Navigate to Posts tab
    await clickBlogTab(page, 'posts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for post cards containing [E2E]
    let attempts = 0;
    const maxAttempts = 10; // Safety limit

    while (attempts < maxAttempts) {
      attempts++;

      // Find all post cards
      const postCards = await page.locator('[data-testid^="post-card-"]').all();

      if (postCards.length === 0) {
        console.log('No posts found on the page');
        break;
      }

      // Find one with [E2E] in title
      let foundE2EPost = false;

      for (const card of postCards) {
        const titleText = await card.locator('h3').textContent();

        if (titleText && titleText.includes('[E2E]')) {
          foundE2EPost = true;

          // Get the post ID from the testid
          const testid = await card.getAttribute('data-testid');
          const postId = testid?.replace('post-card-', '');

          if (!postId) {
            result.errors.push('Could not extract post ID from card');
            continue;
          }

          console.log(`Deleting E2E post: "${titleText}" (${postId})`);

          // Click delete button
          const deleteButton = page.getByTestId(`button-delete-${postId}`);
          await deleteButton.click();

          // Wait for confirmation dialog
          await page.waitForTimeout(500);

          // Click confirm delete in AlertDialog
          const confirmButton = page.getByRole('button', { name: /delete/i }).last();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            result.deleted++;

            // Wait for deletion to complete
            await page.waitForTimeout(1000);
          } else {
            result.errors.push(`Confirm dialog not found for post ${postId}`);
          }

          // Break inner loop to re-query the post list
          break;
        }
      }

      // If no E2E post found in this iteration, we're done
      if (!foundE2EPost) {
        console.log('No more [E2E] posts found');
        break;
      }
    }

    console.log(`Cleanup complete: ${result.deleted} posts deleted`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Cleanup failed: ${msg}`);
    console.error('Cleanup error:', error);
  }

  return result;
}
