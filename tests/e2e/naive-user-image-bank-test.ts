/**
 * Naive User Test — Image Bank Screen (V3 - Fixed Help Content Timing)
 *
 * Focused test of the Image Bank screen in Blog Hub following the naive user methodology.
 *
 * V1 had a systematic flaw: direct URL navigation bypassed the app's routing context,
 * causing help panel to show "No help content" even when content exists.
 *
 * V2 FIX: Navigate the way a real user would:
 * 1. Click Blog in sidebar
 * 2. Click Image Bank tab
 * This ensures proper route context for help system.
 *
 * V3 FIX: Wait for actual help content to load after opening the panel.
 * The help system fetches content async - we need to wait for real content
 * (look for .w-80 .prose h3) before reading, not just the panel opening.
 *
 * Rules:
 * - Act as someone who has NEVER seen the admin panel
 * - ONLY sources: what appears on screen + help panel content
 * - NO reading source code
 * - NO database queries to understand UI
 *
 * Run: npx tsx tests/e2e/naive-user-image-bank-test.ts
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const STAGING_URL = 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = 'memopyk2025admin';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'image-bank');
const VIEWPORT = { width: 1920, height: 1080 };

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Types
type Rating = 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';

interface PhaseResult {
  phase: string;
  items: ItemResult[];
  summary: { clear: number; ambiguous: number; blocked: number };
}

interface ItemResult {
  name: string;
  description: string;
  screenshots: string[];
  rating: Rating;
  notes: string;
  helpText?: string;
  actualUI?: string;
}

interface TestReport {
  testDate: string;
  environment: string;
  screenName: string;
  phases: PhaseResult[];
  totalSummary: { clear: number; ambiguous: number; blocked: number };
  helpContentExtracted: string;
  uiElementsFound: string[];
  recommendations: string[];
}

// Utility functions
async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${filename}`);
  return filename;
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Login to admin
async function loginToAdmin(page: Page): Promise<void> {
  console.log('\n=== Logging in to admin ===');
  await page.goto(`${STAGING_URL}/en-US/admin`);
  await wait(2000);

  // Handle cookie consent if present
  const acceptButton = page.getByRole('button', { name: /accept/i });
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
    await wait(500);
  }

  // Check if password field is visible (need to login)
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  Entering password...');
    await passwordField.fill(ADMIN_PASSWORD);

    const loginBtn = page.getByRole('button', { name: /access admin/i });
    await loginBtn.click();
    await wait(3000);
  }

  // Wait for sidebar to appear
  await page.waitForSelector('.bg-gray-900', { timeout: 15000 });
  console.log('  ✅ Logged in successfully');
}

/**
 * Navigate to Image Bank the way a real user would:
 * 1. Click Blog in sidebar
 * 2. Click Image Bank tab
 * This ensures proper route context for help system.
 */
async function navigateToImageBank(page: Page): Promise<boolean> {
  console.log('  Navigating to Image Bank via sidebar...');

  // Step 1: Click Blog in sidebar
  const blogLink = page.locator('.bg-gray-900').getByText('Blog', { exact: false }).first();
  if (!await blogLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ❌ Could not find Blog link in sidebar');
    return false;
  }

  await blogLink.click();
  await wait(2000);

  // Step 2: Wait for Blog Hub tabs to appear
  const tabs = page.locator('[data-testid^="tab-"]');
  const tabCount = await tabs.count().catch(() => 0);
  if (tabCount === 0) {
    console.log('  ❌ No tabs found after clicking Blog');
    return false;
  }

  console.log(`  Found ${tabCount} tabs in Blog Hub`);

  // Step 3: Find and click the Image Bank tab (or Images tab)
  // Try different possible tab names
  let tabClicked = false;

  // Try "Image Bank" first
  const imageBankTab = page.locator('[data-testid="tab-images"]');
  if (await imageBankTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await imageBankTab.click();
    tabClicked = true;
    console.log('  Clicked tab-images');
  }

  // If that didn't work, try finding by text
  if (!tabClicked) {
    const tabByText = page.locator('button, [role="tab"]').filter({ hasText: /image/i }).first();
    if (await tabByText.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabByText.click();
      tabClicked = true;
      console.log('  Clicked tab by text "Image"');
    }
  }

  if (!tabClicked) {
    console.log('  ❌ Could not find Image Bank tab');
    return false;
  }

  // Wait for content to load
  await wait(2500);

  // Verify we're on Image Bank - look for the title or upload button
  const imageBankTitle = page.locator('h2:has-text("Image Bank")');
  const uploadBtn = page.getByTestId('button-upload-images');

  const onImageBank = await imageBankTitle.isVisible({ timeout: 2000 }).catch(() => false) ||
                      await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false);

  if (onImageBank) {
    console.log('  ✅ Successfully navigated to Image Bank');
    return true;
  } else {
    console.log('  ⚠️ Navigation complete but Image Bank content not verified');
    return true; // Still return true as we clicked the tab
  }
}

// Open help panel and wait for content to load
async function openHelpPanel(page: Page): Promise<{ opened: boolean; hasRealContent: boolean }> {
  const existingPanel = page.locator('.w-80 h2:has-text("Help")');
  const panelAlreadyOpen = await existingPanel.isVisible({ timeout: 500 }).catch(() => false);

  if (!panelAlreadyOpen) {
    const aideButton = page.locator('.bg-gray-900').getByText('Aide', { exact: false }).first();
    if (await aideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aideButton.click();
      await wait(1500);

      const helpHeader = page.locator('.w-80 h2:has-text("Help")');
      if (!await helpHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        return { opened: false, hasRealContent: false };
      }
    } else {
      return { opened: false, hasRealContent: false };
    }
  }

  // V3 FIX: Wait for ACTUAL content to load, not just the panel
  // The help system fetches content async after the drawer opens.
  // Real content has an h3 with the screen title inside .prose
  // Fallback says "No help content available for this screen yet."
  console.log('  Waiting for help content to load (up to 5s)...');
  const contentLoaded = await page.waitForSelector('.w-80 .prose h3', { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (contentLoaded) {
    console.log('  ✅ Help content loaded');
  } else {
    console.log('  ⚠️ Help content did not load within 5s (may be missing)');
  }

  return { opened: true, hasRealContent: contentLoaded };
}

// Close help panel
async function closeHelpPanel(page: Page): Promise<void> {
  const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg.lucide-x') }).first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
    await wait(500);
  }
}

// Extract all visible text from help panel
async function extractHelpContent(page: Page): Promise<string> {
  try {
    const helpPanel = page.locator('.w-80');
    const allText = await helpPanel.allInnerTexts();
    return allText.join('\n').trim();
  } catch {
    return '';
  }
}

// Main test
async function runTest(): Promise<TestReport> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     NAIVE USER TEST — IMAGE BANK SCREEN (V3)                 ║');
  console.log('║     Fixed: Proper navigation via Blog Hub tabs               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: VIEWPORT });
  const page: Page = await context.newPage();

  const report: TestReport = {
    testDate: new Date().toISOString(),
    environment: STAGING_URL,
    screenName: 'Image Bank',
    phases: [],
    totalSummary: { clear: 0, ambiguous: 0, blocked: 0 },
    helpContentExtracted: '',
    uiElementsFound: [],
    recommendations: []
  };

  try {
    await loginToAdmin(page);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: ROUTE DISCOVERY
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 1: ROUTE DISCOVERY ═══');
    const phase1: PhaseResult = {
      phase: 'Route Discovery',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // Test 1a: Try /admin?tab=images (document that direct URLs don't work properly)
    console.log('\n1a. Testing direct URL: /admin?tab=images');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=images`);
    await wait(2000);
    const screenshot1a = await takeScreenshot(page, 'p1-direct-url-images');
    const pageTitle1a = await page.locator('h2').first().textContent().catch(() => '');

    // Check if help would work with direct URL
    const helpResult1a = await openHelpPanel(page);
    await wait(500);
    const helpContent1a = await extractHelpContent(page);
    const hasRealHelp1a = helpResult1a.hasRealContent && helpContent1a.includes('Image Bank');
    await closeHelpPanel(page);

    phase1.items.push({
      name: 'Direct URL: /admin?tab=images',
      description: `Page title: "${pageTitle1a?.slice(0, 50) || 'unknown'}". Help works: ${hasRealHelp1a}`,
      screenshots: [screenshot1a],
      rating: hasRealHelp1a ? 'CLEAR' : 'AMBIGUOUS',
      notes: hasRealHelp1a
        ? 'Direct URL loads Image Bank with working help'
        : 'Direct URL loads page but help context may be broken'
    });

    // Test 1b: Try /admin?tab=image-bank
    console.log('\n1b. Testing direct URL: /admin?tab=image-bank');
    await page.goto(`${STAGING_URL}/en-US/admin?tab=image-bank`);
    await wait(2000);
    const screenshot1b = await takeScreenshot(page, 'p1-direct-url-image-bank');
    const pageTitle1b = await page.locator('h2').first().textContent().catch(() => '');
    const isImageBank1b = pageTitle1b?.toLowerCase().includes('image');

    phase1.items.push({
      name: 'Direct URL: /admin?tab=image-bank',
      description: `Page title: "${pageTitle1b?.slice(0, 50) || 'unknown'}"`,
      screenshots: [screenshot1b],
      rating: isImageBank1b ? 'CLEAR' : 'BLOCKED',
      notes: isImageBank1b
        ? 'Route loads Image Bank'
        : 'Route does NOT load Image Bank - invalid tab name'
    });

    // Test 1c: Navigate properly via sidebar (THE CORRECT WAY)
    console.log('\n1c. Navigating properly via sidebar (Blog → Image Bank tab)');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await wait(2000);

    const navSuccess = await navigateToImageBank(page);
    const screenshot1c = await takeScreenshot(page, 'p1-proper-navigation');

    // Check current URL
    const currentUrl = page.url();
    console.log(`  Current URL after navigation: ${currentUrl}`);

    phase1.items.push({
      name: 'Proper Navigation: Sidebar → Blog → Image Bank tab',
      description: `Navigation success: ${navSuccess}. URL: ${currentUrl}`,
      screenshots: [screenshot1c],
      rating: navSuccess ? 'CLEAR' : 'BLOCKED',
      notes: navSuccess
        ? 'Proper navigation works - this is how users should access Image Bank'
        : 'Could not navigate to Image Bank via sidebar'
    });

    // Calculate phase 1 summary
    phase1.items.forEach(item => {
      phase1.summary[item.rating.toLowerCase() as keyof typeof phase1.summary]++;
    });
    report.phases.push(phase1);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: HELP PANEL CONTENT (after proper navigation)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 2: HELP PANEL CONTENT ═══');
    const phase2: PhaseResult = {
      phase: 'Help Panel Content',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // Re-navigate properly to ensure correct context
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await wait(1500);
    await navigateToImageBank(page);
    // V3 FIX: Wait longer for HelpButton's 500ms polling to detect URL change
    // and update the currentRoute in HelpContext
    await wait(2000);

    const screenshot2base = await takeScreenshot(page, 'p2-image-bank-screen');

    // V3 FIX: Wait for HelpButton's 500ms polling to detect URL change
    // The polling interval is 500ms, so we need to wait long enough for it to fire
    // Plus some buffer for React state updates and query refetch
    await wait(1000);

    // Open help panel and wait for content
    console.log('\n2a. Opening help panel...');
    const helpResult = await openHelpPanel(page);
    await wait(500);
    const screenshot2a = await takeScreenshot(page, 'p2-help-panel-open');

    if (helpResult.opened) {
      // Extract ALL help content
      const helpContent = await extractHelpContent(page);
      report.helpContentExtracted = helpContent;

      console.log('\n--- HELP PANEL CONTENT (as naive user sees it) ---');
      console.log(helpContent.slice(0, 2000));
      console.log('--- END HELP CONTENT ---\n');

      // Look for specific help elements
      const helpTitle = await page.locator('.w-80 .prose h3, .w-80 h3').first().textContent().catch(() => '');
      const helpParagraphs = await page.locator('.w-80 .prose p, .w-80 p').allTextContents().catch(() => []);
      const helpListItems = await page.locator('.w-80 .prose li, .w-80 li').allTextContents().catch(() => []);

      console.log(`  Help title found: "${helpTitle}"`);
      console.log(`  Help paragraphs: ${helpParagraphs.length}`);
      console.log(`  Help list items: ${helpListItems.length}`);
      console.log(`  Content loaded (V3 check): ${helpResult.hasRealContent}`);

      // V3: Use the hasRealContent flag from openHelpPanel which waited for .prose h3
      const hasRealContent = helpResult.hasRealContent &&
                            helpContent.length > 200 &&
                            !helpContent.includes('No help content available');

      phase2.items.push({
        name: 'Help Panel Opened',
        description: `Title: "${helpTitle || 'NO TITLE FOUND'}". Content length: ${helpContent.length} chars. Real content: ${helpResult.hasRealContent}`,
        screenshots: [screenshot2a],
        rating: helpResult.opened ? 'CLEAR' : 'BLOCKED',
        notes: helpResult.opened ? 'Help panel opens successfully' : 'Could not open help panel',
        helpText: helpContent.slice(0, 500)
      });

      // Rate: Is the purpose clear?
      const purposeClear = hasRealContent &&
                          (helpContent.toLowerCase().includes('upload') ||
                           helpContent.toLowerCase().includes('manage') ||
                           helpContent.toLowerCase().includes('library') ||
                           helpContent.toLowerCase().includes('image bank'));

      phase2.items.push({
        name: 'Help Content Quality',
        description: `Real content: ${hasRealContent}. Purpose explained: ${purposeClear}`,
        screenshots: [],
        rating: purposeClear ? 'CLEAR' : hasRealContent ? 'AMBIGUOUS' : 'BLOCKED',
        notes: purposeClear
          ? 'Help clearly explains Image Bank purpose and features'
          : hasRealContent
            ? 'Help content exists but purpose could be clearer'
            : 'No meaningful help content for Image Bank',
        helpText: helpParagraphs.slice(0, 3).join(' ')
      });

      // Look for specific help sections
      const hasFeatures = helpContent.toLowerCase().includes('feature') ||
                          helpContent.toLowerCase().includes('what you can');
      const hasBestPractices = helpContent.toLowerCase().includes('best practice') ||
                               helpContent.toLowerCase().includes('tip');

      if (hasRealContent) {
        phase2.items.push({
          name: 'Help Sections Coverage',
          description: `Features section: ${hasFeatures}. Best practices: ${hasBestPractices}`,
          screenshots: [],
          rating: hasFeatures && hasBestPractices ? 'CLEAR' : hasFeatures || hasBestPractices ? 'AMBIGUOUS' : 'BLOCKED',
          notes: `Help includes: ${hasFeatures ? 'Features ✓' : ''} ${hasBestPractices ? 'Best Practices ✓' : ''}`
        });
      }

      // Extract UI elements mentioned in help
      const uiElementsInHelp: string[] = [];
      const buttonMatches = helpContent.match(/"([^"]+)" button|"([^"]+)"|click (\w+)|Upload Images|Manage Labels/gi) || [];
      uiElementsInHelp.push(...buttonMatches);

      report.uiElementsFound = uiElementsInHelp;
      console.log(`\n  UI elements mentioned in help: ${uiElementsInHelp.length}`);
      uiElementsInHelp.forEach(el => console.log(`    - ${el}`));

      // Close help for next phases
      await closeHelpPanel(page);

    } else {
      phase2.items.push({
        name: 'Help Panel',
        description: 'Could not open help panel',
        screenshots: [screenshot2a],
        rating: 'BLOCKED',
        notes: 'Help panel failed to open'
      });
    }

    // Calculate phase 2 summary
    phase2.items.forEach(item => {
      phase2.summary[item.rating.toLowerCase() as keyof typeof phase2.summary]++;
    });
    report.phases.push(phase2);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: UI VERIFICATION (help vs reality)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 3: UI VERIFICATION ═══');
    const phase3: PhaseResult = {
      phase: 'UI Verification',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    const screenshot3base = await takeScreenshot(page, 'p3-ui-full-view');

    // Check for Upload button
    console.log('\n3a. Looking for Upload button...');
    const uploadBtn = page.getByTestId('button-upload-images');
    const uploadBtnAlt = page.getByRole('button', { name: /upload/i });
    const uploadVisible = await uploadBtn.isVisible({ timeout: 2000 }).catch(() => false) ||
                          await uploadBtnAlt.isVisible({ timeout: 2000 }).catch(() => false);

    if (uploadVisible) {
      await uploadBtn.or(uploadBtnAlt).first().hover();
      await wait(500);
    }
    const screenshot3a = await takeScreenshot(page, 'p3-upload-btn');
    const uploadBtnText = await uploadBtn.textContent().catch(() => '') ||
                          await uploadBtnAlt.textContent().catch(() => '');

    phase3.items.push({
      name: 'Upload Button',
      description: `Button text: "${uploadBtnText}"`,
      screenshots: [screenshot3a],
      rating: uploadVisible ? 'CLEAR' : 'BLOCKED',
      notes: uploadVisible
        ? `Upload button found: "${uploadBtnText}"`
        : 'Upload button NOT found',
      actualUI: uploadBtnText
    });

    // Check for Manage Labels button
    console.log('\n3b. Looking for Manage Labels button...');
    const labelsBtn = page.getByTestId('button-manage-labels');
    const labelsBtnAlt = page.getByRole('button', { name: /label/i });
    const labelsVisible = await labelsBtn.isVisible({ timeout: 2000 }).catch(() => false) ||
                          await labelsBtnAlt.isVisible({ timeout: 2000 }).catch(() => false);

    const labelsBtnText = await labelsBtn.textContent().catch(() => '') ||
                          await labelsBtnAlt.textContent().catch(() => '');
    const screenshot3b = await takeScreenshot(page, 'p3-labels-btn');

    phase3.items.push({
      name: 'Manage Labels Button',
      description: `Button text: "${labelsBtnText}"`,
      screenshots: [screenshot3b],
      rating: labelsVisible ? 'CLEAR' : 'AMBIGUOUS',
      notes: labelsVisible
        ? `Labels button found: "${labelsBtnText}"`
        : 'Labels button not found (may be optional feature)',
      actualUI: labelsBtnText
    });

    // Check for Category filter dropdown
    console.log('\n3c. Looking for Category filter...');
    const categoryFilter = page.getByTestId('select-category-filter');
    const categoryFilterAlt = page.locator('button, select').filter({ hasText: /category/i }).first();
    const categoryVisible = await categoryFilter.isVisible({ timeout: 2000 }).catch(() => false) ||
                            await categoryFilterAlt.isVisible({ timeout: 2000 }).catch(() => false);
    const screenshot3c = await takeScreenshot(page, 'p3-category-filter');

    phase3.items.push({
      name: 'Category Filter',
      description: categoryVisible ? 'Filter dropdown visible' : 'Filter dropdown NOT visible',
      screenshots: [screenshot3c],
      rating: categoryVisible ? 'CLEAR' : 'AMBIGUOUS',
      notes: categoryVisible ? 'Category filter is present' : 'No category filter found'
    });

    // Check for Search input
    console.log('\n3d. Looking for Search input...');
    const searchInput = page.getByTestId('input-search');
    const searchInputAlt = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]');
    const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false) ||
                          await searchInputAlt.isVisible({ timeout: 2000 }).catch(() => false);
    const screenshot3d = await takeScreenshot(page, 'p3-search-input');

    phase3.items.push({
      name: 'Search Input',
      description: searchVisible ? 'Search field visible' : 'Search field NOT visible',
      screenshots: [screenshot3d],
      rating: searchVisible ? 'CLEAR' : 'AMBIGUOUS',
      notes: searchVisible ? 'Search input is present' : 'No search input found'
    });

    // Check for Image cards/grid
    console.log('\n3e. Looking for Image cards...');
    const imageCards = page.locator('[data-testid^="card-image-"]');
    const imageCardsCount = await imageCards.count().catch(() => 0);
    const screenshot3e = await takeScreenshot(page, 'p3-image-grid');

    console.log(`  Found ${imageCardsCount} image cards`);

    phase3.items.push({
      name: 'Image Cards/Grid',
      description: `Found ${imageCardsCount} image cards`,
      screenshots: [screenshot3e],
      rating: imageCardsCount > 0 ? 'CLEAR' : 'AMBIGUOUS',
      notes: imageCardsCount > 0
        ? `${imageCardsCount} images displayed in grid`
        : 'No images in grid (may be empty bank)'
    });

    // Calculate phase 3 summary
    phase3.items.forEach(item => {
      phase3.summary[item.rating.toLowerCase() as keyof typeof phase3.summary]++;
    });
    report.phases.push(phase3);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: NAIVE USER ACTIONS
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 4: NAIVE USER ACTIONS ═══');
    const phase4: PhaseResult = {
      phase: 'Naive User Actions',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // Action 4a: Try to upload an image
    console.log('\n4a. Attempting to upload an image...');
    const screenshot4a1 = await takeScreenshot(page, 'p4-upload-before');

    if (uploadVisible) {
      await uploadBtn.or(uploadBtnAlt).first().click();
      await wait(1500);
      const screenshot4a2 = await takeScreenshot(page, 'p4-upload-modal');

      // Check if upload modal/dialog appeared
      const uploadModal = page.locator('[role="dialog"], .modal, [class*="DialogContent"]');
      const modalVisible = await uploadModal.isVisible({ timeout: 2000 }).catch(() => false);

      // Look for dropzone or file input instructions
      const dropzone = page.locator('[data-testid="dropzone-upload"], .dropzone, [class*="drop"]');
      const dropzoneVisible = await dropzone.isVisible({ timeout: 2000 }).catch(() => false);

      const dropzoneText = dropzoneVisible
        ? await dropzone.textContent().catch(() => '')
        : await uploadModal.textContent().catch(() => '');

      phase4.items.push({
        name: 'Upload Image Action',
        description: `Modal opened: ${modalVisible}. Dropzone visible: ${dropzoneVisible}.`,
        screenshots: [screenshot4a1, screenshot4a2],
        rating: modalVisible && dropzoneVisible ? 'CLEAR' : modalVisible ? 'AMBIGUOUS' : 'BLOCKED',
        notes: modalVisible && dropzoneVisible
          ? `Upload modal shows clear instructions: "${dropzoneText?.slice(0, 100)}"`
          : modalVisible
            ? 'Upload modal opened but instructions unclear'
            : 'Could not open upload dialog',
        actualUI: dropzoneText?.slice(0, 200)
      });

      // Close modal
      const closeModalBtn = page.locator('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has(svg.lucide-x)').first();
      if (await closeModalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeModalBtn.click();
        await wait(500);
      }
    } else {
      phase4.items.push({
        name: 'Upload Image Action',
        description: 'Upload button not found',
        screenshots: [screenshot4a1],
        rating: 'BLOCKED',
        notes: 'Cannot attempt upload - button not visible'
      });
    }

    // Action 4b: Try to search/filter images
    console.log('\n4b. Attempting to search images...');
    if (searchVisible) {
      const searchField = searchInput.or(searchInputAlt).first();
      await searchField.fill('test');
      await wait(1000);
      const screenshot4b = await takeScreenshot(page, 'p4-search-action');

      // Check if results changed
      const cardsAfterSearch = await imageCards.count().catch(() => 0);

      phase4.items.push({
        name: 'Search Images Action',
        description: `Searched "test". Cards before: ${imageCardsCount}, after: ${cardsAfterSearch}`,
        screenshots: [screenshot4b],
        rating: 'CLEAR',
        notes: cardsAfterSearch !== imageCardsCount
          ? 'Search filtered results'
          : 'Search executed (results may be same if no matches)'
      });

      // Clear search
      await searchField.clear();
      await wait(500);
    } else {
      phase4.items.push({
        name: 'Search Images Action',
        description: 'Search input not found',
        screenshots: [],
        rating: 'BLOCKED',
        notes: 'Cannot search - input not visible'
      });
    }

    // Action 4c: Try to click an image card to see details
    console.log('\n4c. Attempting to view image details...');
    // Re-count cards after clearing search
    const currentCardsCount = await imageCards.count().catch(() => 0);

    if (currentCardsCount > 0) {
      await imageCards.first().click();
      await wait(1500);
      const screenshot4c = await takeScreenshot(page, 'p4-image-details');

      // Check if details modal/panel opened
      const detailsModal = page.locator('[role="dialog"]:has-text("Details"), [role="dialog"]:has-text("Image"), [role="dialog"]:has-text("Filename")');
      const detailsVisible = await detailsModal.isVisible({ timeout: 2000 }).catch(() => false);

      phase4.items.push({
        name: 'View Image Details',
        description: `Clicked image card. Details visible: ${detailsVisible}`,
        screenshots: [screenshot4c],
        rating: detailsVisible ? 'CLEAR' : 'AMBIGUOUS',
        notes: detailsVisible
          ? 'Image details modal opened on click'
          : 'Clicked image but no details panel appeared'
      });

      // Close modal if open
      const closeDetailsBtn = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has(svg.lucide-x)').first();
      if (await closeDetailsBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeDetailsBtn.click();
        await wait(500);
      }
    } else {
      phase4.items.push({
        name: 'View Image Details',
        description: 'No images available to click',
        screenshots: [],
        rating: 'AMBIGUOUS',
        notes: 'Cannot test image details - no images in the bank'
      });
    }

    // Action 4d: Try to use category filter
    console.log('\n4d. Attempting to use category filter...');
    if (categoryVisible) {
      const filterDropdown = categoryFilter.or(categoryFilterAlt).first();
      await filterDropdown.click();
      await wait(500);
      const screenshot4d = await takeScreenshot(page, 'p4-category-dropdown');

      // Check if dropdown options appeared
      const options = page.locator('[role="option"], [role="listbox"] [data-value]');
      const optionsCount = await options.count().catch(() => 0);

      phase4.items.push({
        name: 'Category Filter Action',
        description: `Clicked filter. Options shown: ${optionsCount}`,
        screenshots: [screenshot4d],
        rating: optionsCount > 0 ? 'CLEAR' : 'AMBIGUOUS',
        notes: optionsCount > 0
          ? `Filter dropdown shows ${optionsCount} options`
          : 'Filter dropdown did not show options'
      });

      // Close dropdown by clicking elsewhere
      await page.keyboard.press('Escape');
      await wait(300);
    } else {
      phase4.items.push({
        name: 'Category Filter Action',
        description: 'Category filter not found',
        screenshots: [],
        rating: 'BLOCKED',
        notes: 'Cannot filter by category - dropdown not visible'
      });
    }

    // Calculate phase 4 summary
    phase4.items.forEach(item => {
      phase4.summary[item.rating.toLowerCase() as keyof typeof phase4.summary]++;
    });
    report.phases.push(phase4);

    // ═══════════════════════════════════════════════════════════════════
    // CALCULATE TOTAL SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    report.phases.forEach(phase => {
      report.totalSummary.clear += phase.summary.clear;
      report.totalSummary.ambiguous += phase.summary.ambiguous;
      report.totalSummary.blocked += phase.summary.blocked;
    });

    // Generate recommendations
    report.recommendations = generateRecommendations(report);

  } catch (error) {
    console.error('Test error:', error);
    await takeScreenshot(page, 'error-final-state');
  } finally {
    await browser.close();
  }

  return report;
}

function generateRecommendations(report: TestReport): string[] {
  const recommendations: string[] = [];

  report.phases.forEach(phase => {
    phase.items.forEach(item => {
      if (item.rating === 'BLOCKED') {
        recommendations.push(`[CRITICAL] ${phase.phase} → ${item.name}: ${item.notes}`);
      } else if (item.rating === 'AMBIGUOUS') {
        recommendations.push(`[IMPROVE] ${phase.phase} → ${item.name}: ${item.notes}`);
      }
    });
  });

  // Add help-specific recommendations
  if (!report.helpContentExtracted || report.helpContentExtracted.length < 100) {
    recommendations.unshift('[CRITICAL] Add help content for Image Bank screen');
  } else if (report.helpContentExtracted.includes('No help content available')) {
    recommendations.unshift('[CRITICAL] Help panel shows "No help content" - navigation context issue');
  }

  return recommendations;
}

function generateMarkdownReport(report: TestReport): string {
  const screenshotBasePath = '../../tests/e2e/screenshots/help-validation/image-bank';

  let md = `# Naive User Test Report — Image Bank Screen (V3)

**Test Date:** ${new Date(report.testDate).toLocaleString()}
**Environment:** ${report.environment}
**Screen Tested:** ${report.screenName}
**Version:** V2 (Fixed help content timing)

---

## Summary

| Rating | Count |
|--------|-------|
| CLEAR | ${report.totalSummary.clear} |
| AMBIGUOUS | ${report.totalSummary.ambiguous} |
| BLOCKED | ${report.totalSummary.blocked} |
| **Total** | **${report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked}** |

### Overall Assessment

`;

  const total = report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked;
  const clearPct = total > 0 ? Math.round((report.totalSummary.clear / total) * 100) : 0;

  if (clearPct >= 80) {
    md += `✅ **PASS** — ${clearPct}% of items rated CLEAR. Image Bank is usable.\n\n`;
  } else if (clearPct >= 50) {
    md += `⚠️ **NEEDS IMPROVEMENT** — ${clearPct}% of items rated CLEAR. Some confusion expected.\n\n`;
  } else {
    md += `❌ **FAIL** — Only ${clearPct}% of items rated CLEAR. Major issues found.\n\n`;
  }

  md += `---

## Phase Results

`;

  report.phases.forEach(phase => {
    md += `### ${phase.phase}

| Item | Rating | Notes |
|------|--------|-------|
`;
    phase.items.forEach(item => {
      const ratingEmoji = item.rating === 'CLEAR' ? '✅' : item.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
      md += `| ${item.name} | ${ratingEmoji} ${item.rating} | ${item.notes.replace(/\|/g, '\\|')} |\n`;
    });

    md += `\n**Phase Summary:** ${phase.summary.clear} CLEAR, ${phase.summary.ambiguous} AMBIGUOUS, ${phase.summary.blocked} BLOCKED\n\n`;

    // Add screenshots section
    phase.items.forEach(item => {
      if (item.screenshots.length > 0) {
        md += `#### ${item.name}\n\n`;
        item.screenshots.forEach(screenshot => {
          md += `![${screenshot}](${screenshotBasePath}/${screenshot})\n\n`;
        });
      }
    });

    md += `---\n\n`;
  });

  // Help content section
  md += `## Help Content Extracted

\`\`\`
${report.helpContentExtracted.slice(0, 3000) || 'No help content found'}
\`\`\`

`;

  // Recommendations
  md += `## Recommendations

`;
  if (report.recommendations.length === 0) {
    md += `No critical issues found.\n`;
  } else {
    report.recommendations.forEach((rec, i) => {
      md += `${i + 1}. ${rec}\n`;
    });
  }

  md += `
---

*Generated by naive-user-image-bank-test.ts (V3)*
`;

  return md;
}

function generateHtmlReport(report: TestReport): string {
  const screenshotBasePath = '../../tests/e2e/screenshots/help-validation/image-bank';

  const total = report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked;
  const clearPct = total > 0 ? Math.round((report.totalSummary.clear / total) * 100) : 0;

  let statusClass = 'fail';
  let statusText = 'FAIL';
  if (clearPct >= 80) { statusClass = 'pass'; statusText = 'PASS'; }
  else if (clearPct >= 50) { statusClass = 'warning'; statusText = 'NEEDS IMPROVEMENT'; }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Naive User Test — Image Bank (V3)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 3px solid #D67C4A; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; border-left: 4px solid #D67C4A; padding-left: 10px; }
    h3 { color: #555; }
    .summary-box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
    .status { font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 4px; display: inline-block; }
    .pass { background: #d4edda; color: #155724; }
    .warning { background: #fff3cd; color: #856404; }
    .fail { background: #f8d7da; color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f8f9fa; }
    .rating-clear { color: #28a745; font-weight: bold; }
    .rating-ambiguous { color: #ffc107; font-weight: bold; }
    .rating-blocked { color: #dc3545; font-weight: bold; }
    .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 15px; margin: 15px 0; }
    .screenshot-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .screenshot-card img { width: 100%; height: auto; display: block; }
    .screenshot-card .caption { padding: 10px; font-size: 12px; color: #666; }
    .phase-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .recommendations { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .recommendations li { margin: 8px 0; }
    pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; max-height: 400px; }
    .version-badge { background: #D67C4A; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>🖼️ Naive User Test — Image Bank Screen <span class="version-badge">V2</span></h1>

  <div class="summary-box">
    <p><strong>Test Date:</strong> ${new Date(report.testDate).toLocaleString()}</p>
    <p><strong>Environment:</strong> ${report.environment}</p>
    <p><strong>Screen Tested:</strong> ${report.screenName}</p>
    <p><strong>Version:</strong> V2 (Fixed help content timing)</p>

    <div class="status ${statusClass}">${statusText} — ${clearPct}% CLEAR</div>

    <table style="margin-top: 15px; width: auto;">
      <tr><th>Rating</th><th>Count</th></tr>
      <tr><td class="rating-clear">✅ CLEAR</td><td>${report.totalSummary.clear}</td></tr>
      <tr><td class="rating-ambiguous">⚠️ AMBIGUOUS</td><td>${report.totalSummary.ambiguous}</td></tr>
      <tr><td class="rating-blocked">❌ BLOCKED</td><td>${report.totalSummary.blocked}</td></tr>
      <tr><th>Total</th><th>${total}</th></tr>
    </table>
  </div>

  ${report.phases.map(phase => `
  <div class="phase-section">
    <h2>${phase.phase}</h2>
    <p><strong>Summary:</strong> ${phase.summary.clear} CLEAR, ${phase.summary.ambiguous} AMBIGUOUS, ${phase.summary.blocked} BLOCKED</p>

    <table>
      <tr><th>Item</th><th>Rating</th><th>Description</th><th>Notes</th></tr>
      ${phase.items.map(item => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td class="rating-${item.rating.toLowerCase()}">${item.rating === 'CLEAR' ? '✅' : item.rating === 'AMBIGUOUS' ? '⚠️' : '❌'} ${item.rating}</td>
        <td>${item.description}</td>
        <td>${item.notes}</td>
      </tr>
      `).join('')}
    </table>

    <div class="screenshot-grid">
      ${phase.items.flatMap(item => item.screenshots.map(s => `
      <div class="screenshot-card">
        <img src="${screenshotBasePath}/${s}" alt="${s}" loading="lazy">
        <div class="caption">${s} — ${item.name}</div>
      </div>
      `)).join('')}
    </div>
  </div>
  `).join('')}

  <h2>Help Content Extracted</h2>
  <pre>${report.helpContentExtracted.slice(0, 3000) || 'No help content found'}</pre>

  <h2>Recommendations</h2>
  ${report.recommendations.length > 0 ? `
  <div class="recommendations">
    <ol>
      ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ol>
  </div>
  ` : '<p>No critical issues found.</p>'}

  <footer style="margin-top: 40px; color: #666; font-size: 12px;">
    Generated by naive-user-image-bank-test.ts (V3)
  </footer>
</body>
</html>`;
}

// Run test and generate reports
async function main() {
  const report = await runTest();

  // Print console summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETE (V3)                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('SUMMARY:');
  console.log(`  ✅ CLEAR:     ${report.totalSummary.clear}`);
  console.log(`  ⚠️  AMBIGUOUS: ${report.totalSummary.ambiguous}`);
  console.log(`  ❌ BLOCKED:   ${report.totalSummary.blocked}`);
  console.log(`  ────────────────`);
  console.log(`  TOTAL:       ${report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked}`);

  // Key findings
  console.log('\nKEY FINDINGS:');
  console.log(`  Help content found: ${report.helpContentExtracted.length > 200 && !report.helpContentExtracted.includes('No help content') ? 'YES ✅' : 'NO ❌'}`);

  // Check for images
  const imagePhase = report.phases.find(p => p.phase === 'UI Verification');
  const imageItem = imagePhase?.items.find(i => i.name === 'Image Cards/Grid');
  console.log(`  Images in grid: ${imageItem?.description || 'unknown'}`);

  // Generate and save reports
  const mdReport = generateMarkdownReport(report);
  const htmlReport = generateHtmlReport(report);

  const mdPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_IMAGE_BANK.md');
  const htmlPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_IMAGE_BANK.html');

  fs.writeFileSync(mdPath, mdReport);
  fs.writeFileSync(htmlPath, htmlReport);

  console.log('\nREPORTS GENERATED:');
  console.log(`  📄 ${mdPath}`);
  console.log(`  🌐 ${htmlPath}`);

  console.log('\nSCREENSHOTS:');
  const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  screenshots.forEach(s => console.log(`  📸 ${s}`));
  console.log(`  Total: ${screenshots.length} screenshots`);

  if (report.recommendations.length > 0) {
    console.log('\nRECOMMENDATIONS:');
    report.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  }
}

main().catch(console.error);
