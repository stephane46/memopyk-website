import { Page, expect } from '@playwright/test';

// Configuration from environment variables with defaults
const BASE_URL = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'memopyk2025admin';

export const config = {
  baseUrl: BASE_URL,
  adminUrl: `${BASE_URL}/admin`,
  adminPassword: ADMIN_PASSWORD,
};

/**
 * Login to admin panel and wait for sidebar to load
 */
export async function loginToAdmin(page: Page): Promise<void> {
  await page.goto(config.adminUrl);

  // Handle cookie consent banner if present
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
  }

  // Enter password and submit
  await page.getByLabel(/password/i).fill(config.adminPassword);
  await page.getByRole('button', { name: /access admin/i }).click();

  // Wait for sidebar to load (indicates successful login)
  await expect(page.locator('.bg-gray-900.fixed')).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to Blog Hub and wait for tabs to be visible
 */
export async function navigateToBlogHub(page: Page): Promise<void> {
  const sidebar = page.locator('.bg-gray-900.fixed');
  await sidebar.getByText('Blog').click();

  // Wait for ContentProductionHub tabs to load
  await expect(page.getByTestId('tab-planner')).toBeVisible({ timeout: 10000 });
}

/**
 * Click a specific tab in the Blog Hub
 */
export async function clickBlogTab(page: Page, tabName: string): Promise<void> {
  const testId = `tab-${tabName}`;
  await page.getByTestId(testId).click();

  // Wait for tab content to stabilize
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Brief pause for any animations
}
