/**
 * Help Screens Validation Test
 *
 * Validates that every admin section has a working help screen.
 * Navigates to each tab, opens the help drawer, and verifies content renders.
 */

import { test, expect, Page } from '@playwright/test';
import { loginToAdmin, config } from './helpers/auth';

// All admin tabs that should have help screens
const ADMIN_TABS = [
  // Direct-link tabs
  { tab: 'analytics-new', label: 'Analytics', expectedTitle: 'Analytics Dashboard' },
  { tab: 'blog', label: 'Blog', expectedTitle: 'Blog Hub' },
  { tab: 'seo', label: 'SEO', expectedTitle: 'SEO Management' },

  // Content children
  { tab: 'hero-management', label: 'Hero Videos', expectedTitle: 'Hero Video' },
  { tab: 'gallery', label: 'Video Gallery', expectedTitle: 'Video Gallery' },
  { tab: 'faq', label: 'FAQ', expectedTitle: 'FAQ Management' },
  { tab: 'why-memopyk', label: 'Why MEMOPYK', expectedTitle: 'Why MEMOPYK' },
  { tab: 'cta', label: 'CTA Buttons', expectedTitle: 'CTA Button' },
  { tab: 'legal-docs', label: 'Legal Documents', expectedTitle: 'Legal Document' },

  // Partners children
  { tab: 'travel-agencies', label: 'Travel Agencies', expectedTitle: 'Travel Agency' },
  { tab: 'partners', label: 'Partners', expectedTitle: 'Partners Directory' },

  // System children
  { tab: 'ai-context', label: 'AI Context', expectedTitle: 'AI Context' },
  { tab: 'cache', label: 'Cache', expectedTitle: 'Cache Management' },
];

// Analytics sub-tabs (an_tab param within analytics-new)
const ANALYTICS_SUB_TABS = [
  { anTab: 'overview', label: 'Overview', expectedTitle: 'Overview' },
  { anTab: 'live', label: 'Live', expectedTitle: 'Live Visitors' },
  { anTab: 'video', label: 'Video', expectedTitle: 'Video Analytics' },
  { anTab: 'geo', label: 'Geo', expectedTitle: 'Geography' },
  { anTab: 'cta', label: 'CTA', expectedTitle: 'CTA Tracking' },
  { anTab: 'blog', label: 'Blog', expectedTitle: 'Blog Analytics' },
  { anTab: 'trends', label: 'Trends', expectedTitle: 'Traffic Trends' },
  { anTab: 'clarity', label: 'Clarity', expectedTitle: 'Microsoft Clarity' },
  { anTab: 'fallback', label: 'Diagnostics', expectedTitle: 'Diagnostics' },
  { anTab: 'exclusions', label: 'Exclusions', expectedTitle: 'IP Exclusions' },
];

// Blog sub-tabs (handled by ContentProductionHub internal routing)
const BLOG_SUB_TABS = [
  { tab: 'keywords', label: 'Keywords', expectedTitle: 'Keywords' },
  { tab: 'topics', label: 'Planned Posts', expectedTitle: 'Planned Posts' },
  { tab: 'planner', label: 'Planner', expectedTitle: 'Planner' },
  { tab: 'posts', label: 'Posts', expectedTitle: 'Posts' },
  { tab: 'images', label: 'Image Bank', expectedTitle: 'Image Bank' },
];

test.describe('Help Screens Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  for (const { tab, label, expectedTitle } of ADMIN_TABS) {
    test(`Help renders for ${label} (tab=${tab})`, async ({ page }) => {
      // Navigate to the tab
      await page.goto(`${config.baseUrl}/en-US/admin?tab=${tab}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click the Help button in the sidebar
      const helpButton = page.locator('button:has-text("Aide")');
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();

      // Wait for help drawer to open
      const helpDrawer = page.locator('[class*="fixed right-0"]').filter({ hasText: expectedTitle });
      await expect(helpDrawer).toBeVisible({ timeout: 5000 });

      // Verify the help content contains the expected title text
      const drawerContent = page.locator('[class*="fixed right-0"]');
      await expect(drawerContent).toContainText(expectedTitle, { timeout: 5000 });
    });
  }

  for (const { anTab, label, expectedTitle } of ANALYTICS_SUB_TABS) {
    test(`Help renders for Analytics > ${label} (an_tab=${anTab})`, async ({ page }) => {
      // Navigate to the analytics sub-tab
      await page.goto(`${config.baseUrl}/en-US/admin?tab=analytics-new&an_tab=${anTab}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click the Help button in the sidebar
      const helpButton = page.locator('button:has-text("Aide")');
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();

      // Wait for help drawer to open and verify subtab-specific content
      const drawerContent = page.locator('[class*="fixed right-0"]');
      await expect(drawerContent).toContainText(expectedTitle, { timeout: 5000 });
    });
  }

  for (const { tab, label, expectedTitle } of BLOG_SUB_TABS) {
    test(`Help renders for Blog > ${label} (tab=${tab})`, async ({ page }) => {
      // Navigate to the blog sub-tab
      await page.goto(`${config.baseUrl}/en-US/admin?tab=${tab}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click the Help button in the sidebar
      const helpButton = page.locator('button:has-text("Aide")');
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();

      // Wait for help drawer to open and verify content
      const drawerContent = page.locator('[class*="fixed right-0"]');
      await expect(drawerContent).toContainText(expectedTitle, { timeout: 5000 });
    });
  }

  test('Help drawer closes when clicking close button', async ({ page }) => {
    await page.goto(`${config.baseUrl}/en-US/admin?tab=analytics-new`);
    await page.waitForLoadState('networkidle');

    // Open help
    await page.locator('button:has-text("Aide")').click();
    const drawer = page.locator('[class*="fixed right-0"][class*="translate-x-0"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Close help (look for X button or close button)
    const closeBtn = drawer.locator('button').first();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify drawer is hidden (translated off-screen)
    await expect(page.locator('[class*="fixed right-0"][class*="translate-x-full"]')).toBeVisible();
  });
});
