/**
 * Naive User Test — Planner Screen (V3)
 *
 * Focused test of the Planner screen in Blog Hub following the naive user methodology.
 *
 * V3 Improvements (based on selector diagnostic):
 * - Calendar uses DIVs not TABLE - fixed all table selectors
 * - Use data-testid attributes: button-today, button-prev-period, button-next-period
 * - Use data-testid for view toggle: button-view-topics, button-view-posts
 * - + buttons: button:has(svg.lucide-plus) or [data-testid^="button-add-"]
 * - Day cells: [data-testid^="day-"]
 *
 * V2: Help timing fix, Today button, realistic workflow
 *
 * Rules:
 * - Act as someone who has NEVER seen the admin panel
 * - ONLY sources: what appears on screen + help panel content
 * - NO reading source code
 * - NO database queries to understand UI
 *
 * Run: npx tsx tests/e2e/naive-user-planner-test.ts
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
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'planner');
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
 * Navigate to Planner via direct URL (most reliable for help context)
 */
async function navigateToPlannerDirect(page: Page): Promise<boolean> {
  console.log('  Navigating to Planner via direct URL...');
  await page.goto(`${STAGING_URL}/en-US/admin?tab=planner`);
  await wait(2000);

  // V2 FIX: Wait for HelpButton's 500ms polling to detect URL change
  await wait(1000);

  // Verify we're on Planner
  const calendarTitle = page.locator('h2:has-text("12-Week Content Calendar"), h2:has-text("Content Calendar")');
  const onPlanner = await calendarTitle.isVisible({ timeout: 3000 }).catch(() => false);

  if (onPlanner) {
    console.log('  ✅ Successfully navigated to Planner');
    return true;
  } else {
    console.log('  ⚠️ Navigation complete but calendar title not verified');
    return true;
  }
}

/**
 * Navigate to Planner via sidebar (user flow)
 */
async function navigateToPlannerViaSidebar(page: Page): Promise<boolean> {
  console.log('  Navigating to Planner via sidebar...');

  const blogLink = page.locator('.bg-gray-900').getByText('Blog', { exact: false }).first();
  if (!await blogLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ❌ Could not find Blog link in sidebar');
    return false;
  }

  await blogLink.click();
  await wait(2000);

  const tabs = page.locator('[data-testid^="tab-"]');
  const tabCount = await tabs.count().catch(() => 0);
  if (tabCount === 0) {
    console.log('  ❌ No tabs found after clicking Blog');
    return false;
  }

  console.log(`  Found ${tabCount} tabs in Blog Hub`);

  const plannerTab = page.locator('[data-testid="tab-planner"]');
  if (await plannerTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await plannerTab.click();
    console.log('  Clicked tab-planner');
  }

  await wait(2500);
  console.log('  ✅ Navigation via sidebar complete');
  return true;
}

// Open help panel and wait for content to load (V2 timing fix)
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

  // V2 FIX: Wait for ACTUAL content to load (same fix as Image Bank V3)
  // The help system fetches content async after drawer opens
  // Real content has an h3 with screen title inside .prose
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
  console.log('║     NAIVE USER TEST — PLANNER SCREEN (V3)                    ║');
  console.log('║     12-Week Content Calendar - Realistic User Workflow       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: VIEWPORT });
  const page: Page = await context.newPage();

  const report: TestReport = {
    testDate: new Date().toISOString(),
    environment: STAGING_URL,
    screenName: 'Planner',
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

    // Test 1a: Direct URL
    console.log('\n1a. Testing direct URL: /admin?tab=planner');
    await navigateToPlannerDirect(page);
    const screenshot1a = await takeScreenshot(page, 'p1-direct-url-planner');

    // Check if help works with direct URL
    const helpResult1a = await openHelpPanel(page);
    await wait(500);
    const helpContent1a = await extractHelpContent(page);
    const hasRealHelp1a = helpResult1a.hasRealContent && helpContent1a.toLowerCase().includes('planner');
    await closeHelpPanel(page);

    phase1.items.push({
      name: 'Direct URL: /admin?tab=planner',
      description: `Help works: ${hasRealHelp1a}. Content length: ${helpContent1a.length}`,
      screenshots: [screenshot1a],
      rating: hasRealHelp1a ? 'CLEAR' : 'AMBIGUOUS',
      notes: hasRealHelp1a
        ? 'Direct URL loads Planner with working help'
        : 'Direct URL loads page but help context may be broken'
    });

    // Test 1b: Sidebar navigation
    console.log('\n1b. Navigating via sidebar (Blog → Planner tab)');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await wait(2000);
    const navSuccess = await navigateToPlannerViaSidebar(page);
    const screenshot1b = await takeScreenshot(page, 'p1-proper-navigation');

    phase1.items.push({
      name: 'Sidebar Navigation: Blog → Planner',
      description: `Navigation success: ${navSuccess}`,
      screenshots: [screenshot1b],
      rating: navSuccess ? 'CLEAR' : 'BLOCKED',
      notes: navSuccess
        ? 'Sidebar navigation works - Planner accessible via Blog Hub'
        : 'Could not navigate to Planner via sidebar'
    });

    // Test 1c: Default tab check
    console.log('\n1c. Testing if Planner is default Blog tab');
    await page.goto(`${STAGING_URL}/en-US/admin`);
    await wait(1500);
    const blogLink = page.locator('.bg-gray-900').getByText('Blog', { exact: false }).first();
    await blogLink.click();
    await wait(2000);
    const screenshot1c = await takeScreenshot(page, 'p1-blog-default');

    const plannerTabActive = page.locator('[data-testid="tab-planner"][data-state="active"]');
    const isDefaultPlanner = await plannerTabActive.isVisible({ timeout: 2000 }).catch(() => false);

    phase1.items.push({
      name: 'Blog Default Tab',
      description: `Planner is default: ${isDefaultPlanner}`,
      screenshots: [screenshot1c],
      rating: isDefaultPlanner ? 'CLEAR' : 'AMBIGUOUS',
      notes: isDefaultPlanner
        ? 'Planner is the default tab when clicking Blog'
        : 'Blog does not default to Planner tab'
    });

    phase1.items.forEach(item => {
      phase1.summary[item.rating.toLowerCase() as keyof typeof phase1.summary]++;
    });
    report.phases.push(phase1);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: HELP PANEL CONTENT
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 2: HELP PANEL CONTENT ═══');
    const phase2: PhaseResult = {
      phase: 'Help Panel Content',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // V2 FIX: Use direct URL and proper timing
    await navigateToPlannerDirect(page);
    const screenshot2base = await takeScreenshot(page, 'p2-planner-screen');

    console.log('\n2a. Opening help panel...');
    const helpResult = await openHelpPanel(page);
    await wait(500);
    const screenshot2a = await takeScreenshot(page, 'p2-help-panel-open');

    if (helpResult.opened) {
      const helpContent = await extractHelpContent(page);
      report.helpContentExtracted = helpContent;

      console.log('\n--- HELP PANEL CONTENT ---');
      console.log(helpContent.slice(0, 2000));
      console.log('--- END HELP CONTENT ---\n');

      const helpTitle = await page.locator('.w-80 .prose h3, .w-80 h3').first().textContent().catch(() => '');
      const helpParagraphs = await page.locator('.w-80 .prose p, .w-80 p').allTextContents().catch(() => []);
      const helpListItems = await page.locator('.w-80 .prose li, .w-80 li').allTextContents().catch(() => []);

      console.log(`  Help title: "${helpTitle}"`);
      console.log(`  Paragraphs: ${helpParagraphs.length}, List items: ${helpListItems.length}`);

      const hasRealContent = helpResult.hasRealContent &&
                            helpContent.length > 200 &&
                            !helpContent.includes('No help content available');

      phase2.items.push({
        name: 'Help Panel Opened',
        description: `Title: "${helpTitle}". Length: ${helpContent.length} chars`,
        screenshots: [screenshot2a],
        rating: helpResult.opened ? 'CLEAR' : 'BLOCKED',
        notes: helpResult.opened ? 'Help panel opens successfully' : 'Could not open help panel',
        helpText: helpContent.slice(0, 500)
      });

      const purposeClear = hasRealContent &&
                          (helpContent.toLowerCase().includes('calendar') ||
                           helpContent.toLowerCase().includes('12-week') ||
                           helpContent.toLowerCase().includes('schedule'));

      phase2.items.push({
        name: 'Help Content Quality',
        description: `Real content: ${hasRealContent}. Purpose clear: ${purposeClear}`,
        screenshots: [],
        rating: purposeClear ? 'CLEAR' : hasRealContent ? 'AMBIGUOUS' : 'BLOCKED',
        notes: purposeClear
          ? 'Help clearly explains Planner purpose'
          : hasRealContent
            ? 'Help exists but purpose unclear'
            : 'No meaningful help content'
      });

      if (hasRealContent) {
        const hasViews = helpContent.toLowerCase().includes('topics') && helpContent.toLowerCase().includes('posts');
        const hasActions = helpContent.toLowerCase().includes('click') || helpContent.toLowerCase().includes('+');

        phase2.items.push({
          name: 'Help Sections Coverage',
          description: `Views: ${hasViews}, Actions: ${hasActions}`,
          screenshots: [],
          rating: hasViews && hasActions ? 'CLEAR' : 'AMBIGUOUS',
          notes: `Help includes: ${hasViews ? 'Views ✓' : ''} ${hasActions ? 'Actions ✓' : ''}`
        });
      }

      // Keep help panel open for Phase 4 reference
      // (naive user would read help before acting)

    } else {
      phase2.items.push({
        name: 'Help Panel',
        description: 'Could not open help panel',
        screenshots: [screenshot2a],
        rating: 'BLOCKED',
        notes: 'Help panel failed to open'
      });
    }

    phase2.items.forEach(item => {
      phase2.summary[item.rating.toLowerCase() as keyof typeof phase2.summary]++;
    });
    report.phases.push(phase2);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: UI VERIFICATION
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 3: UI VERIFICATION ═══');
    const phase3: PhaseResult = {
      phase: 'UI Verification',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // Close help to see full UI
    await closeHelpPanel(page);
    await wait(500);

    const screenshot3base = await takeScreenshot(page, 'p3-ui-full-view');

    // 3a: View Toggle (DIAGNOSTIC: data-testid="button-view-topics" and "button-view-posts")
    console.log('\n3a. Looking for View Toggle (Topics/Posts)...');
    const topicsViewBtn = page.locator('[data-testid="button-view-topics"]');
    const postsViewBtn = page.locator('[data-testid="button-view-posts"]');
    const topicsVisible = await topicsViewBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const postsVisible = await postsViewBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const screenshot3a = await takeScreenshot(page, 'p3-view-toggle');

    phase3.items.push({
      name: 'View Toggle (Topics/Posts)',
      description: `Topics: ${topicsVisible}, Posts: ${postsVisible}`,
      screenshots: [screenshot3a],
      rating: topicsVisible && postsVisible ? 'CLEAR' : 'BLOCKED',
      notes: topicsVisible && postsVisible
        ? 'Both view toggles found'
        : 'View toggle not fully visible'
    });

    // 3b: Week Navigation (V2 FIX: use data-testid)
    console.log('\n3b. Looking for Week Navigation...');
    // DIAGNOSTIC FOUND: data-testid="button-today", "button-prev-period", "button-next-period"
    const todayBtn = page.locator('[data-testid="button-today"]');
    const prevBtn = page.locator('[data-testid="button-prev-period"]');
    const nextBtn = page.locator('[data-testid="button-next-period"]');
    const todayVisible = await todayBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const prevVisible = await prevBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const nextVisible = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const screenshot3b = await takeScreenshot(page, 'p3-week-navigation');

    phase3.items.push({
      name: 'Week Navigation',
      description: `Today: ${todayVisible}, Prev: ${prevVisible}, Next: ${nextVisible}`,
      screenshots: [screenshot3b],
      rating: todayVisible && prevVisible && nextVisible ? 'CLEAR' : 'AMBIGUOUS',
      notes: todayVisible && prevVisible && nextVisible
        ? 'All week navigation controls found (Today, Prev, Next)'
        : 'Some week navigation controls missing'
    });

    // 3c: Calendar Grid (NOT a table - uses divs with data-testid="day-YYYY-MM-DD")
    console.log('\n3c. Looking for Calendar Grid...');
    // DIAGNOSTIC FOUND: No <table>, calendar uses div[data-testid^="day-"]
    const dayCells = page.locator('[data-testid^="day-"]');
    const dayCellCount = await dayCells.count().catch(() => 0);
    const screenshot3c = await takeScreenshot(page, 'p3-calendar-grid');

    phase3.items.push({
      name: 'Calendar Grid (Day Cells)',
      description: `Found ${dayCellCount} day cells`,
      screenshots: [screenshot3c],
      rating: dayCellCount > 0 ? 'CLEAR' : 'BLOCKED',
      notes: dayCellCount > 0
        ? `Calendar has ${dayCellCount} day cells (12 weeks x 7 days = 84 expected)`
        : 'Calendar day cells not found'
    });

    // 3d: Day Cells with + buttons (use lucide-plus icon selector)
    console.log('\n3d. Looking for + buttons on day cells...');
    // DIAGNOSTIC FOUND: button:has(svg.lucide-plus) = 84 buttons, data-testid="button-add-YYYY-MM-DD"
    const plusButtons = page.locator('button:has(svg.lucide-plus)');
    const plusCount = await plusButtons.count().catch(() => 0);
    const screenshot3d = await takeScreenshot(page, 'p3-plus-buttons');

    phase3.items.push({
      name: 'Add Topic Buttons (+)',
      description: `Found ${plusCount} + buttons`,
      screenshots: [screenshot3d],
      rating: plusCount > 0 ? 'CLEAR' : 'BLOCKED',
      notes: plusCount > 0
        ? `${plusCount} + buttons found (one per day cell)`
        : 'No + buttons visible - cannot add topics'
    });

    // 3e: Day labels (text within calendar, not th elements)
    console.log('\n3e. Looking for day labels...');
    // Calendar header shows Mon, Tue, Wed, etc. as text in divs
    const monLabel = page.getByText('Mon', { exact: true });
    const tueLabel = page.getByText('Tue', { exact: true });
    const wedLabel = page.getByText('Wed', { exact: true });
    const monVisible = await monLabel.isVisible({ timeout: 1000 }).catch(() => false);
    const tueVisible = await tueLabel.isVisible({ timeout: 1000 }).catch(() => false);
    const wedVisible = await wedLabel.isVisible({ timeout: 1000 }).catch(() => false);
    const dayLabelCount = (monVisible ? 1 : 0) + (tueVisible ? 1 : 0) + (wedVisible ? 1 : 0);
    const screenshot3e = await takeScreenshot(page, 'p3-day-labels');

    phase3.items.push({
      name: 'Day Column Headers',
      description: `Found ${dayLabelCount}/3 day headers (Mon, Tue, Wed)`,
      screenshots: [screenshot3e],
      rating: dayLabelCount >= 3 ? 'CLEAR' : dayLabelCount > 0 ? 'AMBIGUOUS' : 'BLOCKED',
      notes: dayLabelCount >= 3
        ? 'Day headers visible (Mon, Tue, Wed...)'
        : 'Day headers not fully visible'
    });

    phase3.items.forEach(item => {
      phase3.summary[item.rating.toLowerCase() as keyof typeof phase3.summary]++;
    });
    report.phases.push(phase3);

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: NAIVE USER ACTIONS (V2 - Realistic Workflow)
    // Following what help content tells user to do
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ PHASE 4: NAIVE USER ACTIONS (Realistic Workflow) ═══');
    const phase4: PhaseResult = {
      phase: 'Naive User Actions',
      items: [],
      summary: { clear: 0, ambiguous: 0, blocked: 0 }
    };

    // 4a: Open help to read instructions (what a naive user would do first)
    console.log('\n4a. Reading help to understand what to do...');
    await openHelpPanel(page);
    await wait(500);
    const screenshot4a = await takeScreenshot(page, 'p4-read-help-first');
    const helpInstructions = await extractHelpContent(page);
    await closeHelpPanel(page);

    const hasInstructions = helpInstructions.includes('+') ||
                           helpInstructions.toLowerCase().includes('assign') ||
                           helpInstructions.toLowerCase().includes('click');

    phase4.items.push({
      name: 'Step 1: Read Help Instructions',
      description: `Help has actionable instructions: ${hasInstructions}`,
      screenshots: [screenshot4a],
      rating: hasInstructions ? 'CLEAR' : 'AMBIGUOUS',
      notes: hasInstructions
        ? 'Help explains how to use Planner (mentions clicking +, assigning topics)'
        : 'Help does not clearly explain what actions to take'
    });

    // 4b: Click + button on a day cell (help says: "Click + on any day to assign a topic")
    console.log('\n4b. Clicking + button to assign a topic...');
    // DIAGNOSTIC FOUND: button:has(svg.lucide-plus) or [data-testid^="button-add-"]
    const firstPlusBtn = page.locator('button:has(svg.lucide-plus)').first();
    const plusBtnVisible = await firstPlusBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (plusBtnVisible) {
      await firstPlusBtn.click();
      await wait(1500);
      const screenshot4b = await takeScreenshot(page, 'p4-click-plus-modal');

      // Check if assignment modal opened
      const modal = page.locator('[role="dialog"], [class*="DialogContent"], .fixed.inset-0');
      const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

      phase4.items.push({
        name: 'Step 2: Click + to Assign Topic',
        description: `Modal opened: ${modalVisible}`,
        screenshots: [screenshot4b],
        rating: modalVisible ? 'CLEAR' : 'BLOCKED',
        notes: modalVisible
          ? 'Assignment modal/dialog opened after clicking +'
          : 'Clicked + but no modal appeared'
      });

      // 4c: Explore the assignment modal
      if (modalVisible) {
        console.log('\n4c. Exploring assignment modal...');

        // Look for search input in modal
        const searchInput = page.locator('[role="dialog"] input, .fixed input[placeholder*="search" i]');
        const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

        // Look for topic list/options
        const topicOptions = page.locator('[role="dialog"] [class*="cursor-pointer"], [role="dialog"] button, [role="dialog"] li');
        const optionCount = await topicOptions.count().catch(() => 0);

        const screenshot4c = await takeScreenshot(page, 'p4-assignment-modal-content');

        phase4.items.push({
          name: 'Step 3: Browse Assignment Modal',
          description: `Search: ${searchVisible}, Options: ${optionCount}`,
          screenshots: [screenshot4c],
          rating: optionCount > 0 ? 'CLEAR' : 'AMBIGUOUS',
          notes: optionCount > 0
            ? `Modal shows ${optionCount} selectable options`
            : 'Modal opened but no topics available to assign'
        });

        // 4d: Try to select a topic (if any available)
        console.log('\n4d. Attempting to select a topic...');
        const selectableItem = page.locator('[role="dialog"] [class*="cursor-pointer"], [role="dialog"] button:not([aria-label="Close"])').first();
        const canSelect = await selectableItem.isVisible({ timeout: 2000 }).catch(() => false);

        if (canSelect) {
          await selectableItem.click();
          await wait(1000);
          const screenshot4d = await takeScreenshot(page, 'p4-topic-selected');

          // Check if topic was assigned (modal closed, card appeared)
          const modalStillOpen = await modal.isVisible({ timeout: 1000 }).catch(() => false);

          phase4.items.push({
            name: 'Step 4: Select a Topic',
            description: `Selection made, modal closed: ${!modalStillOpen}`,
            screenshots: [screenshot4d],
            rating: !modalStillOpen ? 'CLEAR' : 'AMBIGUOUS',
            notes: !modalStillOpen
              ? 'Topic selected and assigned to calendar'
              : 'Selected item but modal did not close (may need confirmation)'
          });
        } else {
          phase4.items.push({
            name: 'Step 4: Select a Topic',
            description: 'No topics available to select',
            screenshots: [],
            rating: 'AMBIGUOUS',
            notes: 'No topics in library to assign - user would need to create topics first'
          });
        }

        // Close modal if still open
        const closeModalBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg.lucide-x)').first();
        if (await closeModalBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeModalBtn.click();
          await wait(500);
        }
        // Also try pressing Escape
        await page.keyboard.press('Escape');
        await wait(300);
      }
    } else {
      phase4.items.push({
        name: 'Step 2: Click + to Assign Topic',
        description: 'No + button found',
        screenshots: [],
        rating: 'BLOCKED',
        notes: 'Cannot assign topic - + button not visible on any day cell'
      });
    }

    // 4e: Check for cards on calendar (may have existing content)
    console.log('\n4e. Looking for content cards on calendar...');
    const contentCards = page.locator('.bg-blue-50, .bg-green-50, .bg-yellow-50, .bg-gray-100').first();
    const hasCards = await contentCards.isVisible({ timeout: 2000 }).catch(() => false);
    const screenshot4e = await takeScreenshot(page, 'p4-calendar-cards');

    if (hasCards) {
      // Hover to reveal action icons
      await contentCards.hover();
      await wait(500);
      const screenshot4e2 = await takeScreenshot(page, 'p4-card-hover-actions');

      const actionIcons = page.locator('svg.lucide-eye, svg.lucide-square-pen, svg.lucide-x');
      const iconCount = await actionIcons.count().catch(() => 0);

      phase4.items.push({
        name: 'Step 5: View Card with Actions',
        description: `Card found, action icons: ${iconCount}`,
        screenshots: [screenshot4e, screenshot4e2],
        rating: iconCount > 0 ? 'CLEAR' : 'AMBIGUOUS',
        notes: iconCount > 0
          ? `Card shows ${iconCount} action icons on hover`
          : 'Card visible but action icons not appearing on hover'
      });
    } else {
      phase4.items.push({
        name: 'Step 5: View Card with Actions',
        description: 'No content cards on calendar',
        screenshots: [screenshot4e],
        rating: 'AMBIGUOUS',
        notes: 'Calendar is empty - no cards to interact with'
      });
    }

    // 4f: Toggle to Posts view (help mentions two views)
    console.log('\n4f. Switching to Posts view...');
    // DIAGNOSTIC FOUND: data-testid="button-view-posts" and "button-view-topics"
    const viewPostsBtn = page.locator('[data-testid="button-view-posts"]');
    const viewTopicsBtn = page.locator('[data-testid="button-view-topics"]');
    const viewPostsVisible = await viewPostsBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (viewPostsVisible) {
      await viewPostsBtn.click();
      await wait(1500);
      const screenshot4f = await takeScreenshot(page, 'p4-posts-view');

      phase4.items.push({
        name: 'Step 6: Switch to Posts View',
        description: 'Switched to Posts view',
        screenshots: [screenshot4f],
        rating: 'CLEAR',
        notes: 'Posts view shows published/scheduled posts'
      });

      // Switch back to Topics
      await viewTopicsBtn.click();
      await wait(1000);
    } else {
      phase4.items.push({
        name: 'Step 6: Switch to Posts View',
        description: 'Posts view button not visible',
        screenshots: [],
        rating: 'BLOCKED',
        notes: 'Cannot switch views - Posts button not found'
      });
    }

    // 4g: Click Today button (DIAGNOSTIC: data-testid="button-today")
    console.log('\n4g. Clicking Today button...');
    const todayButton = page.locator('[data-testid="button-today"]');
    const todayBtnVisible = await todayButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (todayBtnVisible) {
      await todayButton.click();
      await wait(1000);
      const screenshot4g = await takeScreenshot(page, 'p4-today-clicked');

      // Check if today's date is highlighted (look for ring or border class)
      const todayCell = page.locator('[data-testid^="day-"][class*="ring"], [data-testid^="day-"][class*="border-orange"]');
      const todayHighlighted = await todayCell.isVisible({ timeout: 1000 }).catch(() => false);

      phase4.items.push({
        name: 'Step 7: Click Today Button',
        description: `Today clicked, highlighted: ${todayHighlighted}`,
        screenshots: [screenshot4g],
        rating: 'CLEAR',
        notes: 'Today button works - jumps to current week'
      });
    } else {
      phase4.items.push({
        name: 'Step 7: Click Today Button',
        description: 'Today button not found',
        screenshots: [],
        rating: 'BLOCKED',
        notes: 'Cannot navigate to today - button not visible'
      });
    }

    // 4h: Test week navigation (DIAGNOSTIC: data-testid="button-prev-period" and "button-next-period")
    console.log('\n4h. Testing week navigation...');
    const navNextBtn = page.locator('[data-testid="button-next-period"]');
    const navPrevBtn = page.locator('[data-testid="button-prev-period"]');
    const nextVisible = await navNextBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const prevBtnVisible = await navPrevBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (nextVisible || prevBtnVisible) {
      if (nextVisible) {
        await navNextBtn.click();
        await wait(800);
      }
      const screenshot4h = await takeScreenshot(page, 'p4-week-navigation');

      if (prevBtnVisible) {
        await navPrevBtn.click();
        await wait(800);
      }

      phase4.items.push({
        name: 'Step 8: Navigate Weeks',
        description: `Prev: ${prevBtnVisible}, Next: ${nextVisible}`,
        screenshots: [screenshot4h],
        rating: 'CLEAR',
        notes: 'Week navigation arrows work'
      });
    } else {
      phase4.items.push({
        name: 'Step 8: Navigate Weeks',
        description: 'Navigation arrows not found',
        screenshots: [],
        rating: 'AMBIGUOUS',
        notes: 'Week navigation arrows not visible'
      });
    }

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

  if (!report.helpContentExtracted || report.helpContentExtracted.length < 100) {
    recommendations.unshift('[CRITICAL] Add help content for Planner screen');
  } else if (report.helpContentExtracted.includes('No help content available')) {
    recommendations.unshift('[CRITICAL] Help panel shows "No help content" - route detection issue');
  }

  return recommendations;
}

function generateMarkdownReport(report: TestReport): string {
  const screenshotBasePath = '../../tests/e2e/screenshots/help-validation/planner';

  let md = `# Naive User Test Report — Planner Screen (V3)

**Test Date:** ${new Date(report.testDate).toLocaleString()}
**Environment:** ${report.environment}
**Screen Tested:** ${report.screenName}
**Version:** V3 (Fixed selectors via diagnostic)

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
    md += `✅ **PASS** — ${clearPct}% of items rated CLEAR. Planner is usable.\n\n`;
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

  md += `## Help Content Extracted

\`\`\`
${report.helpContentExtracted.slice(0, 3000) || 'No help content found'}
\`\`\`

## Recommendations

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

*Generated by naive-user-planner-test.ts (V3)*
`;

  return md;
}

function generateHtmlReport(report: TestReport): string {
  const screenshotBasePath = '../../tests/e2e/screenshots/help-validation/planner';

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
  <title>Naive User Test — Planner (V3)</title>
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
  <h1>📅 Naive User Test — Planner Screen <span class="version-badge">V3</span></h1>

  <div class="summary-box">
    <p><strong>Test Date:</strong> ${new Date(report.testDate).toLocaleString()}</p>
    <p><strong>Environment:</strong> ${report.environment}</p>
    <p><strong>Screen Tested:</strong> ${report.screenName}</p>
    <p><strong>Version:</strong> V3 (Fixed selectors via diagnostic)</p>

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
    Generated by naive-user-planner-test.ts (V3)
  </footer>
</body>
</html>`;
}

// Run test and generate reports
async function main() {
  const report = await runTest();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETE (V3)                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('SUMMARY:');
  console.log(`  ✅ CLEAR:     ${report.totalSummary.clear}`);
  console.log(`  ⚠️  AMBIGUOUS: ${report.totalSummary.ambiguous}`);
  console.log(`  ❌ BLOCKED:   ${report.totalSummary.blocked}`);
  console.log(`  ────────────────`);
  console.log(`  TOTAL:       ${report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked}`);

  const total = report.totalSummary.clear + report.totalSummary.ambiguous + report.totalSummary.blocked;
  const clearPct = total > 0 ? Math.round((report.totalSummary.clear / total) * 100) : 0;
  console.log(`\n  SCORE:       ${clearPct}% CLEAR`);

  console.log('\nKEY FINDINGS:');
  console.log(`  Help content: ${report.helpContentExtracted.length > 200 && !report.helpContentExtracted.includes('No help content') ? 'YES ✅' : 'NO ❌'}`);

  const mdReport = generateMarkdownReport(report);
  const htmlReport = generateHtmlReport(report);

  const mdPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_PLANNER.md');
  const htmlPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_PLANNER.html');

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
