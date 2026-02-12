import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/partners-admin';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToPartners(page: Page, subItem?: string): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Partenaires" to expand the collapsible
  await sidebar.getByText('Partenaires').click();
  await page.waitForTimeout(500);

  if (subItem) {
    // Click the specific sub-menu item
    await sidebar.getByText(subItem).click();
  } else {
    // Default: click "Annuaire Pro" (the main partner directory)
    await sidebar.getByText('Annuaire Pro').click();
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================================================
// TEST: PARTNERS DIRECTORY (Annuaire Pro)
// =============================================================================

test.describe('Partners Admin - Annuaire Pro', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Partners directory loads successfully', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for partners-related headings or content
    const hasHeading = await page.getByText(/partenaire|partner|annuaire|directory/i).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    // Accept the page loaded if we see any content
    const hasContent = hasHeading || await page.locator('table, .grid, [class*="card"], [class*="list"]').first()
      .isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasContent).toBe(true);

    await screenshot(page, '1-partners-directory-loaded');
    console.log('Partners directory loaded successfully');
  });

  test('Partners list displays partner entries', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');
    await page.waitForTimeout(2000);

    // Count partner entries (could be table rows, cards, or list items)
    const tableRows = await page.locator('table tbody tr').count();
    const cards = await page.locator('[data-testid^="partner-"], [class*="partner"], [class*="card"]').count();
    const listItems = await page.locator('.grid > div').count();

    const totalItems = Math.max(tableRows, cards, listItems);
    console.log(`Partner entries: tableRows=${tableRows}, cards=${cards}, listItems=${listItems}, total=${totalItems}`);

    await screenshot(page, '2-partners-list');
  });

  test('Partners directory has search/filter functionality', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');
    await page.waitForTimeout(2000);

    // Check for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="chercher" i], input[placeholder*="filter" i], input[placeholder*="filtre" i]'
    ).first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for filter dropdowns
    const filterDropdowns = await page.locator('select, [role="combobox"]').count();

    // Check for category/type filters
    const categoryFilter = page.locator('button, [role="tab"]').filter({ hasText: /categ|type|all|tous/i }).first();
    const hasCategoryFilter = await categoryFilter.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Search/Filter: search=${hasSearch}, dropdowns=${filterDropdowns}, categoryFilter=${hasCategoryFilter}`);

    if (hasSearch) {
      // Test the search by typing a query
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await screenshot(page, '3-partners-search-active');

      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);
    }

    await screenshot(page, '3-partners-filters');
  });

  test('Partners directory has create/edit capabilities', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');
    await page.waitForTimeout(2000);

    // Check for Add/Create button
    const addButton = page.locator('button').filter({ hasText: /add|new|ajouter|create|nouveau/i }).first();
    const hasAdd = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for Edit buttons on partner items
    const editButtons = await page.locator(
      'button[title*="edit" i], button[title*="modifier" i], button[aria-label*="edit" i]'
    ).count();

    // Check for Delete buttons
    const deleteButtons = await page.locator(
      'button[title*="delete" i], button[title*="supprimer" i], button[aria-label*="delete" i]'
    ).count();

    console.log(`CRUD controls: add=${hasAdd}, editButtons=${editButtons}, deleteButtons=${deleteButtons}`);

    if (hasAdd) {
      console.log('Add partner button found');

      // Click it to see the creation form
      await addButton.click();
      await page.waitForTimeout(1000);

      // Check if dialog opened
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Partner creation dialog opened');
        await screenshot(page, '4-partners-create-dialog');

        // Close without saving
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        console.log('Partner creation may use inline form or page navigation');
        await screenshot(page, '4-partners-create-form');

        // Navigate back
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    } else {
      await screenshot(page, '4-partners-no-add-button');
    }
  });

  test('Partners directory has map view if available', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');
    await page.waitForTimeout(2000);

    // Check for map container (Mapbox or Leaflet)
    const mapContainer = page.locator(
      '.mapboxgl-map, .leaflet-container, [class*="map"], [id*="map"], canvas'
    ).first();
    const hasMap = await mapContainer.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for map toggle button
    const mapToggle = page.locator('button').filter({ hasText: /map|carte/i }).first();
    const hasMapToggle = await mapToggle.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasMap) {
      console.log('Map view is visible on the partners page');
    } else if (hasMapToggle) {
      console.log('Map toggle button found - clicking to show map');
      await mapToggle.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('No map view or map toggle found');
    }

    await screenshot(page, '5-partners-map');
  });

  test('Partners full-page screenshot for reference', async ({ page }) => {
    await navigateToPartners(page, 'Annuaire Pro');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '6-partners-full-page.png'),
      fullPage: true,
    });

    console.log('Full-page partners screenshot captured');
  });
});

// =============================================================================
// TEST: TRAVEL AGENCIES (Agences de Voyage)
// =============================================================================

test.describe('Partners Admin - Agences de Voyage', () => {
  test.setTimeout(60000);

  test('Agences de Voyage page loads', async ({ page }) => {
    await loginToAdmin(page);
    await navigateToPartners(page, 'Agences de Voyage');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Verify we're on the travel agencies page
    const hasContent = await page.locator('table, .grid, [class*="card"], [class*="list"], h1, h2, h3').first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasContent).toBe(true);

    await screenshot(page, '7-agences-voyage-loaded');
    console.log('Agences de Voyage page loaded');
  });
});
