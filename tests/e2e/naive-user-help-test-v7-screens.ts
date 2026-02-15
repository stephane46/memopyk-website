/**
 * Naive User Help Test V7 - Screen-by-Screen Validation
 *
 * Tests all 28 admin screens for help content quality:
 * - 12 direct sidebar screens
 * - 5 Blog Hub tabs
 * - 10 Analytics sub-tabs
 * - 1 secondary screen (Blog Editor)
 */

import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STAGING_URL = 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = 'memopyk2025admin';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'v7');

// Baseline chrome elements to exclude from "missed elements" evaluation
const BASELINE_ELEMENTS = [
  // Public nav
  'Notre service', 'Pourquoi MEMOPYK', 'Galerie', 'Blog', 'FAQ', 'Devis', 'Contact',
  // Sidebar items
  'Analytics', 'Blog', 'Agences de Voyage', 'Annuaire Pro', 'SEO', 'Vidéos Hero',
  'Galerie Vidéos', 'FAQ', 'Boutons CTA', 'Documents Légaux', 'AI Context', 'Cache',
  'Partenaires', 'Contenu Site', 'Système', 'Aide', 'Déconnexion',
  // Footer
  'Paramètres des cookies', 'Mentions légales', 'Conditions générales',
  // Date filters
  'Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom range',
  'Date Range:', 'Filters:',
  // Common labels
  'FR', 'EN', 'MEMOPYK', 'admin', 'Navigation', 'Sections', 'Légal',
];

interface ScreenTestResult {
  name: string;
  route: string;
  helpTitle: string;
  helpLength: number;
  titleMatch: boolean;
  referencesUI: boolean;
  missedElements: string[];
  jargonFound: string[];
  broken: boolean;
  helpExists: boolean;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
}

interface TestResults {
  timestamp: string;
  totalScreens: number;
  results: ScreenTestResult[];
  summary: {
    clear: number;
    ambiguous: number;
    blocked: number;
  };
}

// Screen definitions
const SCREENS = [
  // DIRECT SIDEBAR SCREENS (12)
  { name: 'Analytics', navPath: ['Analytics'], route: 'tab=analytics-new' },
  { name: 'Blog', navPath: ['Blog'], route: 'tab=blog' },
  { name: 'Agences de Voyage', navPath: ['Partenaires', 'Agences de Voyage'], route: 'tab=travel-agencies' },
  { name: 'Annuaire Pro', navPath: ['Partenaires', 'Annuaire Pro'], route: 'tab=partners' },
  { name: 'SEO', navPath: ['Contenu Site', 'SEO'], route: 'tab=seo' },
  { name: 'Vidéos Hero', navPath: ['Contenu Site', 'Vidéos Hero'], route: 'tab=hero-management' },
  { name: 'Galerie Vidéos', navPath: ['Contenu Site', 'Galerie Vidéos'], route: 'tab=gallery' },
  { name: 'FAQ', navPath: ['Contenu Site', 'FAQ'], route: 'tab=faq' },
  { name: 'Boutons CTA', navPath: ['Contenu Site', 'Boutons CTA'], route: 'tab=cta' },
  { name: 'Documents Légaux', navPath: ['Contenu Site', 'Documents Légaux'], route: 'tab=legal-docs' },
  { name: 'AI Context', navPath: ['Système', 'AI Context'], route: 'tab=ai-context' },
  { name: 'Cache', navPath: ['Système', 'Cache'], route: 'tab=cache' },

  // BLOG HUB TABS (5)
  { name: 'Keywords', navPath: ['Blog'], route: 'tab=keywords', tab: 'tab-keywords' },
  { name: 'Planned Posts', navPath: ['Blog'], route: 'tab=topics', tab: 'tab-topics' },
  { name: 'Planner', navPath: ['Blog'], route: 'tab=planner', tab: 'tab-planner' },
  { name: 'Posts', navPath: ['Blog'], route: 'tab=posts', tab: 'tab-posts' },
  { name: 'Image Bank', navPath: ['Blog'], route: 'tab=images', tab: 'tab-images' },

  // ANALYTICS SUB-TABS (10)
  { name: 'Analytics Overview', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=overview', analyticsTab: 'overview' },
  { name: 'Analytics Live View', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=live', analyticsTab: 'live' },
  { name: 'Analytics Trends', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=trends', analyticsTab: 'trends' },
  { name: 'Analytics Video', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=video', analyticsTab: 'video' },
  { name: 'Analytics Geo', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=geo', analyticsTab: 'geo' },
  { name: 'Analytics CTA', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=cta', analyticsTab: 'cta' },
  { name: 'Analytics Blog', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=blog', analyticsTab: 'blog' },
  { name: 'Analytics Clarity', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=clarity', analyticsTab: 'clarity' },
  { name: 'Analytics Fallback', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=fallback', analyticsTab: 'fallback' },
  { name: 'Analytics Exclusions', navPath: ['Analytics'], route: 'tab=analytics-new&an_tab=exclusions', analyticsTab: 'exclusions' },
];

const JARGON_PATTERNS = [
  /\bsupabase\b/i,
  /\bapi\b/i,
  /\bcdn\b/i,
  /\bjson\b/i,
  /\bschema\b/i,
  /\bendpoint\b/i,
  /\bmiddleware\b/i,
  /\borm\b/i,
  /\bdatabase\b/i,
  /\bbackend\b/i,
  /\bfrontend\b/i,
];

async function login(page: Page) {
  console.log('  Logging in...');
  await page.goto(`${STAGING_URL}/admin`);
  await page.waitForTimeout(2000);

  // Handle cookie consent if present
  const accept = page.getByRole('button', { name: /accept all|tout accepter/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
  }

  // Login
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /access admin/i }).click();
  await page.locator('.bg-gray-900.fixed').waitFor({ state: 'visible', timeout: 15000 });
  console.log('  ✓ Logged in');
}

async function collapseAllGroups(page: Page) {
  const sidebar = page.locator('.bg-gray-900.fixed');
  const groups = ['Partenaires', 'Contenu Site', 'Système'];

  for (const group of groups) {
    try {
      const groupBtn = sidebar.locator('button')
        .filter({ hasText: group })
        .filter({ has: page.locator('svg') })
        .first();

      const isExpanded = await groupBtn.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await groupBtn.click({ force: true });
        await page.waitForTimeout(300);
      }
    } catch (e) {
      // Ignore if group not found
    }
  }
}

async function navigateToScreen(page: Page, screen: any) {
  const sidebar = page.locator('.bg-gray-900.fixed');

  // First, collapse all groups to prevent overlapping
  await collapseAllGroups(page);
  await page.waitForTimeout(500);

  // Navigate through path
  for (let i = 0; i < screen.navPath.length; i++) {
    const item = screen.navPath[i];

    // If it's a group (has children), expand it
    if (i < screen.navPath.length - 1) {
      const groupBtn = sidebar.locator('button')
        .filter({ hasText: item })
        .filter({ has: page.locator('svg') })
        .first();

      const isExpanded = await groupBtn.getAttribute('aria-expanded');
      if (isExpanded !== 'true') {
        await groupBtn.click({ force: true });
        await page.waitForTimeout(300);
      }
    } else {
      // Click the final item
      await sidebar.locator('nav button')
        .filter({ has: page.locator(`span:text-is("${item}")`) })
        .first()
        .click({ force: true });
      await page.waitForTimeout(2000);
    }
  }

  // If it's a Blog Hub tab, click the tab
  if (screen.tab) {
    await page.getByTestId(screen.tab).click();
    await page.waitForTimeout(2000);
  }

  // If it's an Analytics sub-tab, click the tab
  if (screen.analyticsTab) {
    // Use data-testid for analytics tabs to avoid strict mode violations
    const testIdMap: Record<string, string> = {
      'overview': 'tab-overview',
      'live': 'tab-live',
      'trends': 'tab-trends',
      'video': 'tab-video',
      'geo': 'tab-geo',
      'cta': 'tab-cta',
      'blog': 'tab-blog',
      'clarity': 'tab-clarity',
      'fallback': 'tab-fallback',
      'exclusions': 'tab-exclusions',
    };
    const testId = testIdMap[screen.analyticsTab];
    if (testId) {
      await page.getByTestId(testId).click();
    } else {
      // Fallback to button with exact text
      const tabMap: Record<string, string> = {
        'overview': 'Overview',
        'live': 'Live View',
        'trends': 'Trends',
        'video': 'Video',
        'geo': 'Geo',
        'cta': 'CTA',
        'blog': 'Blog',
        'clarity': 'Clarity',
        'fallback': 'Fallback',
        'exclusions': 'Exclusions',
      };
      const tabText = tabMap[screen.analyticsTab];
      await page.locator(`button:has-text("${tabText}")`).last().click();
    }
    await page.waitForTimeout(2000);
  }
}

async function openHelp(page: Page) {
  // Collapse all groups first to prevent overlapping
  await collapseAllGroups(page);
  await page.waitForTimeout(300);

  const helpButton = page.locator('button:has-text("Aide")');
  await helpButton.click({ force: true });

  // Wait for help content
  await page.waitForSelector('.w-80 .prose h3', { timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(1000);
}

async function closeHelp(page: Page) {
  const helpButton = page.locator('button:has-text("Aide")');
  await helpButton.click({ force: true });
  await page.waitForTimeout(500);
}

async function extractVisibleElements(page: Page): Promise<string[]> {
  // Get all visible text content
  const elements = await page.evaluate(() => {
    const texts = new Set<string>();

    // Get all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) {
        // Check if element is visible
        const parent = node.parentElement;
        if (parent) {
          const style = window.getComputedStyle(parent);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            texts.add(text);
          }
        }
      }
    }

    // Also get aria-labels, placeholders, titles
    document.querySelectorAll('[aria-label], [placeholder], [title]').forEach(el => {
      const label = el.getAttribute('aria-label');
      const placeholder = el.getAttribute('placeholder');
      const title = el.getAttribute('title');
      if (label) texts.add(label);
      if (placeholder) texts.add(placeholder);
      if (title) texts.add(title);
    });

    return Array.from(texts);
  });

  return elements;
}

function isBaselineElement(text: string): boolean {
  return BASELINE_ELEMENTS.some(baseline =>
    text.toLowerCase().includes(baseline.toLowerCase()) ||
    baseline.toLowerCase().includes(text.toLowerCase())
  );
}

function evaluateScreen(
  screenName: string,
  helpTitle: string,
  helpText: string,
  visibleElements: string[]
): Omit<ScreenTestResult, 'name' | 'route'> {
  const helpLength = helpText.length;
  const helpExists = helpLength > 0;

  // Question a: Does help TITLE match the screen title?
  const titleMatch = helpTitle.toLowerCase().includes(screenName.toLowerCase()) ||
                     screenName.toLowerCase().includes(helpTitle.toLowerCase());

  // Question b: Does help reference visible UI elements?
  const adminElements = visibleElements.filter(el => !isBaselineElement(el));
  const referencedElements = adminElements.filter(el =>
    helpText.toLowerCase().includes(el.toLowerCase())
  );
  const referencesUI = referencedElements.length > 0;

  // Question c: Missed major admin-specific elements?
  const missedElements = adminElements
    .filter(el => !helpText.toLowerCase().includes(el.toLowerCase()))
    .filter(el => el.length > 5); // Ignore very short strings

  // Question d: Plain language check
  const jargonFound = JARGON_PATTERNS
    .filter(pattern => pattern.test(helpText))
    .map(pattern => pattern.source.replace(/\\b|\//g, ''));

  // Question e: Broken screen detection (basic heuristic)
  const broken = visibleElements.some(el =>
    el.includes('Error') ||
    el.includes('404') ||
    el.includes('Failed to load')
  );

  // Rating logic
  let rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED' = 'CLEAR';
  let justification = '';

  if (broken) {
    rating = 'BLOCKED';
    justification = 'Screen appears broken or failed to load';
  } else if (!helpExists) {
    rating = 'BLOCKED';
    justification = 'No help content found';
  } else if (!titleMatch) {
    rating = 'AMBIGUOUS';
    justification = 'Help title does not match screen name';
  } else if (!referencesUI) {
    rating = 'AMBIGUOUS';
    justification = 'Help does not reference any visible UI elements';
  } else if (jargonFound.length > 0) {
    rating = 'AMBIGUOUS';
    justification = `Technical jargon found: ${jargonFound.join(', ')}`;
  } else if (missedElements.length > 5) {
    rating = 'AMBIGUOUS';
    justification = `Many UI elements not mentioned in help (${missedElements.length} missed)`;
  } else {
    justification = 'Help content is clear, references UI, uses plain language';
  }

  return {
    helpTitle,
    helpLength,
    titleMatch,
    referencesUI,
    missedElements: missedElements.slice(0, 10), // Limit to 10 for readability
    jargonFound,
    broken,
    helpExists,
    rating,
    justification,
  };
}

async function testScreen(
  page: Page,
  screen: any,
  index: number
): Promise<ScreenTestResult> {
  console.log(`\n[${index + 1}/${SCREENS.length}] Testing: ${screen.name}`);

  try {
    // Navigate to screen
    await navigateToScreen(page, screen);
    console.log('  ✓ Navigated');

    // Screenshot UI
    const uiPath = path.join(SCREENSHOTS_DIR, `screen-${screen.name.toLowerCase().replace(/\s+/g, '-')}-ui.png`);
    await page.screenshot({ path: uiPath, fullPage: true });
    console.log(`  ✓ Screenshot: ${path.basename(uiPath)}`);

    // Extract visible elements BEFORE opening help
    const visibleElements = await extractVisibleElements(page);
    console.log(`  ✓ Found ${visibleElements.length} visible elements`);

    // Open help panel
    await openHelp(page);
    console.log('  ✓ Opened help');

    // Screenshot help
    const helpPath = path.join(SCREENSHOTS_DIR, `screen-${screen.name.toLowerCase().replace(/\s+/g, '-')}-help.png`);
    await page.screenshot({ path: helpPath, fullPage: true });
    console.log(`  ✓ Screenshot: ${path.basename(helpPath)}`);

    // Read help content
    const helpTitle = await page.locator('.w-80 .prose h3').first().textContent().catch(() => '');
    const helpText = await page.locator('.w-80 .prose').textContent().catch(() => '');
    console.log(`  ✓ Help title: "${helpTitle}" (${helpText.length} chars)`);

    // Close help
    await closeHelp(page);

    // Evaluate
    const evaluation = evaluateScreen(screen.name, helpTitle, helpText, visibleElements);
    console.log(`  ✓ Rating: ${evaluation.rating} - ${evaluation.justification}`);

    return {
      name: screen.name,
      route: screen.route,
      ...evaluation,
    };
  } catch (error) {
    console.error(`  ✗ Error testing ${screen.name}:`, error);
    return {
      name: screen.name,
      route: screen.route,
      helpTitle: '',
      helpLength: 0,
      titleMatch: false,
      referencesUI: false,
      missedElements: [],
      jargonFound: [],
      broken: true,
      helpExists: false,
      rating: 'BLOCKED',
      justification: `Test error: ${error}`,
    };
  }
}

async function main() {
  console.log('=== Naive User Help Test V7 - Screen Validation ===\n');

  // Ensure screenshots directory exists
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    // Login
    await login(page);

    // Test each screen
    const results: ScreenTestResult[] = [];
    for (let i = 0; i < SCREENS.length; i++) {
      const result = await testScreen(page, SCREENS[i], i);
      results.push(result);
    }

    // Generate summary
    const summary = {
      clear: results.filter(r => r.rating === 'CLEAR').length,
      ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
      blocked: results.filter(r => r.rating === 'BLOCKED').length,
    };

    const output: TestResults = {
      timestamp: new Date().toISOString(),
      totalScreens: SCREENS.length,
      results,
      summary,
    };

    // Save results
    const outputPath = path.join(SCREENSHOTS_DIR, 'screens.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✓ Results saved to: ${outputPath}`);

    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total screens: ${output.totalScreens}`);
    console.log(`CLEAR: ${summary.clear}`);
    console.log(`AMBIGUOUS: ${summary.ambiguous}`);
    console.log(`BLOCKED: ${summary.blocked}`);

    if (summary.ambiguous > 0 || summary.blocked > 0) {
      console.log('\n=== ISSUES ===');
      results
        .filter(r => r.rating !== 'CLEAR')
        .forEach(r => {
          console.log(`\n${r.name} [${r.rating}]:`);
          console.log(`  ${r.justification}`);
          if (r.jargonFound.length > 0) {
            console.log(`  Jargon: ${r.jargonFound.join(', ')}`);
          }
          if (r.missedElements.length > 0) {
            console.log(`  Missed: ${r.missedElements.slice(0, 3).join(', ')}...`);
          }
        });
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
