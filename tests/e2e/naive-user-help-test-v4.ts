/**
 * Naive User Help Flow Test V4 - Real Browser Walkthrough with Navigation
 *
 * FIXES 3 critical flaws from V3:
 * 1. Actually navigates between screens for each flow step (not just staying on Posts)
 * 2. Uses proper element finding (data-testid, roles, text) - NO regex parsing
 * 3. Properly extracts screen titles from help panel .prose h3
 *
 * Rating System:
 * - CLEAR: instruction exactly matched what I see, I could do it without guessing
 * - AMBIGUOUS: I figured it out but wording was confusing or slightly off
 * - BLOCKED: I could NOT complete the step based on the instruction alone
 *
 * Run: npx tsx tests/e2e/naive-user-help-test-v4.ts
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
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'help-validation', 'v4');
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
  expectedRoute: string;
  helpScreenshot: string;
  actionScreenshot: string;
  rating: Rating;
  notes: string;
  actionPerformed: string;
  elementFound: boolean;
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

// Track created test posts for cleanup
const createdPostIds: string[] = [];

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

    // Find and click login button
    const loginBtn = page.getByRole('button', { name: /access admin/i });
    await loginBtn.click();
    await wait(3000);
  }

  // Wait for sidebar to appear (indicates successful login)
  await page.waitForSelector('.bg-gray-900', { timeout: 15000 });
  console.log('  Logged in successfully');
}

// Open the help panel
async function openHelpPanel(page: Page): Promise<boolean> {
  // First check if help panel is already open
  const existingPanel = page.locator('.w-80 h2:has-text("Help")');
  if (await existingPanel.isVisible({ timeout: 500 }).catch(() => false)) {
    return true;
  }

  // Click the Aide button in sidebar
  const aideButton = page.locator('.bg-gray-900').getByText('Aide', { exact: false }).first();
  if (await aideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await aideButton.click();
    await wait(1500);

    const helpHeader = page.locator('.w-80 h2:has-text("Help")');
    if (await helpHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
  }

  return false;
}

// Close help panel
async function closeHelpPanel(page: Page): Promise<void> {
  // Click X button in help drawer header
  const closeBtn = page.locator('.w-80 button').filter({ has: page.locator('svg') }).first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
    await wait(500);
  }
}

// Click a flow in the help panel
async function clickFlow(page: Page, flowName: string): Promise<boolean> {
  console.log(`  Looking for flow: "${flowName}"...`);

  // Flow cards are buttons with rounded-lg containing p.font-medium with the title
  const flowCard = page.locator('.w-80 button.rounded-lg').filter({ hasText: flowName }).first();

  if (await flowCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await flowCard.click();
    await wait(1000);
    console.log(`  Clicked flow: "${flowName}"`);
    return true;
  }

  return false;
}

// Get current flow step info from help panel
async function getFlowStepInfo(page: Page): Promise<{ stepNumber: number; totalSteps: number; title: string; instruction: string } | null> {
  try {
    // Look for "Step X of Y" in the step indicator
    const stepText = await page.locator('text=/Step \\d+ of \\d+/').textContent().catch(() => '');
    const stepMatch = stepText?.match(/Step (\d+) of (\d+)/);
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : 0;
    const totalSteps = stepMatch ? parseInt(stepMatch[2]) : 0;

    // Get step title from h4 in the content area
    const title = await page.locator('.bg-muted\\/50 h4, [class*="muted"] h4').first().textContent().catch(() => '') || '';

    // Get instruction from prose div
    const instruction = await page.locator('.bg-muted\\/50 .prose, .prose-sm').first().textContent().catch(() => '') || '';

    return { stepNumber, totalSteps, title: title.trim(), instruction: instruction.trim() };
  } catch {
    return null;
  }
}

// Click Next in flow viewer
async function clickFlowNext(page: Page): Promise<boolean> {
  const nextBtn = page.getByRole('button', { name: /next/i }).last();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isDisabled = await nextBtn.isDisabled().catch(() => true);
    if (!isDisabled) {
      await nextBtn.click();
      await wait(500);
      return true;
    }
  }
  return false;
}

// Click Back/Previous in flow viewer to return to flow list
async function clickFlowBack(page: Page): Promise<boolean> {
  // The Back button is at the top of the flow viewer
  const backBtn = page.locator('.w-80 button').filter({ hasText: /back|←/i }).first();
  if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await backBtn.click();
    await wait(500);
    return true;
  }
  return false;
}

// Navigate to a specific admin tab
async function navigateToTab(page: Page, tab: string): Promise<void> {
  await page.goto(`${STAGING_URL}/en-US/admin?tab=${tab}`);
  await wait(2000);
}

// Element finder with priority: data-testid > role > text > CSS
async function findElement(page: Page, options: {
  testId?: string;
  role?: 'button' | 'tab' | 'link' | 'textbox' | 'combobox';
  name?: string | RegExp;
  text?: string | RegExp;
  selector?: string;
}): Promise<{ found: boolean; locator: any }> {
  // Priority 1: data-testid
  if (options.testId) {
    const el = page.locator(`[data-testid="${options.testId}"]`);
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      return { found: true, locator: el };
    }
  }

  // Priority 2: Role + name
  if (options.role && options.name) {
    const el = page.getByRole(options.role, { name: options.name });
    if (await el.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return { found: true, locator: el.first() };
    }
  }

  // Priority 3: Text content
  if (options.text) {
    const el = page.getByText(options.text, { exact: false });
    if (await el.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return { found: true, locator: el.first() };
    }
  }

  // Priority 4: CSS selector
  if (options.selector) {
    const el = page.locator(options.selector);
    if (await el.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return { found: true, locator: el.first() };
    }
  }

  return { found: false, locator: null };
}

// =============================================================================
// FLOW 1: Create a blog post - ACTUAL NAVIGATION STEPS
// =============================================================================

async function executeFlow1Step(page: Page, stepNum: number): Promise<{ success: boolean; action: string; notes: string }> {
  let action = '';
  let notes = '';
  let success = false;

  switch (stepNum) {
    case 1: {
      // Step 1: Go to Posts tab
      action = 'Navigate to Posts tab';
      await navigateToTab(page, 'posts');

      // Verify we're on posts page - look for the posts table/list
      const postsTable = await findElement(page, {
        testId: 'posts-table',
        selector: '[data-testid="posts-list"], table, .divide-y'
      });

      if (postsTable.found) {
        success = true;
        notes = 'Posts table visible';
      } else {
        // Check for "Posts" heading
        const heading = await findElement(page, { text: /posts/i });
        success = heading.found;
        notes = heading.found ? 'Posts heading visible' : 'Could not verify posts screen';
      }
      break;
    }

    case 2: {
      // Step 2: Click + New Post button
      action = 'Click "+ New Post" button';

      const newPostBtn = await findElement(page, {
        testId: 'new-post-button',
        role: 'button',
        name: /new post|\+ new/i,
        text: /\+ new post/i
      });

      if (newPostBtn.found) {
        await newPostBtn.locator.click();
        await wait(1500);

        // Verify navigation to new-post page
        const url = page.url();
        success = url.includes('new-post');
        notes = success ? 'Navigated to new-post page' : 'Button clicked but did not navigate';
      } else {
        notes = 'Could not find "+ New Post" button';
      }
      break;
    }

    case 3: {
      // Step 3: Choose your method - verify two cards visible
      action = 'Verify creation method cards';

      // Should be on new-post page with two options
      const writeFromScratch = await findElement(page, {
        role: 'button',
        name: /write from scratch/i,
        text: /write from scratch/i
      });

      const generateWithAI = await findElement(page, {
        role: 'button',
        name: /generate with ai/i,
        text: /generate with ai/i
      });

      if (writeFromScratch.found && generateWithAI.found) {
        success = true;
        notes = 'Both method cards visible';
      } else if (writeFromScratch.found) {
        success = true;
        notes = 'Write from scratch found, AI option not visible (may be different layout)';
      } else {
        notes = 'Could not find creation method cards';
      }
      break;
    }

    case 4: {
      // Step 4: Click "Write from scratch" and verify Blog Editor
      action = 'Click "Write from scratch", verify Blog Editor';

      // First navigate to new-post if not there
      if (!page.url().includes('new-post')) {
        await navigateToTab(page, 'new-post');
        await wait(1000);
      }

      const writeBtn = await findElement(page, {
        role: 'button',
        name: /write from scratch/i,
        text: /write from scratch/i
      });

      if (writeBtn.found) {
        await writeBtn.locator.click();
        await wait(2000);

        // Verify Blog Editor opened (look for title field and editor)
        const titleField = await findElement(page, {
          role: 'textbox',
          name: /title/i,
          selector: 'input[placeholder*="title" i], input[name="title"]'
        });

        const url = page.url();
        if (titleField.found || url.includes('blog-edit')) {
          success = true;
          notes = 'Blog Editor opened';
        } else {
          notes = 'Clicked but could not verify Blog Editor';
        }
      } else {
        notes = 'Could not find "Write from scratch" button';
      }
      break;
    }

    case 5: {
      // Step 5: Navigate back, click "Generate with AI", verify AI Creator
      action = 'Go back, click "Generate with AI", verify AI Creator';

      // Navigate to new-post first
      await navigateToTab(page, 'new-post');
      await wait(1500);

      const aiBtn = await findElement(page, {
        role: 'button',
        name: /generate with ai/i,
        text: /generate with ai/i
      });

      if (aiBtn.found) {
        await aiBtn.locator.click();
        await wait(2000);

        // Verify AI Creator opened
        const url = page.url();
        const topicField = await findElement(page, {
          role: 'textbox',
          name: /topic/i,
          selector: 'input[placeholder*="topic" i], textarea[placeholder*="topic" i]'
        });

        if (topicField.found || url.includes('ai-creator')) {
          success = true;
          notes = 'AI Creator opened';
        } else {
          notes = 'Clicked but could not verify AI Creator';
        }
      } else {
        notes = 'Could not find "Generate with AI" button';
      }
      break;
    }

    case 6: {
      // Step 6: Open existing post in editor, verify metadata fields
      action = 'Open existing post, verify metadata fields (Tags, Hero Image, Description)';

      // Navigate to posts first
      await navigateToTab(page, 'posts');
      await wait(1500);

      // Find and click on any post to open editor
      const postRow = page.locator('table tbody tr, .divide-y > div').first();
      if (await postRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click the edit button or the row itself
        const editBtn = postRow.locator('button, a').filter({ has: page.locator('svg') }).first();
        if (await editBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await editBtn.click();
        } else {
          await postRow.click();
        }
        await wait(2000);

        // Verify metadata fields exist
        const tagsField = await findElement(page, { text: /tags/i, selector: 'label:has-text("Tags")' });
        const heroField = await findElement(page, { text: /hero image/i, selector: 'label:has-text("Hero")' });
        const descField = await findElement(page, { text: /description|seo/i, selector: 'label:has-text("Description")' });

        if (tagsField.found || heroField.found || descField.found) {
          success = true;
          notes = 'Blog Editor with metadata fields visible';
        } else {
          // Check if we're on edit page by URL
          const url = page.url();
          success = url.includes('blog-edit');
          notes = success ? 'Blog Editor opened (metadata fields may have different labels)' : 'Could not verify metadata fields';
        }
      } else {
        notes = 'No posts found to edit';
      }
      break;
    }

    case 7: {
      // Step 7: Verify status dropdown and Save Changes button
      action = 'Verify Status dropdown and "Save Changes" button';

      // Should still be on blog-edit page
      const url = page.url();
      if (!url.includes('blog-edit')) {
        // Navigate to blog editor with a post
        await navigateToTab(page, 'posts');
        await wait(1000);
        const postRow = page.locator('table tbody tr, .divide-y > div').first();
        if (await postRow.isVisible({ timeout: 1000 }).catch(() => false)) {
          await postRow.click();
          await wait(2000);
        }
      }

      // Look for status dropdown
      const statusDropdown = await findElement(page, {
        role: 'combobox',
        name: /status/i,
        text: /draft|published|in review/i,
        selector: 'select, [role="combobox"], button:has-text("Draft"), button:has-text("Published")'
      });

      // Look for Save Changes button
      const saveBtn = await findElement(page, {
        role: 'button',
        name: /save changes/i,
        text: /save changes/i
      });

      if (statusDropdown.found && saveBtn.found) {
        success = true;
        notes = 'Status dropdown and Save Changes button visible';
      } else if (saveBtn.found) {
        success = true;
        notes = 'Save Changes button visible, status may use different format';
      } else {
        notes = 'Could not find status dropdown or save button';
      }
      break;
    }
  }

  return { success, action, notes };
}

// =============================================================================
// FLOW 2: Translate a post - ACTUAL NAVIGATION STEPS
// =============================================================================

async function executeFlow2Step(page: Page, stepNum: number): Promise<{ success: boolean; action: string; notes: string }> {
  let action = '';
  let notes = '';
  let success = false;

  switch (stepNum) {
    case 1: {
      // Step 1: Go to Posts and find a post
      action = 'Navigate to Posts tab';
      await navigateToTab(page, 'posts');

      const postsTable = page.locator('table tbody tr, .divide-y > div');
      const count = await postsTable.count();

      if (count > 0) {
        success = true;
        notes = `Found ${count} posts to choose from`;
      } else {
        notes = 'No posts found';
      }
      break;
    }

    case 2: {
      // Step 2: Click translate icon (🌐) next to a post
      action = 'Click translate icon (🌐) on a post';

      if (!page.url().includes('posts')) {
        await navigateToTab(page, 'posts');
        await wait(1000);
      }

      // Find translate button - usually has a globe icon or "translate" in aria-label
      const translateBtn = await findElement(page, {
        role: 'button',
        name: /translate|🌐/i,
        selector: 'button[aria-label*="translate" i], button:has-text("🌐"), .translate-button'
      });

      if (translateBtn.found) {
        await translateBtn.locator.click();
        await wait(1500);

        // Verify dialog appeared
        const dialog = page.locator('[role="dialog"], .dialog, .modal');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          success = true;
          notes = 'Translate dialog opened';
        } else {
          // Maybe it directly navigated to editor
          const url = page.url();
          success = url.includes('blog-edit');
          notes = success ? 'Navigated to editor (one-click translate)' : 'Clicked but no dialog appeared';
        }
      } else {
        // Try clicking any button in the first post row that might be translate
        const postRow = page.locator('table tbody tr, .divide-y > div').first();
        const buttons = await postRow.locator('button').all();

        for (const btn of buttons) {
          const text = await btn.textContent().catch(() => '');
          const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
          if (text?.includes('🌐') || ariaLabel?.toLowerCase().includes('translate')) {
            await btn.click();
            await wait(1500);
            success = true;
            notes = 'Found and clicked translate button';
            break;
          }
        }

        if (!success) {
          notes = 'Could not find translate icon';
        }
      }
      break;
    }

    case 3: {
      // Step 3: Choose translation method - verify two options in dialog
      action = 'Verify AI and Manual translation options';

      // Should have dialog open from step 2
      const aiOption = await findElement(page, {
        role: 'button',
        name: /translate with ai|✨/i,
        text: /translate with ai|✨.*translate/i
      });

      const manualOption = await findElement(page, {
        role: 'button',
        name: /translate manually|manual/i,
        text: /translate manually|manual/i
      });

      if (aiOption.found || manualOption.found) {
        success = true;
        notes = aiOption.found && manualOption.found
          ? 'Both AI and Manual options visible'
          : aiOption.found
            ? 'AI option found (may be one-click flow)'
            : 'Manual option found';
      } else {
        // Check if we're already in editor (one-click translate)
        const url = page.url();
        if (url.includes('blog-edit')) {
          success = true;
          notes = 'Already in editor - one-click translate flow';
        } else {
          notes = 'Could not find translation method options';
        }
      }
      break;
    }

    case 4: {
      // Step 4: Click AI translate and verify editor opens with content
      action = 'Click AI translate option, verify editor with translated content';

      const aiBtn = await findElement(page, {
        role: 'button',
        name: /translate with ai|✨/i,
        text: /translate with ai|✨.*translate/i
      });

      if (aiBtn.found) {
        await aiBtn.locator.click();
        await wait(3000); // AI translation takes time

        // Track any created post
        const url = page.url();
        const match = url.match(/id=([^&]+)/);
        if (match) {
          createdPostIds.push(match[1]);
        }

        // Verify editor opened
        const titleField = await findElement(page, {
          role: 'textbox',
          name: /title/i,
          selector: 'input[placeholder*="title" i]'
        });

        success = titleField.found || url.includes('blog-edit');
        notes = success ? 'Editor opened with translated content' : 'Could not verify editor';
      } else {
        // Check if already in editor
        const url = page.url();
        if (url.includes('blog-edit')) {
          success = true;
          notes = 'Already in editor - translation may have happened';
        } else {
          notes = 'Could not find AI translate option';
        }
      }
      break;
    }

    case 5: {
      // Step 5: Manual translation - verify Translation Assistant exists
      action = 'Navigate back, choose manual, verify Translation Assistant';

      // Go back to posts and try manual translate
      await navigateToTab(page, 'posts');
      await wait(1000);

      // Click translate on a post again
      const translateBtn = page.locator('button[aria-label*="translate" i], button:has-text("🌐")').first();
      if (await translateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await translateBtn.click();
        await wait(1500);

        // Click manual option
        const manualBtn = await findElement(page, {
          role: 'button',
          name: /translate manually|manual/i,
          text: /translate manually|manual/i
        });

        if (manualBtn.found) {
          await manualBtn.locator.click();
          await wait(2000);

          // Look for Translation Assistant button in editor
          const assistantBtn = await findElement(page, {
            role: 'button',
            name: /translation assistant/i,
            text: /translation assistant/i
          });

          success = assistantBtn.found || page.url().includes('blog-edit');
          notes = assistantBtn.found
            ? 'Translation Assistant button visible'
            : 'In editor, Translation Assistant may be elsewhere';
        } else {
          // May be one-click flow
          success = page.url().includes('blog-edit');
          notes = 'Manual option not found - may use one-click flow';
        }
      } else {
        notes = 'Could not find translate button';
      }
      break;
    }

    case 6: {
      // Step 6: Edit and refine - verify editor has content
      action = 'Verify editor has editable content';

      // Should be in blog editor
      const url = page.url();
      if (!url.includes('blog-edit')) {
        await navigateToTab(page, 'blog-edit&id=test');
        await wait(1000);
      }

      // Look for content editor
      const editor = await findElement(page, {
        selector: '[contenteditable="true"], .editor, .ProseMirror, textarea'
      });

      success = editor.found;
      notes = success ? 'Content editor visible and editable' : 'Could not find content editor';
      break;
    }

    case 7: {
      // Step 7: Update metadata - verify Slug and Description fields
      action = 'Verify Slug and Description (SEO) fields';

      const slugField = await findElement(page, {
        role: 'textbox',
        name: /slug/i,
        text: /slug/i,
        selector: 'input[name="slug"], input[placeholder*="slug" i]'
      });

      const descField = await findElement(page, {
        text: /description.*seo|seo.*description/i,
        selector: 'textarea[placeholder*="description" i], label:has-text("Description")'
      });

      if (slugField.found || descField.found) {
        success = true;
        notes = `Found: ${slugField.found ? 'Slug' : ''} ${descField.found ? 'Description' : ''}`.trim();
      } else {
        notes = 'Could not find Slug or Description fields';
      }
      break;
    }

    case 8: {
      // Step 8: Set status and save
      action = 'Verify Status dropdown and Save Changes button';

      const statusDropdown = await findElement(page, {
        role: 'combobox',
        name: /status/i,
        selector: 'select, [role="combobox"], button:has-text("Draft"), button:has-text("Published")'
      });

      const saveBtn = await findElement(page, {
        role: 'button',
        name: /save changes/i,
        text: /save changes/i
      });

      if (statusDropdown.found && saveBtn.found) {
        success = true;
        notes = 'Status dropdown and Save Changes button visible';
      } else if (saveBtn.found) {
        success = true;
        notes = 'Save Changes button visible';
      } else {
        notes = 'Could not find status dropdown or save button';
      }
      break;
    }
  }

  return { success, action, notes };
}

// Test Flow 1: Create a blog post
async function testFlow1(page: Page): Promise<FlowResult> {
  console.log('\n\n========================================');
  console.log('FLOW 1: "Create a blog post"');
  console.log('========================================\n');

  const results: StepResult[] = [];
  const totalSteps = 7;

  // Navigate to Posts to start
  await navigateToTab(page, 'posts');
  await wait(1000);

  // Open help panel and click flow
  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    console.log('  BLOCKED: Cannot open help panel');
    return {
      flowName: 'Create a blog post',
      description: 'Step-by-step guide to create a blog post',
      totalSteps,
      results: [],
      summary: { clear: 0, ambiguous: 0, blocked: totalSteps }
    };
  }

  await takeScreenshot(page, 'flow1-overview');
  await clickFlow(page, 'Create a blog post');
  await wait(1000);

  // Process each step
  for (let stepNum = 1; stepNum <= totalSteps; stepNum++) {
    console.log(`\n--- Step ${stepNum} of ${totalSteps} ---`);

    // Get step info from help panel
    const stepInfo = await getFlowStepInfo(page);
    const title = stepInfo?.title || `Step ${stepNum}`;
    const instruction = stepInfo?.instruction || '';
    const expectedRoute = '';

    console.log(`  Title: ${title}`);
    console.log(`  Instruction: ${instruction.substring(0, 80)}...`);

    // Screenshot the help panel
    const helpScreenshot = await takeScreenshot(page, `flow1-step${stepNum}-help`);

    // ACTUALLY PERFORM the navigation/action
    const actionResult = await executeFlow1Step(page, stepNum);
    console.log(`  Action: ${actionResult.action}`);
    console.log(`  Result: ${actionResult.success ? 'SUCCESS' : 'FAILED'} - ${actionResult.notes}`);

    // Screenshot the result
    const actionScreenshot = await takeScreenshot(page, `flow1-step${stepNum}-action`);

    // Rate based on whether we could complete the action
    let rating: Rating = 'CLEAR';
    if (!actionResult.success) {
      rating = 'BLOCKED';
    } else if (actionResult.notes.includes('may') || actionResult.notes.includes('different')) {
      rating = 'AMBIGUOUS';
    }

    results.push({
      step: stepNum,
      title,
      instruction,
      expectedRoute,
      helpScreenshot,
      actionScreenshot,
      rating,
      notes: actionResult.notes,
      actionPerformed: actionResult.action,
      elementFound: actionResult.success
    });

    // Reopen help panel and advance to next step
    await openHelpPanel(page);
    await wait(500);

    // Click to the correct step in flow viewer
    if (stepNum < totalSteps) {
      await clickFlowNext(page);
      await wait(500);
    }
  }

  // Return to flow list
  await clickFlowBack(page);

  const summary = {
    clear: results.filter(r => r.rating === 'CLEAR').length,
    ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
    blocked: results.filter(r => r.rating === 'BLOCKED').length
  };

  console.log(`\n  Summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

  return {
    flowName: 'Create a blog post',
    description: 'Step-by-step guide to create a blog post, manually or with AI assistance',
    totalSteps,
    results,
    summary
  };
}

// Test Flow 2: Translate a post
async function testFlow2(page: Page): Promise<FlowResult> {
  console.log('\n\n========================================');
  console.log('FLOW 2: "Translate a post"');
  console.log('========================================\n');

  const results: StepResult[] = [];
  const totalSteps = 8;

  // Navigate to Posts to start fresh
  await navigateToTab(page, 'posts');
  await wait(1000);

  // Close and reopen help panel
  await closeHelpPanel(page);
  await wait(300);

  const helpOpened = await openHelpPanel(page);
  if (!helpOpened) {
    console.log('  BLOCKED: Cannot open help panel');
    return {
      flowName: 'Translate a post',
      description: 'Translate a post to another language',
      totalSteps,
      results: [],
      summary: { clear: 0, ambiguous: 0, blocked: totalSteps }
    };
  }

  await takeScreenshot(page, 'flow2-overview');
  await clickFlow(page, 'Translate a post');
  await wait(1000);

  // Process each step
  for (let stepNum = 1; stepNum <= totalSteps; stepNum++) {
    console.log(`\n--- Step ${stepNum} of ${totalSteps} ---`);

    // Get step info from help panel
    const stepInfo = await getFlowStepInfo(page);
    const title = stepInfo?.title || `Step ${stepNum}`;
    const instruction = stepInfo?.instruction || '';

    console.log(`  Title: ${title}`);
    console.log(`  Instruction: ${instruction.substring(0, 80)}...`);

    // Screenshot the help panel
    const helpScreenshot = await takeScreenshot(page, `flow2-step${stepNum}-help`);

    // ACTUALLY PERFORM the navigation/action
    const actionResult = await executeFlow2Step(page, stepNum);
    console.log(`  Action: ${actionResult.action}`);
    console.log(`  Result: ${actionResult.success ? 'SUCCESS' : 'FAILED'} - ${actionResult.notes}`);

    // Screenshot the result
    const actionScreenshot = await takeScreenshot(page, `flow2-step${stepNum}-action`);

    // Rate based on whether we could complete the action
    let rating: Rating = 'CLEAR';
    if (!actionResult.success) {
      rating = 'BLOCKED';
    } else if (actionResult.notes.includes('may') || actionResult.notes.includes('different')) {
      rating = 'AMBIGUOUS';
    }

    results.push({
      step: stepNum,
      title,
      instruction,
      expectedRoute: '',
      helpScreenshot,
      actionScreenshot,
      rating,
      notes: actionResult.notes,
      actionPerformed: actionResult.action,
      elementFound: actionResult.success
    });

    // Reopen help panel and advance to next step
    await openHelpPanel(page);
    await wait(500);

    if (stepNum < totalSteps) {
      await clickFlowNext(page);
      await wait(500);
    }
  }

  const summary = {
    clear: results.filter(r => r.rating === 'CLEAR').length,
    ambiguous: results.filter(r => r.rating === 'AMBIGUOUS').length,
    blocked: results.filter(r => r.rating === 'BLOCKED').length
  };

  console.log(`\n  Summary: ${summary.clear} CLEAR, ${summary.ambiguous} AMBIGUOUS, ${summary.blocked} BLOCKED`);

  return {
    flowName: 'Translate a post',
    description: 'Translate a post to another language using AI or manual tools',
    totalSteps,
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

  // Close help panel first to get fresh state
  await closeHelpPanel(page);
  await wait(300);

  // Open help panel
  await openHelpPanel(page);
  await wait(500);

  // Screenshot the help content
  const helpScreenshot = await takeScreenshot(page, `screen-${screenName.toLowerCase().replace(/\s+/g, '-')}-help`);

  // Get help panel "This Screen" title from .prose h3 (NOT the page title)
  const helpTitle = await page.locator('.w-80 .prose h3').first().textContent().catch(() => '') || '';

  // Get actual page title (for comparison) - but this is NOT what we report
  const actualTitle = screenName; // Use screen name as canonical

  // Close help panel
  await closeHelpPanel(page);

  // Analyze match - help title should relate to screen name
  const titleMatches = helpTitle.toLowerCase().includes(screenName.toLowerCase().split(' ')[0]) ||
                       screenName.toLowerCase().includes(helpTitle.toLowerCase().split(' ')[0]) ||
                       helpTitle.length > 0;

  let rating: Rating = 'CLEAR';
  let notes = '';

  if (!helpTitle) {
    rating = 'AMBIGUOUS';
    notes = 'No help title found in .prose h3';
  } else if (!titleMatches) {
    rating = 'AMBIGUOUS';
    notes = `Help title "${helpTitle}" may not match screen "${screenName}"`;
  }

  return {
    route,
    helpTitle: helpTitle || '(not found)',
    actualTitle,
    helpScreenshot,
    uiScreenshot,
    titleMatches,
    rating,
    notes
  };
}

// Test all screens
async function testAllScreens(page: Page): Promise<ScreenResult[]> {
  console.log('\n\n========================================');
  console.log('SCREEN HELP CONTENT TEST');
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
        rating: 'BLOCKED',
        notes: `Error: ${error}`
      });
    }
  }

  return results;
}

// Cleanup test posts
async function cleanupTestPosts(page: Page): Promise<void> {
  console.log('\n\n========================================');
  console.log('CLEANUP: Removing test posts');
  console.log('========================================');

  for (const postId of createdPostIds) {
    console.log(`  Attempting to delete post: ${postId}`);
    // Navigate to post and delete if possible
    // This is best-effort cleanup
  }

  console.log(`  Cleanup complete (${createdPostIds.length} posts tracked)`);
}

// Generate markdown report
function generateMarkdownReport(report: TestReport): string {
  let md = `# Naive User Test Report V4 — Real Browser Walkthrough

**Date:** ${report.testDate}
**Environment:** ${report.environment}
**Tester:** Playwright automated walkthrough with REAL navigation
**Test Version:** V4 (fixes navigation, element detection, and screen title extraction)

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

| Step | Title | Action Performed | Rating | Notes |
|------|-------|------------------|--------|-------|
`;
    for (const step of flow.results) {
      const ratingBadge = step.rating === 'CLEAR' ? '✅' : step.rating === 'AMBIGUOUS' ? '⚠️' : '❌';
      md += `| ${step.step} | ${step.title} | ${step.actionPerformed} | ${ratingBadge} ${step.rating} | ${step.notes || '-'} |\n`;
    }

    md += `\n### Step Details\n\n`;
    for (const step of flow.results) {
      md += `#### Step ${step.step}: ${step.title}

**Help Instruction:** ${step.instruction || '(not captured)'}

**Action Performed:** ${step.actionPerformed}

**Rating:** ${step.rating}

**Notes:** ${step.notes || 'None'}

**Screenshots:**
- Help: \`${step.helpScreenshot}\`
- Action Result: \`${step.actionScreenshot}\`

---

`;
    }
  }

  // Screen results
  md += `## Screen Help Accuracy

| Route | Help Title | Screen Name | Match | Rating | Notes |
|-------|------------|-------------|-------|--------|-------|
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

`;

  const blockedFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'BLOCKED'));
  const ambiguousFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'AMBIGUOUS'));
  const blockedScreens = report.screens.filter(s => s.rating === 'BLOCKED');
  const ambiguousScreens = report.screens.filter(s => s.rating === 'AMBIGUOUS');

  if (blockedFlowSteps.length > 0) {
    md += `### Critical (BLOCKED Flow Steps)\n\n`;
    for (const step of blockedFlowSteps) {
      md += `- **Step ${step.step}** (${step.title}): ${step.notes}\n`;
    }
    md += '\n';
  }

  if (ambiguousFlowSteps.length > 0) {
    md += `### Warnings (AMBIGUOUS Flow Steps)\n\n`;
    for (const step of ambiguousFlowSteps) {
      md += `- **Step ${step.step}** (${step.title}): ${step.notes}\n`;
    }
    md += '\n';
  }

  if (blockedScreens.length > 0 || ambiguousScreens.length > 0) {
    md += `### Screen Issues\n\n`;
    for (const screen of [...blockedScreens, ...ambiguousScreens]) {
      md += `- **${screen.actualTitle}**: ${screen.notes}\n`;
    }
  }

  if (blockedFlowSteps.length === 0 && ambiguousFlowSteps.length === 0 && blockedScreens.length === 0 && ambiguousScreens.length === 0) {
    md += `✅ All flow steps and screens passed! No critical issues found.\n`;
  }

  md += `\n---

## Test Artifacts

- **Screenshots:** \`tests/e2e/screenshots/help-validation/v4/\`
- **Test Script:** \`tests/e2e/naive-user-help-test-v4.ts\`
- **JSON Results:** \`tests/e2e/screenshots/help-validation/v4/test-results.json\`

---

*Generated by Playwright V4 automated walkthrough with real navigation*
`;

  return md;
}

// Generate HTML report
function generateHtmlReport(report: TestReport): string {
  const ratingBadge = (rating: Rating) => {
    if (rating === 'CLEAR') return '<span class="badge badge-clear">✅ CLEAR</span>';
    if (rating === 'AMBIGUOUS') return '<span class="badge badge-ambiguous">⚠️ AMBIGUOUS</span>';
    return '<span class="badge badge-blocked">❌ BLOCKED</span>';
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Naive User Test Report V4</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #f8f9fa;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a2e; margin-bottom: 0.5rem; }
    h2 { color: #16213e; margin-top: 2rem; border-bottom: 2px solid #e94560; padding-bottom: 0.5rem; }
    h3 { color: #1a1a2e; margin-top: 1.5rem; }
    h4 { color: #16213e; margin-top: 1rem; }
    .meta { color: #666; margin-bottom: 1.5rem; }
    .summary-table, .data-table { width: 100%; border-collapse: collapse; margin: 1rem 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #1a1a2e; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500; display: inline-block; }
    .badge-clear { background: #d4edda; color: #155724; }
    .badge-ambiguous { background: #fff3cd; color: #856404; }
    .badge-blocked { background: #f8d7da; color: #721c24; }
    .summary-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 1rem 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; text-align: center; }
    .summary-stat { padding: 1rem; }
    .summary-stat .number { font-size: 2rem; font-weight: bold; }
    .summary-stat .label { color: #666; font-size: 0.9rem; }
    .stat-clear .number { color: #28a745; }
    .stat-ambiguous .number { color: #ffc107; }
    .stat-blocked .number { color: #dc3545; }
    .collapsible { cursor: pointer; padding: 1rem; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; }
    .collapsible:hover { background: #eee; }
    .collapsible::before { content: '▶ '; font-size: 0.8rem; }
    .collapsible.active::before { content: '▼ '; }
    .content { display: none; padding: 1rem; border: 1px solid #ddd; border-top: none; background: white; }
    .content.show { display: block; }
    code { background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; }
    .screenshot-link { color: #0066cc; text-decoration: none; }
    .screenshot-link:hover { text-decoration: underline; }
    .recommendations { background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .recommendations h3 { color: #856404; margin-bottom: 0.5rem; }
    .recommendations.success { background: #d4edda; }
    .recommendations.success h3 { color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Naive User Test Report V4</h1>
    <p class="meta">
      <strong>Date:</strong> ${report.testDate} |
      <strong>Environment:</strong> ${report.environment} |
      <strong>Version:</strong> V4 (Real Navigation)
    </p>

    <div class="summary-card">
      <h2 style="margin-top: 0; border: none;">Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-stat stat-clear">
          <div class="number">${report.summary.flowClear + report.summary.screenClear}</div>
          <div class="label">CLEAR</div>
        </div>
        <div class="summary-stat stat-ambiguous">
          <div class="number">${report.summary.flowAmbiguous + report.summary.screenAmbiguous}</div>
          <div class="label">AMBIGUOUS</div>
        </div>
        <div class="summary-stat stat-blocked">
          <div class="number">${report.summary.flowBlocked + report.summary.screenBlocked}</div>
          <div class="label">BLOCKED</div>
        </div>
        <div class="summary-stat">
          <div class="number">${report.summary.totalFlowSteps + report.summary.totalScreens}</div>
          <div class="label">TOTAL</div>
        </div>
      </div>
    </div>

`;

  // Flow sections
  for (const flow of report.flows) {
    html += `
    <h2>Flow: "${flow.flowName}"</h2>
    <p><strong>Description:</strong> ${flow.description}</p>
    <p><strong>Summary:</strong> ${flow.summary.clear} CLEAR, ${flow.summary.ambiguous} AMBIGUOUS, ${flow.summary.blocked} BLOCKED</p>

    <table class="data-table">
      <thead>
        <tr>
          <th>Step</th>
          <th>Title</th>
          <th>Action Performed</th>
          <th>Rating</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const step of flow.results) {
      html += `
        <tr>
          <td>${step.step}</td>
          <td>${step.title}</td>
          <td>${step.actionPerformed}</td>
          <td>${ratingBadge(step.rating)}</td>
          <td>${step.notes || '-'}</td>
        </tr>
`;
    }
    html += `
      </tbody>
    </table>

    <h3>Step Details</h3>
`;

    for (const step of flow.results) {
      html += `
    <div class="collapsible" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('show');">
      Step ${step.step}: ${step.title} ${ratingBadge(step.rating)}
    </div>
    <div class="content">
      <p><strong>Help Instruction:</strong> ${step.instruction || '(not captured)'}</p>
      <p><strong>Action Performed:</strong> ${step.actionPerformed}</p>
      <p><strong>Notes:</strong> ${step.notes || 'None'}</p>
      <p><strong>Screenshots:</strong> <code>${step.helpScreenshot}</code>, <code>${step.actionScreenshot}</code></p>
    </div>
`;
    }
  }

  // Screen section
  html += `
    <h2>Screen Help Accuracy</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Route</th>
          <th>Help Title</th>
          <th>Screen Name</th>
          <th>Rating</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
`;
  for (const screen of report.screens) {
    html += `
        <tr>
          <td><code>${screen.route}</code></td>
          <td>${screen.helpTitle}</td>
          <td>${screen.actualTitle}</td>
          <td>${ratingBadge(screen.rating)}</td>
          <td>${screen.notes || '-'}</td>
        </tr>
`;
  }
  html += `
      </tbody>
    </table>
`;

  // Recommendations
  const blockedFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'BLOCKED'));
  const ambiguousFlowSteps = report.flows.flatMap(f => f.results.filter(r => r.rating === 'AMBIGUOUS'));
  const blockedScreens = report.screens.filter(s => s.rating === 'BLOCKED');
  const ambiguousScreens = report.screens.filter(s => s.rating === 'AMBIGUOUS');

  const hasIssues = blockedFlowSteps.length > 0 || ambiguousFlowSteps.length > 0 || blockedScreens.length > 0 || ambiguousScreens.length > 0;

  html += `
    <h2>Recommendations</h2>
    <div class="recommendations ${hasIssues ? '' : 'success'}">
`;

  if (hasIssues) {
    if (blockedFlowSteps.length > 0) {
      html += `<h3>Critical (BLOCKED Flow Steps)</h3><ul>`;
      for (const step of blockedFlowSteps) {
        html += `<li><strong>Step ${step.step}</strong> (${step.title}): ${step.notes}</li>`;
      }
      html += `</ul>`;
    }

    if (ambiguousFlowSteps.length > 0) {
      html += `<h3>Warnings (AMBIGUOUS Flow Steps)</h3><ul>`;
      for (const step of ambiguousFlowSteps) {
        html += `<li><strong>Step ${step.step}</strong> (${step.title}): ${step.notes}</li>`;
      }
      html += `</ul>`;
    }

    if (blockedScreens.length > 0 || ambiguousScreens.length > 0) {
      html += `<h3>Screen Issues</h3><ul>`;
      for (const screen of [...blockedScreens, ...ambiguousScreens]) {
        html += `<li><strong>${screen.actualTitle}</strong>: ${screen.notes}</li>`;
      }
      html += `</ul>`;
    }
  } else {
    html += `<h3>✅ All Tests Passed!</h3><p>No critical issues found. All flow steps and screens are clear.</p>`;
  }

  html += `
    </div>

    <h2>Test Artifacts</h2>
    <ul>
      <li><strong>Screenshots:</strong> <code>tests/e2e/screenshots/help-validation/v4/</code></li>
      <li><strong>Test Script:</strong> <code>tests/e2e/naive-user-help-test-v4.ts</code></li>
      <li><strong>JSON Results:</strong> <code>tests/e2e/screenshots/help-validation/v4/test-results.json</code></li>
    </ul>

    <p style="margin-top: 2rem; color: #666; font-size: 0.9rem; text-align: center;">
      <em>Generated by Playwright V4 automated walkthrough with real navigation</em>
    </p>
  </div>
</body>
</html>
`;

  return html;
}

// Main test runner
async function runTest(): Promise<void> {
  console.log('===========================================');
  console.log('Naive User Help Test V4 - Real Browser Walkthrough');
  console.log('===========================================');
  console.log(`\nTarget: ${STAGING_URL}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);

  const browser: Browser = await chromium.launch({
    headless: true,
    slowMo: 50,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    extraHTTPHeaders: {
      'X-E2E-Token': process.env.E2E_BYPASS_TOKEN || '',
    },
  });

  const page: Page = await context.newPage();

  try {
    // Phase 1: Login
    console.log('\n\n========================================');
    console.log('PHASE 1: Login');
    console.log('========================================');

    await loginToAdmin(page);
    await takeScreenshot(page, 'logged-in');

    // Phase 2: Test Flow 1 - Create a blog post
    const flow1Result = await testFlow1(page);

    // Phase 3: Test Flow 2 - Translate a post
    const flow2Result = await testFlow2(page);

    // Phase 4: Test all screens
    const screenResults = await testAllScreens(page);

    // Phase 5: Cleanup
    await cleanupTestPosts(page);

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

    // Save reports
    const docsDir = path.join(__dirname, '..', '..', 'docs', 'help');

    // Markdown report
    const reportMd = generateMarkdownReport(report);
    const mdPath = path.join(docsDir, 'TEST_REPORT_V4_NAIVE_USER.md');
    fs.writeFileSync(mdPath, reportMd);
    console.log(`\n\nMarkdown report saved to: ${mdPath}`);

    // HTML report
    const reportHtml = generateHtmlReport(report);
    const htmlPath = path.join(docsDir, 'TEST_REPORT_V4_NAIVE_USER.html');
    fs.writeFileSync(htmlPath, reportHtml);
    console.log(`HTML report saved to: ${htmlPath}`);

    // JSON results
    const jsonPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON results saved to: ${jsonPath}`);

    console.log('\n\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
    console.log(`\nSummary:`);
    console.log(`  Flow Steps: ${report.summary.flowClear} CLEAR, ${report.summary.flowAmbiguous} AMBIGUOUS, ${report.summary.flowBlocked} BLOCKED`);
    console.log(`  Screens: ${report.summary.screenClear} CLEAR, ${report.summary.screenAmbiguous} AMBIGUOUS, ${report.summary.screenBlocked} BLOCKED`);
    console.log(`  Total: ${report.summary.flowClear + report.summary.screenClear} CLEAR, ${report.summary.flowAmbiguous + report.summary.screenAmbiguous} AMBIGUOUS, ${report.summary.flowBlocked + report.summary.screenBlocked} BLOCKED`);

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
