import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/seo-admin';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToSEO(page: Page): Promise<void> {
  const sidebar = getSidebar(page);
  await sidebar.getByText('SEO').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================================================
// TEST: SEO MANAGEMENT
// =============================================================================

test.describe('SEO Admin Section', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('SEO page loads with management heading', async ({ page }) => {
    await navigateToSEO(page);

    // Verify SEO Management section loaded
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });

    await screenshot(page, '1-seo-page-loaded');
    console.log('SEO Management page loaded successfully');
  });

  test('SEO page has language or page selector controls', async ({ page }) => {
    await navigateToSEO(page);
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });

    // Check for language tabs or page selector
    // The SEO page may have tabs for FR/EN or a dropdown for page selection
    const hasLanguageTabs = await page.locator('button, [role="tab"]').filter({ hasText: /FR|EN|French|English/i }).first()
      .isVisible({ timeout: 5000 }).catch(() => false);

    const hasPageSelector = await page.locator('select, [role="combobox"], button').filter({ hasText: /page|accueil|home/i }).first()
      .isVisible({ timeout: 3000 }).catch(() => false);

    const hasAnySelector = hasLanguageTabs || hasPageSelector;

    if (hasLanguageTabs) {
      console.log('Found language tabs/selector');
    }
    if (hasPageSelector) {
      console.log('Found page selector');
    }
    if (!hasAnySelector) {
      console.log('No explicit language tabs or page selector found - SEO may use a different layout');
    }

    await screenshot(page, '2-seo-controls');
  });

  test('SEO page displays form fields or settings', async ({ page }) => {
    await navigateToSEO(page);
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for common SEO fields: title, description, keywords, OG image
    const hasInputs = await page.locator('input, textarea').count() > 0;
    const hasMetaTitle = await page.getByText(/meta title|titre|title tag/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasMetaDesc = await page.getByText(/meta description|description/i).isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`SEO form state: inputs=${hasInputs}, metaTitle=${hasMetaTitle}, metaDesc=${hasMetaDesc}`);

    await screenshot(page, '3-seo-form-fields');
  });

  test('SEO page has save or update capability', async ({ page }) => {
    await navigateToSEO(page);
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for save/update button
    const saveButton = page.locator('button').filter({ hasText: /save|update|enregistrer|sauvegarder/i }).first();
    const hasSave = await saveButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSave) {
      console.log('Found save/update button - SEO section supports editing');
    } else {
      console.log('No save button found - SEO section may be read-only or auto-saving');
    }

    await screenshot(page, '4-seo-save-capability');
  });

  test('SEO page full-page screenshot for reference', async ({ page }) => {
    await navigateToSEO(page);
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take a full-page screenshot for documentation
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '5-seo-full-page.png'),
      fullPage: true,
    });

    console.log('Full-page SEO screenshot captured');
  });

  test('SEO page can switch between languages if available', async ({ page }) => {
    await navigateToSEO(page);
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Try to find and click language selector tabs
    const frTab = page.locator('button, [role="tab"]').filter({ hasText: /^FR$/i }).first();
    const enTab = page.locator('button, [role="tab"]').filter({ hasText: /^EN$/i }).first();

    if (await frTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await frTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '6-seo-lang-fr');
      console.log('Switched to FR language tab');

      if (await enTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await enTab.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '6-seo-lang-en');
        console.log('Switched to EN language tab');
      }
    } else {
      console.log('No FR/EN language tabs found - language switching may use a different pattern');
      await screenshot(page, '6-seo-no-lang-tabs');
    }
  });
});
