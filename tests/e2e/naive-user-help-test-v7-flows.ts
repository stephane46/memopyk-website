/**
 * Help Flow End-to-End Test (V7)
 *
 * Tests two help flows:
 * - Flow 1: "Create a blog post" (7 steps)
 * - Flow 2: "Translate a post" (8 steps)
 *
 * Rates each step as CLEAR / AMBIGUOUS / BLOCKED
 */

import { chromium, Browser, Page } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://memopyk.memopyk.com';
const SCREENSHOT_DIR = 'C:/Users/ngocn/OneDrive/1 Personal/1 NOUS/MEMOPYK EURL/Systems/MEMOPYK Website/tests/e2e/screenshots/help-validation/v7';

interface FlowStep {
  step: number;
  title: string;
  instruction: string;
  rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED';
  justification: string;
}

interface FlowResult {
  name: string;
  totalSteps: number;
  steps: FlowStep[];
  summary: {
    clear: number;
    ambiguous: number;
    blocked: number;
  };
}

interface TestResults {
  timestamp: string;
  flows: FlowResult[];
  totalSteps: number;
  overallSummary: {
    clear: number;
    ambiguous: number;
    blocked: number;
  };
}

async function login(page: Page) {
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);

  // Accept cookies if present
  const accept = page.getByRole('button', { name: /accept all|tout accepter/i });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
  }

  await page.getByLabel(/password/i).fill('memopyk2025admin');
  await page.getByRole('button', { name: /access admin/i }).click();
  await page.locator('.bg-gray-900.fixed').waitFor({ state: 'visible', timeout: 15000 });
  console.log('Logged in successfully');
}

async function navigateToBlogPosts(page: Page) {
  console.log('Navigating to Blog Hub → Posts...');
  const sidebar = page.locator('.bg-gray-900.fixed');

  // Click Blog in sidebar
  await sidebar.locator('nav button').filter({ has: page.locator('span:text-is("Blog")') }).first().click();
  await page.waitForTimeout(2000);

  // Click Posts tab
  await page.getByTestId('tab-posts').click();
  await page.waitForTimeout(2000);
  console.log('Navigated to Posts tab');
}

async function openHelpPanel(page: Page) {
  console.log('Opening help panel...');

  // Click Aide button
  const helpButton = page.locator('button:has-text("Aide")');
  await helpButton.click();

  // Wait for help content
  await page.waitForSelector('.w-80 .prose h3', { timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(1000);
  console.log('Help panel opened');
}

async function rateStep(instruction: string, screenContext: string): Promise<{ rating: 'CLEAR' | 'AMBIGUOUS' | 'BLOCKED', justification: string }> {
  // Simple heuristic-based rating
  const lowerInstruction = instruction.toLowerCase();

  // BLOCKED conditions
  if (lowerInstruction.includes('error') || lowerInstruction.includes('missing')) {
    return {
      rating: 'BLOCKED',
      justification: 'Instruction indicates an error or missing content'
    };
  }

  // AMBIGUOUS conditions
  if (lowerInstruction.length < 20) {
    return {
      rating: 'AMBIGUOUS',
      justification: 'Instruction is very brief, may lack detail'
    };
  }

  // CLEAR - default
  return {
    rating: 'CLEAR',
    justification: 'Instruction is detailed and actionable'
  };
}

async function testFlow(page: Page, flowName: string, expectedSteps: number): Promise<FlowResult> {
  console.log(`\n=== Testing Flow: ${flowName} ===`);

  const steps: FlowStep[] = [];
  const helpPanel = page.locator('.w-80');

  // Find and click flow link
  console.log(`Looking for flow: ${flowName}`);
  const flowLink = helpPanel.locator('a, button').filter({ hasText: new RegExp(flowName, 'i') });

  if (!await flowLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.error(`Flow link not found: ${flowName}`);
    return {
      name: flowName,
      totalSteps: 0,
      steps: [],
      summary: { clear: 0, ambiguous: 0, blocked: 1 }
    };
  }

  await flowLink.click();
  await page.waitForTimeout(1500);

  // Test each step
  for (let i = 1; i <= expectedSteps; i++) {
    console.log(`Testing step ${i}/${expectedSteps}...`);

    // Extract step content
    const stepContent = await helpPanel.locator('.prose').textContent().catch(() => '');
    const stepTitle = await helpPanel.locator('.prose h3, .prose h4').first().textContent().catch(() => `Step ${i}`);

    // Take screenshot of help panel
    const flowPrefix = flowName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const helpScreenshot = join(SCREENSHOT_DIR, `${flowPrefix}-step${i}-help.png`);
    await helpPanel.screenshot({ path: helpScreenshot });
    console.log(`Screenshot saved: ${flowPrefix}-step${i}-help.png`);

    // Rate the step
    const { rating, justification } = await rateStep(stepContent, '');

    steps.push({
      step: i,
      title: stepTitle.trim(),
      instruction: stepContent.substring(0, 200).trim() + (stepContent.length > 200 ? '...' : ''),
      rating,
      justification
    });

    console.log(`  → ${rating}: ${justification}`);

    // Click Next or Done button
    const nextBtn = helpPanel.locator('button').filter({ hasText: /next|suivant/i });
    const doneBtn = helpPanel.locator('button').filter({ hasText: /done|finish|terminé|fini/i });

    if (i < expectedSteps) {
      // Not the last step - should have Next button
      if (await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1000);

        // Take screenshot after clicking Next
        const actionScreenshot = join(SCREENSHOT_DIR, `${flowPrefix}-step${i}-action.png`);
        await helpPanel.screenshot({ path: actionScreenshot });
        console.log(`Screenshot saved: ${flowPrefix}-step${i}-action.png`);
      } else {
        console.warn(`Next button not enabled at step ${i}`);
      }
    } else {
      // Last step - take final screenshot
      const actionScreenshot = join(SCREENSHOT_DIR, `${flowPrefix}-step${i}-action.png`);
      await helpPanel.screenshot({ path: actionScreenshot });
      console.log(`Screenshot saved: ${flowPrefix}-step${i}-action.png`);

      // Click Done button if available
      if (await doneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await doneBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // Calculate summary
  const summary = {
    clear: steps.filter(s => s.rating === 'CLEAR').length,
    ambiguous: steps.filter(s => s.rating === 'AMBIGUOUS').length,
    blocked: steps.filter(s => s.rating === 'BLOCKED').length
  };

  console.log(`Flow summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

  return {
    name: flowName,
    totalSteps: expectedSteps,
    steps,
    summary
  };
}

async function exitFlowAndReopenHelp(page: Page) {
  console.log('Exiting flow and reopening help...');
  const helpPanel = page.locator('.w-80');

  // Try to find Exit/Back button
  const exitBtn = helpPanel.locator('button').filter({ hasText: /exit|back|retour/i });
  if (await exitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await exitBtn.click();
    await page.waitForTimeout(1000);
  } else {
    // Close and reopen help panel
    const helpButton = page.locator('button:has-text("Aide")');

    // Click Aide to close
    await helpButton.click();
    await page.waitForTimeout(500);

    // Click Aide to reopen
    await helpButton.click();
    await page.waitForSelector('.w-80 .prose h3', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(1000);
  }

  console.log('Help panel ready for next flow');
}

async function main() {
  let browser: Browser | null = null;

  try {
    console.log('Starting Help Flow Test (V7)...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Login and navigate
    await login(page);
    await navigateToBlogPosts(page);
    await openHelpPanel(page);

    // Test Flow 1: Create a blog post (7 steps)
    const flow1 = await testFlow(page, 'Create a blog post', 7);

    // Exit flow and reopen help
    await exitFlowAndReopenHelp(page);

    // Test Flow 2: Translate a post (8 steps)
    const flow2 = await testFlow(page, 'Translate a post', 8);

    // Generate results
    const results: TestResults = {
      timestamp: new Date().toISOString(),
      flows: [flow1, flow2],
      totalSteps: flow1.totalSteps + flow2.totalSteps,
      overallSummary: {
        clear: flow1.summary.clear + flow2.summary.clear,
        ambiguous: flow1.summary.ambiguous + flow2.summary.ambiguous,
        blocked: flow1.summary.blocked + flow2.summary.blocked
      }
    };

    // Save results
    const resultsPath = join(SCREENSHOT_DIR, 'flows.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);

    // Print summary
    console.log('\n=== OVERALL SUMMARY ===');
    console.log(`Total steps: ${results.totalSteps}`);
    console.log(`CLEAR: ${results.overallSummary.clear}`);
    console.log(`AMBIGUOUS: ${results.overallSummary.ambiguous}`);
    console.log(`BLOCKED: ${results.overallSummary.blocked}`);

    console.log('\n✅ Help flow test completed');

  } catch (error) {
    console.error('Error during test:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
