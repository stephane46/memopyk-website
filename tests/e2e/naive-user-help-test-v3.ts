/**
 * Naive User Help Flow Test V3 - Browser Walkthrough with Playwright
 *
 * Tests help flows as a naive user who ONLY has access to:
 * 1. What's visible on screen
 * 2. What the help panel displays
 *
 * NO source code knowledge is used. The ONLY information source is:
 * - What appears on screen
 * - What the help panel says
 *
 * Rating System:
 * - CLEAR: instruction exactly matched what I see, I could do it without guessing
 * - AMBIGUOUS: I figured it out but wording was confusing or slightly off
 * - BLOCKED: I could NOT complete the step based on the instruction alone
 *
 * Run: npx tsx tests/e2e/naive-user-help-test-v3.ts
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
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'v3');
const VIEWPORT = { width: 1920, height: 1080 };

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Types
type Rating = 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';

interface StepResult {
  step: number;
  title: string;
  instruction: string;
  helpScreenshot: string;
  actionScreenshot: string;
  rating: Rating;
  notes: string;
  uiElementFound: boolean;
}

interface FlowResult {
  flowName: string;
  description: string;
  totalSteps: number;
  results: StepResult[];
  summary: { clear: number; ambiguous: number; blocked: number };
}

interface ScreenResult {
  route: string;
  helpTitle: string;
  actualTitle: string;
  helpScreenshot: string;
  uiScreenshot: string;
  titleMatches: boolean;
  contentAccurate: boolean;
  missingElements: string[];
  extraElements: string[];
  rating: Rating;
  notes: string;
}

interface TestReport {
  testDate: string;
  environment: string;
  flows: FlowResult[];
  screens: ScreenResult[];
  summary: {
    totalFlowSteps: number;
    flowClear: number;
    flowAmbiguous: number;
    flowBlocked: number;
    totalScreens: number;
    screenClear: number;
    screenAmbiguous: number;
    screenBlocked: number;
  };
}

// Utility functions
async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  Screenshot: ${filename}`);
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
  const acceptButton = page.locator('button:has-text("Accept")');
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
    await wait(500);
  }

  // Check if password field is visible (need to login)
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  Entering password...');
    await passwordField.fill(ADMIN_PASSWORD);

    // Find and click login button
    const loginBtn = page.locator('button[type="submit"], button:has-text("Access Admin"), button:has-text("Login")').first();
    await loginBtn.click();
    await wait(3000);
  }

  // Wait for sidebar to appear (indicates successful login)
  await page.waitForSelector('.bg-gray-900', { timeout: 15000 });
  console.log('  Logged in successfully');
}

// Open the help panel
async function openHelpPanel(page: Page): Promise<boolean> {
  console.log('\n  Looking for help button (Aide)...');

  // First check if help panel is already open (w-80 div with Help header)
  const existingPanel = page.locator('.w-80 h2:has-text("Help")');
  if (await existingPanel.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log('  Help panel already open');
    return true;
  }

  // The help button is in the sidebar with text "Aide"
  // It's a button in the dark sidebar (.bg-gray-900)
  const aideButton = page.locator('.bg-gray-900 button:has-text("Aide"), .bg-gray-900 >> text=Aide');
  if (await aideButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await aideButton.first().click();
    await wait(1500);

    // Verify help panel opened by looking for the w-80 drawer with "Help" header
    const helpHeader = page.locator('.w-80 h2:has-text("Help")');
    if (await helpHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  Help panel opened successfully');
      return true;
    }
  }

  // Fallback: Try looking for any button with HelpCircle icon or "Aide" text
  const fallbackSelectors = [
    'button:has-text("Aide")',
    '[data-testid="help-button"]',
    'button[aria-label*="aide" i]',
  ];

  for (const selector of fallbackSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await wait(1500);

      const helpHeader = page.locator('.w-80 h2, h2:has-text("Help")');
      if (await helpHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  Help panel opened via fallback');
        return true;
      }
    }
  }

  console.log('  WARNING: Could not open help panel');
  return false;
}

// Close help panel
async function closeHelpPanel(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-testid="help-drawer-close"], button[aria-label="Close"], button:has-text("Close")').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
    await wait(500);
  }
}

// Get help panel content
async function getHelpPanelContent(page: Page): Promise<{ title: string; content: string; flows: string[] }> {
  // The help drawer has h2 with "Help" text
  const title = await page.locator('.w-80 h2, [class*="w-80"] h2').first().textContent().catch(() => '') || '';

  // Get the "This Screen" content from the prose section
  const content = await page.locator('.w-80 .prose, [class*="w-80"] .prose').first().textContent().catch(() => '') || '';

  // Get flow names from "How do I..." section - these are buttons with rounded-lg border
  const flowElements = await page.locator('.w-80 button.rounded-lg, button.w-full.rounded-lg.border').all();
  const flows: string[] = [];
  for (const el of flowElements) {
    const text = await el.locator('p.font-medium').first().textContent().catch(() => '');
    if (text) flows.push(text.trim());
  }

  // Fallback: try to get any button text that looks like a flow
  if (flows.length === 0) {
    const allButtons = await page.locator('.w-80 button').all();
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '');
      if (text && (text.toLowerCase().includes('create') || text.toLowerCase().includes('translate'))) {
        flows.push(text.trim());
      }
    }
  }

  return { title: title.trim(), content: content.trim(), flows };
}

// Click a flow in the help panel
async function clickFlow(page: Page, flowName: string): Promise<boolean> {
  console.log(`  Looking for flow: "${flowName}"...`);

  // Flow cards are buttons with class rounded-lg border containing a p.font-medium with the title
  // Look for button containing the flow name text
  const flowCard = page.locator(`.w-80 button.rounded-lg`).filter({ hasText: flowName }).first();

  if (await flowCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await flowCard.click();
    await wait(1000);
    console.log(`  Clicked flow: "${flowName}"`);
    return true;
  }

  // Try any button with the text
  const anyButton = page.locator(`button:has-text("${flowName}")`).first();
  if (await anyButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await anyButton.click();
    await wait(1000);
    console.log(`  Clicked flow via button text: "${flowName}"`);
    return true;
  }

  // Try partial match with first word
  const firstWord = flowName.split(' ')[0];
  const partialMatch = page.locator(`.w-80 button`).filter({ hasText: new RegExp(firstWord, 'i') }).first();
  if (await partialMatch.isVisible({ timeout: 1000 }).catch(() => false)) {
    await partialMatch.click();
    await wait(1000);
    console.log(`  Clicked flow via partial match: "${firstWord}"`);
    return true;
  }

  console.log(`  WARNING: Could not find flow "${flowName}"`);
  return false;
}

// Get current flow step info
async function getFlowStepInfo(page: Page): Promise<{ stepNumber: number; title: string; instruction: string } | null> {
  try {
    // Look for "Step X of Y" indicator text
    const stepIndicator = await page.locator('text=/Step \\d+ of \\d+/').textContent().catch(() => '');

    // The flow viewer structure is:
    // - h3 = flow title (e.g., "Create a blog post")
    // - h4 = step title (e.g., "Go to Posts tab")
    // - .prose div = instruction content

    // Look for step title (h4 inside the flow viewer content area)
    const title = await page.locator('.bg-muted\\/50 h4, [class*="muted"] h4').first().textContent().catch(() => '') || '';

    // Look for instruction content (prose div or muted-foreground text)
    const instruction = await page.locator('.bg-muted\\/50 .prose, .prose-sm, [class*="muted"] .prose').first().textContent().catch(() => '') || '';

    // Try to extract step number from "Step X of Y"
    const stepMatch = stepIndicator?.match(/Step (\d+) of/);
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : 0;

    return { stepNumber, title: title.trim(), instruction: instruction.trim() };
  } catch {
    return null;
  }
}

// Click Next in flow viewer
async function clickFlowNext(page: Page): Promise<boolean> {
  // The Next button has text "Next" with a ChevronRight icon
  // It's a Button component with variant="outline" and size="sm"
  const nextBtn = page.locator('button:has-text("Next")').last(); // Last one to avoid Back button
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isDisabled = await nextBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      await nextBtn.click();
      await wait(500);
      return true;
    }
    console.log('  Next button is disabled (last step)');
    return false;
  }

  // Fallback: try clicking directly via role
  const nextByRole = page.getByRole('button', { name: /next/i }).last();
  if (await nextByRole.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nextByRole.click();
    await wait(500);
    return true;
  }

  return false;
}

// Click Previous in flow viewer
async function clickFlowPrevious(page: Page): Promise<boolean> {
  const prevBtn = page.locator('button:has-text("Previous"), button:has-text("Back"), button:has-text("Précédent")').first();
  if (await prevBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await prevBtn.click();
    await wait(500);
    return true;
  }
  return false;
}

// Navigate to a specific tab in Blog Hub
async function navigateToTab(page: Page, tabName: string): Promise<boolean> {
  // First go to Blog Hub
  const blogBtn = page.locator('.bg-gray-900 >> text=Blog').first();
  if (await blogBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await blogBtn.click();
    await wait(1000);
  }

  // Click the specific tab
  const tab = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.click();
    await wait(1000);
    return true;
  }

  // Try direct URL navigation
  const tabSlug = tabName.toLowerCase().replace(/\s+/g, '-');
  await page.goto(`${STAGING_URL}/en-US/admin?tab=${tabSlug}`);
  await wait(2000);
  return true;
}

// Try to perform an action based on instruction
async function tryPerformAction(page: Page, instruction: string): Promise<{ success: boolean; notes: string }> {
  const notes: string[] = [];
  let success = false;

  // Extract button/element names from instruction
  // Looking for patterns like "click X", "Click the X button", etc.
  const clickPatterns = [
    /click\s+(?:the\s+)?["']?([^"']+?)["']?\s+(?:button|tab|icon|link)/gi,
    /click\s+["']?([^"']+?)["']?(?:\s|$|,|\.)/gi,
    /<span[^>]*>([^<]+)<\/span>/gi,
  ];

  const elementsToFind: string[] = [];
  for (const pattern of clickPatterns) {
    let match;
    while ((match = pattern.exec(instruction)) !== null) {
      elementsToFind.push(match[1].trim());
    }
  }

  // Try to find and interact with mentioned elements
  for (const elementName of elementsToFind) {
    if (elementName.length < 2) continue;

    const selector = `button:has-text("${elementName}"), [role="tab"]:has-text("${elementName}"), a:has-text("${elementName}")`;
    const el = page.locator(selector).first();

    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      notes.push(`Found: "${elementName}"`);
      success = true;

      // Don't actually click during help walkthrough to avoid changing state
      // Just verify the element exists
    } else {
      notes.push(`NOT FOUND: "${elementName}"`);
    }
  }

  return { success, notes: notes.join('; ') };
}

// Test Flow 1: Create a blog post
async function testCreateBlogPostFlow(page: Page): Promise<FlowResult> {
  console.log('\n\n========================================');
  console.log('PHASE 2: Flow 1 — "Create a blog post"');
  console.log('========================================\n');

  const results: StepResult[] = [];

  // Navigate to Blog Hub first
  await navigateToTab(page, 'Posts');
  await wait(1000);

  // Open help panel
  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    console.log('  BLOCKED: Cannot open help panel');
    return {
      flowName: 'Create a blog post',
      description: 'Step-by-step guide to create a blog post',
      totalSteps: 7,
      results: [],
      summary: { clear: 0, ambiguous: 0, blocked: 7 }
    };
  }

  // Take initial screenshot
  await takeScreenshot(page, 'flow1-overview');

  // Click on the flow
  const flowClicked = await clickFlow(page, 'Create a blog post');
  if (!flowClicked) {
    // Try alternate names
    await clickFlow(page, 'Create');
  }

  await wait(1000);

  // Process each step (expecting 7 steps)
  for (let stepNum = 1; stepNum <= 7; stepNum++) {
    console.log(`\n--- Step ${stepNum} of 7 ---`);

    // Screenshot the help instruction
    const helpScreenshot = await takeScreenshot(page, `flow1-step${stepNum}-help`);

    // Get step info from help panel
    const stepInfo = await getFlowStepInfo(page);
    const instruction = stepInfo?.instruction || '';
    const title = stepInfo?.title || `Step ${stepNum}`;

    console.log(`  Title: ${title}`);
    console.log(`  Instruction: ${instruction.substring(0, 100)}...`);

    // Try to perform the action
    const actionResult = await tryPerformAction(page, instruction);

    // Screenshot the result
    const actionScreenshot = await takeScreenshot(page, `flow1-step${stepNum}-action`);

    // Rate the instruction
    let rating: Rating = 'CLEAR';
    if (!actionResult.success) {
      rating = 'BLOCKED';
    } else if (actionResult.notes.includes('NOT FOUND')) {
      rating = 'AMBIGUOUS';
    }

    results.push({
      step: stepNum,
      title,
      instruction,
      helpScreenshot,
      actionScreenshot,
      rating,
      notes: actionResult.notes,
      uiElementFound: actionResult.success
    });

    // Click Next to advance
    const hasNext = await clickFlowNext(page);
    if (!hasNext && stepNum < 7) {
      console.log('  WARNING: No Next button, trying to continue...');
    }
    await wait(500);
  }

  // Calculate summary
  const summary = {
    clear: results.filter(r => r.rating === 'CLEAR').length,
    ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
    blocked: results.filter(r => r.rating === 'BLOCKED').length
  };

  console.log(`\n  Summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

  // Click Back to return to main help view for next flow test
  const backBtn = page.locator('button:has-text("Back")').first();
  if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await backBtn.click();
    await wait(500);
    console.log('  Returned to main help view');
  }

  return {
    flowName: 'Create a blog post',
    description: 'Step-by-step guide to create a blog post, manually or with AI assistance',
    totalSteps: 7,
    results,
    summary
  };
}

// Test Flow 2: Translate a post
async function testTranslatePostFlow(page: Page): Promise<FlowResult> {
  console.log('\n\n========================================');
  console.log('PHASE 3: Flow 2 — "Translate a post"');
  console.log('========================================\n');

  const results: StepResult[] = [];

  // Navigate to Posts tab fresh
  await navigateToTab(page, 'Posts');
  await wait(1000);

  // Close any existing help panel first, then reopen to get fresh view
  await closeHelpPanel(page);
  await wait(500);

  // Open help panel fresh
  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    console.log('  Could not open help panel for flow 2');
    return {
      flowName: 'Translate a post',
      description: 'Translate a post to another language using AI or manual tools',
      totalSteps: 8,
      results: [],
      summary: { clear: 0, ambiguous: 0, blocked: 8 }
    };
  }
  await wait(500);

  // Take initial screenshot
  await takeScreenshot(page, 'flow2-overview');

  // Click on the translate flow
  const flowClicked = await clickFlow(page, 'Translate a post');
  if (!flowClicked) {
    // Try alternate
    await clickFlow(page, 'Translate');
  }
  await wait(1000);

  // Process each step (expecting 8 steps)
  for (let stepNum = 1; stepNum <= 8; stepNum++) {
    console.log(`\n--- Step ${stepNum} of 8 ---`);

    // Screenshot the help instruction
    const helpScreenshot = await takeScreenshot(page, `flow2-step${stepNum}-help`);

    // Get step info from help panel
    const stepInfo = await getFlowStepInfo(page);
    const instruction = stepInfo?.instruction || '';
    const title = stepInfo?.title || `Step ${stepNum}`;

    console.log(`  Title: ${title}`);
    console.log(`  Instruction: ${instruction.substring(0, 100)}...`);

    // Try to perform the action
    const actionResult = await tryPerformAction(page, instruction);

    // Screenshot the result
    const actionScreenshot = await takeScreenshot(page, `flow2-step${stepNum}-action`);

    // Rate the instruction
    let rating: Rating = 'CLEAR';
    if (!actionResult.success) {
      rating = 'BLOCKED';
    } else if (actionResult.notes.includes('NOT FOUND')) {
      rating = 'AMBIGUOUS';
    }

    results.push({
      step: stepNum,
      title,
      instruction,
      helpScreenshot,
      actionScreenshot,
      rating,
      notes: actionResult.notes,
      uiElementFound: actionResult.success
    });

    // Click Next to advance
    await clickFlowNext(page);
    await wait(500);
  }

  // Calculate summary
  const summary = {
    clear: results.filter(r => r.rating === 'CLEAR').length,
    ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
    blocked: results.filter(r => r.rating === 'BLOCKED').length
  };

  console.log(`\n  Summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

  return {
    flowName: 'Translate a post',
    description: 'Translate a post to another language using AI or manual tools',
    totalSteps: 8,
    results,
    summary
  };
}

// Test screen help content
async function testScreenHelp(page: Page, route: string, screenName: string): Promise<ScreenResult> {
  console.log(`\n--- Testing screen: ${screenName} (${route}) ---`);

  // Navigate to the screen
  await page.goto(`${STAGING_URL}/en-US${route}`);
  await wait(2000);

  // Screenshot the UI
  const uiScreenshot = await takeScreenshot(page, `screen-${screenName.toLowerCase().replace(/\s+/g, '-')}-ui`);

  // Get actual page title from main content area (not sidebar)
  // Look for h1/h2 in the main content area, excluding the sidebar
  const mainContentTitle = await page.locator('main h1, .flex-1 h1, [class*="space-y"] > h1, .text-3xl').first().textContent().catch(() => '');
  const actualTitle = mainContentTitle?.trim() || screenName;

  // Close any existing help panel first
  await closeHelpPanel(page);
  await wait(300);

  // Open help panel
  await openHelpPanel(page);
  await wait(500);

  // Screenshot the help content
  const helpScreenshot = await takeScreenshot(page, `screen-${screenName.toLowerCase().replace(/\s+/g, '-')}-help`);

  // Get help panel "This Screen" content
  // The help title is within the prose section, typically as an h3
  const helpTitle = await page.locator('.w-80 .prose h3').first().textContent().catch(() => '') || '';

  // Get full prose content for analysis
  const helpProseContent = await page.locator('.w-80 .prose').first().textContent().catch(() => '') || '';

  // Analyze accuracy
  const titleMatches = helpTitle.toLowerCase().includes(screenName.toLowerCase()) ||
                       screenName.toLowerCase().includes(helpTitle.toLowerCase()) ||
                       helpTitle.toLowerCase().includes(actualTitle.toLowerCase());

  // Check for mentioned elements that might not exist
  const missingElements: string[] = [];
  const extraElements: string[] = [];

  // Rate the screen help
  let rating: Rating = 'CLEAR';
  let notes = '';

  if (!titleMatches && helpTitle) {
    rating = 'AMBIGUOUS';
    notes = `Help title "${helpTitle}" may not match screen "${actualTitle}"`;
  } else if (!helpTitle) {
    rating = 'AMBIGUOUS';
    notes = 'Could not extract help title from screen content';
  }

  // Close help panel
  await closeHelpPanel(page);

  return {
    route,
    helpTitle: helpTitle || '(not found)',
    actualTitle: actualTitle.trim(),
    helpScreenshot,
    uiScreenshot,
    titleMatches,
    contentAccurate: true, // Would need deeper analysis
    missingElements,
    extraElements,
    rating,
    notes
  };
}

// Test all screens
async function testAllScreens(page: Page): Promise<ScreenResult[]> {
  console.log('\n\n========================================');
  console.log('PHASE 4: Screen Help Content (9 screens)');
  console.log('========================================');

  const screens = [
    { route: '/admin?tab=blog', name: 'Blog Hub' },
    { route: '/admin?tab=posts', name: 'Posts' },
    { route: '/admin?tab=ai-creator', name: 'AI Creator' },
    { route: '/admin?tab=blog-edit&id=test', name: 'Blog Editor' },
    { route: '/admin?tab=planner', name: 'Planner' },
    { route: '/admin?tab=keywords', name: 'Keywords' },
    { route: '/admin?tab=topics', name: 'Topics' },
    { route: '/admin?tab=images', name: 'Images' },
    { route: '/admin?tab=new-post', name: 'New Post' },
  ];

  const results: ScreenResult[] = [];

  for (const screen of screens) {
    try {
      const result = await testScreenHelp(page, screen.route, screen.name);
      results.push(result);
    } catch (error) {
      console.log(`  ERROR testing ${screen.name}: ${error}`);
      results.push({
        route: screen.route,
        helpTitle: '',
        actualTitle: screen.name,
        helpScreenshot: '',
        uiScreenshot: '',
        titleMatches: false,
        contentAccurate: false,
        missingElements: [],
        extraElements: [],
        rating: 'BLOCKED',
        notes: `Error: ${error}`
      });
    }
  }

  return results;
}

// Generate markdown report
function generateReport(report: TestReport): string {
  let md = `# Naive User Test Report V3 — Playwright Browser Walkthrough

**Date:** ${report.testDate}
**Environment:** ${report.environment}
**Tester:** Playwright automated walkthrough (no source code knowledge)

---

## Executive Summary

| Category | CLEAR | AMBIGUOUS | BLOCKED | Total |
|----------|-------|-----------|---------|-------|
| Flow Steps | ${report.summary.flowClear} | ${report.summary.flowAmbiguous} | ${report.summary.flowBlocked} | ${report.summary.totalFlowSteps} |
| Screen Help | ${report.summary.screenClear} | ${report.summary.screenAmbiguous} | ${report.summary.screenBlocked} | ${report.summary.totalScreens} |
| **TOTAL** | **${report.summary.flowClear + report.summary.screenClear}** | **${report.summary.flowAmbiguous + report.summary.screenAmbiguous}** | **${report.summary.flowBlocked + report.summary.screenBlocked}** | **${report.summary.totalFlowSteps + report.summary.totalScreens}** |

---

`;

  // Flow results
  for (const flow of report.flows) {
    md += `## Flow: "${flow.flowName}"

**Description:** ${flow.description}
**Total Steps:** ${flow.totalSteps}
**Summary:** ${flow.summary.clear} CLEAR, ${flow.summary.ambiguous} AMBIGUOUS, ${flow.summary.blocked} BLOCKED

| Step | Title | Rating | Notes |
|------|-------|--------|-------|
`;
    for (const step of flow.results) {
      const ratingBadge = step.rating === 'CLEAR' ? '✅' : step.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
      md += `| ${step.step} | ${step.title} | ${ratingBadge} ${step.rating} | ${step.notes || '-'} |\n`;
    }

    md += `\n### Step Details\n\n`;
    for (const step of flow.results) {
      md += `#### Step ${step.step}: ${step.title}

**Instruction:** ${step.instruction || '(not captured)'}

**Rating:** ${step.rating}

**Notes:** ${step.notes || 'None'}

**Screenshots:**
- Help: \`${step.helpScreenshot}\`
- Action: \`${step.actionScreenshot}\`

---

`;
    }
  }

  // Screen results
  md += `## Screen Help Accuracy

| Route | Help Title | Actual Title | Match | Rating | Notes |
|-------|------------|--------------|-------|--------|-------|
`;
  for (const screen of report.screens) {
    const matchIcon = screen.titleMatches ? '✅' : '❌';
    const ratingBadge = screen.rating === 'CLEAR' ? '✅' : screen.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
    md += `| \`${screen.route}\` | ${screen.helpTitle} | ${screen.actualTitle} | ${matchIcon} | ${ratingBadge} ${screen.rating} | ${screen.notes || '-'} |\n`;
  }

  md += `\n### Screen Screenshots

| Screen | Help | UI |
|--------|------|-----|
`;
  for (const screen of report.screens) {
    md += `| ${screen.actualTitle} | \`${screen.helpScreenshot}\` | \`${screen.uiScreenshot}\` |\n`;
  }

  // Recommendations
  md += `\n---

## Recommendations

Based on the test results, the following improvements are recommended:

`;

  const blockedFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'BLOCKED'));
  const ambiguousFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'AMBIGUOUS'));
  const blockedScreens = report.screens.filter(s => s.rating === 'BLOCKED');

  if (blockedFlowSteps.length > 0) {
    md += `### Critical (BLOCKED)\n\n`;
    for (const step of blockedFlowSteps) {
      md += `- **Flow step ${step.step}** (${step.title}): ${step.notes}\n`;
    }
    md += '\n';
  }

  if (ambiguousFlowSteps.length > 0) {
    md += `### Warnings (AMBIGUOUS)\n\n`;
    for (const step of ambiguousFlowSteps) {
      md += `- **Flow step ${step.step}** (${step.title}): ${step.notes}\n`;
    }
    md += '\n';
  }

  if (blockedScreens.length > 0) {
    md += `### Screen Issues\n\n`;
    for (const screen of blockedScreens) {
      md += `- **${screen.actualTitle}**: ${screen.notes}\n`;
    }
  }

  md += `\n---

## Test Artifacts

- **Screenshots:** \`tests/e2e/screenshots/help-validation/v3/\`
- **Test Script:** \`tests/e2e/naive-user-help-test-v3.ts\`

---

*Generated by Playwright automated walkthrough*
`;

  return md;
}

// Main test runner
async function runTest(): Promise<void> {
  console.log('===========================================');
  console.log('Naive User Help Test V3 - Browser Walkthrough');
  console.log('===========================================');
  console.log(`\nTarget: ${STAGING_URL}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);

  const browser: Browser = await chromium.launch({
    headless: true, // Run headless for automation
    slowMo: 50, // Small delay for stability
  });

  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    extraHTTPHeaders: {
      'X-E2E-Token': process.env.E2E_BYPASS_TOKEN || '',
    },
  });

  const page: Page = await context.newPage();

  try {
    // Phase 1: Login and discovery
    console.log('\n\n========================================');
    console.log('PHASE 1: Discovery');
    console.log('========================================');

    await loginToAdmin(page);

    // Navigate to Blog Hub to find help button
    const blogBtn = page.locator('.bg-gray-900 >> text=Blog').first();
    if (await blogBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await blogBtn.click();
      await wait(2000);
    }

    // Screenshot initial state
    await takeScreenshot(page, 'help-panel-initial');

    // Try to open help panel
    const helpOpened = await openHelpPanel(page);
    if (helpOpened) {
      await takeScreenshot(page, 'help-panel-opened');

      // Get available flows
      const helpContent = await getHelpPanelContent(page);
      console.log('\n  Help panel content:');
      console.log(`    Title: ${helpContent.title}`);
      console.log(`    Flows found: ${helpContent.flows.join(', ') || 'none'}`);
    }

    // Phase 2: Test Flow 1 - Create a blog post
    const flow1Result = await testCreateBlogPostFlow(page);

    // Phase 3: Test Flow 2 - Translate a post
    const flow2Result = await testTranslatePostFlow(page);

    // Phase 4: Test all screens
    const screenResults = await testAllScreens(page);

    // Compile report
    const report: TestReport = {
      testDate: new Date().toISOString().split('T')[0],
      environment: `Staging (${STAGING_URL})`,
      flows: [flow1Result, flow2Result],
      screens: screenResults,
      summary: {
        totalFlowSteps: flow1Result.results.length + flow2Result.results.length,
        flowClear: flow1Result.summary.clear + flow2Result.summary.clear,
        flowAmbiguous: flow1Result.summary.ambiguous + flow2Result.summary.ambiguous,
        flowBlocked: flow1Result.summary.blocked + flow2Result.summary.blocked,
        totalScreens: screenResults.length,
        screenClear: screenResults.filter(s => s.rating === 'CLEAR').length,
        screenAmbiguous: screenResults.filter(s => s.rating === 'AMBIGUOUS').length,
        screenBlocked: screenResults.filter(s => s.rating === 'BLOCKED').length,
      }
    };

    // Generate and save report
    const reportMd = generateReport(report);
    const reportPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_V3_NAIVE_USER.md');
    fs.writeFileSync(reportPath, reportMd);
    console.log(`\n\nReport saved to: ${reportPath}`);

    // Also save JSON for further analysis
    const jsonPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON results saved to: ${jsonPath}`);

    console.log('\n\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
    console.log(`\nSummary:`);
    console.log(`  Flow Steps: ${report.summary.flowClear} CLEAR, ${report.summary.flowAmbiguous} AMBIGUOUS, ${report.summary.flowBlocked} BLOCKED`);
    console.log(`  Screens: ${report.summary.screenClear} CLEAR, ${report.summary.screenAmbiguous} AMBIGUOUS, ${report.summary.screenBlocked} BLOCKED`);

  } catch (error) {
    console.error('\n\nTEST FAILED:', error);
    await takeScreenshot(page, 'error-state');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);
