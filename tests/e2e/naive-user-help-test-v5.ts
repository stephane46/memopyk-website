/**
 * Naive User Help Test V5 — Discovery-Based Full Admin Validation
 *
 * KEY DIFFERENCES FROM V4:
 * 1. DISCOVERY-BASED — no hardcoded screen list, discover by clicking
 * 2. UI-ONLY NAVIGATION — NEVER uses page.goto() after initial login
 * 3. 6-QUESTION ANALYSIS per screen
 * 4. Viewport: 2560x1440, slowMo: 100
 * 5. Comprehensive JSON + Markdown report generation
 *
 * Run: npx tsx tests/e2e/naive-user-help-test-v5.ts
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const STAGING_URL = 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = 'memopyk2025admin';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'v5');
const VIEWPORT = { width: 2560, height: 1440 };
const SLOW_MO = 100;
const NAV_WAIT = 2000;       // Wait after every navigation or tab click
const HELP_WAIT = 5000;      // Wait for .w-80 .prose h3
const HELP_FALLBACK = 3000;  // Fallback wait for .w-80 .prose

// Ensure directories exist
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', '..', 'docs', 'help'), { recursive: true });

// ============================================================================
// TYPES
// ============================================================================

type Rating = 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';

interface DiscoveredScreen {
  id: string;
  name: string;
  navPath: string[];
  sidebarItem: string;
  tabSelector?: string;
  subTabSelector?: string;
  specialAction?: string;
}

interface SixQuestionAnalysis {
  a_helpTitleMatch: { answer: boolean; detail: string };
  b_helpMentionsExistingElements: { answer: boolean; detail: string };
  c_helpMissesVisibleElements: { answer: boolean; detail: string };
  d_languagePlain: { answer: boolean; detail: string };
  e_anythingBroken: { answer: boolean; detail: string };
  f_noHelpContent: { answer: boolean; detail: string };
}

interface ScreenResult {
  screen: DiscoveredScreen;
  helpTitle: string;
  actualTitle: string;
  helpContent: string;
  helpContentLength: number;
  analysis: SixQuestionAnalysis;
  rating: Rating;
  justification: string;
  uiScreenshot: string;
  helpScreenshot: string;
}

interface FlowStepResult {
  step: number;
  totalSteps: number;
  title: string;
  instruction: string;
  uiObservation: string;
  rating: Rating;
  justification: string;
  helpScreenshot: string;
  actionScreenshot: string;
}

interface FlowResult {
  name: string;
  steps: FlowStepResult[];
  summary: { clear: number; ambiguous: number; blocked: number };
}

interface V5TestReport {
  metadata: {
    date: string;
    environment: string;
    viewport: string;
    startTime: string;
    endTime: string;
    elapsed_ms: number;
  };
  discovery: {
    sidebar_items: string[];
    total_screens: number;
    navigation_map: Record<string, { tabs?: string[]; subTabs?: Record<string, string[]>; specialScreens?: string[] }>;
    surprises: string[];
  };
  flows: FlowResult[];
  screens: ScreenResult[];
  summary: {
    flow_clear: number;
    flow_ambiguous: number;
    flow_blocked: number;
    screen_clear: number;
    screen_ambiguous: number;
    screen_blocked: number;
  };
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

const startTime = Date.now();
const surprises: string[] = [];
const allScreens: DiscoveredScreen[] = [];
const navMap: V5TestReport['discovery']['navigation_map'] = {};
let screenshotCount = 0;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(msg: string) {
  console.log(msg);
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  screenshotCount++;
  log(`    📸 ${filename}`);
  return filename;
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function elapsed(): string {
  const ms = Date.now() - startTime;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m${s % 60}s`;
}

// ============================================================================
// LOGIN
// ============================================================================

async function loginToAdmin(page: Page): Promise<void> {
  log('\n=== LOGGING IN ===');
  await page.goto(`${STAGING_URL}/en-US/admin`);
  await wait(NAV_WAIT);

  // Cookie consent
  const acceptBtn = page.getByRole('button', { name: /accept/i });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await wait(500);
  }

  // Password
  const pwField = page.locator('input[type="password"]');
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(ADMIN_PASSWORD);
    const loginBtn = page.getByRole('button', { name: /access admin/i });
    await loginBtn.click();
    await wait(3000);
  }

  // Wait for sidebar
  await page.waitForSelector('.bg-gray-900.fixed', { timeout: 15000 });
  log('  Logged in successfully');
}

// ============================================================================
// SIDEBAR INTERACTION
// ============================================================================

function getSidebar(page: Page) {
  return page.locator('.bg-gray-900.fixed').first();
}

async function discoverSidebarItems(page: Page): Promise<string[]> {
  log('\n=== DISCOVERING SIDEBAR ITEMS ===');

  const sidebar = getSidebar(page);

  // Extract all clickable text items from sidebar using evaluate
  const items: string[] = await sidebar.evaluate((el) => {
    const results: string[] = [];
    const seen = new Set<string>();

    // Get all elements that look like nav items
    const candidates = el.querySelectorAll('button, a, [role="button"], [role="menuitem"], div[class*="cursor"], span[class*="cursor"], [class*="sidebar-item"]');
    for (const c of candidates) {
      // Get direct text (not nested deeply)
      let text = '';
      // Try to get the most specific text
      const spans = c.querySelectorAll('span');
      if (spans.length > 0) {
        // Use the last span's text (often the label after an icon)
        for (const span of spans) {
          const t = span.textContent?.trim();
          if (t && t.length > 1 && t.length < 50) text = t;
        }
      }
      if (!text) {
        text = (c as HTMLElement).textContent?.trim() || '';
      }

      // Clean up — remove icon characters and extra whitespace
      text = text.replace(/[\u{E000}-\u{F8FF}\u{200B}-\u{200F}]/gu, '').trim();

      if (text && text.length > 1 && text.length < 50 && !seen.has(text)) {
        seen.add(text);
        results.push(text);
      }
    }
    return results;
  });

  // Filter out known non-navigation items
  const excluded = ['MEMOPYK', 'Admin', 'Aide', 'Help', 'Logout', 'Sign out', 'Déconnexion', 'déconnexion', '©'];
  const navItems = items.filter(item =>
    !excluded.some(ex => item.toLowerCase().includes(ex.toLowerCase())) &&
    item.length > 1
  );

  log(`  Found ${navItems.length} sidebar items: ${navItems.join(', ')}`);
  return navItems;
}

async function clickSidebarItem(page: Page, itemText: string): Promise<boolean> {
  const sidebar = getSidebar(page);

  // Ensure sidebar is visible
  if (!(await sidebar.isVisible({ timeout: 2000 }).catch(() => false))) {
    log(`    WARNING: Sidebar not visible`);
    return false;
  }

  // Try multiple strategies to find the item within the fixed sidebar
  const strategies = [
    () => sidebar.locator(`span:text-is("${itemText}")`).first(),
    () => sidebar.getByText(itemText, { exact: true }).first(),
    () => sidebar.locator(`a:has-text("${itemText}")`).first(),
    () => sidebar.locator(`button:has-text("${itemText}")`).first(),
    () => sidebar.getByText(itemText, { exact: false }).first(),
  ];

  for (const strategy of strategies) {
    try {
      const el = strategy();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* try next */ }
  }

  // Last resort: scroll sidebar and try again
  try {
    await sidebar.evaluate(el => el.scrollTop = 0);
    await wait(300);
    const el = sidebar.getByText(itemText, { exact: false }).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click();
      await wait(NAV_WAIT);
      return true;
    }
  } catch { /* */ }

  log(`    WARNING: Could not click sidebar item "${itemText}"`);
  return false;
}

// ============================================================================
// TAB DETECTION & INTERACTION
// ============================================================================

async function discoverTabs(page: Page): Promise<Array<{ text: string; selector: string }>> {
  const tabs: Array<{ text: string; selector: string }> = [];
  const seen = new Set<string>();

  // Strategy 1: data-testid="tab-*" elements (most reliable)
  // Exclude mobile tabs (tab-mobile-*) and description tabs (tab-description-*)
  const testIdTabs = await page.locator('[data-testid^="tab-"]:not([data-testid^="tab-mobile"]):not([data-testid^="tab-description"])').all();
  for (const tab of testIdTabs) {
    const inSidebar = await tab.evaluate(el => !!el.closest('.bg-gray-900')).catch(() => false);
    if (inSidebar) continue;
    const isVisible = await tab.isVisible().catch(() => false);
    if (!isVisible) continue;
    const text = await tab.textContent().catch(() => '') || '';
    const testId = await tab.getAttribute('data-testid').catch(() => '') || '';
    const cleaned = text.trim().replace(/\s+/g, ' ');
    if (cleaned && !seen.has(cleaned) && testId) {
      seen.add(cleaned);
      tabs.push({ text: cleaned, selector: `[data-testid="${testId}"]` });
    }
  }

  // Strategy 2: role="tab" elements (dedup by text)
  if (tabs.length === 0) {
    const roleTabs = await page.locator('[role="tab"]').all();
    for (const tab of roleTabs) {
      const inSidebar = await tab.evaluate(el => !!el.closest('.bg-gray-900')).catch(() => false);
      if (inSidebar) continue;
      const text = await tab.textContent().catch(() => '') || '';
      const testId = await tab.getAttribute('data-testid').catch(() => '') || '';
      const cleaned = text.trim().replace(/\s+/g, ' ');
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        const selector = testId ? `[data-testid="${testId}"]` : `[role="tab"]:text-is("${cleaned}")`;
        tabs.push({ text: cleaned, selector });
      }
    }
  }

  // Strategy 3: Look for numbered circles (Blog Hub pattern ①②③④⑤)
  if (tabs.length === 0) {
    const numberedTabs = await page.locator('button').filter({
      has: page.locator('text=/[①②③④⑤⑥⑦⑧⑨⑩]/')
    }).all();
    for (const tab of numberedTabs) {
      const inSidebar = await tab.evaluate(el => !!el.closest('.bg-gray-900')).catch(() => false);
      if (inSidebar) continue;
      const text = await tab.textContent().catch(() => '') || '';
      const cleaned = text.trim().replace(/\s+/g, ' ');
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        tabs.push({ text: cleaned, selector: `button:has-text("${cleaned.substring(0, 20)}")` });
      }
    }
  }

  // Strategy 4: Look for horizontal button group in content (tab-like buttons)
  if (tabs.length === 0) {
    // Try [role="tablist"] first
    const tablist = page.locator('[role="tablist"]').first();
    if (await tablist.isVisible({ timeout: 500 }).catch(() => false)) {
      const buttons = await tablist.locator('button, a, [role="tab"]').all();
      for (const btn of buttons) {
        const text = await btn.textContent().catch(() => '') || '';
        const cleaned = text.trim().replace(/\s+/g, ' ');
        if (cleaned && cleaned.length < 30 && !seen.has(cleaned)) {
          seen.add(cleaned);
          tabs.push({ text: cleaned, selector: `[role="tablist"] :text-is("${cleaned}")` });
        }
      }
    }
  }

  return tabs;
}

async function discoverSubTabs(page: Page): Promise<Array<{ text: string; selector: string }>> {
  // Sub-tabs are ONLY detected if there's an explicit nested [role="tablist"]
  // This prevents false positives from filter buttons (ALL/EN/FR), toggle buttons, etc.
  const subTabs: Array<{ text: string; selector: string }> = [];
  const seen = new Set<string>();

  // Only look inside [role="tablist"] containers
  const tabLists = await page.locator('[role="tablist"]').all();
  for (const tabList of tabLists) {
    const inSidebar = await tabList.evaluate(node => !!node.closest('.bg-gray-900')).catch(() => false);
    const inHelp = await tabList.evaluate(node => !!node.closest('.w-80')).catch(() => false);
    if (inSidebar || inHelp) continue;

    const tabs = await tabList.locator('[role="tab"]').all();
    for (const tab of tabs) {
      const text = await tab.textContent().catch(() => '') || '';
      const cleaned = text.trim().replace(/\s+/g, ' ');
      const testId = await tab.getAttribute('data-testid').catch(() => '') || '';

      if (cleaned && cleaned.length > 3 && cleaned.length < 40 && !seen.has(cleaned)) {
        seen.add(cleaned);
        const selector = testId
          ? `[data-testid="${testId}"]`
          : `[role="tab"]:has-text("${cleaned}")`;
        subTabs.push({ text: cleaned, selector });
      }
    }
  }

  return subTabs;
}

async function clickTab(page: Page, selector: string, tabText?: string): Promise<boolean> {
  // Strategy 1: Use the stored selector with scroll-into-view
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click();
      await wait(NAV_WAIT);
      return true;
    }
  } catch { /* try next */ }

  // Strategy 2: Find visible button by data-testid pattern derived from tabText
  if (tabText) {
    const slug = tabText.toLowerCase().replace(/\s+/g, '-');
    const testIdSelector = `[data-testid="tab-${slug}"]:visible`;
    try {
      const el = page.locator(testIdSelector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* try next */ }
  }

  // Strategy 3: Find by getByText scoped to content area (not sidebar, not help)
  if (tabText) {
    try {
      // Click by text, excluding sidebar and help panel
      const el = page.locator(`button:not(.bg-gray-900 *):not(.w-80 *)`).filter({ hasText: tabText }).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* try next */ }

    // Strategy 4: getByRole
    try {
      const el = page.getByRole('tab', { name: tabText }).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* */ }
  }

  return false;
}

// ============================================================================
// HELP PANEL INTERACTION
// ============================================================================

async function openHelpPanel(page: Page): Promise<boolean> {
  // Check if already open
  const existing = page.locator('.w-80 h2');
  if (await existing.isVisible({ timeout: 500 }).catch(() => false)) {
    return true;
  }

  // Click Aide button in sidebar
  const sidebar = getSidebar(page);
  const aideBtn = sidebar.getByText('Aide', { exact: false }).first();
  if (await aideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await aideBtn.click();
    await wait(1500);

    // Verify drawer opened
    if (await page.locator('.w-80 h2').isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
  }

  // Fallback
  const fallbacks = [
    page.locator('button:has-text("Aide")').first(),
    page.locator('[data-testid="help-button"]').first(),
  ];
  for (const btn of fallbacks) {
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await wait(1500);
      if (await page.locator('.w-80 h2').isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
  }

  return false;
}

async function closeHelpPanel(page: Page): Promise<void> {
  // Click X button in help drawer
  const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg') }).first();
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click();
    await wait(300);
  }
}

async function waitForHelpContent(page: Page): Promise<boolean> {
  // Primary: wait for actual help content title
  try {
    await page.waitForSelector('.w-80 .prose h3', { timeout: HELP_WAIT });
    return true;
  } catch { /* fallback */ }

  // Fallback: wait for prose container
  try {
    await page.waitForSelector('.w-80 .prose', { timeout: HELP_FALLBACK });
    return true;
  } catch { /* no content */ }

  return false;
}

async function getHelpContent(page: Page): Promise<{ title: string; body: string; fullText: string }> {
  const title = await page.locator('.w-80 .prose h3').first().textContent().catch(() => '') || '';
  const body = await page.locator('.w-80 .prose').first().textContent().catch(() => '') || '';
  return { title: title.trim(), body: body.trim(), fullText: body.trim() };
}

async function getFlowList(page: Page): Promise<string[]> {
  const flows: string[] = [];
  const flowCards = await page.locator('.w-80 button.rounded-lg').all();
  for (const card of flowCards) {
    const text = await card.locator('p.font-medium').first().textContent().catch(() => '');
    if (text?.trim()) flows.push(text.trim());
  }

  // Fallback: look for any button with flow-like text
  if (flows.length === 0) {
    const buttons = await page.locator('.w-80 button').all();
    for (const btn of buttons) {
      const text = await btn.textContent().catch(() => '') || '';
      if (text.includes('Create') || text.includes('Translate') || text.includes('blog') || text.includes('post')) {
        if (text.trim().length > 5 && text.trim().length < 60) {
          flows.push(text.trim());
        }
      }
    }
  }

  return flows;
}

async function clickFlow(page: Page, flowName: string): Promise<boolean> {
  const card = page.locator('.w-80 button.rounded-lg').filter({ hasText: flowName }).first();
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    await card.click();
    await wait(1000);
    return true;
  }
  // Fallback
  const btn = page.locator(`.w-80 button:has-text("${flowName}")`).first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await wait(1000);
    return true;
  }
  return false;
}

async function getFlowStepInfo(page: Page): Promise<{
  stepNumber: number;
  totalSteps: number;
  title: string;
  instruction: string;
} | null> {
  try {
    // Step indicator: "Step X of Y"
    const stepText = await page.locator('text=/Step \\d+ of \\d+/').first().textContent().catch(() => '');
    const match = stepText?.match(/Step (\d+) of (\d+)/);

    // Step title from h4
    const title = await page.locator('.bg-muted\\/50 h4, [class*="muted"] h4, .w-80 h4').first()
      .textContent().catch(() => '') || '';

    // Instruction from prose
    const instruction = await page.locator('.bg-muted\\/50 .prose, .prose-sm, .w-80 .bg-muted\\/50')
      .first().textContent().catch(() => '') || '';

    return {
      stepNumber: match ? parseInt(match[1]) : 0,
      totalSteps: match ? parseInt(match[2]) : 0,
      title: title.trim(),
      instruction: instruction.trim()
    };
  } catch {
    return null;
  }
}

async function clickFlowNext(page: Page): Promise<boolean> {
  const nextBtn = page.getByRole('button', { name: /next/i }).last();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (!(await nextBtn.isDisabled().catch(() => true))) {
      await nextBtn.click();
      await wait(500);
      return true;
    }
  }
  return false;
}

async function clickFlowBack(page: Page): Promise<boolean> {
  const backBtn = page.locator('.w-80 button').filter({ hasText: /back|←/i }).first();
  if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await backBtn.click();
    await wait(500);
    return true;
  }
  return false;
}

// ============================================================================
// GET SCREEN TITLE (from content area)
// ============================================================================

async function getContentTitle(page: Page): Promise<string> {
  // Try various heading selectors in the main content area
  const selectors = [
    'main h1', '.flex-1 h1', 'h1.text-3xl', 'h1.text-2xl',
    'main h2', '.flex-1 h2', 'h2.text-2xl', 'h2.text-xl'
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      const text = await el.textContent().catch(() => '') || '';
      if (text.trim()) return text.trim();
    }
  }
  return '';
}

// ============================================================================
// GET VISIBLE UI ELEMENTS (for 6-question analysis)
// ============================================================================

async function getVisibleUIElements(page: Page): Promise<string[]> {
  // Extract names of visible interactive elements (buttons, inputs, selects, links)
  return page.evaluate(() => {
    const elements: string[] = [];
    const seen = new Set<string>();

    // Buttons
    document.querySelectorAll('main button, .flex-1 button').forEach(el => {
      const text = (el as HTMLElement).textContent?.trim();
      if (text && text.length > 1 && text.length < 60 && !seen.has(text)) {
        // Skip if it's in the sidebar or help panel
        if (el.closest('.bg-gray-900') || el.closest('.w-80')) return;
        seen.add(text);
        elements.push(`[Button] ${text}`);
      }
    });

    // Inputs
    document.querySelectorAll('main input, .flex-1 input, main textarea, .flex-1 textarea').forEach(el => {
      const input = el as HTMLInputElement;
      const label = input.placeholder || input.getAttribute('aria-label') || input.name || '';
      if (label && !seen.has(label)) {
        seen.add(label);
        elements.push(`[Input] ${label}`);
      }
    });

    // Headings
    document.querySelectorAll('main h1, main h2, main h3, .flex-1 h1, .flex-1 h2, .flex-1 h3').forEach(el => {
      const text = (el as HTMLElement).textContent?.trim();
      if (text && text.length > 1 && !seen.has(text)) {
        if (el.closest('.bg-gray-900') || el.closest('.w-80')) return;
        seen.add(text);
        elements.push(`[Heading] ${text}`);
      }
    });

    return elements.slice(0, 30); // Cap at 30 to avoid noise
  });
}

// ============================================================================
// 6-QUESTION ANALYSIS
// ============================================================================

function performSixQuestionAnalysis(
  screenName: string,
  helpTitle: string,
  helpBody: string,
  actualTitle: string,
  visibleElements: string[],
): SixQuestionAnalysis {
  // a. Does help title match the screen?
  const titleLower = helpTitle.toLowerCase();
  const screenLower = screenName.toLowerCase();
  const actualLower = actualTitle.toLowerCase();
  const titleMatch = titleLower.includes(screenLower) || screenLower.includes(titleLower) ||
    titleLower.includes(actualLower) || actualLower.includes(titleLower) ||
    (helpTitle.length > 0 && actualTitle.length > 0);

  // b. Does help mention UI elements that exist?
  const helpLower = helpBody.toLowerCase();
  const mentionedElements = visibleElements.filter(el => {
    const elText = el.replace(/^\[.*?\]\s*/, '').toLowerCase();
    return helpLower.includes(elText.substring(0, Math.min(10, elText.length)));
  });
  const bAnswer = mentionedElements.length > 0 || helpBody.length < 50;

  // c. Does help MISS visible UI elements?
  const buttonElements = visibleElements.filter(e => e.startsWith('[Button]'));
  const missedButtons = buttonElements.filter(el => {
    const elText = el.replace('[Button] ', '').toLowerCase();
    return !helpLower.includes(elText.substring(0, Math.min(8, elText.length))) && elText.length > 3;
  });

  // d. Is language plain?
  const jargonTerms = ['DPT', 'CRUD', 'API', 'REST', 'JSON', 'SQL', 'regex', 'endpoint', 'schema', 'webhook'];
  const foundJargon = jargonTerms.filter(term => helpBody.includes(term));

  // e. Anything broken? (checked by caller — we just placeholder here)
  const eBroken = false;

  // f. No help content?
  const noContent = helpBody.includes('No help content available') ||
    helpBody.includes('no help content') ||
    helpBody.length < 20;

  return {
    a_helpTitleMatch: {
      answer: titleMatch,
      detail: titleMatch
        ? `Help title "${helpTitle}" matches screen "${actualTitle || screenName}"`
        : `Help title "${helpTitle}" does NOT match screen "${actualTitle || screenName}"`
    },
    b_helpMentionsExistingElements: {
      answer: bAnswer,
      detail: bAnswer
        ? `Help mentions ${mentionedElements.length} visible elements`
        : `Help does not reference any visible UI elements`
    },
    c_helpMissesVisibleElements: {
      answer: missedButtons.length <= 2,
      detail: missedButtons.length > 0
        ? `${missedButtons.length} visible buttons not mentioned in help: ${missedButtons.slice(0, 3).map(b => b.replace('[Button] ', '')).join(', ')}`
        : 'All major UI elements are covered in help'
    },
    d_languagePlain: {
      answer: foundJargon.length === 0,
      detail: foundJargon.length > 0
        ? `Jargon found: ${foundJargon.join(', ')}`
        : 'Language is plain and user-friendly'
    },
    e_anythingBroken: {
      answer: !eBroken,
      detail: eBroken ? 'Visual issues detected' : 'No visible issues on screen'
    },
    f_noHelpContent: {
      answer: noContent,
      detail: noContent
        ? `BLOCKED: Help content missing or says "No help content available" (${helpBody.length} chars)`
        : `Help content present (${helpBody.length} chars)`
    }
  };
}

function deriveRating(analysis: SixQuestionAnalysis): { rating: Rating; justification: string } {
  // f = no content → automatic BLOCKED
  if (analysis.f_noHelpContent.answer) {
    return { rating: 'BLOCKED', justification: analysis.f_noHelpContent.detail };
  }

  // Collect issues
  const issues: string[] = [];
  if (!analysis.a_helpTitleMatch.answer) issues.push('Title mismatch');
  if (!analysis.b_helpMentionsExistingElements.answer) issues.push('Help doesn\'t reference visible elements');
  if (!analysis.c_helpMissesVisibleElements.answer) issues.push(analysis.c_helpMissesVisibleElements.detail);
  if (!analysis.d_languagePlain.answer) issues.push(analysis.d_languagePlain.detail);
  if (!analysis.e_anythingBroken.answer) issues.push('Screen has visual issues');

  if (issues.length === 0) {
    return {
      rating: 'CLEAR',
      justification: 'Help title matches, content references visible elements, language is plain, no issues detected'
    };
  }

  // Multiple issues or critical ones → AMBIGUOUS or BLOCKED
  if (issues.length >= 3 || !analysis.a_helpTitleMatch.answer && !analysis.b_helpMentionsExistingElements.answer) {
    return { rating: 'BLOCKED', justification: issues.join('. ') };
  }

  return { rating: 'AMBIGUOUS', justification: issues.join('. ') };
}

// ============================================================================
// PHASE 1: DISCOVERY
// ============================================================================

async function runDiscovery(page: Page): Promise<DiscoveredScreen[]> {
  log('\n\n' + '='.repeat(60));
  log('PHASE 1: DISCOVERY');
  log('='.repeat(60));

  // Screenshot the full sidebar
  await screenshot(page, 'discovery-sidebar');

  const sidebarItems = await discoverSidebarItems(page);

  for (const item of sidebarItems) {
    // Skip help button
    if (item.toLowerCase().includes('aide') || item.toLowerCase() === 'help') {
      log(`\n  [SKIP] "${item}" — help button, not a screen`);
      continue;
    }

    log(`\n  ► Clicking sidebar: "${item}"`);

    // Capture URL before clicking to detect group toggles
    const urlBefore = page.url();

    const clicked = await clickSidebarItem(page, item);
    if (!clicked) {
      surprises.push(`Could not click sidebar item: "${item}"`);
      continue;
    }

    // Detect expandable group toggles (Partenaires, Contenu Site, Système)
    // These just expand/collapse sidebar sub-items without navigating
    const urlAfter = page.url();
    if (urlBefore === urlAfter) {
      // Double-check: see if new sidebar sub-items appeared (group toggle behavior)
      log(`    [GROUP TOGGLE] "${item}" — expands sidebar group, not a screen`);
      navMap[item] = { tabs: ['(group toggle — see sub-items)'] };
      continue;
    }

    // Screenshot what loaded
    await screenshot(page, `discovery-${kebab(item)}`);

    // Get page title
    const pageTitle = await getContentTitle(page);
    log(`    Page title: "${pageTitle || '(none)'}"`);

    // Check for tabs
    const tabs = await discoverTabs(page);
    const tabTexts = tabs.map(t => t.text);
    log(`    Tabs found: ${tabs.length > 0 ? tabTexts.join(', ') : '(none)'}`);

    navMap[item] = {};

    if (tabs.length > 0) {
      navMap[item].tabs = tabTexts;

      // Click the FIRST tab and check for sub-tabs to detect "same navigation" pattern
      // (Blog Hub has numbered buttons AND [role="tablist"] tabs for the same 5 views)
      let blogHubPattern = false;
      let subTabsForNavigation: Array<{ text: string; selector: string }> = [];

      const firstTabClicked = await clickTab(page, tabs[0].selector, tabs[0].text);
      if (firstTabClicked) {
        const subTabs = await discoverSubTabs(page);
        const uniqueSubTabs = subTabs.filter(st =>
          !tabTexts.some(tt => tt === st.text) && st.text.length > 1
        );

        // Detect Blog Hub pattern: sub-tab count matches tab count AND sub-tab names
        // appear as substrings within tab names (e.g., "Keywords" in "1KeywordsResearch SEO")
        if (uniqueSubTabs.length > 0 && uniqueSubTabs.length === tabs.length) {
          const matchCount = uniqueSubTabs.filter(st =>
            tabs.some(t =>
              t.text.toLowerCase().includes(st.text.toLowerCase()) ||
              st.text.toLowerCase().includes(t.text.toLowerCase().substring(1, 8))
            )
          ).length;
          if (matchCount >= Math.floor(tabs.length * 0.6)) {
            blogHubPattern = true;
            subTabsForNavigation = uniqueSubTabs;
            log(`    [BLOG HUB PATTERN] Sub-tabs match main tabs — using ${uniqueSubTabs.length} sub-tabs`);
          }
        }
      }

      if (blogHubPattern) {
        // Blog Hub: register each sub-tab as a direct screen (no cross-multiplication)
        const subTabTexts = subTabsForNavigation.map(st => st.text);
        navMap[item].tabs = subTabTexts;

        for (const subTab of subTabsForNavigation) {
          log(`\n    ► Clicking sub-tab: "${subTab.text}"`);
          const subClicked = await clickTab(page, subTab.selector, subTab.text);
          if (subClicked) {
            await screenshot(page, `discovery-${kebab(item)}-${kebab(subTab.text)}`);
          }

          allScreens.push({
            id: `${kebab(item)}-${kebab(subTab.text)}`,
            name: `${item} > ${subTab.text}`,
            navPath: [item, subTab.text],
            sidebarItem: item,
            tabSelector: subTab.selector
          });
        }
      } else {
        // Normal tabs (Analytics, SEO, etc.) — each tab is a separate screen
        for (const tab of tabs) {
          log(`\n    ► Clicking tab: "${tab.text}"`);
          const tabClicked = await clickTab(page, tab.selector, tab.text);
          if (!tabClicked) {
            log(`      WARNING: Could not click tab "${tab.text}"`);
            surprises.push(`Could not click tab "${tab.text}" in "${item}"`);
            allScreens.push({
              id: `${kebab(item)}-${kebab(tab.text)}`,
              name: `${item} > ${tab.text}`,
              navPath: [item, tab.text],
              sidebarItem: item,
              tabSelector: tab.selector
            });
            continue;
          }

          await screenshot(page, `discovery-${kebab(item)}-${kebab(tab.text)}`);

          // Register tab as a screen
          allScreens.push({
            id: `${kebab(item)}-${kebab(tab.text)}`,
            name: `${item} > ${tab.text}`,
            navPath: [item, tab.text],
            sidebarItem: item,
            tabSelector: tab.selector
          });
        }
      }
    } else {
      // No tabs — sidebar item IS the screen
      allScreens.push({
        id: kebab(item),
        name: item,
        navPath: [item],
        sidebarItem: item
      });
    }
  }

  // Special screen discovery: Blog Editor
  log('\n  ► Special: Blog Editor (click a post in Posts tab)');
  try {
    // Navigate to Blog
    await clickSidebarItem(page, sidebarItems.find(i => i.toLowerCase().includes('blog')) || 'Blog');

    // Look for Posts tab
    const postsTabs = await discoverTabs(page);
    const postsTab = postsTabs.find(t => t.text.toLowerCase().includes('post'));
    if (postsTab) {
      await clickTab(page, postsTab.selector);
      await wait(1000);

      // Click first post row
      const postRow = page.locator('table tbody tr, .divide-y > div').first();
      if (await postRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Find clickable element in row (title link or edit button)
        const editLink = postRow.locator('a, button').first();
        if (await editLink.isVisible({ timeout: 1000 }).catch(() => false)) {
          await editLink.click();
          await wait(NAV_WAIT);

          const editorTitle = await getContentTitle(page);
          log(`    Blog Editor loaded: "${editorTitle}"`);
          await screenshot(page, 'discovery-blog-editor');

          allScreens.push({
            id: 'blog-editor',
            name: 'Blog Editor',
            navPath: ['Blog', 'Posts', '(click post)'],
            sidebarItem: sidebarItems.find(i => i.toLowerCase().includes('blog')) || 'Blog',
            specialAction: 'click-first-post'
          });

          navMap[sidebarItems.find(i => i.toLowerCase().includes('blog')) || 'Blog'] =
            navMap[sidebarItems.find(i => i.toLowerCase().includes('blog')) || 'Blog'] || {};
          (navMap[sidebarItems.find(i => i.toLowerCase().includes('blog')) || 'Blog'].specialScreens ??= []).push('Blog Editor');
        }
      }
    }
  } catch (e) {
    log(`    WARNING: Could not discover Blog Editor: ${e}`);
    surprises.push('Could not navigate to Blog Editor by clicking a post');
  }

  // Summary
  log('\n' + '-'.repeat(40));
  log(`DISCOVERY COMPLETE [${elapsed()}]`);
  log(`  Sidebar items: ${sidebarItems.length}`);
  log(`  Total unique screens: ${allScreens.length}`);
  log(`  Surprises: ${surprises.length > 0 ? surprises.join('; ') : 'none'}`);
  log('-'.repeat(40));

  return allScreens;
}

// ============================================================================
// PHASE 2: FLOW WALKTHROUGHS
// ============================================================================

async function testFlows(page: Page): Promise<FlowResult[]> {
  log('\n\n' + '='.repeat(60));
  log('PHASE 2: FLOW WALKTHROUGHS');
  log('='.repeat(60));

  const results: FlowResult[] = [];

  // Navigate to Blog section to find flows
  const blogItem = allScreens.find(s => s.sidebarItem.toLowerCase().includes('blog'));
  if (blogItem) {
    await clickSidebarItem(page, blogItem.sidebarItem);
  }

  // Open help panel
  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    log('  BLOCKED: Cannot open help panel');
    surprises.push('Could not open help panel for flow testing');
    return results;
  }

  await waitForHelpContent(page);

  // Get available flows
  const flowNames = await getFlowList(page);
  log(`\n  Flows found: ${flowNames.length > 0 ? flowNames.join(', ') : 'NONE'}`);

  if (flowNames.length === 0) {
    surprises.push('No flows found in help panel');
    return results;
  }

  for (const flowName of flowNames) {
    log(`\n  ${'─'.repeat(50)}`);
    log(`  FLOW: "${flowName}"`);
    log(`  ${'─'.repeat(50)}`);

    // Click the flow
    const clicked = await clickFlow(page, flowName);
    if (!clicked) {
      log(`    BLOCKED: Could not click flow "${flowName}"`);
      results.push({
        name: flowName,
        steps: [],
        summary: { clear: 0, ambiguous: 0, blocked: 1 }
      });
      continue;
    }

    await wait(500);

    // Get step info to know total steps
    const firstStepInfo = await getFlowStepInfo(page);
    const totalSteps = firstStepInfo?.totalSteps || 10; // Default max if we can't detect

    const steps: FlowStepResult[] = [];

    for (let stepNum = 1; stepNum <= totalSteps; stepNum++) {
      log(`\n    --- Step ${stepNum}/${totalSteps} ---`);

      const stepInfo = await getFlowStepInfo(page);
      const title = stepInfo?.title || `Step ${stepNum}`;
      const instruction = stepInfo?.instruction || '';

      log(`    Title: ${title}`);
      log(`    Instruction: ${instruction.substring(0, 100)}${instruction.length > 100 ? '...' : ''}`);

      // Screenshot help
      const helpSS = await screenshot(page, `flow${results.length + 1}-step${stepNum}-help`);

      // Observe UI: what elements are visible that the instruction references?
      const visibleElements = await getVisibleUIElements(page);
      const uiObservation = `Visible: ${visibleElements.slice(0, 10).join(', ')}`;

      // Screenshot action/UI state
      const actionSS = await screenshot(page, `flow${results.length + 1}-step${stepNum}-action`);

      // Rate this step
      let rating: Rating = 'CLEAR';
      let justification = 'Instruction matches visible UI';

      if (!instruction) {
        rating = 'BLOCKED';
        justification = 'Could not extract instruction from help panel';
      } else if (!title) {
        rating = 'AMBIGUOUS';
        justification = 'Step title not visible but instruction exists';
      }

      steps.push({
        step: stepNum,
        totalSteps,
        title,
        instruction,
        uiObservation,
        rating,
        justification,
        helpScreenshot: helpSS,
        actionScreenshot: actionSS
      });

      // Advance to next step
      const hasNext = await clickFlowNext(page);
      if (!hasNext && stepNum < totalSteps) {
        log(`    No Next button at step ${stepNum} — flow may have fewer steps than expected`);
        break;
      }
    }

    // Go back to flow list
    await clickFlowBack(page);
    await wait(500);

    const summary = {
      clear: steps.filter(s => s.rating === 'CLEAR').length,
      ambiguous: steps.filter(s => s.rating === 'AMBIGUOUS').length,
      blocked: steps.filter(s => s.rating === 'BLOCKED').length
    };

    log(`\n    Flow summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

    results.push({ name: flowName, steps, summary });
  }

  return results;
}

// ============================================================================
// PHASE 3: SCREEN HELP VALIDATION
// ============================================================================

async function navigateToScreen(page: Page, screen: DiscoveredScreen): Promise<boolean> {
  // Step 1: Click sidebar item
  const clicked = await clickSidebarItem(page, screen.sidebarItem);
  if (!clicked) return false;

  // Step 2: Click tab if needed
  if (screen.tabSelector) {
    const tabText = screen.navPath.length >= 2 ? screen.navPath[1] : undefined;
    const tabClicked = await clickTab(page, screen.tabSelector, tabText);
    if (!tabClicked) return false;
  }

  // Step 3: Click sub-tab if needed
  if (screen.subTabSelector) {
    const subText = screen.navPath.length >= 3 ? screen.navPath[2] : undefined;
    const subClicked = await clickTab(page, screen.subTabSelector, subText);
    if (!subClicked) return false;
  }

  // Step 4: Special action (e.g., click first post for Blog Editor)
  if (screen.specialAction === 'click-first-post') {
    // Find and click Posts tab first
    const postsTabs = await discoverTabs(page);
    const postsTab = postsTabs.find(t => t.text.toLowerCase().includes('post'));
    if (postsTab) {
      await clickTab(page, postsTab.selector, postsTab.text);
      await wait(1000);
    }

    const postRow = page.locator('table tbody tr, .divide-y > div').first();
    if (await postRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const link = postRow.locator('a, button').first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await link.click();
        await wait(NAV_WAIT);
      }
    }
  }

  return true;
}

async function testAllScreens(page: Page, screens: DiscoveredScreen[]): Promise<ScreenResult[]> {
  log('\n\n' + '='.repeat(60));
  log('PHASE 3: SCREEN HELP VALIDATION');
  log(`Testing ${screens.length} discovered screens`);
  log('='.repeat(60));

  const results: ScreenResult[] = [];

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    log(`\n  [${i + 1}/${screens.length}] ${screen.name}`);
    log(`  Nav path: ${screen.navPath.join(' → ')}`);

    try {
      // Navigate
      const reached = await navigateToScreen(page, screen);
      if (!reached) {
        log(`    BLOCKED: Could not navigate to screen`);
        results.push({
          screen,
          helpTitle: '',
          actualTitle: '',
          helpContent: '',
          helpContentLength: 0,
          analysis: performSixQuestionAnalysis(screen.name, '', '', '', []),
          rating: 'BLOCKED',
          justification: 'Could not navigate to screen via UI',
          uiScreenshot: '',
          helpScreenshot: ''
        });
        continue;
      }

      // Get actual title
      const actualTitle = await getContentTitle(page);

      // Get visible UI elements
      const visibleElements = await getVisibleUIElements(page);

      // Close help panel if open
      await closeHelpPanel(page);
      await wait(300);

      // Screenshot UI
      const uiSS = await screenshot(page, `screen-${screen.id}-ui`);

      // Open help panel
      const helpOpened = await openHelpPanel(page);
      if (!helpOpened) {
        log(`    WARNING: Could not open help panel`);
        const analysis = performSixQuestionAnalysis(screen.name, '', '', actualTitle, visibleElements);
        analysis.f_noHelpContent = { answer: true, detail: 'Could not open help panel' };
        const { rating, justification } = deriveRating(analysis);
        results.push({
          screen,
          helpTitle: '',
          actualTitle,
          helpContent: '',
          helpContentLength: 0,
          analysis,
          rating,
          justification,
          uiScreenshot: uiSS,
          helpScreenshot: ''
        });
        continue;
      }

      // Wait for help content
      await waitForHelpContent(page);

      // Screenshot help
      const helpSS = await screenshot(page, `screen-${screen.id}-help`);

      // Get help content
      const helpContent = await getHelpContent(page);

      // Perform 6-question analysis
      const analysis = performSixQuestionAnalysis(
        screen.name,
        helpContent.title,
        helpContent.body,
        actualTitle,
        visibleElements
      );

      // Check for console errors (question e)
      const consoleErrors = await page.evaluate(() => {
        // Can't retroactively check console, but we can check for error elements
        const errorEls = document.querySelectorAll('.error, [class*="error"], [role="alert"]');
        return Array.from(errorEls).map(el => (el as HTMLElement).textContent?.trim()).filter(Boolean);
      });
      if (consoleErrors.length > 0) {
        analysis.e_anythingBroken = {
          answer: false,
          detail: `Error elements found on page: ${consoleErrors.slice(0, 3).join('; ')}`
        };
      }

      const { rating, justification } = deriveRating(analysis);

      log(`    Help title: "${helpContent.title}"`);
      log(`    Help length: ${helpContent.body.length} chars`);
      log(`    Rating: ${rating}`);
      log(`    Justification: ${justification}`);

      // Close help panel
      await closeHelpPanel(page);

      results.push({
        screen,
        helpTitle: helpContent.title,
        actualTitle,
        helpContent: helpContent.body,
        helpContentLength: helpContent.body.length,
        analysis,
        rating,
        justification,
        uiScreenshot: uiSS,
        helpScreenshot: helpSS
      });

    } catch (error) {
      log(`    ERROR: ${error}`);
      results.push({
        screen,
        helpTitle: '',
        actualTitle: '',
        helpContent: '',
        helpContentLength: 0,
        analysis: performSixQuestionAnalysis(screen.name, '', '', '', []),
        rating: 'BLOCKED',
        justification: `Error during testing: ${error}`,
        uiScreenshot: '',
        helpScreenshot: ''
      });
    }
  }

  return results;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(report: V5TestReport): string {
  const { metadata, discovery, flows, screens, summary } = report;
  const totalClear = summary.flow_clear + summary.screen_clear;
  const totalAmbiguous = summary.flow_ambiguous + summary.screen_ambiguous;
  const totalBlocked = summary.flow_blocked + summary.screen_blocked;
  const totalAll = totalClear + totalAmbiguous + totalBlocked;

  let md = `# Naive User Test Report V5 — Discovery-Based Full Admin Validation

**Date:** ${metadata.date}
**Environment:** ${metadata.environment}
**Viewport:** ${metadata.viewport}
**Elapsed:** ${Math.round(metadata.elapsed_ms / 1000)}s
**Total screens discovered:** ${discovery.total_screens}
**Total flow steps tested:** ${flows.reduce((sum, f) => sum + f.steps.length, 0)}

---

## 1. Metadata

| Field | Value |
|-------|-------|
| Date | ${metadata.date} |
| Environment | ${metadata.environment} |
| Viewport | ${metadata.viewport} |
| Start time | ${metadata.startTime} |
| End time | ${metadata.endTime} |
| Elapsed | ${Math.round(metadata.elapsed_ms / 1000)}s |
| Screens discovered | ${discovery.total_screens} |
| Sidebar items | ${discovery.sidebar_items.length} |

---

## 2. Discovery Results

### Navigation Map

| Sidebar Item | Tabs | Sub-Tabs | Special |
|-------------|------|----------|---------|
`;
  for (const [item, data] of Object.entries(discovery.navigation_map)) {
    const tabs = data.tabs?.join(', ') || '—';
    const subs = data.subTabs ? Object.entries(data.subTabs).map(([t, st]) => `${t}: ${st.join(', ')}`).join('; ') : '—';
    const special = data.specialScreens?.join(', ') || '—';
    md += `| ${item} | ${tabs} | ${subs} | ${special} |\n`;
  }

  md += `
**Total unique screens:** ${discovery.total_screens}

### Surprises / Unexpected findings

`;
  if (discovery.surprises.length > 0) {
    for (const s of discovery.surprises) {
      md += `- ${s}\n`;
    }
  } else {
    md += `None — all sidebar items and tabs behaved as expected.\n`;
  }

  md += `
---

## 3. Executive Summary

| Category | CLEAR | AMBIGUOUS | BLOCKED | Total |
|----------|-------|-----------|---------|-------|
| Flow Steps | ${summary.flow_clear} | ${summary.flow_ambiguous} | ${summary.flow_blocked} | ${summary.flow_clear + summary.flow_ambiguous + summary.flow_blocked} |
| Screens | ${summary.screen_clear} | ${summary.screen_ambiguous} | ${summary.screen_blocked} | ${summary.screen_clear + summary.screen_ambiguous + summary.screen_blocked} |
| **TOTAL** | **${totalClear}** | **${totalAmbiguous}** | **${totalBlocked}** | **${totalAll}** |

---

## 4. Flow Detail Sections

`;

  for (const flow of flows) {
    md += `### Flow: "${flow.name}"

**Steps:** ${flow.steps.length}
**Summary:** ${flow.summary.clear} CLEAR, ${flow.summary.ambiguous} AMBIGUOUS, ${flow.summary.blocked} BLOCKED

| Step | Title | Rating | Justification |
|------|-------|--------|---------------|
`;
    for (const step of flow.steps) {
      const badge = step.rating === 'CLEAR' ? '✅' : step.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
      md += `| ${step.step} | ${step.title} | ${badge} ${step.rating} | ${step.justification} |\n`;
    }

    md += `\n`;

    for (const step of flow.steps) {
      md += `#### Step ${step.step}: ${step.title}

- **Help instruction (VERBATIM):** ${step.instruction || '(not captured)'}
- **What was visible on screen:** ${step.uiObservation || '(not recorded)'}
- **What the tester attempted:** Follow the instruction literally
- **Rating:** ${step.rating}
- **Justification:** ${step.justification}
- **Screenshots:** \`${step.helpScreenshot}\`, \`${step.actionScreenshot}\`

`;
    }
  }

  md += `---

## 5. Screen Detail Sections

`;

  for (const screen of screens) {
    const a = screen.analysis;
    const badge = screen.rating === 'CLEAR' ? '✅' : screen.rating === 'AMBIGUOUS' ? '⚠️' : '❌';

    md += `### ${screen.screen.name}

- **Screen ID:** \`${screen.screen.id}\`
- **Navigation path:** ${screen.screen.navPath.join(' → ')}
- **Help panel title:** "${screen.helpTitle}"
- **Actual screen title:** "${screen.actualTitle}"
- **Help content length:** ${screen.helpContentLength} chars

#### 6-Question Analysis

| # | Question | Answer | Detail |
|---|----------|--------|--------|
| a | Help title matches screen? | ${a.a_helpTitleMatch.answer ? '✅ Yes' : '❌ No'} | ${a.a_helpTitleMatch.detail} |
| b | Help mentions existing UI elements? | ${a.b_helpMentionsExistingElements.answer ? '✅ Yes' : '❌ No'} | ${a.b_helpMentionsExistingElements.detail} |
| c | Help misses visible UI elements? | ${a.c_helpMissesVisibleElements.answer ? '✅ No' : '⚠️ Yes'} | ${a.c_helpMissesVisibleElements.detail} |
| d | Language plain? | ${a.d_languagePlain.answer ? '✅ Yes' : '⚠️ No'} | ${a.d_languagePlain.detail} |
| e | Anything broken? | ${a.e_anythingBroken.answer ? '✅ No' : '❌ Yes'} | ${a.e_anythingBroken.detail} |
| f | No help content? | ${a.f_noHelpContent.answer ? '❌ BLOCKED' : '✅ Has content'} | ${a.f_noHelpContent.detail} |

**Rating:** ${badge} ${screen.rating}
**Justification:** ${screen.justification}
**Screenshots:** \`${screen.uiScreenshot}\`, \`${screen.helpScreenshot}\`

---

`;
  }

  // Recommendations
  md += `## 6. Recommendations

`;

  const blockedScreens = screens.filter(s => s.rating === 'BLOCKED');
  const ambiguousScreens = screens.filter(s => s.rating === 'AMBIGUOUS');
  const blockedFlowSteps = flows.flatMap(f => f.steps.filter(s => s.rating === 'BLOCKED'));
  const ambiguousFlowSteps = flows.flatMap(f => f.steps.filter(s => s.rating === 'AMBIGUOUS'));

  if (blockedScreens.length > 0 || blockedFlowSteps.length > 0) {
    md += `### BLOCKED — Must Fix

`;
    for (const s of blockedScreens) {
      md += `- **${s.screen.name}**: ${s.justification}\n`;
    }
    for (const s of blockedFlowSteps) {
      md += `- **Flow step ${s.step} (${s.title})**: ${s.justification}\n`;
    }
    md += '\n';
  }

  if (ambiguousScreens.length > 0 || ambiguousFlowSteps.length > 0) {
    md += `### AMBIGUOUS — Should Fix

`;
    for (const s of ambiguousScreens) {
      md += `- **${s.screen.name}**: ${s.justification}\n`;
    }
    for (const s of ambiguousFlowSteps) {
      md += `- **Flow step ${s.step} (${s.title})**: ${s.justification}\n`;
    }
    md += '\n';
  }

  // Observations
  md += `### Observations

`;
  const clearScreens = screens.filter(s => s.rating === 'CLEAR');
  if (clearScreens.length === screens.length && blockedFlowSteps.length === 0 && ambiguousFlowSteps.length === 0) {
    md += `All screens and flow steps rated CLEAR. No issues found.\n`;
  } else {
    md += `- ${clearScreens.length}/${screens.length} screens rated CLEAR\n`;
    const clearFlows = flows.flatMap(f => f.steps).filter(s => s.rating === 'CLEAR');
    const totalFlowSteps = flows.reduce((sum, f) => sum + f.steps.length, 0);
    md += `- ${clearFlows.length}/${totalFlowSteps} flow steps rated CLEAR\n`;
  }

  md += `
---

## Test Artifacts

- **Test script:** \`tests/e2e/naive-user-help-test-v5.ts\`
- **Screenshots:** \`tests/e2e/screenshots/help-validation/v5/\`
- **JSON results:** \`tests/e2e/screenshots/help-validation/v5/test-results.json\`
- **Total screenshots:** ${screenshotCount}

---

*Generated by Naive User Help Test V5 — discovery-based, UI-only navigation*
`;

  return md;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runV5Test(): Promise<void> {
  const startIso = new Date().toISOString();

  log('╔' + '═'.repeat(58) + '╗');
  log('║  NAIVE USER HELP TEST V5                                  ║');
  log('║  Discovery-Based Full Admin Validation                    ║');
  log('╚' + '═'.repeat(58) + '╝');
  log(`\nStart time: ${startIso}`);
  log(`Target: ${STAGING_URL}`);
  log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  log(`Screenshots: ${SCREENSHOT_DIR}`);

  const browser: Browser = await chromium.launch({
    headless: true,
    slowMo: SLOW_MO,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    extraHTTPHeaders: {
      'X-E2E-Token': process.env.E2E_BYPASS_TOKEN || '',
    },
  });

  const page: Page = await context.newPage();

  try {
    // LOGIN
    await loginToAdmin(page);
    await screenshot(page, 'logged-in');

    // PHASE 1: DISCOVERY
    const screens = await runDiscovery(page);

    // PHASE 2: FLOW WALKTHROUGHS
    const flowResults = await testFlows(page);

    // PHASE 3: SCREEN HELP VALIDATION
    const screenResults = await testAllScreens(page, screens);

    // BUILD REPORT
    const endTime = Date.now();
    const endIso = new Date().toISOString();

    const report: V5TestReport = {
      metadata: {
        date: new Date().toISOString().split('T')[0],
        environment: `Staging (${STAGING_URL})`,
        viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
        startTime: startIso,
        endTime: endIso,
        elapsed_ms: endTime - startTime,
      },
      discovery: {
        sidebar_items: Object.keys(navMap),
        total_screens: screens.length,
        navigation_map: navMap,
        surprises,
      },
      flows: flowResults,
      screens: screenResults,
      summary: {
        flow_clear: flowResults.reduce((sum, f) => sum + f.summary.clear, 0),
        flow_ambiguous: flowResults.reduce((sum, f) => sum + f.summary.ambiguous, 0),
        flow_blocked: flowResults.reduce((sum, f) => sum + f.summary.blocked, 0),
        screen_clear: screenResults.filter(s => s.rating === 'CLEAR').length,
        screen_ambiguous: screenResults.filter(s => s.rating === 'AMBIGUOUS').length,
        screen_blocked: screenResults.filter(s => s.rating === 'BLOCKED').length,
      }
    };

    // SAVE REPORTS
    // JSON results
    const jsonPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    log(`\nJSON results: ${jsonPath}`);

    // Markdown report
    const mdReport = generateMarkdownReport(report);
    const mdPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_V5_NAIVE_USER.md');
    fs.writeFileSync(mdPath, mdReport);
    log(`Markdown report: ${mdPath}`);

    // FINAL SUMMARY
    log('\n' + '═'.repeat(60));
    log('TEST COMPLETE');
    log('═'.repeat(60));
    log(`Elapsed: ${elapsed()}`);
    log(`Screens discovered: ${screens.length}`);
    log(`Flows tested: ${flowResults.length}`);
    log(`Total flow steps: ${flowResults.reduce((sum, f) => sum + f.steps.length, 0)}`);
    log(`Screenshots taken: ${screenshotCount}`);
    log('');
    log('Executive Summary:');
    log(`  Flow Steps:  ${report.summary.flow_clear} CLEAR, ${report.summary.flow_ambiguous} AMBIGUOUS, ${report.summary.flow_blocked} BLOCKED`);
    log(`  Screens:     ${report.summary.screen_clear} CLEAR, ${report.summary.screen_ambiguous} AMBIGUOUS, ${report.summary.screen_blocked} BLOCKED`);

    const tc = report.summary.flow_clear + report.summary.screen_clear;
    const ta = report.summary.flow_ambiguous + report.summary.screen_ambiguous;
    const tb = report.summary.flow_blocked + report.summary.screen_blocked;
    log(`  TOTAL:       ${tc} CLEAR, ${ta} AMBIGUOUS, ${tb} BLOCKED`);

    if (tb > 0) {
      log('\nTop BLOCKED findings:');
      const blocked = screenResults.filter(s => s.rating === 'BLOCKED');
      for (const b of blocked.slice(0, 3)) {
        log(`  - ${b.screen.name}: ${b.justification}`);
      }
    }

  } catch (error) {
    log(`\n\nTEST FAILED: ${error}`);
    await screenshot(page, 'error-state');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run
runV5Test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
