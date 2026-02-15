/**
 * NAIVE USER HELP TEST V8 — FLOW TESTING
 * Tests two help flows: "Create a blog post" (7 steps), "Translate a post" (8 steps)
 * STRICT UI-ONLY: Zero database queries. Playwright only.
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

interface FlowStep {
  step: number;
  title: string;
  instruction: string;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
  screenshot: string;
}
interface FlowResult {
  name: string;
  total_steps: number;
  steps: FlowStep[];
  summary: { clear: number; ambiguous: number; blocked: number };
}

const t0 = Date.now();
const elapsed = () => { const s = Math.floor((Date.now() - t0) / 1000); return `${Math.floor(s / 60)}m${s % 60}s`; };
const log = (m: string) => console.log(`[${elapsed()}] ${m}`);

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

async function openHelpOnPosts(page: Page) {
  const sidebar = page.locator('.bg-gray-900.fixed');
  // Navigate to Blog → Posts
  await sidebar.locator('nav button').filter({ has: page.locator('span:text-is("Blog")') }).first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.getByTestId('tab-posts').click();
  await page.waitForTimeout(2000);
  // Collapse groups, scroll, click Aide
  for (const g of ['Partenaires', 'Contenu Site', 'Système']) {
    try {
      const btn = sidebar.locator('button').filter({ hasText: new RegExp(`^\\s*${g}\\s*$`, 'i') }).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        const exp = await btn.getAttribute('aria-expanded');
        if (exp === 'true') { await btn.click({ force: true }); await page.waitForTimeout(200); }
      }
    } catch {}
  }
  await page.waitForTimeout(300);
  await sidebar.evaluate(el => { el.scrollTo(0, el.scrollHeight); const n = el.querySelector('nav'); if (n) n.scrollTo(0, n.scrollHeight); });
  await page.waitForTimeout(200);
  const aideBtn = sidebar.locator('button').filter({ hasText: /^Aide$/ }).first();
  await aideBtn.click({ force: true });
  await page.waitForSelector('.w-80 .prose h3', { timeout: 6000 }).catch(() => null);
  await page.waitForTimeout(800);
  log('Help panel opened on Posts tab');
}

async function testFlow(page: Page, flowName: string, maxSteps: number): Promise<FlowResult> {
  log(`\n=== Flow: ${flowName} ===`);
  const steps: FlowStep[] = [];
  const hp = page.locator('.w-80');
  const prefix = flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Find and click flow link
  const flowLink = hp.locator('a, button').filter({ hasText: new RegExp(flowName, 'i') });
  if (!await flowLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    log(`  Flow link "${flowName}" not found`);
    return { name: flowName, total_steps: 0, steps: [], summary: { clear: 0, ambiguous: 0, blocked: 1 } };
  }
  await flowLink.click();
  await page.waitForTimeout(1500);

  for (let i = 1; i <= maxSteps + 2; i++) {
    // Read content
    const prose = hp.locator('.prose');
    const content = await prose.textContent().catch(() => '') || '';
    const title = await prose.locator('h3, h4').first().textContent().then(t => t?.trim() || `Step ${i}`).catch(() => `Step ${i}`);

    // Screenshot
    const ssFile = `flow-${prefix}-step-${i}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, ssFile) });

    // Rate
    let rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED' = 'CLEAR';
    let justification = 'Clear, actionable instruction';
    if (!content || content.length < 20) {
      rating = 'BLOCKED'; justification = 'No instruction content';
    } else if (content.length < 50) {
      rating = 'AMBIGUOUS'; justification = 'Very brief instruction';
    } else {
      const hasAction = /click|enter|type|select|choose|check|scroll|set|fill|write|open|go to|locate|press/i.test(content);
      if (!hasAction) { rating = 'AMBIGUOUS'; justification = 'No clear action verb'; }
    }

    steps.push({ step: i, title, instruction: content.substring(0, 300).trim(), rating, justification, screenshot: ssFile });
    log(`  Step ${i}: ${rating} — ${title.substring(0, 40)}`);

    // Navigate
    const nextBtn = hp.locator('button').filter({ hasText: /next|suivant/i });
    const doneBtn = hp.locator('button').filter({ hasText: /done|finish|terminé|close|fermer|retour|back/i });

    // Check if Next is visible AND enabled
    const nextVisible = await nextBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const nextEnabled = nextVisible ? await nextBtn.isEnabled({ timeout: 500 }).catch(() => false) : false;

    if (nextVisible && nextEnabled) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    } else if (await doneBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Click Done and break
      await doneBtn.click({ timeout: 2000 }).catch(() => {});
      break;
    } else if (nextVisible && !nextEnabled) {
      log(`  Next disabled — last step`);
      break;
    } else {
      log(`  No Next/Done at step ${i}`);
      break;
    }
  }

  const summary = {
    clear: steps.filter(s => s.rating === 'CLEAR').length,
    ambiguous: steps.filter(s => s.rating === 'AMBIGUOUS').length,
    blocked: steps.filter(s => s.rating === 'BLOCKED').length,
  };
  log(`  Summary: ${summary.clear} CLEAR / ${summary.ambiguous} AMB / ${summary.blocked} BLK (${steps.length} steps)`);
  return { name: flowName, total_steps: steps.length, steps, summary };
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 2560, height: 1440 } })).newPage();

  try {
    await login(page);
    await openHelpOnPosts(page);

    // Flow 1
    const flow1 = await testFlow(page, 'Create a blog post', 7);

    // Close and reopen help for flow 2
    log('Reopening help for Flow 2...');
    const sidebar = page.locator('.bg-gray-900.fixed');
    await sidebar.evaluate(el => { el.scrollTo(0, el.scrollHeight); });
    const aideBtn = sidebar.locator('button').filter({ hasText: /^Aide$/ }).first();
    // Toggle close
    await aideBtn.click({ force: true });
    await page.waitForTimeout(500);
    // Toggle open
    await aideBtn.click({ force: true });
    await page.waitForSelector('.w-80 .prose h3', { timeout: 6000 }).catch(() => null);
    await page.waitForTimeout(800);

    // Flow 2
    const flow2 = await testFlow(page, 'Translate a post', 8);

    // Save
    const flowsJson = {
      timestamp: new Date().toISOString(),
      methodology: 'Strict UI-only. Playwright browser. Help panel kept open during flow navigation.',
      flows: [flow1, flow2],
      totalSteps: flow1.total_steps + flow2.total_steps,
      overallSummary: {
        clear: flow1.summary.clear + flow2.summary.clear,
        ambiguous: flow1.summary.ambiguous + flow2.summary.ambiguous,
        blocked: flow1.summary.blocked + flow2.summary.blocked,
      },
    };
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'flows.json'), JSON.stringify(flowsJson, null, 2));

    log('\n=== FLOW RESULTS ===');
    log(`Flow 1 (${flow1.name}): ${flow1.summary.clear}/${flow1.total_steps} CLEAR`);
    log(`Flow 2 (${flow2.name}): ${flow2.summary.clear}/${flow2.total_steps} CLEAR`);
    log(`Total: ${flowsJson.overallSummary.clear}/${flowsJson.totalSteps} CLEAR`);

  } finally {
    await browser.close();
  }
  log(`Done in ${elapsed()}`);
}

run().catch(e => { console.error(e); process.exit(1); });
