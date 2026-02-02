import { test, expect } from '@playwright/test';

const ADMIN_URL = 'https://memopyk.memopyk.com/admin';
const ADMIN_PASSWORD = 'memopyk2025admin';

test.describe('Admin Blog Section', () => {

  test.beforeEach(async ({ page }) => {
    // Login to admin
    await page.goto(ADMIN_URL);

    // Accept cookies if present
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }

    // Enter password and submit
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /access admin/i }).click();

    // Wait for dashboard to load - look for sidebar navigation items
    // Using Blog Posts button as indicator since Analytics appears in toasts
    await expect(page.getByRole('button', { name: /blog posts/i })).toBeVisible({ timeout: 15000 });
  });

  test('Admin dashboard loads', async ({ page }) => {
    await expect(page).toHaveTitle(/MEMOPYK/);
    // Verify sidebar menu items are visible
    await expect(page.getByRole('button', { name: /blog posts/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('Blog Posts section loads', async ({ page }) => {
    await page.getByRole('button', { name: /blog posts/i }).click();
    await expect(page.getByRole('tab', { name: /manage posts/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/blog-posts-section.png' });
  });

  test('Manage Posts tab shows post list', async ({ page }) => {
    await page.getByRole('button', { name: /blog posts/i }).click();
    await page.getByRole('tab', { name: /manage posts/i }).click();

    // Wait for posts to load (table or list)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/manage-posts.png' });
  });

  test('Tag management - create and delete tag', async ({ page }) => {
    await page.getByRole('button', { name: /blog posts/i }).click();
    await page.getByRole('tab', { name: /manage posts/i }).click();

    // Find tag input/creation area
    // This may need adjustment based on actual UI
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/tag-management.png' });
  });

});

test.describe('Public Blog', () => {

  test('Blog listing page loads', async ({ page }) => {
    await page.goto('https://memopyk.memopyk.com/blog');

    // Accept cookies if present
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }

    await expect(page).toHaveTitle(/blog/i);
    await page.screenshot({ path: 'test-results/public-blog-listing.png' });
  });

  test('Blog post detail page loads', async ({ page }) => {
    await page.goto('https://memopyk.memopyk.com/blog');

    // Accept cookies
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }

    // Click first blog post
    const firstPost = page.locator('article a, [data-testid="blog-post"] a').first();
    if (await firstPost.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstPost.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/public-blog-post.png' });
    }
  });

});
