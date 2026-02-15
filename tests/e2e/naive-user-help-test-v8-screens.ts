/**
 * NAIVE USER HELP TEST V8 — DISCOVERY + SCREEN TESTING (v2)
 * STRICT UI-ONLY: Zero database queries. All screens visited in browser.
 * Two screenshots per screen: UI + Help panel.
 * Blog Editor is MANDATORY.
 */
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'tests/e2e/screenshots/help-validation/v8');
const BASE_URL = 'https://memopyk.memopyk.com';
const PASSWORD = 'memopyk2025admin';

interface ScreenResult {
  screen_name: string;
  route: string;
  type: 'direct' | 'tab' | 'subtab' | 'secondary';
  parent?: string;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
  help_title: string;
  help_chars_approx: 'short' | 'medium' | 'long';
  help_length: number;
  screenshots: string[];
  blog_editor_checklist?: Record<string, boolean>;
}

const results: ScreenResult[] = [];
const visitedRoutes = new Set<string>();
const JARGON = ['supabase', 'drizzle', 'orm', 'endpoint', 'middleware', 'postgresql'];
const t0 = Date.now();
const elapsed = () => { const s = Math.floor((Date.now() - t0) / 1000); return `${Math.floor(s / 60)}m${s % 60}s`; };
const log = (m: string) => console.log(`[${elapsed()}] ${m}`);
const sanitize = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// ──────────── HELPERS ────────────

async function login(page: Page) {
  log('Logging in...');
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  const cookieBtn = page.getByRole('button', { name: /accept all|tout accepter/i });
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cookieBtn.click();
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /access admin/i }).click();
  await page.locator('.bg-gray-900.fixed').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(3000);
  log('Logged in');
}

function sb(page: Page) { return page.locator('.bg-gray-900.fixed'); }
const GROUPS = ['Partenaires', 'Contenu Site', 'Système'];

async function setGroup(page: Page, name: string, expand: boolean) {
  try {
    const btn = sb(page).locator('button').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`, 'i') }).first();
    if (!await btn.isVisible({ timeout: 500 }).catch(() => false)) return;
    const exp = await btn.getAttribute('aria-expanded');
    if (expand && exp !== 'true') { await btn.click({ force: true }); await page.waitForTimeout(400); }
    if (!expand && exp === 'true') { await btn.click({ force: true }); await page.waitForTimeout(300); }
  } catch {}
}

async function expandAll(page: Page) { for (const g of GROUPS) await setGroup(page, g, true); }
async function collapseAll(page: Page) { for (const g of GROUPS) await setGroup(page, g, false); }

async function clickAide(page: Page) {
  const sidebar = sb(page);
  await sidebar.evaluate(el => { el.scrollTo(0, el.scrollHeight); const n = el.querySelector('nav'); if (n) n.scrollTo(0, n.scrollHeight); });
  await page.waitForTimeout(200);
  try {
    const btn = sidebar.locator('button').filter({ hasText: /^Aide$/ }).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click({ force: true });
      return;
    }
  } catch {}
  await page.evaluate(() => {
    const s = document.querySelector('.bg-gray-900');
    if (!s) return;
    for (const b of s.querySelectorAll('button')) {
      if (b.textContent?.trim() === 'Aide') { (b as HTMLElement).click(); return; }
    }
  });
}

async function openHelp(page: Page): Promise<boolean> {
  if (await page.locator('.w-80').isVisible().catch(() => false)) {
    await clickAide(page);
    await page.waitForTimeout(400);
  }
  await collapseAll(page);
  await page.waitForTimeout(300);
  await clickAide(page);
  await page.waitForSelector('.w-80 .prose h3', { timeout: 6000 }).catch(() => null);
  await page.waitForTimeout(800);
  return await page.locator('.w-80').isVisible().catch(() => false);
}

async function closeHelp(page: Page) {
  if (!await page.locator('.w-80').isVisible().catch(() => false)) return;
  await clickAide(page);
  await page.waitForTimeout(400);
}

// Extract clean tab label from a Blog Hub or Analytics tab button
async function getTabLabel(tab: any): Promise<string> {
  return await tab.evaluate((el: HTMLElement) => {
    // Try data-testid: "tab-keywords" → "Keywords"
    const tid = el.getAttribute('data-testid') || '';
    const tidName = tid.replace('tab-', '').replace(/-/g, ' ');
    // Try first direct text span (skip number spans like ①)
    const spans = el.querySelectorAll('span');
    for (const s of spans) {
      const t = s.textContent?.trim() || '';
      if (t && t.length > 1 && !/^[①②③④⑤⑥⑦⑧⑨⑩\d]+$/.test(t) && !/^[a-z\s]{15,}$/i.test(t)) {
        return t;
      }
    }
    // Fallback to testid-derived name
    if (tidName) return tidName.charAt(0).toUpperCase() + tidName.slice(1);
    return el.textContent?.trim().split('\n')[0] || '';
  });
}

// ──────────── FLEXIBLE TITLE MATCHING ────────────

function titleMatches(screenName: string, helpTitle: string, helpText: string): boolean {
  const sn = screenName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ht = helpTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const txt = helpText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Direct containment
  if (ht.includes(sn) || sn.includes(ht)) return true;

  // Strip "Analytics - " prefix for sub-tabs
  const cleanSn = sn.replace(/^analytics\s*[-–—]\s*/, '');
  if (ht.includes(cleanSn) || cleanSn.includes(ht)) return true;

  // Word overlap: check if significant words from screen name appear in help title or first 500 chars
  const snWords = cleanSn.split(/[\s\-_]+/).filter(w => w.length > 2);
  const snippet = ht + ' ' + txt.substring(0, 500);
  const matched = snWords.filter(w => snippet.includes(w));
  if (matched.length > 0 && matched.length >= snWords.length * 0.5) return true;

  // French-English equivalents
  const equivalents: Record<string, string[]> = {
    'galerie': ['gallery', 'galerie', 'video gallery'],
    'videos': ['video', 'vidéo', 'vidéos'],
    'documents': ['legal', 'document', 'légaux'],
    'legaux': ['legal', 'document'],
    'annuaire': ['partners', 'directory', 'annuaire'],
    'pourquoi': ['why', 'pourquoi'],
    'boutons': ['cta', 'button', 'bouton'],
    'geo': ['geographic', 'geography', 'geo'],
    'fallback': ['diagnostic', 'fallback', 'system'],
    'exclusions': ['exclusion', 'ip'],
    'clarity': ['clarity', 'microsoft'],
    'cache': ['cache', 'storage'],
    'context': ['context', 'brand brain', 'ai'],
    'blog': ['blog'],
    'cta': ['cta', 'call-to-action', 'bouton'],
  };
  for (const word of snWords) {
    const equivs = equivalents[word] || [];
    if (equivs.some(eq => snippet.includes(eq))) return true;
  }

  return false;
}

// ──────────── TEST ONE SCREEN ────────────

async function testScreen(
  page: Page, screenName: string,
  screenType: 'direct' | 'tab' | 'subtab' | 'secondary',
  parent?: string
): Promise<ScreenResult | null> {
  const url = page.url();
  const routeKey = new URL(url).search.replace(/&id=[^&]+/, '') || '?';
  if (visitedRoutes.has(routeKey)) { log(`  Skip dup: ${screenName} (${routeKey})`); return null; }
  visitedRoutes.add(routeKey);

  const prefix = sanitize(screenName);
  const uiFile = `screen-${prefix}-ui.png`;
  const helpFile = `screen-${prefix}-help.png`;
  log(`  Testing: ${screenName} [${routeKey}]`);

  // 1. UI screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, uiFile) });

  // 2. Open help
  const opened = await openHelp(page);
  if (!opened) {
    log(`  BLOCKED: help panel didn't open`);
    const r: ScreenResult = {
      screen_name: screenName, route: routeKey, type: screenType, parent,
      rating: 'BLOCKED', justification: 'Help panel did not open',
      help_title: '', help_chars_approx: 'short', help_length: 0,
      screenshots: [uiFile],
    };
    results.push(r);
    await expandAll(page);
    return r;
  }

  // 3. Help screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, helpFile) });

  // 4. Extract help content
  // Get ALL h3 titles for matching
  const allH3 = await page.locator('.w-80 .prose h3').allTextContents().catch(() => []);
  const helpTitle = allH3[0]?.trim() || '';
  const helpText = await page.locator('.w-80 .prose').textContent()
    .then(t => t?.trim() || '').catch(() => '');

  // 5. Close help & restore sidebar
  await closeHelp(page);
  await expandAll(page);
  await page.waitForTimeout(300);

  // 6. Evaluate
  const helpLen = helpText.length;
  const charCat: 'short' | 'medium' | 'long' = helpLen < 500 ? 'short' : helpLen < 2000 ? 'medium' : 'long';

  if (helpText.includes('No help content') || helpText.includes('Pas de contenu') || helpLen < 50) {
    const r: ScreenResult = {
      screen_name: screenName, route: routeKey, type: screenType, parent,
      rating: 'BLOCKED', justification: `No help content (${helpLen} chars)`,
      help_title: helpTitle, help_chars_approx: charCat, help_length: helpLen,
      screenshots: [uiFile, helpFile],
    };
    results.push(r);
    log(`  BLOCKED: no content`);
    return r;
  }

  // Flexible title matching using help text context
  const tmatch = titleMatches(screenName, helpTitle, helpText);

  // Jargon check
  const jargon = JARGON.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(helpText));

  let rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED' = 'CLEAR';
  let justification = 'Help matches screen, plain language, substantial content';

  if (!tmatch) {
    rating = 'AMBIGUOUS';
    justification = `Help title "${helpTitle}" may not match screen "${screenName}"`;
  } else if (jargon.length > 0) {
    rating = 'AMBIGUOUS';
    justification = `Jargon: ${jargon.join(', ')}`;
  } else if (helpLen < 200) {
    rating = 'AMBIGUOUS';
    justification = `Help too short (${helpLen} chars)`;
  }

  // Blog Editor checklist
  let blogChecklist: Record<string, boolean> | undefined;
  if (screenName === 'Blog Editor') {
    const checks = ['AI Assist', 'language', 'editor', 'Sitemap', 'FAQ Schema',
      'Status', 'Save', 'Discard', 'Slug', 'description', 'image'];
    blogChecklist = {};
    for (const c of checks) blogChecklist[c] = helpText.toLowerCase().includes(c.toLowerCase());
    const missing = Object.entries(blogChecklist).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 3) {
      rating = 'AMBIGUOUS';
      justification = `Blog Editor help missing: ${missing.join(', ')}`;
    }
  }

  const r: ScreenResult = {
    screen_name: screenName, route: routeKey, type: screenType, parent,
    rating, justification,
    help_title: helpTitle, help_chars_approx: charCat, help_length: helpLen,
    screenshots: [uiFile, helpFile],
    blog_editor_checklist: blogChecklist,
  };
  results.push(r);
  log(`  ${rating}: ${justification} [${helpLen}ch, title="${helpTitle}"]`);
  return r;
}

// ──────────── MAIN ────────────

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 2560, height: 1440 } })).newPage();

  try {
    await login(page);

    // === BASELINE ===
    log('Capturing baseline chrome...');
    const baseline = await page.evaluate(() => {
      const texts = new Set<string>();
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        const t = n.textContent?.trim();
        if (!t || t.length < 2) continue;
        const el = n.parentElement;
        if (el) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) texts.add(t); }
      }
      return Array.from(texts).sort();
    });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'discovery-baseline.json'),
      JSON.stringify({ element_count: baseline.length, elements: baseline }, null, 2));
    log(`Baseline: ${baseline.length} elements`);

    // === EXPAND SIDEBAR ===
    log('Expanding sidebar...');
    await expandAll(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'discovery-sidebar.png') });

    // === COLLECT SIDEBAR ITEMS ===
    log('Collecting sidebar items...');
    const sidebar = sb(page);
    const items = await sidebar.evaluate((el) => {
      const result: { text: string; isGroup: boolean; idx: number }[] = [];
      const nav = el.querySelector('nav');
      if (!nav) return result;
      const buttons = nav.querySelectorAll('button');
      buttons.forEach((btn, idx) => {
        const spans = btn.querySelectorAll('span');
        let text = '';
        spans.forEach(s => { text = (text + ' ' + (s.textContent || '')).trim(); });
        if (!text) text = btn.textContent?.trim() || '';
        if (!text || text.length < 2) return;
        if (/^(Aide|Déconnexion|MEMOPYK|Panel|Sections|Navigation|Légal)$/i.test(text)) return;
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const hasChevron = !!btn.querySelector('svg[class*="chevron"], .lucide-chevron-right, .lucide-chevron-down');
        result.push({ text: text.trim(), isGroup: hasChevron, idx });
      });
      return result;
    });

    log(`Found ${items.length} sidebar items:`);
    items.forEach(i => log(`  ${i.isGroup ? '[G]' : '[I]'} "${i.text}"`));

    // === CLICK EACH ITEM ===
    for (const item of items) {
      if (item.isGroup) continue;
      log(`\n=== ${item.text} ===`);

      try {
        await expandAll(page);
        await page.waitForTimeout(300);

        const urlBefore = page.url();
        const btn = sidebar.locator('nav button').filter({ has: page.locator(`span:text-is("${item.text}")`) }).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click({ force: true });
        } else {
          const fallback = sidebar.locator(`nav button:has-text("${item.text}")`).first();
          await fallback.click({ force: true, timeout: 2000 });
        }
        await page.waitForTimeout(2500);
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

        // Verify navigation happened
        const urlAfter = page.url();
        if (urlAfter === urlBefore && !urlAfter.includes(sanitize(item.text).substring(0, 5))) {
          log(`  WARNING: URL didn't change after clicking "${item.text}" — trying JS navigation`);
          // Try JS click
          await sidebar.evaluate((el, text) => {
            const nav = el.querySelector('nav');
            if (!nav) return;
            for (const b of nav.querySelectorAll('button')) {
              const spans = b.querySelectorAll('span');
              for (const s of spans) {
                if (s.textContent?.trim() === text) { (b as HTMLElement).click(); return; }
              }
            }
          }, item.text);
          await page.waitForTimeout(2000);
        }

        // Test this screen
        await testScreen(page, item.text, 'direct');

        // === Blog Hub tabs ===
        if (/^Blog$/i.test(item.text)) {
          log('  Discovering Blog Hub tabs...');
          const blogTabs = page.locator('[data-testid^="tab-"]');
          const tc = await blogTabs.count();
          log(`  ${tc} candidate Blog tabs`);
          for (let i = 0; i < Math.min(tc, 8); i++) {
            try {
              const tab = blogTabs.nth(i);
              if (!await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
                log(`    Skip non-visible tab #${i}`);
                continue;
              }
              const label = await getTabLabel(tab);
              if (!label) continue;
              await tab.click();
              await page.waitForTimeout(2000);
              await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
              await testScreen(page, label, 'tab', 'Blog');
            } catch (e: any) { log(`    Tab err: ${e.message?.substring(0, 60)}`); }
          }
        }

        // === Analytics sub-tabs ===
        if (/^Analytics$/i.test(item.text)) {
          log('  Discovering Analytics sub-tabs...');
          const aTabs = page.locator('[data-testid^="tab-"]');
          const tc = await aTabs.count();
          log(`  ${tc} candidate Analytics tabs`);
          for (let i = 0; i < Math.min(tc, 15); i++) {
            try {
              const tab = aTabs.nth(i);
              if (!await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
                continue; // Skip non-visible
              }
              const label = await getTabLabel(tab);
              if (!label) continue;
              await tab.click();
              await page.waitForTimeout(2000);
              await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
              await testScreen(page, `Analytics - ${label}`, 'subtab', 'Analytics');
            } catch (e: any) { log(`    Sub-tab err: ${e.message?.substring(0, 60)}`); }
          }
        }
      } catch (e: any) {
        log(`  ERROR: ${e.message?.substring(0, 80)}`);
      }
    }

    // === BLOG EDITOR (MANDATORY) ===
    log('\n=== Blog Editor (MANDATORY) ===');
    let blogEditorFound = false;
    try {
      await expandAll(page);
      await page.waitForTimeout(300);
      const blogBtn = sidebar.locator('nav button').filter({ has: page.locator('span:text-is("Blog")') }).first();
      await blogBtn.click({ force: true });
      await page.waitForTimeout(2000);
      const postsTab = page.getByTestId('tab-posts');
      if (await postsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postsTab.click();
        await page.waitForTimeout(3000);

        // Take a debug screenshot of the Posts tab
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'debug-posts-tab.png') });

        // Strategy 1: h3.cursor-pointer (post titles use onClick → window.location.href)
        const postTitle = page.locator('h3.cursor-pointer').first();
        const titleCount = await page.locator('h3.cursor-pointer').count();
        log(`  Strategy 1: ${titleCount} h3.cursor-pointer elements`);
        if (titleCount > 0 && await postTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
          await postTitle.click();
          await page.waitForTimeout(3000);
          if (page.url().includes('blog-edit')) blogEditorFound = true;
        }

        // Strategy 2: data-testid post cards
        if (!blogEditorFound) {
          const postCard = page.locator('[data-testid^="post-card-"] h3');
          const cardCount = await postCard.count();
          log(`  Strategy 2: ${cardCount} post card h3 elements`);
          if (cardCount > 0) {
            await postCard.first().click();
            await page.waitForTimeout(3000);
            if (page.url().includes('blog-edit')) blogEditorFound = true;
          }
        }

        // Strategy 3: title attribute "Edit post"
        if (!blogEditorFound) {
          const editEl = page.locator('[title="Edit post"], h3[title="Edit post"]').first();
          if (await editEl.isVisible({ timeout: 1000 }).catch(() => false)) {
            await editEl.click();
            await page.waitForTimeout(3000);
            if (page.url().includes('blog-edit')) blogEditorFound = true;
          }
        }

        // Strategy 4: JS click on first h3.cursor-pointer
        if (!blogEditorFound) {
          log('  Strategy 4: JS click');
          await page.evaluate(() => {
            const h3 = document.querySelector('h3.cursor-pointer') as HTMLElement;
            if (h3) h3.click();
          });
          await page.waitForTimeout(3000);
          if (page.url().includes('blog-edit')) blogEditorFound = true;
        }

        // Strategy 5: direct URL with post ID from data-testid
        if (!blogEditorFound) {
          log('  Strategy 5: Extract ID from data-testid');
          const postId = await page.evaluate(() => {
            const card = document.querySelector('[data-testid^="post-card-"]');
            if (card) {
              const tid = card.getAttribute('data-testid') || '';
              return tid.replace('post-card-', '');
            }
            return '';
          });
          if (postId) {
            await page.goto(`${BASE_URL}/admin?tab=blog-edit&id=${postId}`);
            await page.waitForTimeout(3000);
            blogEditorFound = page.url().includes('blog-edit');
          }
        }

        if (blogEditorFound) {
          log('  Reached Blog Editor!');
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'discovery-blog-editor-reached.png') });
          await testScreen(page, 'Blog Editor', 'secondary', 'Posts');
        } else {
          log('  BLOCKED: Could not reach Blog Editor by any method');
          results.push({
            screen_name: 'Blog Editor', route: '?tab=blog-edit', type: 'secondary', parent: 'Posts',
            rating: 'BLOCKED', justification: 'Could not navigate to Blog Editor — all 5 strategies failed',
            help_title: '', help_chars_approx: 'short', help_length: 0, screenshots: [],
          });
        }
      }
    } catch (e: any) {
      log(`  Blog Editor error: ${e.message?.substring(0, 80)}`);
      if (!blogEditorFound) {
        results.push({
          screen_name: 'Blog Editor', route: '?tab=blog-edit', type: 'secondary', parent: 'Posts',
          rating: 'BLOCKED', justification: `Error: ${e.message?.substring(0, 100)}`,
          help_title: '', help_chars_approx: 'short', help_length: 0, screenshots: [],
        });
      }
    }

    // === AGENCES DE VOYAGE (if not already tested) ===
    if (!results.some(r => r.route.includes('travel-agencies'))) {
      log('\n=== Agences de Voyage (retry) ===');
      try {
        await expandAll(page);
        await page.waitForTimeout(300);
        // Try direct navigation via sidebar
        await sidebar.evaluate((el) => {
          const nav = el.querySelector('nav');
          if (!nav) return;
          for (const b of nav.querySelectorAll('button')) {
            for (const s of b.querySelectorAll('span')) {
              if (s.textContent?.trim() === 'Agences de Voyage') { (b as HTMLElement).click(); return; }
            }
          }
        });
        await page.waitForTimeout(2500);
        if (!page.url().includes('travel-agencies')) {
          // Direct URL as fallback
          await page.goto(`${BASE_URL}/admin?tab=travel-agencies`);
          await page.waitForTimeout(2500);
        }
        await testScreen(page, 'Agences de Voyage', 'direct');
      } catch (e: any) { log(`  Error: ${e.message?.substring(0, 60)}`); }
    }

    // === TRAVEL AGENCIES AGENCY CODES TAB ===
    log('\n=== Travel Agencies — Agency Codes ===');
    try {
      // Make sure we're on Travel Agencies
      if (!page.url().includes('travel-agencies')) {
        await page.goto(`${BASE_URL}/admin?tab=travel-agencies`);
        await page.waitForTimeout(2000);
      }
      const codeTabs = page.locator('button, [role="tab"]').filter({ hasText: /codes|agency codes/i });
      if (await codeTabs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await codeTabs.first().click();
        await page.waitForTimeout(1500);
        const tabLabel = (await codeTabs.first().textContent())?.trim() || 'Agency Codes';
        await testScreen(page, `Travel Agencies - ${tabLabel}`, 'secondary', 'Agences de Voyage');
      } else {
        log('  No Agency Codes tab found');
      }
    } catch (e: any) { log(`  Agency Codes error: ${e.message?.substring(0, 60)}`); }

    // === SAVE RESULTS ===
    log('\n=== SAVING ===');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'discovery-complete.png') });

    const discoveryJson = {
      timestamp: new Date().toISOString(),
      totalScreens: results.length,
      screens: results.map(r => ({ name: r.screen_name, route: r.route, type: r.type, parent: r.parent })),
    };
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'discovery-screens.json'), JSON.stringify(discoveryJson, null, 2));

    const summary = {
      total: results.length,
      clear: results.filter(r => r.rating === 'CLEAR').length,
      ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
      blocked: results.filter(r => r.rating === 'BLOCKED').length,
    };
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'screens.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      methodology: 'Strict UI-only. Zero database queries. All screens visited in browser.',
      summary, screens: results,
    }, null, 2));

    log('\n=== RESULTS ===');
    log(`Screens: ${results.length} (${results.filter(r => r.type === 'direct').length} direct, ${results.filter(r => r.type === 'tab').length} tab, ${results.filter(r => r.type === 'subtab').length} subtab, ${results.filter(r => r.type === 'secondary').length} secondary)`);
    log(`CLEAR: ${summary.clear} | AMBIGUOUS: ${summary.ambiguous} | BLOCKED: ${summary.blocked}`);
    log(`Blog Editor: ${results.find(r => r.screen_name === 'Blog Editor')?.rating || 'NOT TESTED'}`);
    log('');
    results.forEach(r => {
      log(`[${r.rating}] ${r.screen_name} (${r.route}) — ${r.help_title} [${r.help_length}ch]`);
      if (r.rating !== 'CLEAR') log(`       ${r.justification}`);
    });

  } finally {
    await browser.close();
  }
  log(`\nDone in ${elapsed()}`);
}

run().catch(e => { console.error(e); process.exit(1); });
