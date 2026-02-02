import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Accept cookies if banner appears
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/MEMOPYK/i);
  });

  test('has navigation with main links', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    // Use first() since desktop and mobile nav both have these items
    await expect(nav.getByText('Gallery').first()).toBeVisible();
    await expect(nav.getByText('Blog').first()).toBeVisible();
    await expect(nav.getByText('Contact').first()).toBeVisible();
  });

  test('shows hero section', async ({ page }) => {
    // Wait for hero content to load
    await expect(page.getByText(/transform your personal photos/i)).toBeVisible({ timeout: 10000 });
  });

  test('clicking Gallery scrolls to gallery section', async ({ page }) => {
    await page.click('nav >> text=Gallery');
    // Gallery section should be visible after scroll
    await expect(page.getByText(/small and medium-sized projects/i)).toBeVisible();
  });

  test('can navigate to blog page', async ({ page }) => {
    await page.click('nav >> text=Blog');
    await expect(page).toHaveURL(/blog/i);
  });
});

test.describe('Digitization Directory', () => {
  test('loads page', async ({ page }) => {
    await page.goto('/digitization-directory');
    // Accept cookies if banner appears
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }
    await expect(page).toHaveURL(/digitization-directory/i);
  });
});
