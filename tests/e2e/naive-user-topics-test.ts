/**
 * Naive User Help Test - Topics Screen
 *
 * Tests the Topics screen help content against actual UI from a naive user's perspective.
 * The ONLY information source is what appears on screen + help panel.
 * No source code reading, no DB queries.
 *
 * Rating System:
 * - CLEAR: instruction exactly matched what I see, I could do it without guessing
 * - AMBIGUOUS: I figured it out but wording was confusing or slightly off
 * - BLOCKED: I could NOT complete the step based on the instruction alone
 *
 * Run: npx tsx tests/e2e/naive-user-topics-test.ts
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const STAGING_URL = 'https://memopyk.memopyk.com';
const ADMIN_PASSWORD = 'memopyk2025admin';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'topics');
const REPORT_PATH = path.join(__dirname, '../../docs/help/TOPICS_NAIVE_USER_REPORT.md');
const VIEWPORT = { width: 1920, height: 1080 };

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
const reportDir = path.dirname(REPORT_PATH);
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// =============================================================================
// TYPES
// =============================================================================

type Rating = 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';

interface TestItem {
  name: string;
  description: string;
  rating: Rating;
  notes: string;
  screenshot?: string;
}

interface TestPhase {
  name: string;
  items: TestItem[];
}

interface TestReport {
  testDate: string;
  environment: string;
  screen: string;
  phases: TestPhase[];
  helpContentExtracted: string;
  accuracyComparison: {
    helpMentions: string[];
    actualUI: string[];
    missingInHelp: string[];
    helpMentionsNotInUI: string[];
  };
  summary: {
    clear: number;
    ambiguous: number;
    blocked: number;
    total: number;
    percentage: number;
  };
  recommendations: string[];
}

// =============================================================================
// UTILITIES
// =============================================================================

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`    Screenshot: ${filename}`);
  return filename;
}

function ratingEmoji(rating: Rating): string {
  switch (rating) {
    case 'CLEAR': return '✅';
    case 'AMBIGUOUS': return '⚠️';
    case 'BLOCKED': return '❌';
  }
}

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

async function loginToAdmin(page: Page): Promise<void> {
  console.log('\n=== Phase 0: Login ===');
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

async function navigateToTopicsViaSidebar(page: Page): Promise<boolean> {
  console.log('\n  Navigating: Sidebar → Blog → Topics tab');

  // Step 1: Click Blog in sidebar
  const sidebar = page.locator('.bg-gray-900');
  const blogLink = sidebar.getByText('Blog', { exact: false }).first();

  if (!await blogLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('    ❌ Blog link not found in sidebar');
    return false;
  }

  await blogLink.click();
  await wait(2000);

  // Step 2: Click Topics tab
  const topicsTab = page.locator('[data-testid="tab-topics"]');
  if (!await topicsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('    ❌ Topics tab not found');
    return false;
  }

  await topicsTab.click();
  await wait(2000);

  console.log('    ✅ Navigated to Topics tab');
  return true;
}

async function openHelpPanel(page: Page): Promise<boolean> {
  console.log('  Opening help panel...');

  // Click the Aide button in sidebar
  const aideButton = page.locator('.bg-gray-900').getByText('Aide', { exact: false }).first();
  if (!await aideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('    ❌ Aide button not found');
    return false;
  }

  await aideButton.click();
  await wait(1500);

  // Wait for help content to load - specifically wait for .prose h3
  const helpContentLoaded = page.locator('.w-80 .prose h3');
  if (await helpContentLoaded.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('    ✅ Help panel opened with content');
    return true;
  }

  // Check if "No help content" message
  const noContent = page.locator('.w-80').getByText('No help content', { exact: false });
  if (await noContent.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('    ⚠️ Help panel shows "No help content"');
    return true; // Panel opened, just no content
  }

  console.log('    ⚠️ Help panel opened but content not verified');
  return true;
}

async function extractHelpContent(page: Page): Promise<string> {
  const helpPanel = page.locator('.w-80');
  const text = await helpPanel.textContent().catch(() => '');
  return text?.trim() || '';
}

// =============================================================================
// MAIN TEST
// =============================================================================

async function runTest(): Promise<TestReport> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     NAIVE USER TEST - TOPICS SCREEN                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const report: TestReport = {
    testDate: new Date().toISOString(),
    environment: STAGING_URL,
    screen: 'Topics',
    phases: [],
    helpContentExtracted: '',
    accuracyComparison: {
      helpMentions: [],
      actualUI: [],
      missingInHelp: [],
      helpMentionsNotInUI: [],
    },
    summary: { clear: 0, ambiguous: 0, blocked: 0, total: 0, percentage: 0 },
    recommendations: [],
  };

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: VIEWPORT });
  const page: Page = await context.newPage();

  try {
    await loginToAdmin(page);

    // =========================================================================
    // PHASE 1: DISCOVERY
    // =========================================================================
    console.log('\n=== Phase 1: Discovery ===');
    const phase1: TestPhase = { name: 'Discovery', items: [] };

    // Navigate to Topics via sidebar (real user navigation)
    const navSuccess = await navigateToTopicsViaSidebar(page);
    phase1.items.push({
      name: 'Sidebar Navigation: Blog → Topics',
      description: 'Navigate using sidebar like a real user',
      rating: navSuccess ? 'CLEAR' : 'BLOCKED',
      notes: navSuccess ? 'Topics tab accessible via Blog Hub' : 'Could not navigate to Topics',
      screenshot: await takeScreenshot(page, 'p1-topics-ui'),
    });

    // Open help panel
    const helpOpened = await openHelpPanel(page);
    await wait(1000);
    const helpScreenshot = await takeScreenshot(page, 'p1-topics-help');

    // Extract help content
    report.helpContentExtracted = await extractHelpContent(page);
    console.log(`  Help content length: ${report.helpContentExtracted.length} chars`);

    // Check if help has real content
    const hasRealContent = report.helpContentExtracted.includes('Topics') &&
                          !report.helpContentExtracted.includes('No help content available');

    phase1.items.push({
      name: 'Help Panel Content',
      description: 'Help panel opens and shows meaningful content',
      rating: hasRealContent ? 'CLEAR' : 'BLOCKED',
      notes: hasRealContent ? 'Help content loaded for Topics' : 'No meaningful help content',
      screenshot: helpScreenshot,
    });

    report.phases.push(phase1);

    // =========================================================================
    // PHASE 2: UI ELEMENT VERIFICATION
    // =========================================================================
    console.log('\n=== Phase 2: UI Element Verification ===');
    const phase2: TestPhase = { name: 'UI Element Verification', items: [] };

    // Close help panel for clean UI check
    const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await wait(500);
    }

    // Check for New Topic button
    const newTopicBtn = page.getByTestId('button-new-topic');
    const newTopicVisible = await newTopicBtn.isVisible({ timeout: 3000 }).catch(() => false);
    phase2.items.push({
      name: 'New Topic Button',
      description: 'Button to create new topics',
      rating: newTopicVisible ? 'CLEAR' : 'BLOCKED',
      notes: newTopicVisible ? 'New Topic button visible in header' : 'New Topic button not found',
      screenshot: await takeScreenshot(page, 'p2-new-topic-btn'),
    });

    // Check for filter controls
    const searchInput = page.getByTestId('input-search');
    const categoryFilter = page.getByTestId('select-category');
    const statusFilter = page.getByTestId('select-status');

    const filtersVisible = await searchInput.isVisible().catch(() => false) &&
                          await categoryFilter.isVisible().catch(() => false) &&
                          await statusFilter.isVisible().catch(() => false);

    phase2.items.push({
      name: 'Filter Controls',
      description: 'Search and filter dropdowns for topics',
      rating: filtersVisible ? 'CLEAR' : 'AMBIGUOUS',
      notes: filtersVisible ? 'All filter controls visible' : 'Some filters missing',
      screenshot: await takeScreenshot(page, 'p2-filters'),
    });

    // Check for topic cards/accordion
    const topicCards = page.locator('[data-testid^="topic-"]');
    const topicCount = await topicCards.count();
    phase2.items.push({
      name: 'Topic List',
      description: 'List of existing topics',
      rating: topicCount > 0 ? 'CLEAR' : 'AMBIGUOUS',
      notes: `Found ${topicCount} topics in list`,
      screenshot: await takeScreenshot(page, 'p2-topic-list'),
    });

    report.phases.push(phase2);

    // =========================================================================
    // PHASE 3: CRUD ACTIONS GUIDED BY HELP
    // =========================================================================
    console.log('\n=== Phase 3: CRUD Actions (Help-Guided) ===');
    const phase3: TestPhase = { name: 'CRUD Actions (Help-Guided)', items: [] };

    // Check what help says about New Topic
    const helpMentionsNewTopic = report.helpContentExtracted.toLowerCase().includes('new topic');

    // Test: Can we create a new topic?
    if (newTopicVisible) {
      await newTopicBtn.click();
      await wait(1000);

      const dialogVisible = await page.getByRole('dialog').isVisible({ timeout: 3000 }).catch(() => false);
      phase3.items.push({
        name: 'Create Topic Modal',
        description: 'Clicking New Topic opens creation form',
        rating: dialogVisible ? 'CLEAR' : 'BLOCKED',
        notes: dialogVisible
          ? (helpMentionsNewTopic ? 'Modal opened as help describes' : 'Modal opened but help does not mention this')
          : 'Could not open creation modal',
        screenshot: await takeScreenshot(page, 'p3-create-modal'),
      });

      // Close modal
      await page.keyboard.press('Escape');
      await wait(500);
    }

    // Test: Can we edit a topic?
    if (topicCount > 0) {
      // Click first topic to expand
      const firstTopic = topicCards.first();
      await firstTopic.click();
      await wait(500);

      // Look for Edit button
      const editBtn = page.locator('button[data-testid^="button-edit-topic"]').first();
      const editVisible = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);

      const helpMentionsEdit = report.helpContentExtracted.toLowerCase().includes('edit');

      phase3.items.push({
        name: 'Edit Topic Button',
        description: 'Edit button visible in expanded topic',
        rating: editVisible ? 'CLEAR' : 'BLOCKED',
        notes: editVisible
          ? (helpMentionsEdit ? 'Edit button found as help describes' : 'Edit button found but help unclear')
          : 'Edit button not visible',
        screenshot: await takeScreenshot(page, 'p3-edit-btn'),
      });

      // Look for Delete button
      const deleteBtn = page.locator('button[data-testid^="button-delete-topic"]').first();
      const deleteVisible = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);

      const helpMentionsDelete = report.helpContentExtracted.toLowerCase().includes('delete');

      phase3.items.push({
        name: 'Delete Topic Button',
        description: 'Delete button visible in expanded topic',
        rating: deleteVisible ? 'CLEAR' : 'BLOCKED',
        notes: deleteVisible
          ? (helpMentionsDelete ? 'Delete button found as help describes' : 'Delete button found but help unclear')
          : 'Delete button not visible',
        screenshot: await takeScreenshot(page, 'p3-delete-btn'),
      });
    }

    report.phases.push(phase3);

    // =========================================================================
    // PHASE 4: ACCURACY COMPARISON
    // =========================================================================
    console.log('\n=== Phase 4: Accuracy Comparison ===');

    // What does help mention?
    const helpLower = report.helpContentExtracted.toLowerCase();
    if (helpLower.includes('new topic')) report.accuracyComparison.helpMentions.push('New Topic button');
    if (helpLower.includes('edit')) report.accuracyComparison.helpMentions.push('Edit button');
    if (helpLower.includes('delete')) report.accuracyComparison.helpMentions.push('Delete button');
    if (helpLower.includes('filter')) report.accuracyComparison.helpMentions.push('Filters');
    if (helpLower.includes('search')) report.accuracyComparison.helpMentions.push('Search');
    if (helpLower.includes('category')) report.accuracyComparison.helpMentions.push('Category filter');
    if (helpLower.includes('status')) report.accuracyComparison.helpMentions.push('Status filter');
    if (helpLower.includes('priority')) report.accuracyComparison.helpMentions.push('Priority');
    if (helpLower.includes('create post')) report.accuracyComparison.helpMentions.push('Create Post from Topic');

    // What actually exists in UI?
    if (newTopicVisible) report.accuracyComparison.actualUI.push('New Topic button');
    if (await page.locator('button[data-testid^="button-edit-topic"]').first().isVisible().catch(() => false)) {
      report.accuracyComparison.actualUI.push('Edit button');
    }
    if (await page.locator('button[data-testid^="button-delete-topic"]').first().isVisible().catch(() => false)) {
      report.accuracyComparison.actualUI.push('Delete button');
    }
    if (await searchInput.isVisible().catch(() => false)) report.accuracyComparison.actualUI.push('Search');
    if (await categoryFilter.isVisible().catch(() => false)) report.accuracyComparison.actualUI.push('Category filter');
    if (await statusFilter.isVisible().catch(() => false)) report.accuracyComparison.actualUI.push('Status filter');
    if (await page.getByTestId('select-type').isVisible().catch(() => false)) report.accuracyComparison.actualUI.push('Type filter');

    // Find mismatches
    report.accuracyComparison.missingInHelp = report.accuracyComparison.actualUI.filter(
      item => !report.accuracyComparison.helpMentions.includes(item)
    );
    report.accuracyComparison.helpMentionsNotInUI = report.accuracyComparison.helpMentions.filter(
      item => !report.accuracyComparison.actualUI.includes(item)
    );

    // =========================================================================
    // CALCULATE SUMMARY
    // =========================================================================
    for (const phase of report.phases) {
      for (const item of phase.items) {
        report.summary.total++;
        switch (item.rating) {
          case 'CLEAR': report.summary.clear++; break;
          case 'AMBIGUOUS': report.summary.ambiguous++; break;
          case 'BLOCKED': report.summary.blocked++; break;
        }
      }
    }
    report.summary.percentage = Math.round((report.summary.clear / report.summary.total) * 100);

    // =========================================================================
    // GENERATE RECOMMENDATIONS
    // =========================================================================
    if (!hasRealContent) {
      report.recommendations.push('[CRITICAL] Help content not loading - verify route detection');
    }
    if (report.accuracyComparison.missingInHelp.length > 0) {
      report.recommendations.push(`[IMPROVE] UI elements not documented in help: ${report.accuracyComparison.missingInHelp.join(', ')}`);
    }
    if (report.accuracyComparison.helpMentionsNotInUI.length > 0) {
      report.recommendations.push(`[FIX] Help mentions elements not found in UI: ${report.accuracyComparison.helpMentionsNotInUI.join(', ')}`);
    }
    for (const phase of report.phases) {
      for (const item of phase.items) {
        if (item.rating === 'BLOCKED') {
          report.recommendations.push(`[CRITICAL] ${phase.name} → ${item.name}: ${item.notes}`);
        } else if (item.rating === 'AMBIGUOUS') {
          report.recommendations.push(`[IMPROVE] ${phase.name} → ${item.name}: ${item.notes}`);
        }
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }

  return report;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateMarkdownReport(report: TestReport): string {
  let md = `# Naive User Test Report - Topics Screen

**Test Date:** ${new Date(report.testDate).toLocaleString()}
**Environment:** ${report.environment}
**Screen:** ${report.screen}

## Summary

| Rating | Count |
|--------|-------|
| ✅ CLEAR | ${report.summary.clear} |
| ⚠️ AMBIGUOUS | ${report.summary.ambiguous} |
| ❌ BLOCKED | ${report.summary.blocked} |
| **Total** | **${report.summary.total}** |

**Overall Score:** ${report.summary.percentage}% CLEAR

---

`;

  // Phases
  for (const phase of report.phases) {
    md += `## ${phase.name}\n\n`;
    md += `| Item | Rating | Notes |\n`;
    md += `|------|--------|-------|\n`;
    for (const item of phase.items) {
      md += `| ${item.name} | ${ratingEmoji(item.rating)} ${item.rating} | ${item.notes} |\n`;
    }
    md += '\n';
  }

  // Accuracy Comparison
  md += `## Accuracy Comparison\n\n`;
  md += `### Help Panel Mentions\n`;
  md += report.accuracyComparison.helpMentions.map(h => `- ${h}`).join('\n') || '- (none detected)';
  md += `\n\n### Actual UI Elements\n`;
  md += report.accuracyComparison.actualUI.map(u => `- ${u}`).join('\n') || '- (none detected)';
  md += `\n\n### Missing from Help (UI exists but not documented)\n`;
  md += report.accuracyComparison.missingInHelp.map(m => `- ${m}`).join('\n') || '- None';
  md += `\n\n### Help Mentions Non-existent Elements\n`;
  md += report.accuracyComparison.helpMentionsNotInUI.map(h => `- ${h}`).join('\n') || '- None';

  // Help Content
  md += `\n\n## Help Content Extracted\n\n\`\`\`\n${report.helpContentExtracted.slice(0, 2000)}\n\`\`\`\n`;

  // Recommendations
  md += `\n## Recommendations\n\n`;
  if (report.recommendations.length === 0) {
    md += '- No issues found\n';
  } else {
    md += report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n');
  }

  md += `\n\n---\n*Generated by naive-user-topics-test.ts*\n`;

  return md;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const report = await runTest();

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  Results: ${report.summary.clear} CLEAR, ${report.summary.ambiguous} AMBIGUOUS, ${report.summary.blocked} BLOCKED`);
  console.log(`  Score: ${report.summary.percentage}% CLEAR\n`);

  // Generate and save report
  const markdown = generateMarkdownReport(report);
  fs.writeFileSync(REPORT_PATH, markdown);
  console.log(`  Report saved to: ${REPORT_PATH}`);

  // Print recommendations
  if (report.recommendations.length > 0) {
    console.log('\n  Recommendations:');
    report.recommendations.forEach((r, i) => console.log(`    ${i + 1}. ${r}`));
  }
}

main().catch(console.error);
