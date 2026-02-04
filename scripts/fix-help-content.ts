/**
 * Fix Help Content Issues
 *
 * Fixes all 6 issues identified in the Naive User Help Flow Test Report:
 * 1. Tab naming mismatch (HIGH): "Posts (Manual)"/"Posts (AI)" → "Posts"/"Create a Post"
 * 2. French text in English help (HIGH): "Choisir une date"/"Definir maintenant" → English
 * 3. Translation Assistant outdated (MEDIUM): Add "Translate with AI" mention
 * 4. Icon descriptions vague (MEDIUM): "swap/arrows icon" → better description
 * 5. "Tag badges" unclear (LOW): Add location hint
 * 6. Manual flow doesn't mention CreatePostLanding (LOW): Add choice screen step
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPA')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface HelpFlow {
  id: string;
  title: string;
  description: string;
  steps_json: Array<{
    step: number;
    route: string;
    title: string;
    instruction: string;
    highlightSelector?: string;
  }>;
}

interface HelpScreen {
  id: string;
  route: string;
  title: string;
  html_content: string;
}

async function main() {
  console.log('=== Fixing Help Content Issues ===\n');

  const changes: string[] = [];

  // 1. Fetch all help_flows
  console.log('Fetching help_flows...');
  const { data: flows, error: flowsError } = await supabase
    .from('help_flows')
    .select('*');

  if (flowsError) {
    console.error('Error fetching flows:', flowsError);
    process.exit(1);
  }

  console.log(`Found ${flows.length} help flows\n`);

  // 2. Fetch all help_screens
  console.log('Fetching help_screens...');
  const { data: screens, error: screensError } = await supabase
    .from('help_screens')
    .select('*');

  if (screensError) {
    console.error('Error fetching screens:', screensError);
    process.exit(1);
  }

  console.log(`Found ${screens.length} help screens\n`);

  // ============================================================================
  // FIX HELP FLOWS
  // ============================================================================

  console.log('--- Processing Help Flows ---\n');

  for (const flow of flows as HelpFlow[]) {
    console.log(`Processing flow: "${flow.title}" (${flow.id})`);
    let flowChanged = false;
    const updatedSteps = [...flow.steps_json];

    // Fix description if needed
    let updatedDescription = flow.description;

    // Issue 1: Tab naming - fix description
    if (updatedDescription?.includes('Posts (Manual)')) {
      updatedDescription = updatedDescription.replace(/Posts \(Manual\)/g, 'Posts');
      changes.push(`Flow "${flow.title}": description - "Posts (Manual)" → "Posts"`);
      flowChanged = true;
    }
    if (updatedDescription?.includes('Posts (AI)')) {
      updatedDescription = updatedDescription.replace(/Posts \(AI\)/g, 'Create a Post');
      changes.push(`Flow "${flow.title}": description - "Posts (AI)" → "Create a Post"`);
      flowChanged = true;
    }

    // Process each step
    for (let i = 0; i < updatedSteps.length; i++) {
      const step = updatedSteps[i];
      let instruction = step.instruction;
      let title = step.title;
      let modified = false;

      // Issue 1: Tab naming mismatch (HIGH)
      if (instruction.includes('Posts (Manual)')) {
        instruction = instruction.replace(/Posts \(Manual\)/g, 'Posts');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - "Posts (Manual)" → "Posts"`);
        modified = true;
      }
      if (instruction.includes('Posts (AI)')) {
        instruction = instruction.replace(/Posts \(AI\)/g, 'Create a Post');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - "Posts (AI)" → "Create a Post"`);
        modified = true;
      }
      if (title.includes('Posts (Manual)')) {
        title = title.replace(/Posts \(Manual\)/g, 'Posts');
        changes.push(`Flow "${flow.title}", Step ${step.step}: title - "Posts (Manual)" → "Posts"`);
        modified = true;
      }
      if (title.includes('Posts (AI)')) {
        title = title.replace(/Posts \(AI\)/g, 'Create a Post');
        changes.push(`Flow "${flow.title}", Step ${step.step}: title - "Posts (AI)" → "Create a Post"`);
        modified = true;
      }

      // Issue 2: French text in English help (HIGH)
      if (instruction.includes('Choisir une date')) {
        instruction = instruction.replace(/Choisir une date/g, 'Choose a date');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - "Choisir une date" → "Choose a date"`);
        modified = true;
      }
      if (instruction.includes('Definir maintenant') || instruction.includes('Définir maintenant')) {
        instruction = instruction.replace(/D[ée]finir maintenant/g, 'Set to now');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - "Definir maintenant" → "Set to now"`);
        modified = true;
      }

      // Issue 3: Translation Assistant outdated (MEDIUM)
      // Update Step 2 of Translate flow to mention "Translate with AI" button
      if (flow.title.toLowerCase().includes('translat') && step.title?.includes('Copy and Translate')) {
        instruction = 'Click <span class="help-btn">Translate with AI</span> to automatically translate using Claude. Alternatively, click "Prefer to translate manually?" to copy a prompt for ChatGPT or another AI. When using manual mode, paste the translation and click <span class="help-btn">Next Step</span> when ready.';
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Updated for new "Translate with AI" feature`);
        modified = true;
      }

      // Issue 4: Icon descriptions vague (MEDIUM)
      if (instruction.includes('swap/arrows icon') || instruction.includes('swap icon')) {
        instruction = instruction.replace(
          /the swap\/arrows icon|the swap icon/gi,
          'the Languages icon (two overlapping speech bubbles)'
        );
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Improved icon description`);
        modified = true;
      }

      // Issue 5: "Tag badges" unclear (LOW)
      if (instruction.includes('tag badges') && !instruction.includes('Tags section')) {
        instruction = instruction.replace(
          /Click on tag badges to assign tags/gi,
          'Click on tag badges in the Tags section on the right sidebar to assign tags'
        );
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Added tag location hint`);
        modified = true;
      }

      // Issue 6: Manual flow CreatePostLanding (LOW) - handled by checking if this is about "New Post"
      // Use regex to handle HTML tags in the button text
      if (instruction.match(/New Post.*at the top right/i) && !instruction.includes('choice screen') && !instruction.includes('Write from scratch')) {
        // Replace the sentence about opening a blank post
        instruction = instruction.replace(
          /A blank post opens in the Blog Editor\./gi,
          'On the choice screen, select "Write from scratch" to open a blank post in the Blog Editor.'
        );
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Added CreatePostLanding choice screen step`);
        modified = true;
      }

      if (modified) {
        updatedSteps[i] = { ...step, instruction, title };
        flowChanged = true;
      }
    }

    // Update flow if changed
    if (flowChanged) {
      console.log(`  → Updating flow...`);
      const { error: updateError } = await supabase
        .from('help_flows')
        .update({
          description: updatedDescription,
          steps_json: updatedSteps,
          updated_at: new Date().toISOString(),
          updated_by: 'claude-help-fix'
        })
        .eq('id', flow.id);

      if (updateError) {
        console.error(`  → ERROR updating flow:`, updateError);
      } else {
        console.log(`  → Updated successfully`);
      }
    } else {
      console.log(`  → No changes needed`);
    }
  }

  // ============================================================================
  // FIX HELP SCREENS
  // ============================================================================

  console.log('\n--- Processing Help Screens ---\n');

  for (const screen of screens as HelpScreen[]) {
    console.log(`Processing screen: "${screen.title}" (${screen.route})`);
    let content = screen.html_content;
    let screenChanged = false;

    // Issue 1: Tab naming mismatch (HIGH)
    if (content.includes('Posts (Manual)')) {
      content = content.replace(/Posts \(Manual\)/g, 'Posts');
      changes.push(`Screen "${screen.title}": html_content - "Posts (Manual)" → "Posts"`);
      screenChanged = true;
    }
    if (content.includes('Posts (AI)')) {
      content = content.replace(/Posts \(AI\)/g, 'Create a Post');
      changes.push(`Screen "${screen.title}": html_content - "Posts (AI)" → "Create a Post"`);
      screenChanged = true;
    }

    // Issue 2: French text (HIGH)
    if (content.includes('Choisir une date')) {
      content = content.replace(/Choisir une date/g, 'Choose a date');
      changes.push(`Screen "${screen.title}": html_content - "Choisir une date" → "Choose a date"`);
      screenChanged = true;
    }
    if (content.includes('Definir maintenant') || content.includes('Définir maintenant')) {
      content = content.replace(/D[ée]finir maintenant/g, 'Set to now');
      changes.push(`Screen "${screen.title}": html_content - "Definir maintenant" → "Set to now"`);
      screenChanged = true;
    }

    // Issue 4: Icon descriptions (MEDIUM)
    if (content.includes('swap/arrows icon') || content.includes('swap icon')) {
      content = content.replace(
        /the swap\/arrows icon|the swap icon/gi,
        'the Languages icon (two overlapping speech bubbles)'
      );
      changes.push(`Screen "${screen.title}": html_content - Improved icon description`);
      screenChanged = true;
    }

    // Issue 5: Tag badges (LOW)
    if (content.includes('tag badges') && !content.includes('Tags section')) {
      content = content.replace(
        /Click on tag badges to assign tags/gi,
        'Click on tag badges in the Tags section on the right sidebar to assign tags'
      );
      changes.push(`Screen "${screen.title}": html_content - Added tag location hint`);
      screenChanged = true;
    }

    // Update screen if changed
    if (screenChanged) {
      console.log(`  → Updating screen...`);
      const { error: updateError } = await supabase
        .from('help_screens')
        .update({
          html_content: content,
          updated_at: new Date().toISOString(),
          updated_by: 'claude-help-fix'
        })
        .eq('id', screen.id);

      if (updateError) {
        console.error(`  → ERROR updating screen:`, updateError);
      } else {
        console.log(`  → Updated successfully`);
      }
    } else {
      console.log(`  → No changes needed`);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n=== SUMMARY ===\n');
  console.log(`Total changes made: ${changes.length}\n`);

  if (changes.length > 0) {
    console.log('All changes:');
    changes.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change}`);
    });
  }

  // ============================================================================
  // VERIFICATION - Query and display updated content
  // ============================================================================

  console.log('\n=== VERIFICATION ===\n');

  console.log('Updated help_flows:');
  const { data: updatedFlows } = await supabase
    .from('help_flows')
    .select('id, title, description, steps_json, updated_at, updated_by');

  for (const flow of updatedFlows || []) {
    console.log(`\n--- Flow: ${flow.title} ---`);
    console.log(`ID: ${flow.id}`);
    console.log(`Description: ${flow.description}`);
    console.log(`Updated: ${flow.updated_at} by ${flow.updated_by}`);
    console.log('Steps:');
    for (const step of flow.steps_json as any[]) {
      console.log(`  Step ${step.step}: ${step.title}`);
      console.log(`    Instruction: ${step.instruction}`);
    }
  }

  console.log('\n\nUpdated help_screens:');
  const { data: updatedScreens } = await supabase
    .from('help_screens')
    .select('id, route, title, html_content, updated_at, updated_by');

  for (const screen of updatedScreens || []) {
    console.log(`\n--- Screen: ${screen.title} ---`);
    console.log(`ID: ${screen.id}`);
    console.log(`Route: ${screen.route}`);
    console.log(`Updated: ${screen.updated_at} by ${screen.updated_by}`);
    console.log(`Content preview: ${screen.html_content.substring(0, 200)}...`);
  }
}

main().catch(console.error);
