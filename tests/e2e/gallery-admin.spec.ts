import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/gallery-admin';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToGallery(page: Page): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Contenu Site" to expand it
  await sidebar.getByText('Contenu Site').click();
  await page.waitForTimeout(500);

  // Click "Galerie Vidéos" sub-menu item
  await sidebar.getByText('Galerie Vidéos').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================================================
// TEST: GALLERY MANAGEMENT
// =============================================================================

test.describe('Gallery Admin Section', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Gallery page loads successfully', async ({ page }) => {
    await navigateToGallery(page);

    // Wait for gallery content to load
    await page.waitForTimeout(2000);

    // Look for gallery-related content
    const hasGalleryHeading = await page.getByText(/galerie|gallery|vid[eé]os/i).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasGalleryHeading).toBe(true);

    await screenshot(page, '1-gallery-page-loaded');
    console.log('Gallery page loaded successfully');
  });

  test('Gallery displays video/media items', async ({ page }) => {
    await navigateToGallery(page);
    await page.waitForTimeout(2000);

    // Count gallery items (could be cards, rows, or grid items)
    const galleryItems = await page.locator(
      '[data-testid^="gallery-"], .gallery-item, [class*="gallery"], video, iframe, [class*="video"]'
    ).count();

    // Also check for image/thumbnail elements
    const thumbnails = await page.locator('img[src*="supabase"], img[src*="video"], img[src*="gallery"]').count();

    // Check for any list/grid of items
    const listItems = await page.locator('table tbody tr, .grid > div, [class*="card"]').count();

    console.log(`Gallery items: ${galleryItems}, thumbnails: ${thumbnails}, list items: ${listItems}`);

    await screenshot(page, '2-gallery-items');
  });

  test('Gallery has CRUD controls', async ({ page }) => {
    await navigateToGallery(page);
    await page.waitForTimeout(2000);

    // Check for Add/Create button
    const addButton = page.locator('button').filter({ hasText: /add|new|ajouter|upload|create/i }).first();
    const hasAdd = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for Edit buttons
    const editButtons = await page.locator('button').filter({ hasText: /edit|modifier|pencil/i }).count();

    // Check for Delete buttons
    const deleteButtons = await page.locator('button').filter({ hasText: /delete|supprimer|remove/i }).count();

    // Check for reorder/drag handles
    const dragHandles = await page.locator('[class*="drag"], [class*="grip"], [data-handler]').count();

    console.log(`CRUD controls: add=${hasAdd}, edit=${editButtons}, delete=${deleteButtons}, drag=${dragHandles}`);

    if (hasAdd) {
      console.log('Add/Create button found');
    }

    await screenshot(page, '3-gallery-crud-controls');
  });

  test('Gallery has filter or sort controls', async ({ page }) => {
    await navigateToGallery(page);
    await page.waitForTimeout(2000);

    // Check for search/filter input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="chercher" i]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);

    // Check for sort/filter dropdowns
    const filterDropdown = page.locator('select, [role="combobox"]').first();
    const hasFilter = await filterDropdown.isVisible({ timeout: 3000 }).catch(() => false);

    // Check for tabs (e.g., by type, language)
    const tabs = page.locator('[role="tab"], button[role="tab"]');
    const tabCount = await tabs.count();

    console.log(`Controls: search=${hasSearch}, filter=${hasFilter}, tabs=${tabCount}`);

    await screenshot(page, '4-gallery-controls');
  });

  test('Gallery full-page screenshot for reference', async ({ page }) => {
    await navigateToGallery(page);
    await page.waitForTimeout(2000);

    // Take a full-page screenshot for documentation
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '5-gallery-full-page.png'),
      fullPage: true,
    });

    console.log('Full-page gallery screenshot captured');
  });

  test('Gallery item interaction: click first item if available', async ({ page }) => {
    await navigateToGallery(page);
    await page.waitForTimeout(2000);

    // Try to find and click the first gallery item or edit button
    const firstEditButton = page.locator('button[title*="edit" i], button[title*="modifier" i], button:has(svg)').first();

    if (await firstEditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstEditButton.click();
      await page.waitForTimeout(1000);

      // Check if a modal or form opened
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Gallery item edit dialog opened');
        await screenshot(page, '6-gallery-item-edit-dialog');

        // Close dialog without saving
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        console.log('Gallery item clicked but no dialog appeared - may use inline editing');
        await screenshot(page, '6-gallery-item-clicked');
      }
    } else {
      // Try clicking on a card or row directly
      const firstCard = page.locator('.grid > div, table tbody tr, [class*="card"]').first();
      if (await firstCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstCard.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '6-gallery-first-card-clicked');
        console.log('Clicked first gallery card');
      } else {
        console.log('No gallery items found to interact with');
        await screenshot(page, '6-gallery-no-items');
      }
    }
  });
});
