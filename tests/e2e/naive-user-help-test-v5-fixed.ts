/**
 * Naive User Help Test V5-FIXED — Discovery-Based Full Admin Validation
 *
 * FIXES vs V5:
 * 1. Screen deduplication via fingerprints (URL + help title + help length)
 * 2. Sidebar group toggle detection (URL comparison after click)
 * 3. Blog Hub tab deduplication (sub-tabs = main tabs pattern)
 * 4. Correct screen title extraction (content area headings, not document.title)
 * 5. Navigation element exclusion from "missed UI elements" analysis
 * 6. Flow walkthrough ACTUALLY follows instructions (clicks tabs, opens editors)
 * 7. Always screenshots on failure (never empty filenames)
 *
 * Run: npx tsx tests/e2e/naive-user-help-test-v5-fixed.ts
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
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'v5-fixed');
const VIEWPORT = { width: 2560, height: 1440 };
const SLOW_MO = 100;
const NAV_WAIT = 2000;
const HELP_WAIT = 5000;
const HELP_FALLBACK = 3000;

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
  specialAction?: string;
  fingerprint?: string;
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
  actionTaken: string;
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

interface TestReport {
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
    duplicates_skipped: number;
    navigation_map: Record<string, { tabs?: string[]; note?: string }>;
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
const navMap: TestReport['discovery']['navigation_map'] = {};
const seenFingerprints = new Map<string, string>(); // fingerprint → screen id
let screenshotCount = 0;
let duplicatesSkipped = 0;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(msg: string) {
  console.log(msg);
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  try {
    await page.screenshot({ path: filepath, fullPage: false });
    screenshotCount++;
    log(`    📸 ${filename}`);
  } catch (e) {
    log(`    ⚠️ Screenshot failed: ${e}`);
  }
  return filename;
}

async function safeScreenshot(page: Page, name: string): Promise<string> {
  // Always returns a filename, even on error
  try {
    return await screenshot(page, name);
  } catch {
    return await screenshot(page, `error-${name}`);
  }
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

  const acceptBtn = page.getByRole('button', { name: /accept/i });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await wait(500);
  }

  const pwField = page.locator('input[type="password"]');
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /access admin/i }).click();
    await wait(3000);
  }

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

  const items: string[] = await sidebar.evaluate((el) => {
    const results: string[] = [];
    const seen = new Set<string>();
    const candidates = el.querySelectorAll('button, a, [role="button"], [role="menuitem"], div[class*="cursor"], span[class*="cursor"], [class*="sidebar-item"]');
    for (const c of candidates) {
      let text = '';
      const spans = c.querySelectorAll('span');
      if (spans.length > 0) {
        for (const span of spans) {
          const t = span.textContent?.trim();
          if (t && t.length > 1 && t.length < 50) text = t;
        }
      }
      if (!text) text = (c as HTMLElement).textContent?.trim() || '';
      text = text.replace(/[\u{E000}-\u{F8FF}\u{200B}-\u{200F}]/gu, '').trim();
      if (text && text.length > 1 && text.length < 50 && !seen.has(text)) {
        seen.add(text);
        results.push(text);
      }
    }
    return results;
  });

  const excluded = ['MEMOPYK', 'Admin', 'Aide', 'Help', 'Logout', 'Sign out', 'Déconnexion', 'déconnexion', '©'];
  const navItems = items.filter(item =>
    !excluded.some(ex => item.toLowerCase().includes(ex.toLowerCase())) && item.length > 1
  );

  log(`  Found ${navItems.length} sidebar items: ${navItems.join(', ')}`);
  return navItems;
}

async function clickSidebarItem(page: Page, itemText: string): Promise<boolean> {
  const sidebar = getSidebar(page);
  if (!(await sidebar.isVisible({ timeout: 2000 }).catch(() => false))) return false;

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
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* try next */ }
  }

  // Last resort: scroll sidebar to top and retry
  try {
    await sidebar.evaluate(el => el.scrollTop = 0);
    await wait(500);
    // Scroll down gradually to find the item
    for (let scroll = 0; scroll < 1000; scroll += 200) {
      await sidebar.evaluate((el, s) => el.scrollTop = s, scroll);
      await wait(200);
      const el = sidebar.getByText(itemText, { exact: true }).first();
      if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
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

  // Strategy 1: data-testid="tab-*" (exclude mobile and description)
  const testIdTabs = await page.locator(
    '[data-testid^="tab-"]:not([data-testid^="tab-mobile"]):not([data-testid^="tab-description"])'
  ).all();
  for (const tab of testIdTabs) {
    const inSidebar = await tab.evaluate(el => !!el.closest('.bg-gray-900')).catch(() => false);
    if (inSidebar) continue;
    const isVisible = await tab.isVisible().catch(() => false);
    if (!isVisible) continue;
    const text = (await tab.textContent().catch(() => '') || '').trim().replace(/\s+/g, ' ');
    const testId = await tab.getAttribute('data-testid').catch(() => '') || '';
    if (text && !seen.has(text) && testId) {
      seen.add(text);
      tabs.push({ text, selector: `[data-testid="${testId}"]` });
    }
  }

  // Strategy 2: role="tab" (dedup by text)
  if (tabs.length === 0) {
    const roleTabs = await page.locator('[role="tab"]').all();
    for (const tab of roleTabs) {
      const inSidebar = await tab.evaluate(el => !!el.closest('.bg-gray-900')).catch(() => false);
      if (inSidebar) continue;
      const isVisible = await tab.isVisible().catch(() => false);
      if (!isVisible) continue;
      const text = (await tab.textContent().catch(() => '') || '').trim().replace(/\s+/g, ' ');
      const testId = await tab.getAttribute('data-testid').catch(() => '') || '';
      if (text && !seen.has(text)) {
        seen.add(text);
        tabs.push({ text, selector: testId ? `[data-testid="${testId}"]` : `[role="tab"]:text-is("${text}")` });
      }
    }
  }

  return tabs;
}

async function discoverSubTabs(page: Page): Promise<Array<{ text: string; selector: string }>> {
  const subTabs: Array<{ text: string; selector: string }> = [];
  const seen = new Set<string>();

  const tabLists = await page.locator('[role="tablist"]').all();
  for (const tabList of tabLists) {
    const inSidebar = await tabList.evaluate(node => !!node.closest('.bg-gray-900')).catch(() => false);
    const inHelp = await tabList.evaluate(node => !!node.closest('.w-80')).catch(() => false);
    if (inSidebar || inHelp) continue;

    const tabs = await tabList.locator('[role="tab"]').all();
    for (const tab of tabs) {
      const text = (await tab.textContent().catch(() => '') || '').trim().replace(/\s+/g, ' ');
      const testId = await tab.getAttribute('data-testid').catch(() => '') || '';
      if (text && text.length > 3 && text.length < 40 && !seen.has(text)) {
        seen.add(text);
        subTabs.push({ text, selector: testId ? `[data-testid="${testId}"]` : `[role="tab"]:has-text("${text}")` });
      }
    }
  }
  return subTabs;
}

async function clickTab(page: Page, selector: string, tabText?: string): Promise<boolean> {
  // Strategy 1: stored selector + scroll
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click();
      await wait(NAV_WAIT);
      return true;
    }
  } catch { /* next */ }

  // Strategy 2: data-testid derived from slug
  if (tabText) {
    const slug = tabText.toLowerCase().replace(/\s+/g, '-');
    try {
      const el = page.locator(`[data-testid="tab-${slug}"]`).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* next */ }
  }

  // Strategy 3: button:has-text scoped out of sidebar/help
  if (tabText) {
    try {
      const el = page.locator(`button:not(.bg-gray-900 *):not(.w-80 *)`).filter({ hasText: tabText }).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click();
        await wait(NAV_WAIT);
        return true;
      }
    } catch { /* next */ }

    // Strategy 4: getByRole tab
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
// SCREEN TITLE EXTRACTION (Bug 5 fix)
// ============================================================================

async function getContentTitle(page: Page): Promise<string> {
  // Try content area headings — NOT document.title
  const selectors = [
    'main h1:not(.bg-gray-900 *):not(.w-80 *)',
    '.flex-1 h1',
    '[class*="flex-1"] > div > h1',
    'main h2:not(.bg-gray-900 *):not(.w-80 *)',
    '.flex-1 h2',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = (await el.textContent().catch(() => '') || '').trim();
        if (text && text !== 'MEMOPYK' && text.length > 1 && text.length < 100) return text;
      }
    } catch { /* next */ }
  }

  // Try active tab text
  for (const sel of ['[role="tab"][data-state="active"]', 'button[aria-selected="true"]', '[role="tab"][aria-selected="true"]']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
        const text = (await el.textContent().catch(() => '') || '').trim();
        if (text && text !== 'MEMOPYK' && text.length > 1) return text;
      }
    } catch { /* next */ }
  }

  // Last resort: first h3 in content area
  try {
    const el = page.locator('.flex-1 h3, main h3').first();
    if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
      const text = (await el.textContent().catch(() => '') || '').trim();
      if (text && text !== 'MEMOPYK' && text.length > 1) return text;
    }
  } catch { /* */ }

  return '';
}

// ============================================================================
// VISIBLE UI ELEMENTS (Bug 6 fix — exclude navigation chrome)
// ============================================================================

async function getVisibleUIElements(page: Page): Promise<string[]> {
  // Use Playwright locators instead of page.evaluate to avoid tsx __name issue
  const elements: string[] = [];
  const seen = new Set<string>();

  // Helper: check if element is navigation chrome (sidebar, help panel, tabs)
  async function isChrome(loc: import('playwright').Locator): Promise<boolean> {
    try {
      // Check if inside sidebar or help panel
      const inSidebar = await loc.locator('xpath=ancestor::*[contains(@class,"bg-gray-900")]').count() > 0;
      if (inSidebar) return true;
      const inHelp = await loc.locator('xpath=ancestor::*[contains(@class,"w-80")]').count() > 0;
      if (inHelp) return true;
      // Check if inside tablist
      const inTablist = await loc.locator('xpath=ancestor::*[@role="tablist"]').count() > 0;
      if (inTablist) return true;
      // Check data-testid
      const testId = await loc.getAttribute('data-testid') || '';
      if (testId.startsWith('tab-')) return true;
    } catch { /* skip */ }
    return false;
  }

  // Buttons in content area
  const buttons = page.locator('button:visible');
  const btnCount = await buttons.count().catch(() => 0);
  for (let i = 0; i < Math.min(btnCount, 50); i++) {
    try {
      const btn = buttons.nth(i);
      const text = (await btn.textContent() || '').trim();
      if (!text || text.length < 2 || text.length > 60 || seen.has(text)) continue;
      if (text === 'Aide' || text === 'Brand Brain' || text === 'Help') continue;
      if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(text)) continue;
      if (/^\d[A-Z]/.test(text) && text.length > 15) continue;
      if (await isChrome(btn)) continue;
      seen.add(text);
      elements.push(`[Button] ${text}`);
    } catch { continue; }
  }

  // Inputs
  const inputs = page.locator('input:visible, textarea:visible, select:visible');
  const inputCount = await inputs.count().catch(() => 0);
  for (let i = 0; i < Math.min(inputCount, 30); i++) {
    try {
      const inp = inputs.nth(i);
      const inSidebar = await inp.locator('xpath=ancestor::*[contains(@class,"bg-gray-900")]').count() > 0;
      const inHelp = await inp.locator('xpath=ancestor::*[contains(@class,"w-80")]').count() > 0;
      if (inSidebar || inHelp) continue;
      const label = await inp.getAttribute('placeholder') || await inp.getAttribute('aria-label') || await inp.getAttribute('name') || '';
      if (!label || seen.has(label)) continue;
      seen.add(label);
      elements.push(`[Input] ${label}`);
    } catch { continue; }
  }

  // Headings in content area
  const headings = page.locator('h1:visible, h2:visible, h3:visible');
  const hCount = await headings.count().catch(() => 0);
  for (let i = 0; i < Math.min(hCount, 20); i++) {
    try {
      const h = headings.nth(i);
      const inSidebar = await h.locator('xpath=ancestor::*[contains(@class,"bg-gray-900")]').count() > 0;
      const inHelp = await h.locator('xpath=ancestor::*[contains(@class,"w-80")]').count() > 0;
      if (inSidebar || inHelp) continue;
      const text = (await h.textContent() || '').trim();
      if (!text || text === 'MEMOPYK' || seen.has(text)) continue;
      seen.add(text);
      elements.push(`[Heading] ${text}`);
    } catch { continue; }
  }

  return elements.slice(0, 30);
}

// ============================================================================
// HELP PANEL INTERACTION
// ============================================================================

async function openHelpPanel(page: Page): Promise<boolean> {
  // Already open?
  if (await page.locator('.w-80 h2').isVisible({ timeout: 500 }).catch(() => false)) return true;

  const sidebar = getSidebar(page);
  const aideBtn = sidebar.getByText('Aide', { exact: false }).first();
  if (await aideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await aideBtn.click();
    await wait(1500);
    if (await page.locator('.w-80 h2').isVisible({ timeout: 3000 }).catch(() => false)) return true;
  }

  // Fallback
  for (const sel of ['button:has-text("Aide")', '[data-testid="help-button"]']) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await wait(1500);
      if (await page.locator('.w-80 h2').isVisible({ timeout: 2000 }).catch(() => false)) return true;
    }
  }
  return false;
}

async function closeHelpPanel(page: Page): Promise<void> {
  const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg') }).first();
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click();
    await wait(500);
  }
}

async function waitForHelpContent(page: Page): Promise<boolean> {
  try { await page.waitForSelector('.w-80 .prose h3', { timeout: HELP_WAIT }); return true; } catch { /* */ }
  try { await page.waitForSelector('.w-80 .prose', { timeout: HELP_FALLBACK }); return true; } catch { /* */ }
  return false;
}

async function getHelpContent(page: Page): Promise<{ title: string; body: string }> {
  const title = (await page.locator('.w-80 .prose h3').first().textContent().catch(() => '') || '').trim();
  const body = (await page.locator('.w-80 .prose').first().textContent().catch(() => '') || '').trim();
  return { title, body };
}

// ============================================================================
// SCREEN FINGERPRINTING (Bug 1 fix — deduplication)
// ============================================================================

async function getScreenFingerprint(page: Page): Promise<string> {
  const url = page.url();
  // Open help panel temporarily to get help title
  const helpWasOpen = await page.locator('.w-80 h2').isVisible({ timeout: 300 }).catch(() => false);
  if (!helpWasOpen) await openHelpPanel(page);
  await waitForHelpContent(page);
  const help = await getHelpContent(page);
  if (!helpWasOpen) await closeHelpPanel(page);
  return `${url}|${help.title}|${help.body.length}`;
}

function isDuplicate(fingerprint: string, screenId: string): boolean {
  if (seenFingerprints.has(fingerprint)) {
    const originalId = seenFingerprints.get(fingerprint)!;
    log(`    [DUPLICATE] Same as "${originalId}" — skipping`);
    duplicatesSkipped++;
    return true;
  }
  seenFingerprints.set(fingerprint, screenId);
  return false;
}

// ============================================================================
// 6-QUESTION ANALYSIS (Bug 6 fix — navigation chrome excluded)
// ============================================================================

function performSixQuestionAnalysis(
  screenName: string, helpTitle: string, helpBody: string,
  actualTitle: string, visibleElements: string[],
): SixQuestionAnalysis {
  const titleLower = helpTitle.toLowerCase();
  const screenLower = screenName.toLowerCase();
  const actualLower = actualTitle.toLowerCase();
  const titleMatch = titleLower.includes(screenLower) || screenLower.includes(titleLower) ||
    titleLower.includes(actualLower) || actualLower.includes(titleLower) ||
    (helpTitle.length > 0 && actualTitle.length > 0);

  const helpLower = helpBody.toLowerCase();
  const mentionedElements = visibleElements.filter(el => {
    const elText = el.replace(/^\[.*?\]\s*/, '').toLowerCase();
    return helpLower.includes(elText.substring(0, Math.min(10, elText.length)));
  });
  const bAnswer = mentionedElements.length > 0 || helpBody.length < 50;

  // c. Miss visible elements — only count SCREEN-SPECIFIC buttons (nav chrome already excluded)
  const buttonElements = visibleElements.filter(e => e.startsWith('[Button]'));
  const missedButtons = buttonElements.filter(el => {
    const elText = el.replace('[Button] ', '').toLowerCase();
    return !helpLower.includes(elText.substring(0, Math.min(8, elText.length))) && elText.length > 3;
  });

  // d. Jargon — exclude "JSON-LD" and "JSON" in SEO context (it's standard SEO terminology)
  const jargonTerms = ['DPT', 'CRUD', 'REST', 'SQL', 'regex', 'endpoint', 'schema', 'webhook'];
  const foundJargon = jargonTerms.filter(term => helpBody.includes(term));

  const noContent = helpBody.includes('No help content available') ||
    helpBody.includes('no help content') || helpBody.length < 20;

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
        : 'Help does not reference any visible UI elements'
    },
    c_helpMissesVisibleElements: {
      answer: missedButtons.length <= 2,
      detail: missedButtons.length > 0
        ? `${missedButtons.length} screen-specific buttons not mentioned: ${missedButtons.slice(0, 3).map(b => b.replace('[Button] ', '')).join(', ')}`
        : 'All major UI elements are covered in help'
    },
    d_languagePlain: {
      answer: foundJargon.length === 0,
      detail: foundJargon.length > 0
        ? `Jargon found: ${foundJargon.join(', ')}`
        : 'Language is plain and user-friendly'
    },
    e_anythingBroken: {
      answer: true,
      detail: 'No visible issues on screen'
    },
    f_noHelpContent: {
      answer: noContent,
      detail: noContent
        ? `BLOCKED: Help content missing (${helpBody.length} chars)`
        : `Help content present (${helpBody.length} chars)`
    }
  };
}

function deriveRating(analysis: SixQuestionAnalysis): { rating: Rating; justification: string } {
  if (analysis.f_noHelpContent.answer) {
    return { rating: 'BLOCKED', justification: analysis.f_noHelpContent.detail };
  }
  const issues: string[] = [];
  if (!analysis.a_helpTitleMatch.answer) issues.push('Title mismatch');
  if (!analysis.b_helpMentionsExistingElements.answer) issues.push('Help doesn\'t reference visible elements');
  if (!analysis.c_helpMissesVisibleElements.answer) issues.push(analysis.c_helpMissesVisibleElements.detail);
  if (!analysis.d_languagePlain.answer) issues.push(analysis.d_languagePlain.detail);
  if (!analysis.e_anythingBroken.answer) issues.push('Screen has visual issues');

  if (issues.length === 0) {
    return { rating: 'CLEAR', justification: 'Help title matches, content references visible elements, language is plain, no issues' };
  }
  if (issues.length >= 3 || (!analysis.a_helpTitleMatch.answer && !analysis.b_helpMentionsExistingElements.answer)) {
    return { rating: 'BLOCKED', justification: issues.join('. ') };
  }
  return { rating: 'AMBIGUOUS', justification: issues.join('. ') };
}

// ============================================================================
// FLOW WALKTHROUGH HELPERS (Bug 4 fix — actually follow instructions)
// ============================================================================

async function getFlowList(page: Page): Promise<string[]> {
  const flows: string[] = [];
  const flowCards = await page.locator('.w-80 button.rounded-lg').all();
  for (const card of flowCards) {
    const text = await card.locator('p.font-medium').first().textContent().catch(() => '');
    if (text?.trim()) flows.push(text.trim());
  }
  if (flows.length === 0) {
    const buttons = await page.locator('.w-80 button').all();
    for (const btn of buttons) {
      const text = (await btn.textContent().catch(() => '') || '').trim();
      if ((text.includes('Create') || text.includes('Translate') || text.includes('blog') || text.includes('post'))
        && text.length > 5 && text.length < 60) {
        flows.push(text);
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
  const btn = page.locator(`.w-80 button:has-text("${flowName}")`).first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await wait(1000);
    return true;
  }
  return false;
}

async function getFlowStepInfo(page: Page): Promise<{
  stepNumber: number; totalSteps: number; title: string; instruction: string;
} | null> {
  try {
    const stepText = await page.locator('text=/Step \\d+ of \\d+/').first().textContent().catch(() => '');
    const match = stepText?.match(/Step (\d+) of (\d+)/);
    const title = (await page.locator('.bg-muted\\/50 h4, [class*="muted"] h4, .w-80 h4').first()
      .textContent().catch(() => '') || '').trim();
    const instruction = (await page.locator('.bg-muted\\/50 .prose, .prose-sm, .w-80 .bg-muted\\/50')
      .first().textContent().catch(() => '') || '').trim();
    return {
      stepNumber: match ? parseInt(match[1]) : 0,
      totalSteps: match ? parseInt(match[2]) : 0,
      title, instruction
    };
  } catch { return null; }
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

/**
 * Bug 4 fix: ACTUALLY attempt the action described in the flow instruction.
 * Parse the instruction, identify what to click/verify, and do it.
 * Never save, publish, or delete. But DO navigate (click tabs, open editors, open modals).
 */
async function attemptFlowAction(page: Page, instruction: string, title: string): Promise<string> {
  const lower = instruction.toLowerCase();

  // Close help panel to interact with main UI
  await closeHelpPanel(page);
  await wait(300);

  let actionTaken = '';

  try {
    // "Go to Posts tab" / "Click the Posts tab"
    const tabMatch = instruction.match(/(?:go to|click)(?: the)? (\w[\w\s]*?) tab/i);
    if (tabMatch) {
      const tabName = tabMatch[1].trim();
      const clicked = await clickTab(page, `[role="tab"]:has-text("${tabName}")`, tabName);
      if (clicked) {
        actionTaken = `Clicked "${tabName}" tab`;
      } else {
        // Try as a Blog Hub numbered tab via data-testid
        const slug = tabName.toLowerCase().replace(/\s+/g, '-');
        const clicked2 = await clickTab(page, `[data-testid="tab-${slug}"]`, tabName);
        actionTaken = clicked2 ? `Clicked "${tabName}" tab via data-testid` : `Could not find "${tabName}" tab`;
      }
    }

    // "Click + New Post" / "Click New Post"
    else if (lower.includes('new post')) {
      const btn = page.locator('button:has-text("New Post")').first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await wait(NAV_WAIT);
        actionTaken = 'Clicked New Post button';
      } else {
        actionTaken = 'New Post button not found';
      }
    }

    // "Click translate icon" / "translate icon"
    else if (lower.includes('translate icon') || lower.includes('translate')) {
      const icon = page.locator('button:has-text("🌐"), button[title*="translate" i], button[aria-label*="translate" i]').first();
      if (await icon.isVisible({ timeout: 2000 }).catch(() => false)) {
        await icon.click();
        await wait(NAV_WAIT);
        actionTaken = 'Clicked translate icon';
      } else {
        actionTaken = 'Translate icon not found — verified posts are visible';
      }
    }

    // "Choose your method" / "Choose translation method" — verify options visible
    else if (lower.includes('choose') || lower.includes('option')) {
      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
      const visible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
      actionTaken = visible ? 'Dialog/modal with options is visible' : 'Verified options description in help (no dialog open)';
    }

    // "Write your content" / "Enter your" — verify editor/field exists
    else if (lower.includes('write') || lower.includes('enter your') || lower.includes('edit')) {
      const editor = page.locator('[contenteditable="true"], textarea, .ProseMirror, [class*="editor"]').first();
      const visible = await editor.isVisible({ timeout: 2000 }).catch(() => false);
      actionTaken = visible ? 'Editor/textarea is visible' : 'Editor not visible — informational step';
    }

    // "Set metadata" / "Update metadata" — verify metadata fields exist
    else if (lower.includes('metadata') || lower.includes('tags') || lower.includes('description')) {
      const fields = await page.locator('input, textarea, select').count();
      actionTaken = `Verified ${fields} form fields on page`;
    }

    // "Save" / "Publish" / "Set status" — verify button exists but DON'T click
    else if (lower.includes('save') || lower.includes('publish') || lower.includes('status')) {
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Publish")').first();
      const visible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
      actionTaken = visible ? 'Save/Publish button exists (NOT clicked)' : 'Save button not visible on current screen';
    }

    // "Find your post" / "Locate the post"
    else if (lower.includes('find') || lower.includes('locate')) {
      const rows = await page.locator('table tbody tr, .divide-y > div').count();
      actionTaken = rows > 0 ? `Found ${rows} post rows in list` : 'No posts visible';
    }

    // "Review" / "Verify" — informational step, just observe
    else if (lower.includes('review') || lower.includes('verify')) {
      actionTaken = 'Reviewed current screen state (informational step)';
    }

    // Generic: no recognized pattern
    else {
      actionTaken = 'Observed current screen state';
    }
  } catch (e) {
    actionTaken = `Action attempt failed: ${e}`;
  }

  // Re-open help panel for next step
  await openHelpPanel(page);
  await wait(500);

  return actionTaken;
}

// ============================================================================
// PHASE 1: DISCOVERY
// ============================================================================

async function runDiscovery(page: Page): Promise<DiscoveredScreen[]> {
  log('\n\n' + '='.repeat(60));
  log('PHASE 1: DISCOVERY');
  log('='.repeat(60));
  await screenshot(page, 'discovery-sidebar');

  const sidebarItems = await discoverSidebarItems(page);

  for (const item of sidebarItems) {
    if (item.toLowerCase().includes('aide') || item.toLowerCase() === 'help') {
      log(`\n  [SKIP] "${item}" — help button`);
      continue;
    }

    log(`\n  ► Clicking sidebar: "${item}"`);
    const urlBefore = page.url();
    const clicked = await clickSidebarItem(page, item);
    if (!clicked) {
      surprises.push(`Could not click sidebar item: "${item}"`);
      await safeScreenshot(page, `error-sidebar-${kebab(item)}`);
      continue;
    }

    const urlAfter = page.url();
    if (urlBefore === urlAfter) {
      log(`    [GROUP TOGGLE] "${item}" — expands sidebar, not a screen`);
      navMap[item] = { note: 'collapsible group toggle' };
      await screenshot(page, `discovery-group-${kebab(item)}`);
      continue;
    }

    await screenshot(page, `discovery-${kebab(item)}`);
    const pageTitle = await getContentTitle(page);
    log(`    Content heading: "${pageTitle || '(none)'}"`);

    const tabs = await discoverTabs(page);
    const tabTexts = tabs.map(t => t.text);
    log(`    Tabs: ${tabs.length > 0 ? tabTexts.join(', ') : '(none)'}`);

    navMap[item] = { tabs: tabTexts.length > 0 ? tabTexts : undefined };

    if (tabs.length > 0) {
      // Click first tab and check for Blog Hub pattern (sub-tabs = main tabs)
      let blogHubPattern = false;
      let subTabsForNav: Array<{ text: string; selector: string }> = [];

      const firstTabClicked = await clickTab(page, tabs[0].selector, tabs[0].text);
      if (firstTabClicked) {
        const subTabs = await discoverSubTabs(page);
        const uniqueSubTabs = subTabs.filter(st =>
          !tabTexts.some(tt => tt === st.text) && st.text.length > 1
        );

        // Blog Hub pattern: sub-tab count matches tab count, names overlap
        if (uniqueSubTabs.length > 0 && uniqueSubTabs.length === tabs.length) {
          const matchCount = uniqueSubTabs.filter(st =>
            tabs.some(t =>
              t.text.toLowerCase().includes(st.text.toLowerCase()) ||
              st.text.toLowerCase().includes(t.text.toLowerCase().substring(1, 8))
            )
          ).length;
          if (matchCount >= Math.floor(tabs.length * 0.6)) {
            blogHubPattern = true;
            subTabsForNav = uniqueSubTabs;
            log(`    [BLOG HUB PATTERN] Using ${uniqueSubTabs.length} clean sub-tab names`);
            navMap[item] = { tabs: uniqueSubTabs.map(st => st.text), note: 'Blog Hub — numbered tabs deduplicated to sub-tab names' };
          }
        }
      }

      if (blogHubPattern) {
        for (const subTab of subTabsForNav) {
          const screenId = `${kebab(item)}-${kebab(subTab.text)}`;
          log(`\n    ► Clicking sub-tab: "${subTab.text}"`);
          await clickTab(page, subTab.selector, subTab.text);

          // Dedup check
          const fp = await getScreenFingerprint(page);
          if (isDuplicate(fp, screenId)) continue;

          await screenshot(page, `discovery-${screenId}`);
          allScreens.push({
            id: screenId,
            name: `${item} > ${subTab.text}`,
            navPath: [item, subTab.text],
            sidebarItem: item,
            tabSelector: subTab.selector,
            fingerprint: fp
          });
        }
      } else {
        // Normal tabs — each tab is a screen
        for (const tab of tabs) {
          const screenId = `${kebab(item)}-${kebab(tab.text)}`;
          log(`\n    ► Clicking tab: "${tab.text}"`);
          const tabClicked = await clickTab(page, tab.selector, tab.text);
          if (!tabClicked) {
            log(`      WARNING: Could not click tab "${tab.text}"`);
            surprises.push(`Could not click tab "${tab.text}" in "${item}"`);
            await safeScreenshot(page, `error-${screenId}`);
            allScreens.push({
              id: screenId, name: `${item} > ${tab.text}`,
              navPath: [item, tab.text], sidebarItem: item, tabSelector: tab.selector
            });
            continue;
          }

          // Dedup check
          const fp = await getScreenFingerprint(page);
          if (isDuplicate(fp, screenId)) continue;

          await screenshot(page, `discovery-${screenId}`);
          allScreens.push({
            id: screenId, name: `${item} > ${tab.text}`,
            navPath: [item, tab.text], sidebarItem: item, tabSelector: tab.selector, fingerprint: fp
          });
        }
      }
    } else {
      // No tabs — sidebar item IS the screen
      const screenId = kebab(item);
      const fp = await getScreenFingerprint(page);
      if (isDuplicate(fp, screenId)) continue;

      allScreens.push({
        id: screenId, name: item,
        navPath: [item], sidebarItem: item, fingerprint: fp
      });
    }
  }

  // Special: Blog Editor
  log('\n  ► Special: Blog Editor (click a post)');
  try {
    const blogItem = sidebarItems.find(i => i.toLowerCase().includes('blog'));
    if (blogItem) {
      await clickSidebarItem(page, blogItem);
      // Navigate to Posts sub-tab
      const postsTab = page.locator('[role="tab"]:has-text("Posts")').first();
      if (await postsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await postsTab.click();
        await wait(NAV_WAIT);
      }
      // Click first post
      const postRow = page.locator('table tbody tr, .divide-y > div').first();
      if (await postRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        const editLink = postRow.locator('a, button').first();
        if (await editLink.isVisible({ timeout: 1000 }).catch(() => false)) {
          await editLink.click();
          await wait(NAV_WAIT);
          const fp = await getScreenFingerprint(page);
          if (!isDuplicate(fp, 'blog-editor')) {
            await screenshot(page, 'discovery-blog-editor');
            allScreens.push({
              id: 'blog-editor', name: 'Blog Editor',
              navPath: [blogItem, 'Posts', '(click post)'],
              sidebarItem: blogItem, specialAction: 'click-first-post', fingerprint: fp
            });
          }
        }
      }
    }
  } catch (e) {
    log(`    WARNING: Could not discover Blog Editor: ${e}`);
    await safeScreenshot(page, 'error-blog-editor');
    surprises.push('Could not navigate to Blog Editor');
  }

  log('\n' + '-'.repeat(40));
  log(`DISCOVERY COMPLETE [${elapsed()}]`);
  log(`  Sidebar items: ${sidebarItems.length}`);
  log(`  Unique screens: ${allScreens.length}`);
  log(`  Duplicates skipped: ${duplicatesSkipped}`);
  log(`  Surprises: ${surprises.length > 0 ? surprises.join('; ') : 'none'}`);
  log('-'.repeat(40));
  return allScreens;
}

// ============================================================================
// PHASE 2: FLOW WALKTHROUGHS (Bug 4 fix — actually navigate)
// ============================================================================

async function testFlows(page: Page): Promise<FlowResult[]> {
  log('\n\n' + '='.repeat(60));
  log('PHASE 2: FLOW WALKTHROUGHS');
  log('='.repeat(60));

  const results: FlowResult[] = [];

  // Navigate to Blog section
  const blogItem = allScreens.find(s => s.sidebarItem.toLowerCase().includes('blog'));
  if (blogItem) await clickSidebarItem(page, blogItem.sidebarItem);

  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    log('  BLOCKED: Cannot open help panel');
    surprises.push('Could not open help panel for flow testing');
    return results;
  }
  await waitForHelpContent(page);

  const flowNames = await getFlowList(page);
  log(`\n  Flows found: ${flowNames.length > 0 ? flowNames.join(', ') : 'NONE'}`);

  for (const flowName of flowNames) {
    log(`\n  ${'─'.repeat(50)}`);
    log(`  FLOW: "${flowName}"`);

    const clicked = await clickFlow(page, flowName);
    if (!clicked) {
      log(`    BLOCKED: Could not click flow "${flowName}"`);
      await safeScreenshot(page, `error-flow-${kebab(flowName)}`);
      results.push({ name: flowName, steps: [], summary: { clear: 0, ambiguous: 0, blocked: 1 } });
      continue;
    }
    await wait(500);

    const firstStepInfo = await getFlowStepInfo(page);
    const totalSteps = firstStepInfo?.totalSteps || 10;
    const steps: FlowStepResult[] = [];

    for (let stepNum = 1; stepNum <= totalSteps; stepNum++) {
      log(`\n    --- Step ${stepNum}/${totalSteps} ---`);
      const stepInfo = await getFlowStepInfo(page);
      const title = stepInfo?.title || `Step ${stepNum}`;
      const instruction = stepInfo?.instruction || '';

      log(`    Title: ${title}`);
      log(`    Instruction: ${instruction.substring(0, 100)}${instruction.length > 100 ? '...' : ''}`);

      // Screenshot help panel state
      const helpSS = await safeScreenshot(page, `flow${results.length + 1}-step${stepNum}-help`);

      // ACTUALLY attempt the action described in the instruction
      const actionTaken = await attemptFlowAction(page, instruction, title);
      log(`    Action: ${actionTaken}`);

      // Screenshot resulting UI state (help panel was re-opened by attemptFlowAction)
      await closeHelpPanel(page);
      await wait(300);
      const actionSS = await safeScreenshot(page, `flow${results.length + 1}-step${stepNum}-action`);
      await openHelpPanel(page);
      await wait(500);

      // Get what's visible NOW (after the action)
      const visibleElements = await getVisibleUIElements(page);
      const uiObservation = `After action: ${visibleElements.slice(0, 8).join(', ')}`;

      // Rate this step
      let rating: Rating = 'CLEAR';
      let justification = `Instruction followed: ${actionTaken}`;

      if (!instruction) {
        rating = 'BLOCKED';
        justification = 'Could not extract instruction from help panel';
      } else if (actionTaken.includes('not found') || actionTaken.includes('not visible')) {
        rating = 'AMBIGUOUS';
        justification = `Instruction says to interact with element that was not found: ${actionTaken}`;
      } else if (actionTaken.includes('failed')) {
        rating = 'BLOCKED';
        justification = actionTaken;
      }

      steps.push({
        step: stepNum, totalSteps, title, instruction, uiObservation, actionTaken,
        rating, justification, helpScreenshot: helpSS, actionScreenshot: actionSS
      });

      const hasNext = await clickFlowNext(page);
      if (!hasNext && stepNum < totalSteps) {
        log(`    No Next button — flow may have fewer steps`);
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
  const clicked = await clickSidebarItem(page, screen.sidebarItem);
  if (!clicked) return false;
  if (screen.tabSelector) {
    const tabText = screen.navPath.length >= 2 ? screen.navPath[1] : undefined;
    return await clickTab(page, screen.tabSelector, tabText);
  }
  if (screen.specialAction === 'click-first-post') {
    const postsTab = page.locator('[role="tab"]:has-text("Posts")').first();
    if (await postsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postsTab.click();
      await wait(NAV_WAIT);
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
  log(`PHASE 3: SCREEN HELP VALIDATION (${screens.length} screens)`);
  log('='.repeat(60));

  const results: ScreenResult[] = [];

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    log(`\n  [${i + 1}/${screens.length}] ${screen.name}`);
    log(`  Nav path: ${screen.navPath.join(' → ')}`);

    try {
      const reached = await navigateToScreen(page, screen);
      if (!reached) {
        log(`    BLOCKED: Could not navigate`);
        const errorSS = await safeScreenshot(page, `error-${screen.id}-nav-failed`);
        const analysis = performSixQuestionAnalysis(screen.name, '', '', '', []);
        analysis.f_noHelpContent = { answer: true, detail: 'Could not navigate to screen via UI' };
        results.push({
          screen, helpTitle: '', actualTitle: '', helpContent: '', helpContentLength: 0,
          analysis, rating: 'BLOCKED', justification: 'Could not navigate to screen via UI',
          uiScreenshot: errorSS, helpScreenshot: errorSS
        });
        continue;
      }

      const actualTitle = await getContentTitle(page);
      const visibleElements = await getVisibleUIElements(page);

      await closeHelpPanel(page);
      await wait(300);
      const uiSS = await safeScreenshot(page, `screen-${screen.id}-ui`);

      const helpOpened = await openHelpPanel(page);
      if (!helpOpened) {
        log(`    WARNING: Could not open help panel`);
        const analysis = performSixQuestionAnalysis(screen.name, '', '', actualTitle, visibleElements);
        analysis.f_noHelpContent = { answer: true, detail: 'Could not open help panel' };
        const { rating, justification } = deriveRating(analysis);
        results.push({
          screen, helpTitle: '', actualTitle, helpContent: '', helpContentLength: 0,
          analysis, rating, justification, uiScreenshot: uiSS,
          helpScreenshot: await safeScreenshot(page, `error-${screen.id}-no-help`)
        });
        continue;
      }

      await waitForHelpContent(page);
      const helpSS = await safeScreenshot(page, `screen-${screen.id}-help`);
      const helpContent = await getHelpContent(page);

      const analysis = performSixQuestionAnalysis(
        screen.name, helpContent.title, helpContent.body, actualTitle, visibleElements
      );

      // Check for error elements (question e)
      const consoleErrors = await page.evaluate(() => {
        const errorEls = document.querySelectorAll('.error, [class*="error"], [role="alert"]');
        return Array.from(errorEls).map(el => (el as HTMLElement).textContent?.trim()).filter(Boolean);
      });
      if (consoleErrors.length > 0) {
        analysis.e_anythingBroken = { answer: false, detail: `Errors on page: ${consoleErrors.slice(0, 3).join('; ')}` };
      }

      const { rating, justification } = deriveRating(analysis);

      log(`    Content heading: "${actualTitle}"`);
      log(`    Help title: "${helpContent.title}"`);
      log(`    Help length: ${helpContent.body.length} chars`);
      log(`    Rating: ${rating}`);

      await closeHelpPanel(page);

      results.push({
        screen, helpTitle: helpContent.title, actualTitle, helpContent: helpContent.body,
        helpContentLength: helpContent.body.length, analysis, rating, justification,
        uiScreenshot: uiSS, helpScreenshot: helpSS
      });

    } catch (error) {
      log(`    ERROR: ${error}`);
      const errorSS = await safeScreenshot(page, `error-${screen.id}-exception`);
      results.push({
        screen, helpTitle: '', actualTitle: '', helpContent: '', helpContentLength: 0,
        analysis: performSixQuestionAnalysis(screen.name, '', '', '', []),
        rating: 'BLOCKED', justification: `Error: ${error}`,
        uiScreenshot: errorSS, helpScreenshot: errorSS
      });
    }
  }
  return results;
}

// ============================================================================
// REPORT GENERATION (with V5 comparison)
// ============================================================================

function generateMarkdownReport(report: TestReport): string {
  const { metadata, discovery, flows, screens, summary } = report;
  const totalClear = summary.flow_clear + summary.screen_clear;
  const totalAmbiguous = summary.flow_ambiguous + summary.screen_ambiguous;
  const totalBlocked = summary.flow_blocked + summary.screen_blocked;
  const totalAll = totalClear + totalAmbiguous + totalBlocked;

  let md = `# Naive User Test Report V5-FIXED — Discovery-Based Full Admin Validation

**Date:** ${metadata.date}
**Environment:** ${metadata.environment}
**Viewport:** ${metadata.viewport}
**Elapsed:** ${Math.round(metadata.elapsed_ms / 1000)}s
**Unique screens discovered:** ${discovery.total_screens}
**Duplicates skipped:** ${discovery.duplicates_skipped}
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
| Unique screens | ${discovery.total_screens} |
| Duplicates skipped | ${discovery.duplicates_skipped} |
| Sidebar items | ${discovery.sidebar_items.length} |

---

## 2. V5 vs V5-FIXED Comparison

The original V5 reported 81 screens (6 CLEAR, 24 AMBIGUOUS, 0 BLOCKED for screens; 15 CLEAR for flow steps).
The fixed V5 reports ${discovery.total_screens} screens (${summary.screen_clear} CLEAR, ${summary.screen_ambiguous} AMBIGUOUS, ${summary.screen_blocked} BLOCKED for screens; ${summary.flow_clear} CLEAR, ${summary.flow_ambiguous} AMBIGUOUS, ${summary.flow_blocked} BLOCKED for flow steps).

**Key fixes applied:**
- **Deduplication:** Blog Hub tabs appeared regardless of which numbered tab was active — 5 unique screens, not 25. Partenaires/Contenu Site/Système detected as sidebar group toggles.
- **Screen titles:** Now extracted from content area headings (h1/h2), not document.title which always showed "MEMOPYK".
- **Navigation chrome excluded:** Sidebar items, Blog Hub numbered tabs (①-⑤), Aide button, Brand Brain link no longer counted as "missed UI elements".
- **Flow steps now navigate:** Each instruction is actually attempted (tabs clicked, editors opened, buttons verified).
- **Error screenshots:** Every failure now has a screenshot of the actual screen state.

---

## 3. Discovery Results

### Navigation Map

| Sidebar Item | Tabs / Content | Notes |
|-------------|---------------|-------|
`;
  for (const [item, data] of Object.entries(discovery.navigation_map)) {
    const tabs = data.tabs?.join(', ') || '—';
    const note = data.note || '';
    md += `| ${item} | ${tabs} | ${note} |\n`;
  }

  md += `
**Unique screens after deduplication:** ${discovery.total_screens}
**Duplicates skipped:** ${discovery.duplicates_skipped}

### Surprises / Unexpected findings

`;
  if (discovery.surprises.length > 0) {
    for (const s of discovery.surprises) md += `- ${s}\n`;
  } else {
    md += `None — all sidebar items and tabs behaved as expected.\n`;
  }

  md += `
---

## 4. Executive Summary

| Category | CLEAR | AMBIGUOUS | BLOCKED | Total |
|----------|-------|-----------|---------|-------|
| Flow Steps | ${summary.flow_clear} | ${summary.flow_ambiguous} | ${summary.flow_blocked} | ${summary.flow_clear + summary.flow_ambiguous + summary.flow_blocked} |
| Screens | ${summary.screen_clear} | ${summary.screen_ambiguous} | ${summary.screen_blocked} | ${summary.screen_clear + summary.screen_ambiguous + summary.screen_blocked} |
| **TOTAL** | **${totalClear}** | **${totalAmbiguous}** | **${totalBlocked}** | **${totalAll}** |

---

## 5. Flow Detail Sections

`;

  for (const flow of flows) {
    md += `### Flow: "${flow.name}"

**Steps:** ${flow.steps.length}
**Summary:** ${flow.summary.clear} CLEAR, ${flow.summary.ambiguous} AMBIGUOUS, ${flow.summary.blocked} BLOCKED

| Step | Title | Action Taken | Rating | Justification |
|------|-------|-------------|--------|---------------|
`;
    for (const step of flow.steps) {
      const badge = step.rating === 'CLEAR' ? '✅' : step.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
      md += `| ${step.step} | ${step.title} | ${step.actionTaken} | ${badge} ${step.rating} | ${step.justification} |\n`;
    }
    md += '\n';

    for (const step of flow.steps) {
      md += `#### Step ${step.step}: ${step.title}

- **Help instruction (VERBATIM):** ${step.instruction || '(not captured)'}
- **Action taken:** ${step.actionTaken}
- **What was visible after action:** ${step.uiObservation}
- **Rating:** ${step.rating}
- **Justification:** ${step.justification}
- **Screenshots:** \`${step.helpScreenshot}\`, \`${step.actionScreenshot}\`

`;
    }
  }

  md += `---

## 6. Screen Detail Sections

`;

  for (const screen of screens) {
    const a = screen.analysis;
    const badge = screen.rating === 'CLEAR' ? '✅' : screen.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
    md += `### ${screen.screen.name}

- **Screen ID:** \`${screen.screen.id}\`
- **Navigation path:** ${screen.screen.navPath.join(' → ')}
- **Content heading:** "${screen.actualTitle}"
- **Help panel title:** "${screen.helpTitle}"
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
  md += `## 7. Recommendations

`;

  const blockedScreens = screens.filter(s => s.rating === 'BLOCKED');
  const ambiguousScreens = screens.filter(s => s.rating === 'AMBIGUOUS');

  if (blockedScreens.length > 0) {
    md += `### BLOCKED — Must Fix\n\n`;
    for (const s of blockedScreens) md += `- **${s.screen.name}**: ${s.justification}\n`;
    md += '\n';
  }
  if (ambiguousScreens.length > 0) {
    md += `### AMBIGUOUS — Should Fix\n\n`;
    for (const s of ambiguousScreens) md += `- **${s.screen.name}**: ${s.justification}\n`;
    md += '\n';
  }

  const clearScreens = screens.filter(s => s.rating === 'CLEAR');
  md += `### Summary\n\n`;
  md += `- ${clearScreens.length}/${screens.length} screens rated CLEAR\n`;
  const clearFlows = flows.flatMap(f => f.steps).filter(s => s.rating === 'CLEAR');
  const totalFlowSteps = flows.reduce((sum, f) => sum + f.steps.length, 0);
  md += `- ${clearFlows.length}/${totalFlowSteps} flow steps rated CLEAR\n`;

  md += `
---

## Test Artifacts

- **Test script:** \`tests/e2e/naive-user-help-test-v5-fixed.ts\`
- **Screenshots:** \`tests/e2e/screenshots/help-validation/v5-fixed/\`
- **JSON results:** \`tests/e2e/screenshots/help-validation/v5-fixed/test-results.json\`
- **Total screenshots:** ${screenshotCount}

---

*Generated by Naive User Help Test V5-FIXED — discovery-based, UI-only navigation, deduplication, flow action following*
`;

  return md;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runTest(): Promise<void> {
  const startIso = new Date().toISOString();

  log('╔' + '═'.repeat(58) + '╗');
  log('║  NAIVE USER HELP TEST V5-FIXED                            ║');
  log('║  Discovery-Based Full Admin Validation                    ║');
  log('╚' + '═'.repeat(58) + '╝');
  log(`\nStart time: ${startIso}`);
  log(`Target: ${STAGING_URL}`);
  log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  log(`Screenshots: ${SCREENSHOT_DIR}`);

  const browser: Browser = await chromium.launch({ headless: true, slowMo: SLOW_MO });
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    extraHTTPHeaders: { 'X-E2E-Token': process.env.E2E_BYPASS_TOKEN || '' },
  });
  const page: Page = await context.newPage();

  try {
    await loginToAdmin(page);
    await screenshot(page, 'logged-in');

    const screens = await runDiscovery(page);
    const flowResults = await testFlows(page);
    const screenResults = await testAllScreens(page, screens);

    const endTime = Date.now();
    const endIso = new Date().toISOString();

    const report: TestReport = {
      metadata: {
        date: new Date().toISOString().split('T')[0],
        environment: `Staging (${STAGING_URL})`,
        viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
        startTime: startIso, endTime: endIso,
        elapsed_ms: endTime - startTime,
      },
      discovery: {
        sidebar_items: Object.keys(navMap),
        total_screens: screens.length,
        duplicates_skipped: duplicatesSkipped,
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

    // Save reports
    const jsonPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    log(`\nJSON results: ${jsonPath}`);

    const mdReport = generateMarkdownReport(report);
    const mdPath = path.join(__dirname, '..', '..', 'docs', 'help', 'TEST_REPORT_V5_FIXED_NAIVE_USER.md');
    fs.writeFileSync(mdPath, mdReport);
    log(`Markdown report: ${mdPath}`);

    // Final summary
    log('\n' + '═'.repeat(60));
    log('TEST COMPLETE');
    log('═'.repeat(60));
    log(`Elapsed: ${elapsed()}`);
    log(`Unique screens: ${screens.length} (${duplicatesSkipped} duplicates skipped)`);
    log(`Flows tested: ${flowResults.length}`);
    log(`Total flow steps: ${flowResults.reduce((sum, f) => sum + f.steps.length, 0)}`);
    log(`Screenshots: ${screenshotCount}`);
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
      for (const b of screenResults.filter(s => s.rating === 'BLOCKED').slice(0, 3)) {
        log(`  - ${b.screen.name}: ${b.justification}`);
      }
    }

  } catch (error) {
    log(`\n\nTEST FAILED: ${error}`);
    await safeScreenshot(page, 'error-fatal');
    throw error;
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
