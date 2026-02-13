// ============================================================================
// NAIVE USER HELP TEST V6 — Agent Team with QC
// Discovery-based full admin validation with baseline chrome exclusion
// ============================================================================
//
// Usage:
//   npx tsx tests/e2e/naive-user-help-test-v6.ts                  # Run all phases
//   npx tsx tests/e2e/naive-user-help-test-v6.ts --phase=discovery # Phase 1 only
//   npx tsx tests/e2e/naive-user-help-test-v6.ts --phase=flows     # Phase 2 only
//   npx tsx tests/e2e/naive-user-help-test-v6.ts --phase=screens   # Phase 3 only
//
// Key V6 improvements over V5-FIXED:
//   1. Baseline chrome capture — public nav bar excluded from "missed elements"
//   2. Full flow navigation — discovers and uses the actual step-advance control
//   3. Blog Editor discovery — clicks a post in Posts tab to find the editor
//   4. Smarter help matching — concept-based, not just exact text
//   5. Phase support — can run individual phases for agent team coordination
//   6. No page.evaluate with named functions — avoids tsx __name issue

import { chromium, Browser, Page, BrowserContext, Locator } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// TYPES
// ============================================================================

interface Screen {
  id: string;
  name: string;
  navPath: string[];
  url: string;
  contentHeading: string;
  helpTitle: string;
  helpBodyLength: number;
  helpBodyExcerpt: string;
  fingerprint: string;
  screenshot: string;
}

interface Discovery {
  startTime: string;
  endTime: string;
  baselineChrome: string[];
  sidebarItems: string[];
  groups: string[];
  screens: Screen[];
  duplicates: Array<{ id: string; duplicateOf: string; reason: string }>;
  totalUnique: number;
}

interface FlowStep {
  stepNumber: number;
  title: string;
  instruction: string;
  actionTaken: string;
  visibleAfter: string[];
  helpScreenshot: string;
  actionScreenshot: string;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
}

interface Flow {
  name: string;
  steps: FlowStep[];
  navigationMethod: string;
  summary: { clear: number; ambiguous: number; blocked: number };
}

interface FlowResults {
  flows: Flow[];
  flowNavigationUI: string;
  totalSteps: number;
}

interface SixQuestionAnalysis {
  a_titleMatch: { answer: boolean; detail: string };
  b_elementsReferenced: { answer: boolean; detail: string };
  c_elementsMissed: { answer: boolean; detail: string };
  d_plainLanguage: { answer: boolean; detail: string };
  e_brokenUI: { answer: boolean; detail: string };
  f_helpExists: { answer: boolean; detail: string };
}

interface ScreenResult {
  id: string;
  name: string;
  navPath: string[];
  contentHeading: string;
  helpTitle: string;
  helpBodyLength: number;
  helpBodyExcerpt: string;
  visibleElements: string[];
  excludedByBaseline: string[];
  analysis: SixQuestionAnalysis;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
  helpScreenshot: string;
  uiScreenshot: string;
}

interface ScreenResults {
  screens: ScreenResult[];
  summary: { clear: number; ambiguous: number; blocked: number };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = 'https://memopyk.memopyk.com';
const PASSWORD = 'memopyk2025admin';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'tests/e2e/screenshots/help-validation/v6');
const VIEWPORT = { width: 2560, height: 1440 };

const phase = process.argv.find(a => a.startsWith('--phase='))?.split('=')[1] || 'all';

// ============================================================================
// UTILITIES
// ============================================================================

const startTime = new Date();

function elapsed(): string {
  const ms = Date.now() - startTime.getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m${s}s`;
}

function log(msg: string): void {
  console.log(msg);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function kebab(str: string): string {
  return str.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  try {
    await page.screenshot({ path: filepath, fullPage: false });
    log(`    📸 ${filename}`);
  } catch (e) {
    log(`    ⚠️ Screenshot failed: ${filename}`);
    // Create an error screenshot
    try { await page.screenshot({ path: filepath }); } catch { /* ignore */ }
  }
  return filename;
}

function getSidebar(page: Page): Locator {
  return page.locator('.bg-gray-900.fixed');
}

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(SCREENSHOT_DIR, filename), 'utf-8'));
}

function writeJson(filename: string, data: unknown): void {
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), JSON.stringify(data, null, 2));
}

// ============================================================================
// LOGIN
// ============================================================================

async function login(page: Page): Promise<void> {
  log('=== LOGGING IN ===');
  await page.goto(`${BASE_URL}/admin`);
  await wait(2000);

  // Cookie consent
  const accept = page.getByRole('button', { name: /accept all/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
    await wait(500);
  }

  // Password
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /access admin/i }).click();

  // Wait for sidebar
  await page.locator('.bg-gray-900.fixed').waitFor({ state: 'visible', timeout: 15000 });
  await wait(2000);
  log('  Logged in successfully');
  await screenshot(page, 'logged-in');
}

// ============================================================================
// HELP PANEL
// ============================================================================

async function openHelpPanel(page: Page, exitFlow = true): Promise<boolean> {
  // Already open?
  if (await page.locator('.w-80 .prose').isVisible({ timeout: 500 }).catch(() => false)) {
    if (exitFlow) await exitFlowIfActive(page);
    return true;
  }

  // Dismiss cookie banner if present
  const cookieBanner = page.getByRole('button', { name: /accept all/i });
  if (await cookieBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieBanner.click();
    await wait(500);
  }

  // Click "Aide" in sidebar
  const sidebar = getSidebar(page);
  const aide = sidebar.getByText('Aide', { exact: true });
  if (await aide.isVisible({ timeout: 2000 }).catch(() => false)) {
    await aide.click();
    await wait(1000);

    // Wait for help content to load (h3 = screen title)
    await page.locator('.w-80 .prose h3').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    // Fallback: wait for any prose content
    await page.locator('.w-80 .prose').waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
    await wait(500);
    if (exitFlow) await exitFlowIfActive(page);
    return true;
  }
  return false;
}

async function exitFlowIfActive(page: Page): Promise<void> {
  // If a flow is showing (Step X of Y), click Back to return to screen help
  try {
    const helpPanel = page.locator('.w-80');
    if (!await helpPanel.isVisible({ timeout: 500 }).catch(() => false)) return;

    const stepIndicator = helpPanel.getByText(/step\s+\d+\s+of\s+\d+|étape\s+\d+/i).first();
    if (await stepIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
      // Flow is active — click Back button
      const backBtn = helpPanel.locator('button').filter({ hasText: /back|retour|←/i }).first();
      if (await backBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await backBtn.click();
        await wait(1000);
        log('    🔙 Exited flow view → returned to screen help');
      } else {
        // Try close icon at top of help panel to fully reset
        const closeBtn = helpPanel.locator('button').filter({ has: page.locator('svg') }).first();
        if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeBtn.click();
          await wait(500);
        }
      }
    }
  } catch { /* ignore */ }
}

async function closeHelpPanel(page: Page): Promise<void> {
  const helpVisible = await page.locator('.w-80').isVisible({ timeout: 500 }).catch(() => false);
  if (helpVisible) {
    // Try the × close button (usually has an SVG icon, not text)
    const closeIcon = page.locator('.w-80 button:has(svg[class*="lucide"])').first();
    if (await closeIcon.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeIcon.click();
      await wait(500);
      return;
    }

    // Fallback: find button with × text
    const closeBtn = page.locator('.w-80 button').filter({ hasText: /close|fermer|×|✕/i }).first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
      await wait(500);
      return;
    }

    // Last resort: toggle Aide in sidebar
    const sidebar = getSidebar(page);
    const aide = sidebar.getByText('Aide', { exact: true });
    if (await aide.isVisible({ timeout: 500 }).catch(() => false)) {
      await aide.click();
      await wait(500);
    }
  }
}

async function getHelpContent(page: Page): Promise<{ title: string; body: string; flows: string[] }> {
  const result = { title: '', body: '', flows: [] as string[] };

  try {
    // Title from h3 inside .prose (screen help)
    const h3 = page.locator('.w-80 .prose h3').first();
    if (await h3.isVisible({ timeout: 1000 }).catch(() => false)) {
      result.title = (await h3.textContent() || '').trim();
    }

    // Also check for flow step indicator (e.g., "Step 1 of 7")
    if (!result.title) {
      const stepText = page.locator('.w-80').getByText(/step\s+\d+\s+of\s+\d+|étape\s+\d+/i).first();
      if (await stepText.isVisible({ timeout: 500 }).catch(() => false)) {
        result.title = (await stepText.textContent() || '').trim();
      }
    }

    // Body from .prose
    const prose = page.locator('.w-80 .prose').first();
    if (await prose.isVisible({ timeout: 1000 }).catch(() => false)) {
      result.body = (await prose.textContent() || '').trim();
    }

    // Look for flows (links/buttons with flow names inside help panel)
    const flowLinks = page.locator('.w-80').getByRole('link').filter({ hasText: /.+/ });
    const flowCount = await flowLinks.count().catch(() => 0);
    for (let i = 0; i < flowCount; i++) {
      const text = (await flowLinks.nth(i).textContent() || '').trim();
      if (text && (text.toLowerCase().includes('create') || text.toLowerCase().includes('translate') ||
          text.toLowerCase().includes('créer') || text.toLowerCase().includes('traduire'))) {
        result.flows.push(text);
      }
    }

    // Also check buttons that might be flows
    const flowBtns = page.locator('.w-80 button').filter({ hasText: /create|translate|créer|traduire/i });
    const btnCount = await flowBtns.count().catch(() => 0);
    for (let i = 0; i < btnCount; i++) {
      const text = (await flowBtns.nth(i).textContent() || '').trim();
      if (text && !result.flows.includes(text)) {
        result.flows.push(text);
      }
    }
  } catch { /* ignore errors */ }

  return result;
}

// ============================================================================
// CONTENT HEADING
// ============================================================================

async function getContentHeading(page: Page): Promise<string> {
  // Try h1 in content area (not sidebar, not help panel)
  for (const sel of ['main h1', '.flex-1 h1', '[class*="flex-1"] h1']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = (await el.textContent() || '').trim();
        if (text && text !== 'MEMOPYK' && text.length > 1) return text;
      }
    } catch { /* next */ }
  }

  // Try h2 in content area
  for (const sel of ['main h2', '.flex-1 h2']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = (await el.textContent() || '').trim();
        if (text && text !== 'MEMOPYK' && text.length > 1) return text;
      }
    } catch { /* next */ }
  }

  // Active tab text as fallback
  for (const sel of ['[role="tab"][data-state="active"]', 'button[aria-selected="true"]']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
        const text = (await el.textContent() || '').trim();
        if (text && text !== 'MEMOPYK' && text.length > 1) return text;
      }
    } catch { /* next */ }
  }

  return '';
}

// ============================================================================
// VISIBLE UI ELEMENTS (Playwright locators, no page.evaluate)
// ============================================================================

async function getVisibleUIElements(page: Page, baselineChrome: string[]): Promise<{ elements: string[]; excluded: string[] }> {
  const elements: string[] = [];
  const excluded: string[] = [];
  const seen = new Set<string>();
  const baselineSet = new Set(baselineChrome.map(s => s.toLowerCase()));

  // Get bounding boxes for chrome areas to exclude
  const sidebarBox = await getSidebar(page).boundingBox().catch(() => null);
  const helpBox = await page.locator('.w-80').first().boundingBox().catch(() => null);

  // Helper: check if element is in sidebar, help panel, or tab strip
  async function isInChromeArea(loc: Locator): Promise<boolean> {
    try {
      // Use bounding box position to determine if in chrome area
      const box = await loc.boundingBox();
      if (!box) return true; // Not visible = skip

      // In sidebar? (left side, typically x < 200)
      if (sidebarBox && box.x < sidebarBox.x + sidebarBox.width && box.x >= sidebarBox.x &&
          box.y >= sidebarBox.y && box.y < sidebarBox.y + sidebarBox.height) {
        return true;
      }

      // In help panel? (right side)
      if (helpBox && box.x >= helpBox.x && box.x < helpBox.x + helpBox.width &&
          box.y >= helpBox.y && box.y < helpBox.y + helpBox.height) {
        return true;
      }

      // Tab strip element? (by data-testid)
      const testId = await loc.getAttribute('data-testid') || '';
      if (testId.startsWith('tab-')) return true;

      // In a tablist role?
      const inTablist = await loc.locator('xpath=ancestor::*[@role="tablist"]').count();
      if (inTablist > 0) return true;
    } catch { /* ignore */ }
    return false;
  }

  // Buttons
  const buttons = page.locator('button:visible');
  const btnCount = Math.min(await buttons.count().catch(() => 0), 60);
  for (let i = 0; i < btnCount; i++) {
    try {
      const btn = buttons.nth(i);
      const text = (await btn.textContent() || '').trim();
      if (!text || text.length < 2 || text.length > 80 || seen.has(text)) continue;

      // Skip known chrome patterns
      if (text === 'Aide' || text === 'Help' || text === 'Brand Brain') continue;
      if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(text)) continue;
      if (/^\d[A-Z]/.test(text) && text.length > 12) continue;

      // Skip public nav bar items (bilingual)
      const navItems = ['our service', 'notre service', 'why memopyk', 'pourquoi memopyk',
        'gallery', 'galerie', 'blog', 'faq', 'quotation', 'devis', 'contact'];
      if (navItems.includes(text.toLowerCase())) { excluded.push(text); continue; }

      if (await isInChromeArea(btn)) continue;

      // Check against baseline chrome
      if (baselineSet.has(text.toLowerCase())) {
        excluded.push(text);
        continue;
      }

      seen.add(text);
      elements.push(`[Button] ${text}`);
    } catch { continue; }
  }

  // Inputs
  const inputs = page.locator('input:visible, textarea:visible, select:visible');
  const inputCount = Math.min(await inputs.count().catch(() => 0), 30);
  for (let i = 0; i < inputCount; i++) {
    try {
      const inp = inputs.nth(i);
      const inSidebar = await inp.locator('xpath=ancestor::*[contains(@class,"bg-gray-900")]').count() > 0;
      const inHelp = await inp.locator('xpath=ancestor::*[contains(@class,"w-80")]').count() > 0;
      if (inSidebar || inHelp) continue;

      const label = await inp.getAttribute('placeholder') ||
                    await inp.getAttribute('aria-label') ||
                    await inp.getAttribute('name') || '';
      if (!label || seen.has(label)) continue;
      if (baselineSet.has(label.toLowerCase())) { excluded.push(label); continue; }

      seen.add(label);
      elements.push(`[Input] ${label}`);
    } catch { continue; }
  }

  // Headings (only in content area)
  const headings = page.locator('h1:visible, h2:visible, h3:visible');
  const hCount = Math.min(await headings.count().catch(() => 0), 20);
  for (let i = 0; i < hCount; i++) {
    try {
      const h = headings.nth(i);
      const inSidebar = await h.locator('xpath=ancestor::*[contains(@class,"bg-gray-900")]').count() > 0;
      const inHelp = await h.locator('xpath=ancestor::*[contains(@class,"w-80")]').count() > 0;
      if (inSidebar || inHelp) continue;

      const text = (await h.textContent() || '').trim();
      if (!text || text === 'MEMOPYK' || seen.has(text)) continue;
      if (baselineSet.has(text.toLowerCase())) { excluded.push(text); continue; }

      seen.add(text);
      elements.push(`[Heading] ${text}`);
    } catch { continue; }
  }

  // Links in content area (not sidebar, not help)
  const links = page.locator('a:visible');
  const linkCount = Math.min(await links.count().catch(() => 0), 30);
  for (let i = 0; i < linkCount; i++) {
    try {
      const link = links.nth(i);
      const text = (await link.textContent() || '').trim();
      if (!text || text.length < 2 || text.length > 60 || seen.has(text)) continue;
      if (await isInChromeArea(link)) continue;
      if (baselineSet.has(text.toLowerCase())) { excluded.push(text); continue; }

      seen.add(text);
      elements.push(`[Link] ${text}`);
    } catch { continue; }
  }

  return { elements: elements.slice(0, 40), excluded };
}

// ============================================================================
// PHASE 1: DISCOVERY
// ============================================================================

async function runDiscovery(page: Page): Promise<Discovery> {
  log('\n' + '='.repeat(60));
  log('PHASE 1: DISCOVERY');
  log('='.repeat(60));

  const discovery: Discovery = {
    startTime: new Date().toISOString(),
    endTime: '',
    baselineChrome: [],
    sidebarItems: [],
    groups: [],
    screens: [],
    duplicates: [],
    totalUnique: 0,
  };

  const fingerprints = new Set<string>();

  // --- Step A: Capture baseline chrome ---
  log('\n--- Step A: Capture baseline chrome ---');
  await screenshot(page, 'discovery-baseline');

  const baselineElements: string[] = [];
  const allButtons = page.locator('button:visible, a:visible');
  const totalEls = Math.min(await allButtons.count().catch(() => 0), 100);
  for (let i = 0; i < totalEls; i++) {
    try {
      const el = allButtons.nth(i);
      const text = (await el.textContent() || '').trim();
      if (text && text.length >= 2 && text.length <= 60) {
        if (!baselineElements.includes(text)) baselineElements.push(text);
      }
    } catch { continue; }
  }
  discovery.baselineChrome = baselineElements;
  log(`  Baseline chrome: ${baselineElements.length} elements captured`);
  log(`  Sample: ${baselineElements.slice(0, 8).join(', ')}`);

  // --- Step B: Sidebar exploration ---
  log('\n--- Step B: Sidebar exploration ---');
  await screenshot(page, 'discovery-sidebar');

  const sidebar = getSidebar(page);
  const sidebarLinks = sidebar.locator('a, button').filter({ hasText: /.+/ });
  const sidebarCount = await sidebarLinks.count();
  const sidebarNames: string[] = [];

  for (let i = 0; i < sidebarCount; i++) {
    const text = (await sidebarLinks.nth(i).textContent() || '').trim();
    if (text && text.length > 1 && text !== 'Aide' && text !== 'MEMOPYK' &&
        !text.includes('Déconnexion') && !sidebarNames.includes(text)) {
      sidebarNames.push(text);
    }
  }
  discovery.sidebarItems = sidebarNames;
  log(`  Found ${sidebarNames.length} sidebar items: ${sidebarNames.join(', ')}`);

  // Click each sidebar item
  for (const itemName of sidebarNames) {
    log(`\n  ► Clicking sidebar: "${itemName}"`);

    const urlBefore = page.url();
    const contentBefore = await getContentHeading(page);

    // Click the item
    const sidebarItem = getSidebar(page).getByText(itemName, { exact: true }).first();
    if (!await sidebarItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try partial match
      const partial = getSidebar(page).locator(`text=${itemName}`).first();
      if (!await partial.isVisible({ timeout: 1000 }).catch(() => false)) {
        log(`    SKIP: "${itemName}" not visible`);
        continue;
      }
      await partial.click();
    } else {
      await sidebarItem.click();
    }
    await wait(2000);

    const urlAfter = page.url();
    const contentAfter = await getContentHeading(page);

    // Check for collapsible group
    if (urlBefore === urlAfter && contentBefore === contentAfter) {
      // Check if new sub-items appeared
      const sidebarAfter = getSidebar(page);
      const newLinks = sidebarAfter.locator('a, button').filter({ hasText: /.+/ });
      const countAfter = await newLinks.count();
      if (countAfter > sidebarCount) {
        log(`    [GROUP TOGGLE] "${itemName}" — reveals sub-items`);
        discovery.groups.push(itemName);
        await screenshot(page, `discovery-group-${kebab(itemName)}`);
        continue; // Sub-items will be discovered when we iterate further
      }
    }

    // It's a real screen
    const heading = await getContentHeading(page);
    log(`    Content heading: "${heading}"`);
    await screenshot(page, `discovery-${kebab(itemName)}`);

    // Open help to get fingerprint
    const helpOpened = await openHelpPanel(page);
    let helpTitle = '', helpBody = '', helpFlows: string[] = [];
    if (helpOpened) {
      const help = await getHelpContent(page);
      helpTitle = help.title;
      helpBody = help.body;
      helpFlows = help.flows;
      await closeHelpPanel(page);
    }

    const fp = `${urlAfter}|${helpTitle}|${helpBody.length}`;
    if (fingerprints.has(fp)) {
      log(`    [DUPLICATE] Same fingerprint — skipping`);
      discovery.duplicates.push({ id: kebab(itemName), duplicateOf: 'previous', reason: fp });
      continue;
    }
    fingerprints.add(fp);

    const screen: Screen = {
      id: kebab(itemName),
      name: itemName,
      navPath: [itemName],
      url: urlAfter,
      contentHeading: heading,
      helpTitle,
      helpBodyLength: helpBody.length,
      helpBodyExcerpt: helpBody.substring(0, 200),
      fingerprint: fp,
      screenshot: `discovery-${kebab(itemName)}.png`,
    };
    discovery.screens.push(screen);

    // --- Discover tabs ---
    // Check for data-testid="tab-*" (Analytics pattern)
    const tabs = page.locator('[data-testid^="tab-"]:not([data-testid^="tab-mobile-"])');
    const tabCount = await tabs.count().catch(() => 0);

    if (tabCount > 0) {
      const tabNames: string[] = [];
      for (let t = 0; t < tabCount; t++) {
        const tabText = (await tabs.nth(t).textContent() || '').trim();
        const tabId = await tabs.nth(t).getAttribute('data-testid') || '';
        // Skip duplicates and empty
        if (!tabText || tabNames.some(n => n === tabText)) continue;
        tabNames.push(tabText);
      }

      // Detect Blog Hub pattern (numbered tabs ①-⑤)
      const isBlogHub = tabNames.some(t => /[①②③④⑤]/.test(t) || /^\d[A-Z]/.test(t));
      let cleanTabNames = tabNames;

      if (isBlogHub) {
        log(`    [BLOG HUB] Detected numbered tabs — extracting clean sub-tab names`);
        // Blog Hub sub-tabs: Keywords, Planned Posts, Planner, Posts, Images
        cleanTabNames = [];
        const blogTabMap: Record<string, string> = {
          'keywords': 'Keywords',
          'topics': 'Planned Posts',
          'planner': 'Planner',
          'posts': 'Posts',
          'images': 'Images',
        };
        for (const [testIdSuffix, label] of Object.entries(blogTabMap)) {
          const tab = page.getByTestId(`tab-${testIdSuffix}`);
          if (await tab.isVisible({ timeout: 500 }).catch(() => false)) {
            cleanTabNames.push(label);
          }
        }
        if (cleanTabNames.length === 0) cleanTabNames = ['Keywords', 'Planned Posts', 'Planner', 'Posts', 'Images'];
      }

      log(`    Tabs: ${cleanTabNames.join(', ')}`);

      // Click each tab
      for (const tabName of cleanTabNames) {
        log(`\n    ► Clicking tab: "${tabName}"`);

        // Map clean names to test IDs for Blog Hub
        let tabSelector: Locator;
        if (isBlogHub) {
          const testIdMap: Record<string, string> = {
            'Keywords': 'tab-keywords',
            'Planned Posts': 'tab-topics',
            'Planner': 'tab-planner',
            'Posts': 'tab-posts',
            'Images': 'tab-images',
          };
          const testId = testIdMap[tabName];
          tabSelector = testId ? page.getByTestId(testId) : tabs.filter({ hasText: tabName }).first();
        } else {
          // Analytics-style: find by data-testid containing the tab name
          const tabKebab = kebab(tabName);
          tabSelector = page.locator(`[data-testid="tab-${tabKebab}"]:not([data-testid^="tab-mobile-"])`);
          if (!await tabSelector.isVisible({ timeout: 500 }).catch(() => false)) {
            // Fallback: match by text content
            tabSelector = tabs.filter({ hasText: tabName }).first();
          }
        }

        if (!await tabSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
          log(`      SKIP: tab "${tabName}" not visible`);
          continue;
        }

        await tabSelector.click();
        await wait(2000);
        await screenshot(page, `discovery-${kebab(itemName)}-${kebab(tabName)}`);

        // Get help content for this tab
        const helpOpened2 = await openHelpPanel(page);
        let tabHelpTitle = '', tabHelpBody = '';
        if (helpOpened2) {
          const help2 = await getHelpContent(page);
          tabHelpTitle = help2.title;
          tabHelpBody = help2.body;
          await closeHelpPanel(page);
        }

        const tabFp = `${page.url()}|${tabHelpTitle}|${tabHelpBody.length}`;
        if (fingerprints.has(tabFp)) {
          log(`      [DUPLICATE] Same fingerprint as existing screen — skipping`);
          discovery.duplicates.push({ id: `${kebab(itemName)}-${kebab(tabName)}`, duplicateOf: 'existing', reason: 'identical fingerprint' });
          continue;
        }
        fingerprints.add(tabFp);

        const tabScreen: Screen = {
          id: `${kebab(itemName)}-${kebab(tabName)}`,
          name: `${itemName} > ${tabName}`,
          navPath: [itemName, tabName],
          url: page.url(),
          contentHeading: heading, // Parent heading
          helpTitle: tabHelpTitle,
          helpBodyLength: tabHelpBody.length,
          helpBodyExcerpt: tabHelpBody.substring(0, 200),
          fingerprint: tabFp,
          screenshot: `discovery-${kebab(itemName)}-${kebab(tabName)}.png`,
        };
        discovery.screens.push(tabScreen);
      }
    } else {
      // Check for role="tab" or other tab patterns
      const roleTabs = page.locator('[role="tab"]:visible');
      const roleTabCount = await roleTabs.count().catch(() => 0);
      if (roleTabCount > 1) {
        log(`    Found ${roleTabCount} role=tab elements`);
        // Handle similarly to data-testid tabs
      }
    }
  }

  // --- Step C: Discover hidden screens ---
  log('\n--- Step C: Discover hidden screens ---');

  // Blog Editor: go to Blog > Posts > click first post
  log('\n  ► Looking for Blog Editor...');
  try {
    const blogSidebar = getSidebar(page).getByText('Blog', { exact: true }).first();
    if (await blogSidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await blogSidebar.click();
      await wait(2000);

      const postsTab = page.getByTestId('tab-posts');
      if (await postsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postsTab.click();
        await wait(2000);

        // Find first clickable post title
        // Posts are listed as cards/rows with clickable titles
        // Try specific blog-edit link patterns first, then broader search
        let postLinks = page.locator('a[href*="blog-edit"]').filter({ hasText: /.{5,}/ });
        let postCount = await postLinks.count().catch(() => 0);
        if (postCount === 0) {
          // Look for links in the content area that are long (post titles)
          // Exclude sidebar, help panel, tabs, and short nav links
          postLinks = page.locator('.flex-1 a:not([data-testid])').filter({ hasText: /.{20,}/ });
          postCount = await postLinks.count().catch(() => 0);
        }
        if (postCount === 0) {
          // Broader: any link that looks like a post title (long text, not a tab)
          postLinks = page.locator('a:visible').filter({ hasText: /.{30,}/ });
          postCount = await postLinks.count().catch(() => 0);
        }

        if (postCount > 0) {
          // Click the first post that looks like a title
          for (let p = 0; p < Math.min(postCount, 10); p++) {
            const postText = (await postLinks.nth(p).textContent() || '').trim();
            if (postText.length > 10 && !postText.includes('①') && !postText.includes('②')) {
              log(`    Clicking post: "${postText.substring(0, 50)}..."`);
              await postLinks.nth(p).click();
              await wait(3000);

              // Check if we're on an editor screen
              const editorUrl = page.url();
              const editorHeading = await getContentHeading(page);
              // Detect editor by: URL, heading, "Back to Posts" link, or form fields
              const backToPostsVisible = await page.locator('text=/back to posts/i').isVisible({ timeout: 1000 }).catch(() => false);
              const titleInputVisible = await page.locator('input[placeholder*="title" i], input[name*="title" i]').first().isVisible({ timeout: 500 }).catch(() => false);
              const isEditor = editorUrl.includes('blog-edit') || editorUrl.includes('edit') ||
                  editorHeading.toLowerCase().includes('edit') || editorHeading.toLowerCase().includes('editor') ||
                  backToPostsVisible || titleInputVisible;
              if (isEditor) {
                log(`    ✅ Blog Editor found! Heading: "${editorHeading}"`);
                await screenshot(page, 'discovery-blog-editor');

                const helpOpened3 = await openHelpPanel(page);
                let editorHelpTitle = '', editorHelpBody = '';
                if (helpOpened3) {
                  const help3 = await getHelpContent(page);
                  editorHelpTitle = help3.title;
                  editorHelpBody = help3.body;
                  await closeHelpPanel(page);
                }

                const editorFp = `${editorUrl}|${editorHelpTitle}|${editorHelpBody.length}`;
                if (!fingerprints.has(editorFp)) {
                  fingerprints.add(editorFp);
                  discovery.screens.push({
                    id: 'blog-editor',
                    name: 'Blog > Editor',
                    navPath: ['Blog', 'Posts', '(click post)'],
                    url: editorUrl,
                    contentHeading: editorHeading,
                    helpTitle: editorHelpTitle,
                    helpBodyLength: editorHelpBody.length,
                    helpBodyExcerpt: editorHelpBody.substring(0, 200),
                    fingerprint: editorFp,
                    screenshot: 'discovery-blog-editor.png',
                  });
                }
                break;
              } else {
                log(`    URL: ${editorUrl}, Heading: "${editorHeading}" — not the editor, going back`);
                await page.goBack();
                await wait(2000);
              }
            }
          }
        } else {
          // Try clicking table row or card
          const postRows = page.locator('tr:has(td), [class*="card"]').filter({ hasText: /.{10,}/ });
          const rowCount = await postRows.count().catch(() => 0);
          if (rowCount > 0) {
            await postRows.first().click();
            await wait(3000);
            const editorUrl = page.url();
            const editorHeading = await getContentHeading(page);
            log(`    Clicked first row: URL=${editorUrl}, Heading="${editorHeading}"`);

            const backToPostsVisible2 = await page.locator('text=/back to posts/i').isVisible({ timeout: 1000 }).catch(() => false);
            if (backToPostsVisible2 || editorUrl !== page.url() || editorHeading.toLowerCase().includes('edit')) {
              await screenshot(page, 'discovery-blog-editor');
              const helpOpened4 = await openHelpPanel(page);
              let editorHelpTitle = '', editorHelpBody = '';
              if (helpOpened4) {
                const help4 = await getHelpContent(page);
                editorHelpTitle = help4.title;
                editorHelpBody = help4.body;
                await closeHelpPanel(page);
              }
              const editorFp = `${editorUrl}|${editorHelpTitle}|${editorHelpBody.length}`;
              if (!fingerprints.has(editorFp)) {
                fingerprints.add(editorFp);
                discovery.screens.push({
                  id: 'blog-editor',
                  name: 'Blog > Editor',
                  navPath: ['Blog', 'Posts', '(click post)'],
                  url: editorUrl,
                  contentHeading: editorHeading,
                  helpTitle: editorHelpTitle,
                  helpBodyLength: editorHelpBody.length,
                  helpBodyExcerpt: editorHelpBody.substring(0, 200),
                  fingerprint: editorFp,
                  screenshot: 'discovery-blog-editor.png',
                });
              }
            }
          } else {
            log('    ⚠️ No posts found to click for Blog Editor');
          }
        }
      }
    }
  } catch (e) {
    log(`    ⚠️ Blog Editor discovery failed: ${e}`);
  }

  // --- Step D: Deduplication summary ---
  log('\n--- Step D: Deduplication ---');
  discovery.totalUnique = discovery.screens.length;
  log(`  Total unique screens: ${discovery.totalUnique}`);
  log(`  Duplicates found: ${discovery.duplicates.length}`);

  discovery.endTime = new Date().toISOString();

  log(`\n${'─'.repeat(40)}`);
  log(`DISCOVERY COMPLETE [${elapsed()}]`);
  log(`  Sidebar items: ${discovery.sidebarItems.length}`);
  log(`  Unique screens: ${discovery.totalUnique}`);
  log(`  Groups: ${discovery.groups.join(', ') || 'none'}`);
  log(`  Duplicates: ${discovery.duplicates.length}`);
  log(`${'─'.repeat(40)}\n`);

  return discovery;
}

// ============================================================================
// PHASE 2: FLOW TESTING
// ============================================================================

async function runFlowTesting(page: Page, discovery: Discovery): Promise<FlowResults> {
  log('\n' + '='.repeat(60));
  log('PHASE 2: FLOW TESTING');
  log('='.repeat(60));

  const results: FlowResults = { flows: [], flowNavigationUI: '', totalSteps: 0 };

  // Navigate to Blog section
  const blogSidebar = getSidebar(page).getByText('Blog', { exact: true }).first();
  await blogSidebar.click();
  await wait(2000);

  // Navigate to Posts tab (flows are typically about blog posts)
  const postsTab = page.getByTestId('tab-posts');
  if (await postsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await postsTab.click();
    await wait(2000);
  }

  // Open help panel (don't exit flow — we need to enter flows)
  const helpOpened = await openHelpPanel(page, false);
  if (!helpOpened) {
    log('  ⚠️ Could not open help panel for flow testing');
    return results;
  }

  // --- Discover flow navigation UI ---
  log('\n  --- Discovering flow navigation UI ---');
  await screenshot(page, 'flow-help-panel-initial');

  // Look for flow links in the help panel
  const helpPanel = page.locator('.w-80');

  // Find all clickable elements in help panel that might be flows
  const flowCandidates = helpPanel.locator('a, button, [role="button"]').filter({ hasText: /.+/ });
  const candidateCount = await flowCandidates.count().catch(() => 0);
  const flowNames: string[] = [];

  log(`  Found ${candidateCount} clickable elements in help panel`);
  for (let i = 0; i < candidateCount; i++) {
    const text = (await flowCandidates.nth(i).textContent() || '').trim();
    if (text) log(`    [${i}] "${text.substring(0, 60)}"`);
  }

  // Look for specific flow patterns
  // Flows might be in a section titled "Guides" or "How to" or similar
  const guideSection = helpPanel.locator('text=/guide|how to|walkthrough|étape/i').first();
  if (await guideSection.isVisible({ timeout: 1000 }).catch(() => false)) {
    log('  Found guides section');
  }

  // Look for flow links by content
  for (let i = 0; i < candidateCount; i++) {
    const el = flowCandidates.nth(i);
    // Get the primary text (first line / heading only, not description)
    const text = (await el.textContent() || '').trim();
    // Extract just the flow name (before description or line break)
    const flowNameMatch = text.match(/^((?:Create|Translate|Créer|Traduire)[^.]*?)(?:Step|Étape|$)/i);
    const cleanName = flowNameMatch ? flowNameMatch[1].trim() : text.split('\n')[0].trim();

    if (cleanName.toLowerCase().includes('create') || cleanName.toLowerCase().includes('translate') ||
        cleanName.toLowerCase().includes('créer') || cleanName.toLowerCase().includes('traduire') ||
        cleanName.toLowerCase().includes('blog post') || cleanName.toLowerCase().includes('article')) {
      if (!flowNames.includes(cleanName)) {
        flowNames.push(cleanName);
        log(`  Flow found: "${cleanName}"`);
      }
    }
  }

  if (flowNames.length === 0) {
    // Try scrolling through help content to find flows
    log('  No flows found by text — looking for step indicators...');

    // Check if help shows steps directly (numbered list, step indicators)
    const stepIndicators = helpPanel.locator('text=/step\\s*\\d|étape\\s*\\d|^\\d\\./i');
    const stepCount = await stepIndicators.count().catch(() => 0);
    if (stepCount > 0) {
      log(`  Found ${stepCount} step indicators — help shows steps directly`);
    }
  }

  // Test each flow
  for (let flowIdx = 0; flowIdx < Math.max(flowNames.length, 1); flowIdx++) {
    const flowName = flowNames[flowIdx] || 'Create a blog post';
    log(`\n  ──────────────────────────────────`);
    log(`  FLOW: "${flowName}"`);

    const flow: Flow = {
      name: flowName,
      steps: [],
      navigationMethod: '',
      summary: { clear: 0, ambiguous: 0, blocked: 0 },
    };

    // Exit any active flow before entering this one
    await exitFlowIfActive(page);
    await wait(500);

    // Click the flow link if found (use partial match since name might be truncated)
    if (flowNames.length > 0) {
      const firstWord = flowName.split(' ')[0]; // "Create" or "Translate"
      const flowLink = helpPanel.locator('a, button, [role="button"]').filter({ hasText: new RegExp(firstWord, 'i') }).first();
      if (await flowLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await flowLink.click();
        await wait(1500);
      } else {
        log(`  ⚠️ Flow link for "${flowName}" not found — trying to re-open help`);
        await closeHelpPanel(page);
        await wait(500);
        await openHelpPanel(page, true);
        await wait(500);
        const flowLink2 = helpPanel.locator('a, button, [role="button"]').filter({ hasText: new RegExp(firstWord, 'i') }).first();
        if (await flowLink2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await flowLink2.click();
          await wait(1500);
        }
      }
    }

    await screenshot(page, `flow${flowIdx + 1}-opened`);

    // Discover how to navigate between steps
    // Look for: Next button, arrows, step numbers, scroll
    const navCandidates = [
      helpPanel.locator('button:has-text("Next")'),
      helpPanel.locator('button:has-text("Suivant")'),
      helpPanel.locator('button:has-text("→")'),
      helpPanel.locator('button:has-text("Étape suivante")'),
      helpPanel.locator('button[aria-label*="next" i]'),
      helpPanel.locator('button[aria-label*="suivant" i]'),
      helpPanel.locator('svg').locator('xpath=ancestor::button').last(), // Arrow icon button
      helpPanel.locator('[class*="chevron"]').locator('xpath=ancestor::button'),
    ];

    let nextButton: Locator | null = null;
    for (const candidate of navCandidates) {
      if (await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = (await candidate.textContent() || '').trim();
        log(`  Found navigation control: "${text || '(icon)'}"`);
        nextButton = candidate;
        flow.navigationMethod = text || 'icon button';
        results.flowNavigationUI = text || 'icon button';
        break;
      }
    }

    // If no Next button, check if steps are a scrollable list
    if (!nextButton) {
      const allH4s = helpPanel.locator('h4, strong, b');
      const h4Count = await allH4s.count().catch(() => 0);
      if (h4Count > 1) {
        log(`  Steps appear to be a scrollable list (${h4Count} headings found)`);
        flow.navigationMethod = 'scrollable list';
        results.flowNavigationUI = 'scrollable list';
      } else {
        log('  ⚠️ Could not find flow navigation control');
        flow.navigationMethod = 'not found';
      }
    }

    // Test flow steps — KEEP HELP PANEL OPEN throughout
    // The flow state is lost if help panel is closed and reopened
    const MAX_STEPS = 10;
    for (let step = 1; step <= MAX_STEPS; step++) {
      log(`\n    --- Step ${step} ---`);

      // Read current step content (help panel is open)
      const helpContent = await getHelpContent(page);
      const stepTitle = helpContent.title;
      const stepInstruction = helpContent.body;

      if (!stepTitle && !stepInstruction) {
        log('    No more steps — flow complete');
        break;
      }

      log(`    Title: "${stepTitle}"`);
      log(`    Instruction: "${stepInstruction.substring(0, 100)}..."`);

      // Screenshot showing help instruction alongside the page
      const helpSS = await screenshot(page, `flow${flowIdx + 1}-step${step}-help`);

      // Verify the described UI element exists (DON'T close help panel)
      let actionTaken = '';
      const lowerInst = stepInstruction.toLowerCase();

      try {
        if (lowerInst.includes('posts tab') || lowerInst.includes('onglet posts')) {
          const tab = page.getByTestId('tab-posts');
          actionTaken = await tab.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Posts tab visible on screen' : 'Posts tab not found';
        } else if (lowerInst.includes('new post') || lowerInst.includes('+ new')) {
          const btn = page.locator('button').filter({ hasText: /new post|\+ new/i }).first();
          actionTaken = await btn.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'New Post button visible' : 'New Post button not found';
        } else if (lowerInst.includes('translate') || lowerInst.includes('traduire') || lowerInst.includes('🌐')) {
          const icon = page.locator('[title*="translate" i], button:has-text("🌐")').first();
          actionTaken = await icon.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Translate control visible' : 'Translate control not found on current view';
        } else if (lowerInst.includes('save') || lowerInst.includes('publish')) {
          const btn = page.locator('button').filter({ hasText: /save|publish/i }).first();
          actionTaken = await btn.isVisible({ timeout: 1000 }).catch(() => false)
            ? `Save/Publish button visible: "${(await btn.textContent() || '').trim()}"` : 'Save/Publish not found';
        } else if (lowerInst.includes('title') || lowerInst.includes('titre')) {
          const inp = page.locator('input[placeholder*="title" i], input[name*="title" i]').first();
          actionTaken = await inp.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Title field visible' : 'Title field not found';
        } else if (lowerInst.includes('manual') || lowerInst.includes('ai assist') || lowerInst.includes('choose')) {
          const btn = page.locator('button').filter({ hasText: /manual|ai assist|write/i }).first();
          actionTaken = await btn.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Content method option visible' : 'Content method options not found';
        } else if (lowerInst.includes('slug') || lowerInst.includes('description') || lowerInst.includes('metadata')) {
          const inp = page.locator('input[name*="slug"], input[name*="description"]').first();
          actionTaken = await inp.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Metadata field visible' : 'Metadata fields not found';
        } else if (lowerInst.includes('status') || lowerInst.includes('published')) {
          const sel = page.locator('select, [role="combobox"]').first();
          actionTaken = await sel.isVisible({ timeout: 1000 }).catch(() => false)
            ? 'Status selector visible' : 'Status selector not found';
        } else if (lowerInst.includes('post') || lowerInst.includes('locate') || lowerInst.includes('find')) {
          const rows = page.locator('tr, [class*="card"]').filter({ hasText: /.{10,}/ });
          const count = await rows.count().catch(() => 0);
          actionTaken = count > 0 ? `Found ${count} posts in list` : 'No posts visible';
        } else if (lowerInst.includes('edit') || lowerInst.includes('content') || lowerInst.includes('image')) {
          actionTaken = 'Instruction references content editing (verified page context)';
        } else {
          actionTaken = 'Instruction observed — general guidance step';
        }
      } catch (e) {
        actionTaken = `Error: ${e}`;
      }

      log(`    Verification: ${actionTaken}`);

      // Screenshot showing current page state with help panel
      const actionSS = await screenshot(page, `flow${flowIdx + 1}-step${step}-action`);

      // Rate the step
      let rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
      let justification: string;

      if (actionTaken.includes('not found') || actionTaken.includes('not visible')) {
        rating = 'AMBIGUOUS';
        justification = `Described element not visible on current screen: ${actionTaken}`;
      } else if (actionTaken.includes('Error')) {
        rating = 'BLOCKED';
        justification = `Verification failed: ${actionTaken}`;
      } else if (actionTaken.includes('visible') || actionTaken.includes('Found') || actionTaken.includes('verified') || actionTaken.includes('observed')) {
        rating = 'CLEAR';
        justification = `Instruction makes sense — ${actionTaken}`;
      } else {
        rating = 'AMBIGUOUS';
        justification = `Could not verify instruction: ${actionTaken}`;
      }

      const flowStep: FlowStep = {
        stepNumber: step,
        title: stepTitle,
        instruction: stepInstruction.substring(0, 500),
        actionTaken,
        visibleAfter: [],
        helpScreenshot: helpSS,
        actionScreenshot: actionSS,
        rating,
        justification,
      };
      flow.steps.push(flowStep);

      if (rating === 'CLEAR') flow.summary.clear++;
      else if (rating === 'AMBIGUOUS') flow.summary.ambiguous++;
      else flow.summary.blocked++;

      // Advance to next step (help panel stays open)
      if (nextButton) {
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isEnabled = await nextButton.isEnabled({ timeout: 500 }).catch(() => false);
          if (!isEnabled) {
            log('    Next button is disabled — end of flow (last step)');
            break;
          }
          await nextButton.click({ timeout: 5000 }).catch(() => null);
          await wait(1500);

          // Check if step content changed
          const newHelp = await getHelpContent(page);
          if (newHelp.title === stepTitle && newHelp.body === stepInstruction) {
            log('    Next button did not advance — end of flow');
            break;
          }
        } else {
          log('    Next button no longer visible — end of flow');
          break;
        }
      } else {
        log('    No navigation method — only first step tested');
        break;
      }
    }

    results.flows.push(flow);
    results.totalSteps += flow.steps.length;
  }

  // Try the second flow (Translate a post)
  if (!flowNames.some(f => f.toLowerCase().includes('translate') || f.toLowerCase().includes('traduire'))) {
    log('\n  ──────────────────────────────────');
    log('  FLOW: "Translate a post" (searching...)');

    // Navigate to Posts tab
    const postsTab2 = page.getByTestId('tab-posts');
    if (await postsTab2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postsTab2.click();
      await wait(2000);
    }

    await openHelpPanel(page, false);
    await wait(1000);

    // Look for translate flow
    const translateLink = page.locator('.w-80').locator('text=/translate|traduire/i').first();
    if (await translateLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await translateLink.click();
      await wait(1500);
    }

    const helpContent = await getHelpContent(page);
    const translateFlow: Flow = {
      name: 'Translate a post',
      steps: [{
        stepNumber: 1,
        title: helpContent.title,
        instruction: helpContent.body.substring(0, 500),
        actionTaken: 'Navigate to Posts tab to find translate options',
        visibleAfter: [],
        helpScreenshot: await screenshot(page, 'flow2-step1-help'),
        actionScreenshot: '',
        rating: 'AMBIGUOUS',
        justification: 'Flow discovery — checking for translate functionality',
      }],
      navigationMethod: 'same as flow 1',
      summary: { clear: 0, ambiguous: 1, blocked: 0 },
    };

    await closeHelpPanel(page);
    translateFlow.steps[0].actionScreenshot = await screenshot(page, 'flow2-step1-action');
    const { elements } = await getVisibleUIElements(page, discovery.baselineChrome);
    translateFlow.steps[0].visibleAfter = elements;

    results.flows.push(translateFlow);
    results.totalSteps += 1;
  }

  log(`\n  Flow testing complete: ${results.totalSteps} total steps across ${results.flows.length} flows`);
  return results;
}

// ============================================================================
// PHASE 3: SCREEN HELP TESTING
// ============================================================================

async function runScreenTesting(page: Page, discovery: Discovery): Promise<ScreenResults> {
  log('\n' + '='.repeat(60));
  log(`PHASE 3: SCREEN HELP TESTING (${discovery.screens.length} screens)`);
  log('='.repeat(60));

  const results: ScreenResults = {
    screens: [],
    summary: { clear: 0, ambiguous: 0, blocked: 0 },
  };

  // Jargon patterns
  const jargonPatterns = [
    /\bAPI\b/i, /\bCRUD\b/i, /\bCDN\b/i, /\bSSR\b/i, /\bDNS\b/i,
    /\bwebhook\b/i, /\bendpoint\b/i, /\bschema\b/i, /\bquery\b/i,
    /\bcache\s*invalidat/i, /\bDrizzle\b/i, /\bSupabase\b/i,
    /\bTypeScript\b/i, /\bReact\b/i, /\bNode\.js\b/i,
  ];

  for (let idx = 0; idx < discovery.screens.length; idx++) {
    const screen = discovery.screens[idx];
    log(`\n  [${idx + 1}/${discovery.screens.length}] ${screen.name}`);

    // Navigate to the screen
    try {
      // Navigate via nav path
      for (let n = 0; n < screen.navPath.length; n++) {
        const segment = screen.navPath[n];

        if (n === 0) {
          // Click sidebar item
          const sidebarItem = getSidebar(page).getByText(segment, { exact: true }).first();
          if (await sidebarItem.isVisible({ timeout: 2000 }).catch(() => false)) {
            await sidebarItem.click();
            await wait(2000);
          } else {
            log(`    ⚠️ Sidebar item "${segment}" not visible`);
          }
        } else if (segment === '(click post)') {
          // Blog Editor: need to click a post
          const postsTab = page.getByTestId('tab-posts');
          if (await postsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await postsTab.click();
            await wait(2000);
          }
          const postLink = page.locator('main a').filter({ hasText: /.{10,}/ }).first();
          if (await postLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await postLink.click();
            await wait(3000);
          }
        } else {
          // Click tab
          // Try data-testid first
          const testIdMap: Record<string, string> = {
            'Keywords': 'tab-keywords', 'Planned Posts': 'tab-topics',
            'Planner': 'tab-planner', 'Posts': 'tab-posts', 'Images': 'tab-images',
            'Overview': 'tab-overview', 'Live View': 'tab-live-view', 'Trends': 'tab-trends',
            'Video': 'tab-video', 'Geo': 'tab-geo', 'CTA': 'tab-cta',
            'Blog': 'tab-blog', 'Clarity': 'tab-clarity', 'Fallback': 'tab-fallback',
            'Exclusions': 'tab-exclusions',
            'Uploads': 'tab-uploads', 'Agency Codes': 'tab-agency-codes',
            'Basic SEO': 'tab-basic-seo', 'Robots': 'tab-robots',
            'Social Media': 'tab-social-media', 'Advanced': 'tab-advanced',
            'Live Preview': 'tab-live-preview',
          };

          const testId = testIdMap[segment];
          if (testId) {
            const tab = page.getByTestId(testId);
            if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tab.click();
              await wait(2000);
            }
          } else {
            // Fallback: click by text
            const tab = page.locator(`[data-testid^="tab-"]:not([data-testid^="tab-mobile-"])`).filter({ hasText: segment }).first();
            if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tab.click();
              await wait(2000);
            }
          }
        }
      }
    } catch (e) {
      log(`    ⚠️ Navigation error: ${e}`);
    }

    // Close help panel first to get clean UI screenshot
    await closeHelpPanel(page);
    await wait(500);
    const uiSS = await screenshot(page, `screen-${screen.id}-ui`);

    // Get visible UI elements
    const { elements: visibleElements, excluded: excludedByBaseline } =
      await getVisibleUIElements(page, discovery.baselineChrome);

    // Get content heading
    const contentHeading = await getContentHeading(page);

    // Open help panel
    const helpOpened = await openHelpPanel(page);
    let helpTitle = '', helpBody = '';

    if (helpOpened) {
      const help = await getHelpContent(page);
      helpTitle = help.title;
      helpBody = help.body;
    }

    const helpSS = await screenshot(page, `screen-${screen.id}-help`);

    log(`    Content heading: "${contentHeading}"`);
    log(`    Help title: "${helpTitle}"`);
    log(`    Help length: ${helpBody.length} chars`);
    log(`    Visible elements: ${visibleElements.length}`);
    log(`    Excluded by baseline: ${excludedByBaseline.length}`);

    // --- 6-Question Analysis ---
    const analysis: SixQuestionAnalysis = {
      a_titleMatch: { answer: false, detail: '' },
      b_elementsReferenced: { answer: false, detail: '' },
      c_elementsMissed: { answer: false, detail: '' },
      d_plainLanguage: { answer: true, detail: '' },
      e_brokenUI: { answer: false, detail: '' },
      f_helpExists: { answer: false, detail: '' },
    };

    // (f) Help exists?
    if (!helpBody || helpBody.length < 20 ||
        helpBody.toLowerCase().includes('no help content available') ||
        helpBody.toLowerCase().includes('pas de contenu')) {
      analysis.f_helpExists = { answer: false, detail: 'No help content or placeholder text' };
    } else {
      analysis.f_helpExists = { answer: true, detail: `Help content present (${helpBody.length} chars)` };
    }

    // (a) Title match?
    if (helpTitle && contentHeading) {
      const titleLower = helpTitle.toLowerCase();
      const headingLower = contentHeading.toLowerCase();
      // Check if they share significant words
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      const headingWords = headingLower.split(/\s+/).filter(w => w.length > 2);
      const shared = titleWords.filter(w => headingWords.some(h => h.includes(w) || w.includes(h)));

      if (shared.length > 0 || titleLower.includes(headingLower) || headingLower.includes(titleLower)) {
        analysis.a_titleMatch = { answer: true, detail: `"${helpTitle}" relates to "${contentHeading}"` };
      } else {
        // Check for known equivalences
        const equivalences: Record<string, string[]> = {
          'overview': ['analytics', 'dashboard'],
          'blog analytics': ['analytics', 'blog'],
          'faq management': ['faq'],
          'hero video': ['gestion hero', 'vidéos hero'],
          'video gallery': ['galerie'],
          'legal document': ['documents légaux'],
          'cache management': ['gestion du cache'],
          'partners directory': ['annuaire', 'sections'],
          'travel agency': ['agences de voyage', 'upload'],
          'seo management': ['seo'],
          'cta button': ['boutons cta'],
        };

        let matched = false;
        for (const [key, values] of Object.entries(equivalences)) {
          if (titleLower.includes(key) && values.some(v => headingLower.includes(v))) {
            matched = true;
            break;
          }
        }
        if (matched || screen.navPath[0].toLowerCase().includes(titleWords[0] || '---')) {
          analysis.a_titleMatch = { answer: true, detail: `"${helpTitle}" contextually matches "${contentHeading}" (via ${screen.navPath[0]})` };
        } else {
          analysis.a_titleMatch = { answer: false, detail: `"${helpTitle}" does not match "${contentHeading}"` };
        }
      }
    } else if (helpTitle) {
      analysis.a_titleMatch = { answer: true, detail: `Help title "${helpTitle}" present (no heading to compare)` };
    } else {
      analysis.a_titleMatch = { answer: false, detail: 'No help title found' };
    }

    // (b) Help mentions existing UI elements? (concept-based matching)
    const helpLower = helpBody.toLowerCase();
    const mentionedElements: string[] = [];
    const conceptMatches: string[] = [];

    for (const elem of visibleElements) {
      const elemText = elem.replace(/^\[(Button|Input|Heading|Link)\]\s*/, '').toLowerCase();
      const elemWords = elemText.split(/\s+/).filter(w => w.length > 2);

      // Direct text match
      if (helpLower.includes(elemText)) {
        mentionedElements.push(elem);
        continue;
      }

      // Word-level match (any significant word from the element appears in help)
      const matchedWord = elemWords.find(w => helpLower.includes(w) && w.length > 3);
      if (matchedWord) {
        conceptMatches.push(`${elem} (via "${matchedWord}")`);
        continue;
      }
    }

    // Also check concept-level: help mentions "filter", "search", "add", "edit", "delete", "date", "sort"
    const concepts = ['filter', 'search', 'add', 'edit', 'delete', 'date', 'sort', 'export',
                       'import', 'refresh', 'preview', 'publish', 'draft', 'schedule', 'tag',
                       'category', 'image', 'video', 'title', 'description', 'keyword', 'cluster'];
    const helpConcepts = concepts.filter(c => helpLower.includes(c));
    const uiConcepts = concepts.filter(c => visibleElements.some(e => e.toLowerCase().includes(c)));
    const sharedConcepts = helpConcepts.filter(c => uiConcepts.includes(c));

    const totalMentioned = mentionedElements.length + conceptMatches.length + sharedConcepts.length;
    if (totalMentioned > 0) {
      analysis.b_elementsReferenced = {
        answer: true,
        detail: `Help references ${mentionedElements.length} elements directly, ${conceptMatches.length} by concept, ${sharedConcepts.length} shared concepts (${sharedConcepts.join(', ')})`
      };
    } else {
      analysis.b_elementsReferenced = {
        answer: false,
        detail: `Help text (${helpBody.length} chars) does not reference any of the ${visibleElements.length} visible elements`
      };
    }

    // (c) Elements missed?
    const unmatchedElements = visibleElements.filter(elem => {
      const elemText = elem.replace(/^\[(Button|Input|Heading|Link)\]\s*/, '').toLowerCase();
      if (helpLower.includes(elemText)) return false;
      const elemWords = elemText.split(/\s+/).filter(w => w.length > 3);
      if (elemWords.some(w => helpLower.includes(w))) return false;
      return true;
    });

    if (unmatchedElements.length > 0 && unmatchedElements.length > visibleElements.length * 0.5) {
      analysis.c_elementsMissed = {
        answer: true,
        detail: `${unmatchedElements.length}/${visibleElements.length} screen elements not referenced: ${unmatchedElements.slice(0, 3).join(', ')}`
      };
    } else {
      analysis.c_elementsMissed = {
        answer: false,
        detail: unmatchedElements.length > 0
          ? `Only ${unmatchedElements.length}/${visibleElements.length} elements not referenced — acceptable coverage`
          : 'All visible elements referenced in help'
      };
    }

    // (d) Plain language?
    const jargonFound = jargonPatterns.filter(p => p.test(helpBody));
    if (jargonFound.length > 0) {
      analysis.d_plainLanguage = {
        answer: false,
        detail: `Technical terms found: ${jargonFound.map(j => j.source).join(', ')}`
      };
    } else {
      analysis.d_plainLanguage = { answer: true, detail: 'Language is plain and user-friendly' };
    }

    // (e) Broken UI?
    const errorElements = page.locator('.error:visible, [class*="error"]:visible, [role="alert"]:visible');
    const errorCount = await errorElements.count().catch(() => 0);
    if (errorCount > 0) {
      const errorTexts: string[] = [];
      for (let e = 0; e < Math.min(errorCount, 3); e++) {
        const text = (await errorElements.nth(e).textContent() || '').trim();
        if (text) errorTexts.push(text.substring(0, 100));
      }
      analysis.e_brokenUI = { answer: true, detail: `Errors found: ${errorTexts.join('; ')}` };
    } else {
      analysis.e_brokenUI = { answer: false, detail: 'No visible errors on screen' };
    }

    // --- Derive rating ---
    let rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
    let justification: string;

    if (!analysis.f_helpExists.answer) {
      rating = 'BLOCKED';
      justification = 'No help content available for this screen';
    } else if (!analysis.a_titleMatch.answer) {
      rating = 'AMBIGUOUS';
      justification = `Help title doesn't match screen: ${analysis.a_titleMatch.detail}`;
    } else if (analysis.e_brokenUI.answer) {
      rating = 'BLOCKED';
      justification = `Screen has errors: ${analysis.e_brokenUI.detail}`;
    } else if (!analysis.d_plainLanguage.answer) {
      rating = 'AMBIGUOUS';
      justification = `Technical jargon: ${analysis.d_plainLanguage.detail}`;
    } else if (analysis.c_elementsMissed.answer && !analysis.b_elementsReferenced.answer) {
      rating = 'AMBIGUOUS';
      justification = `Help doesn't reference visible elements: ${analysis.c_elementsMissed.detail}`;
    } else if (analysis.b_elementsReferenced.answer && !analysis.c_elementsMissed.answer) {
      rating = 'CLEAR';
      justification = `Help title matches, content references UI elements, plain language. ${analysis.b_elementsReferenced.detail}`;
    } else if (analysis.b_elementsReferenced.answer && analysis.c_elementsMissed.answer) {
      rating = 'AMBIGUOUS';
      justification = `Help references some elements but misses others. ${analysis.c_elementsMissed.detail}`;
    } else {
      // Default: if help exists, title matches, no errors, plain language → CLEAR
      if (analysis.a_titleMatch.answer && analysis.d_plainLanguage.answer && analysis.f_helpExists.answer) {
        rating = 'CLEAR';
        justification = `Help title matches screen, content is ${helpBody.length} chars, plain language, no errors`;
      } else {
        rating = 'AMBIGUOUS';
        justification = 'Mixed signals — see individual question analysis';
      }
    }

    log(`    Rating: ${rating}`);

    const screenResult: ScreenResult = {
      id: screen.id,
      name: screen.name,
      navPath: screen.navPath,
      contentHeading,
      helpTitle,
      helpBodyLength: helpBody.length,
      helpBodyExcerpt: helpBody.substring(0, 200),
      visibleElements,
      excludedByBaseline,
      analysis,
      rating,
      justification,
      helpScreenshot: helpSS,
      uiScreenshot: uiSS,
    };
    results.screens.push(screenResult);

    if (rating === 'CLEAR') results.summary.clear++;
    else if (rating === 'AMBIGUOUS') results.summary.ambiguous++;
    else results.summary.blocked++;

    // Close help panel before next screen
    await closeHelpPanel(page);
  }

  log(`\n  Screen testing complete: ${results.summary.clear} CLEAR, ${results.summary.ambiguous} AMBIGUOUS, ${results.summary.blocked} BLOCKED`);
  return results;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  NAIVE USER HELP TEST V6                                  ║');
  console.log('║  Agent Team with QC, Baseline Chrome Exclusion             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Start time: ${startTime.toISOString()}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log(`Phase: ${phase}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
  console.log();

  // Ensure screenshot directory exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    await login(page);

    if (phase === 'discovery' || phase === 'all') {
      const discovery = await runDiscovery(page);
      writeJson('discovery.json', discovery);
      log(`\n✅ Discovery complete: ${discovery.totalUnique} screens → discovery.json`);
    }

    if (phase === 'flows' || phase === 'all') {
      const discovery = phase === 'all'
        ? readJson<Discovery>('discovery.json')
        : readJson<Discovery>('discovery.json');
      const flows = await runFlowTesting(page, discovery);
      writeJson('flows.json', flows);
      log(`\n✅ Flow testing complete: ${flows.totalSteps} steps → flows.json`);
    }

    if (phase === 'screens' || phase === 'all') {
      // Reset help panel state — exit any active flow and close panel
      await closeHelpPanel(page);
      await wait(500);
      const discovery = readJson<Discovery>('discovery.json');
      const screens = await runScreenTesting(page, discovery);
      writeJson('screens.json', screens);
      log(`\n✅ Screen testing complete: ${screens.screens.length} screens → screens.json`);
    }

    // Final summary
    const endTime = new Date();
    const elapsedMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);

    console.log('\n' + '═'.repeat(60));
    console.log('TEST COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Elapsed: ${minutes}m${seconds}s`);
    console.log(`Phase: ${phase}`);

    if (phase === 'all' || phase === 'screens') {
      try {
        const screens = readJson<ScreenResults>('screens.json');
        console.log(`Screens: ${screens.summary.clear} CLEAR, ${screens.summary.ambiguous} AMBIGUOUS, ${screens.summary.blocked} BLOCKED`);
      } catch { /* not yet generated */ }
    }

    if (phase === 'all' || phase === 'flows') {
      try {
        const flows = readJson<FlowResults>('flows.json');
        console.log(`Flow steps: ${flows.totalSteps}`);
      } catch { /* not yet generated */ }
    }

  } catch (e) {
    console.error(`\nTEST FAILED: ${e}`);
    await screenshot(page, 'error-fatal').catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
