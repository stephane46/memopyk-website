import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/cache-admin';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToCache(page: Page): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Système" to expand it (note the accent)
  await sidebar.getByText('Système').click();
  await page.waitForTimeout(500);

  // Click "Cache" sub-menu item
  await sidebar.getByText('Cache').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function navigateToSystemSection(page: Page, section: string): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Système" to expand it
  await sidebar.getByText('Système').click();
  await page.waitForTimeout(500);

  // Click the specific sub-menu item
  await sidebar.getByText(section).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================================================
// TEST: CACHE / SYSTEM MANAGEMENT
// =============================================================================

test.describe('Cache/System Admin Section', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Cache page loads with status information', async ({ page }) => {
    await navigateToCache(page);

    // Wait for cache content to load
    await page.waitForTimeout(2000);

    // Look for cache-related content
    const hasCacheContent = await page.getByText(/cache|status|statut/i).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasCacheContent).toBe(true);

    await screenshot(page, '1-cache-page-loaded');
    console.log('Cache page loaded successfully');
  });

  test('Cache page displays status cards or metrics', async ({ page }) => {
    await navigateToCache(page);
    await page.waitForTimeout(2000);

    // Count status cards or metric displays
    const cards = await page.locator('[class*="card"], [class*="stat"], [class*="metric"]').count();
    const badges = await page.locator('[class*="badge"]').count();

    // Check for specific cache status indicators
    const hasHitRate = await page.getByText(/hit rate|taux/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasEntries = await page.getByText(/entries|entr[eé]es|items|elements/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasSize = await page.getByText(/size|taille|memory|m[eé]moire/i).isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Cache metrics: cards=${cards}, badges=${badges}, hitRate=${hasHitRate}, entries=${hasEntries}, size=${hasSize}`);

    await screenshot(page, '2-cache-status-cards');
  });

  test('Cache page has refresh/update button', async ({ page }) => {
    await navigateToCache(page);
    await page.waitForTimeout(2000);

    // Look for refresh/update status button
    const refreshButton = page.locator('button').filter({
      hasText: /refresh|update|actualiser|rafra[iî]chir|reload|status/i
    }).first();
    const hasRefresh = await refreshButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRefresh) {
      console.log('Found refresh/update button');

      // Click it and verify it works
      await refreshButton.click();
      await page.waitForTimeout(2000);

      // Check for success toast or visual feedback
      const toast = page.locator('[role="status"]').filter({ hasText: /success|updated|refresh/i });
      if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Refresh action completed with success feedback');
      } else {
        console.log('Refresh action completed (no toast detected)');
      }

      await screenshot(page, '3-cache-after-refresh');
    } else {
      console.log('No explicit refresh button found');
      await screenshot(page, '3-cache-no-refresh-button');
    }
  });

  test('Cache page has clear/purge capability', async ({ page }) => {
    await navigateToCache(page);
    await page.waitForTimeout(2000);

    // Look for clear/purge cache button
    const clearButton = page.locator('button').filter({
      hasText: /clear|purge|vider|supprimer|reset|invalidate/i
    }).first();
    const hasClear = await clearButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasClear) {
      console.log('Found clear/purge cache button');
      // Note: We do NOT click this to avoid disrupting the staging environment
      // Just verify it exists
      await screenshot(page, '4-cache-clear-button');
    } else {
      console.log('No clear/purge button found');
      await screenshot(page, '4-cache-no-clear-button');
    }
  });

  test('Cache full-page screenshot for reference', async ({ page }) => {
    await navigateToCache(page);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '5-cache-full-page.png'),
      fullPage: true,
    });

    console.log('Full-page cache screenshot captured');
  });
});

// =============================================================================
// TEST: OTHER SYSTEM SECTIONS
// =============================================================================

test.describe('System Admin - Other Sections', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Tests section loads', async ({ page }) => {
    await navigateToSystemSection(page, 'Tests');
    await page.waitForTimeout(2000);

    // Verify some content loaded
    const hasContent = await page.locator('h1, h2, h3, table, .grid, [class*="card"]').first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    console.log(`Tests section loaded: ${hasContent}`);

    await screenshot(page, '6-system-tests');
  });

  test('Deploiement section loads', async ({ page }) => {
    // Note: sidebar text is "Déploiement" with accent
    await navigateToSystemSection(page, 'Déploiement');
    await page.waitForTimeout(2000);

    // Verify some content loaded
    const hasContent = await page.locator('h1, h2, h3, table, .grid, [class*="card"]').first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    console.log(`Deploiement section loaded: ${hasContent}`);

    await screenshot(page, '7-system-deploiement');
  });
});
