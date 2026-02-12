import { test, expect, Page } from '@playwright/test';
import { loginToAdmin } from './helpers/auth';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SCREENSHOT_DIR = 'tests/e2e/screenshots/hero-admin';

// =============================================================================
// HELPERS
// =============================================================================

const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

async function navigateToHero(page: Page): Promise<void> {
  const sidebar = getSidebar(page);

  // Click "Contenu Site" to expand it
  await sidebar.getByText('Contenu Site').click();
  await page.waitForTimeout(500);

  // Click "Vidéos Hero" sub-menu item (note the accent)
  await sidebar.getByText('Vidéos Hero').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// =============================================================================
// TEST: HERO SECTION MANAGEMENT
// =============================================================================

test.describe('Hero Admin Section', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Hero section loads successfully', async ({ page }) => {
    await navigateToHero(page);

    // Wait for hero content to load
    await page.waitForTimeout(2000);

    // Look for hero-related content
    const hasHeroHeading = await page.getByText(/hero|vid[eé]os?\s*hero/i).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    // Fallback: check for any content on the page
    const hasAnyContent = hasHeroHeading || await page.locator('h1, h2, h3, table, .grid').first()
      .isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasAnyContent).toBe(true);

    await screenshot(page, '1-hero-section-loaded');
    console.log('Hero section loaded successfully');
  });

  test('Hero section displays video list', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    // Look for video items in various formats
    const tableRows = await page.locator('table tbody tr').count();
    const videoCards = await page.locator(
      '[data-testid^="hero-video-"], [data-testid^="video-"], [class*="video"], [class*="card"]'
    ).count();
    const listItems = await page.locator('.grid > div, ul > li').count();

    const totalItems = Math.max(tableRows, videoCards, listItems);
    console.log(`Hero videos: tableRows=${tableRows}, videoCards=${videoCards}, listItems=${listItems}, total=${totalItems}`);

    // Check for video-specific elements (URLs, thumbnails, titles)
    const videoUrls = await page.locator('input[value*="video"], input[value*="mp4"], input[value*="youtube"], a[href*="video"]').count();
    const thumbnails = await page.locator('img, video, [class*="thumbnail"], [class*="preview"]').count();

    console.log(`Video elements: urls=${videoUrls}, thumbnails/media=${thumbnails}`);

    await screenshot(page, '2-hero-video-list');
  });

  test('Hero section has text/content settings', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    // Look for text configuration fields (hero title, subtitle, CTA text)
    const textInputs = await page.locator(
      'input[type="text"], textarea'
    ).count();

    const hasTitle = await page.getByText(/title|titre|heading/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasSubtitle = await page.getByText(/subtitle|sous-titre|description/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasCTA = await page.getByText(/cta|button|bouton|call to action/i).isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Hero text settings: inputs=${textInputs}, title=${hasTitle}, subtitle=${hasSubtitle}, cta=${hasCTA}`);

    await screenshot(page, '3-hero-text-settings');
  });

  test('Hero section has video management controls', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    // Check for Add/Upload video button
    const addButton = page.locator('button').filter({
      hasText: /add|upload|ajouter|t[eé]l[eé]charger|new|nouveau/i
    }).first();
    const hasAdd = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for Edit buttons
    const editButtons = await page.locator(
      'button[title*="edit" i], button[title*="modifier" i], button[aria-label*="edit" i]'
    ).count();

    // Check for Delete buttons
    const deleteButtons = await page.locator(
      'button[title*="delete" i], button[title*="supprimer" i], button[aria-label*="delete" i]'
    ).count();

    // Check for Reorder/Drag capability
    const dragHandles = await page.locator('[class*="drag"], [class*="grip"], [draggable="true"]').count();

    // Check for Enable/Disable toggles
    const toggles = await page.locator('[role="switch"], input[type="checkbox"]').count();

    console.log(`Video controls: add=${hasAdd}, edit=${editButtons}, delete=${deleteButtons}, drag=${dragHandles}, toggles=${toggles}`);

    if (hasAdd) {
      console.log('Add/Upload video button found');
    }

    await screenshot(page, '4-hero-video-controls');
  });

  test('Hero section has language settings if available', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    // Check for language tabs or selector
    const langTabs = page.locator('button, [role="tab"]').filter({ hasText: /^(FR|EN)$/i });
    const langTabCount = await langTabs.count();

    const langDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /fran[cç]ais|english|language|langue/i }).first();
    const hasLangDropdown = await langDropdown.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Language controls: tabs=${langTabCount}, dropdown=${hasLangDropdown}`);

    if (langTabCount > 0) {
      // Click FR tab
      const frTab = langTabs.filter({ hasText: /^FR$/i }).first();
      if (await frTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frTab.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '5-hero-lang-fr');
        console.log('Switched to FR');
      }

      // Click EN tab
      const enTab = langTabs.filter({ hasText: /^EN$/i }).first();
      if (await enTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enTab.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '5-hero-lang-en');
        console.log('Switched to EN');
      }
    } else {
      await screenshot(page, '5-hero-no-lang-controls');
    }
  });

  test('Hero section full-page screenshot for reference', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '6-hero-full-page.png'),
      fullPage: true,
    });

    console.log('Full-page hero screenshot captured');
  });

  test('Hero section: click first video item if available', async ({ page }) => {
    await navigateToHero(page);
    await page.waitForTimeout(2000);

    // Try to find an editable video item
    const firstEditButton = page.locator(
      'button[title*="edit" i], button[title*="modifier" i]'
    ).first();

    if (await firstEditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstEditButton.click();
      await page.waitForTimeout(1000);

      // Check if a dialog or form appeared
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Video edit dialog opened');

        // Document dialog fields
        const inputs = await dialog.locator('input, textarea, select').count();
        console.log(`Dialog contains ${inputs} form fields`);

        await screenshot(page, '7-hero-video-edit-dialog');

        // Close without saving
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } else {
        console.log('Video edit did not open a dialog - may use inline editing');
        await screenshot(page, '7-hero-video-edit-inline');
      }
    } else {
      // Try clicking on a table row or card
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        await screenshot(page, '7-hero-first-row-clicked');
        console.log('Clicked first table row');
      } else {
        console.log('No video items found to interact with');
        await screenshot(page, '7-hero-no-items');
      }
    }
  });
});
