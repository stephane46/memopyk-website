/**
 * Revert and Fix Help Content
 *
 * Previous fixes were based on incorrect assumptions about the UI.
 * This script reverts incorrect changes and keeps correct ones.
 *
 * ACTUAL UI LABELS (verified via screenshots):
 * - Tabs: "Posts (Manual)", "Posts (AI)" (NOT "Posts" and "Create a Post")
 * - Date picker: "Choisir une date" (French, NOT "Choose a date")
 * - CreatePostLanding: EXISTS with "Write from scratch" and "Generate with AI"
 *
 * CHANGES TO MAKE:
 * 1. REVERT: "Posts" → "Posts (Manual)"
 * 2. REVERT: "Create a Post" → "Posts (AI)"
 * 3. REVERT: "Choose a date" → "Choisir une date"
 * 4. REVERT: "Set to now" → "Définir maintenant"
 * 5. KEEP: CreatePostLanding mention (correct)
 * 6. KEEP: Tag location hints (helpful)
 * 7. KEEP: Icon description improvements (helpful)
 * 8. KEEP: "Translate with AI" mention (if UI has it)
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
  console.log('=== Reverting Incorrect Help Content Changes ===\n');

  const changes: string[] = [];

  // Fetch all help_flows
  console.log('Fetching help_flows...');
  const { data: flows, error: flowsError } = await supabase
    .from('help_flows')
    .select('*');

  if (flowsError) {
    console.error('Error fetching flows:', flowsError);
    process.exit(1);
  }

  console.log(`Found ${flows.length} help flows\n`);

  // Fetch all help_screens
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

    // Fix description
    let updatedDescription = flow.description;

    // REVERT: "Create a Post" → "Posts (AI)"
    if (updatedDescription?.includes('Create a Post')) {
      updatedDescription = updatedDescription.replace(/Create a Post/g, 'Posts (AI)');
      changes.push(`Flow "${flow.title}": description - "Create a Post" → "Posts (AI)"`);
      flowChanged = true;
    }

    // Process each step
    for (let i = 0; i < updatedSteps.length; i++) {
      const step = updatedSteps[i];
      let instruction = step.instruction;
      let title = step.title;
      let modified = false;

      // REVERT: Tab name "Posts" back to "Posts (Manual)"
      // Be careful to match exactly the span pattern we created
      if (instruction.includes('<span class="help-tab">Posts</span>') &&
          !instruction.includes('Posts (Manual)') &&
          !instruction.includes('Posts (AI)')) {
        instruction = instruction.replace(
          /<span class="help-tab">Posts<\/span>/g,
          '<span class="help-tab">Posts (Manual)</span>'
        );
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Reverted "Posts" → "Posts (Manual)"`);
        modified = true;
      }

      // REVERT: Tab name in title "Posts" → "Posts (Manual)"
      if (title === 'Open the Posts tab') {
        title = 'Open the Posts (Manual) tab';
        changes.push(`Flow "${flow.title}", Step ${step.step}: title - Reverted to "Posts (Manual)"`);
        modified = true;
      }
      if (title === 'Go to Posts tab') {
        title = 'Go to Posts (Manual) tab';
        changes.push(`Flow "${flow.title}", Step ${step.step}: title - Reverted to "Posts (Manual)"`);
        modified = true;
      }

      // REVERT: "Create a Post" → "Posts (AI)" in instructions
      if (instruction.includes('<span class="help-tab">Create a Post</span>')) {
        instruction = instruction.replace(
          /<span class="help-tab">Create a Post<\/span>/g,
          '<span class="help-tab">Posts (AI)</span>'
        );
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Reverted "Create a Post" → "Posts (AI)"`);
        modified = true;
      }

      // REVERT: "Choose a date" → "Choisir une date"
      if (instruction.includes('Choose a date')) {
        instruction = instruction.replace(
          /<span class="help-btn">Choose a date<\/span>/g,
          '<span class="help-btn">Choisir une date</span>'
        );
        instruction = instruction.replace(/Choose a date/g, 'Choisir une date');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Reverted "Choose a date" → "Choisir une date"`);
        modified = true;
      }

      // REVERT: "Set to now" → "Définir maintenant"
      if (instruction.includes('Set to now')) {
        instruction = instruction.replace(
          /<span class="help-btn">Set to now<\/span>/g,
          '<span class="help-btn">Définir maintenant</span>'
        );
        instruction = instruction.replace(/Set to now/g, 'Définir maintenant');
        changes.push(`Flow "${flow.title}", Step ${step.step}: instruction - Reverted "Set to now" → "Définir maintenant"`);
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
          updated_by: 'claude-help-revert'
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

    // REVERT: "Posts" → "Posts (Manual)" (when standalone, not already qualified)
    // Match <span class="help-tab">Posts</span> that's not already Posts (Manual) or Posts (AI)
    const postsPattern = /<span class="help-tab">Posts<\/span>/g;
    if (postsPattern.test(content) && !content.includes('Posts (Manual)') && !content.includes('Posts (AI)')) {
      content = content.replace(postsPattern, '<span class="help-tab">Posts (Manual)</span>');
      changes.push(`Screen "${screen.title}": html_content - Reverted "Posts" → "Posts (Manual)"`);
      screenChanged = true;
    }

    // REVERT: "Create a Post" → "Posts (AI)"
    if (content.includes('Create a Post')) {
      content = content.replace(/Create a Post/g, 'Posts (AI)');
      changes.push(`Screen "${screen.title}": html_content - Reverted "Create a Post" → "Posts (AI)"`);
      screenChanged = true;
    }

    // REVERT: "Choose a date" → "Choisir une date"
    if (content.includes('Choose a date')) {
      content = content.replace(/Choose a date/g, 'Choisir une date');
      changes.push(`Screen "${screen.title}": html_content - Reverted "Choose a date" → "Choisir une date"`);
      screenChanged = true;
    }

    // REVERT: "Set to now" → "Définir maintenant"
    if (content.includes('Set to now')) {
      content = content.replace(/Set to now/g, 'Définir maintenant');
      changes.push(`Screen "${screen.title}": html_content - Reverted "Set to now" → "Définir maintenant"`);
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
          updated_by: 'claude-help-revert'
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
  // VERIFICATION
  // ============================================================================

  console.log('\n=== VERIFICATION ===\n');

  const { data: updatedFlows } = await supabase
    .from('help_flows')
    .select('id, title, description, steps_json, updated_at, updated_by');

  for (const flow of updatedFlows || []) {
    console.log(`\n--- Flow: ${flow.title} ---`);
    console.log(`Updated: ${flow.updated_at} by ${flow.updated_by}`);
    console.log('Steps:');
    for (const step of flow.steps_json as any[]) {
      console.log(`  Step ${step.step}: ${step.title}`);
      console.log(`    Instruction preview: ${step.instruction.substring(0, 150)}...`);
    }
  }

  const { data: updatedScreens } = await supabase
    .from('help_screens')
    .select('id, route, title, html_content, updated_at, updated_by');

  console.log('\n\nUpdated help_screens:');
  for (const screen of updatedScreens || []) {
    console.log(`\n--- Screen: ${screen.title} ---`);
    console.log(`Route: ${screen.route}`);
    console.log(`Updated: ${screen.updated_at} by ${screen.updated_by}`);
    console.log(`Content preview: ${screen.html_content.substring(0, 200)}...`);
  }
}

main().catch(console.error);
