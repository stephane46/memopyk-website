// ============================================================================
// NAIVE USER HELP TEST V7 — DISCOVERY PHASE
// Discovers all admin screens by clicking through the sidebar UI
// Sidebar uses <button> elements (not <a> links) with collapsible groups
// ============================================================================

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'tests/e2e/screenshots/help-validation/v7');
const BASE_URL = 'https://memopyk.memopyk.com';
const PASSWORD = 'memopyk2025admin';

interface Screen {
  name: string;
  route: string;
  type: 'direct' | 'tab' | 'secondary';
  parent?: string;
}

const t0 = Date.now();
const elapsed = () => { const s = Math.floor((Date.now() - t0) / 1000); return `${Math.floor(s / 60)}m${s % 60}s`; };
const log = (m: string) => console.log(`[${elapsed()}] ${m}`);

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext({ viewport: { width: 2560, height: 1440 } }).then(c => c.newPage());

  // === LOGIN ===
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

  // === BASELINE CHROME ===
  log('Capturing baseline chrome...');
  const baseline = await page.evaluate(() => {
    const texts = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const t = node.textContent?.trim();
      if (!t || t.length < 2) continue;
      const el = node.parentElement;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) texts.add(t);
    }
    return Array.from(texts).sort();
  });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'discovery-baseline.json'),
    JSON.stringify({ element_count: baseline.length, elements: baseline }, null, 2));
  log(`Baseline: ${baseline.length} elements`);

  // === EXPAND SIDEBAR GROUPS ===
  log('Expanding sidebar groups...');
  const sidebar = page.locator('.bg-gray-900.fixed');

  // The sidebar has collapsible groups: Partenaires, Contenu Site, Système
  // Each has a chevron-right svg and a hidden child div with max-h-0 opacity-0
  // Clicking the group button toggles the children
  const groupNames = ['Partenaires', 'Contenu Site', 'Système'];
  for (const name of groupNames) {
    try {
      // Find the button that contains this text and has a chevron
      const groupBtn = sidebar.locator('button').filter({ hasText: name }).filter({ has: page.locator('svg.lucide-chevron-right, svg.lucide-chevron-down') });
      if (await groupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await groupBtn.click();
        await page.waitForTimeout(500);
        log(`  Expanded: ${name}`);
      } else {
        // Try without chevron filter
        const btn = sidebar.locator('button').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
        if (await btn.first().isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.first().click();
          await page.waitForTimeout(500);
          log(`  Clicked: ${name}`);
        }
      }
    } catch { log(`  Skip: ${name}`); }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'discovery-sidebar.png') });
  log('Sidebar expanded');

  // === COLLECT ALL SIDEBAR BUTTONS WITH THEIR TEXT ===
  log('Collecting sidebar items...');

  // Get all buttons in the sidebar that look like navigation items
  const sidebarItems = await sidebar.evaluate((el) => {
    const items: { text: string; index: number; isGroup: boolean }[] = [];
    // All buttons inside nav
    const nav = el.querySelector('nav');
    if (!nav) return items;
    const buttons = nav.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
      // Get the span text inside
      const spans = btn.querySelectorAll('span');
      let text = '';
      spans.forEach(s => { text = (text + ' ' + (s.textContent || '')).trim(); });
      if (!text) text = btn.textContent?.trim() || '';
      // Check if it has a chevron (group indicator)
      const hasChevron = btn.querySelector('svg.lucide-chevron-right, svg.lucide-chevron-down') !== null;
      if (text && text.length > 1 && !/(Aide|Déconnexion|MEMOPYK|Panel|Sections)/i.test(text)) {
        items.push({ text: text.trim(), index: idx, isGroup: hasChevron });
      }
    });
    return items;
  });

  log(`Found ${sidebarItems.length} sidebar items:`);
  sidebarItems.forEach(i => log(`  ${i.isGroup ? '[GROUP]' : '  [ITEM]'} ${i.text}`));

  // === CLICK EACH NON-GROUP ITEM ===
  const screens: Screen[] = [];
  const visitedRoutes = new Set<string>();

  for (const item of sidebarItems) {
    if (item.isGroup) {
      log(`Skipping group: ${item.text}`);
      continue;
    }

    log(`Clicking: ${item.text}`);
    try {
      // Find the button by its span text
      const btn = sidebar.locator('nav button').filter({ has: page.locator(`span:text-is("${item.text}")`) });
      const btnCount = await btn.count();
      if (btnCount === 0) {
        // Fallback
        const fallback = sidebar.locator(`nav button:has-text("${item.text}")`).first();
        await fallback.click({ timeout: 3000 });
      } else {
        await btn.first().click({ timeout: 3000 });
      }
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      const currentUrl = page.url();
      const routeKey = currentUrl.replace(/\/[a-z]{2}(-[A-Z]{2})?\//, '/');

      if (!visitedRoutes.has(routeKey)) {
        visitedRoutes.add(routeKey);
        screens.push({ name: item.text, route: currentUrl, type: 'direct' });
        log(`  Added: ${item.text} -> ${currentUrl}`);

        // Discover tabs
        await discoverTabs(page, item.text, screens, visitedRoutes);
      } else {
        log(`  Dup route: ${item.text} -> ${routeKey}`);
      }
    } catch (e: any) {
      log(`  ERROR: ${item.text} -- ${e.message?.substring(0, 80)}`);
    }
  }

  // === SECONDARY SCREENS ===
  log('=== Discovering secondary screens ===');

  // Blog Editor: Blog -> Posts tab -> click post title
  try {
    log('Looking for Blog Editor...');
    const blogBtn = sidebar.locator('nav button').filter({ has: page.locator('span:text-is("Blog")') }).first();
    await blogBtn.click();
    await page.waitForTimeout(2000);
    const postsTab = page.getByTestId('tab-posts');
    if (await postsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await postsTab.click();
      await page.waitForTimeout(2000);

      // Post titles may be in a table or card list
      // Check for clickable elements that would open the editor
      const postTitle = page.locator('h3.cursor-pointer, td a, [data-testid*="post"] a, table tbody tr td:first-child').first();
      if (await postTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postTitle.click();
        await page.waitForTimeout(2000);
        const url = page.url();
        if (url.includes('blog-edit')) {
          screens.push({ name: 'Blog Editor', route: url, type: 'secondary', parent: 'Posts' });
          log('  Found Blog Editor');
        } else {
          log(`  Clicked post but URL is ${url}`);
        }
      } else {
        log('  No clickable post title found');
      }
    }
  } catch (e: any) {
    log(`  Blog Editor error: ${e.message?.substring(0, 80)}`);
  }

  // Travel Agencies -> Agency Codes tab
  try {
    log('Looking for Travel Agencies Agency Codes...');
    const agBtn = sidebar.locator('nav button').filter({ has: page.locator('span:text-is("Agences de Voyage")') }).first();
    if (await agBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await agBtn.click();
      await page.waitForTimeout(2000);
      // Look for tabs within the Travel Agencies screen
      const agencyCodesTab = page.locator('button, [role="tab"]').filter({ hasText: /Agency Codes|Codes/i });
      if (await agencyCodesTab.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await agencyCodesTab.first().click();
        await page.waitForTimeout(1000);
        const tabText = (await agencyCodesTab.first().textContent())?.trim() || 'Agency Codes';
        screens.push({
          name: `Travel Agencies - ${tabText}`,
          route: page.url(),
          type: 'secondary',
          parent: 'Agences de Voyage'
        });
        log(`  Found: Travel Agencies - ${tabText}`);
      } else {
        log('  No Agency Codes tab found');
      }
    }
  } catch (e: any) {
    log(`  Agency Codes error: ${e.message?.substring(0, 80)}`);
  }

  // === FINAL DEDUP ===
  log('Final deduplication...');
  const deduped: Screen[] = [];
  const seen = new Set<string>();
  for (const s of screens) {
    const key = s.route.replace(/\/[a-z]{2}(-[A-Z]{2})?\//, '/').replace(/&id=[^&]+/, '');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    } else {
      log(`  Removed dup: ${s.name} (${key})`);
    }
  }

  // === SAVE RESULTS ===
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'discovery-complete.png') });

  const results = {
    timestamp: new Date().toISOString(),
    totalScreens: deduped.length,
    screens: deduped,
    baselineChrome: { element_count: baseline.length, elements: baseline }
  };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'discovery-screens.json'), JSON.stringify(results, null, 2));

  log(`\n=== DISCOVERY COMPLETE ===`);
  log(`Total: ${deduped.length} unique screens`);
  log(`  Direct: ${deduped.filter(s => s.type === 'direct').length}`);
  log(`  Tabs: ${deduped.filter(s => s.type === 'tab').length}`);
  log(`  Secondary: ${deduped.filter(s => s.type === 'secondary').length}`);
  log('---');
  deduped.forEach(s => {
    const indent = s.type === 'tab' ? '    ' : s.type === 'secondary' ? '  * ' : '  ';
    log(`${indent}${s.name} (${s.type}) -> ${s.route}`);
  });

  await browser.close();
}

async function discoverTabs(page: Page, parentName: string, screens: Screen[], visited: Set<string>) {
  // Blog Hub tabs: data-testid="tab-*"
  if (/^Blog$/i.test(parentName)) {
    const blogTabs = page.locator('[data-testid^="tab-"]');
    const count = await blogTabs.count();
    if (count >= 3) {
      log(`  Found ${count} Blog Hub tabs`);
      for (let i = 0; i < count; i++) {
        try {
          const tab = blogTabs.nth(i);
          const text = (await tab.textContent())?.trim() || '';
          await tab.click({ timeout: 2000 });
          await page.waitForTimeout(1500);
          const url = page.url();
          const key = url.replace(/\/[a-z]{2}(-[A-Z]{2})?\//, '/');
          if (!visited.has(key)) {
            visited.add(key);
            const cleanName = text.replace(/^\d+\s*/, '').trim();
            screens.push({ name: cleanName || text, route: url, type: 'tab', parent: parentName });
            log(`    Tab: ${cleanName || text}`);
          }
        } catch { /* skip */ }
      }
    }
    return;
  }

  // Analytics sub-tabs
  if (/^Analytics$/i.test(parentName)) {
    // Analytics has a sub-tab nav bar
    const tabTexts = ['Overview', 'Live View', 'Trends', 'Video', 'Geo', 'CTA', 'Blog', 'Clarity', 'Fallback', 'Exclusions'];
    for (const tabName of tabTexts) {
      try {
        const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(`^${tabName}$`, 'i') });
        if (await tab.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await tab.first().click({ timeout: 2000 });
          await page.waitForTimeout(1500);
          const url = page.url();
          const key = url.replace(/\/[a-z]{2}(-[A-Z]{2})?\//, '/');
          if (!visited.has(key)) {
            visited.add(key);
            screens.push({ name: `Analytics - ${tabName}`, route: url, type: 'tab', parent: parentName });
            log(`    Tab: Analytics - ${tabName}`);
          }
        }
      } catch { /* skip */ }
    }
    return;
  }

  // SEO, Travel Agencies: tabs exist but ONE help entry covers them all
  // Don't add sub-tabs
}

run().catch(e => { console.error(e); process.exit(1); });
