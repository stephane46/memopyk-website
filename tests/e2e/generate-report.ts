/**
 * QA Report Generator for Blog Hub E2E Tests
 *
 * This standalone script generates a unified qa-report.md from:
 * - test-results/discovery/discovery.json
 * - test-results/flows/flow-narrative.md
 * - playwright-report/results.json
 *
 * Usage: npx tsx tests/e2e/generate-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Paths
const PROJECT_ROOT = process.cwd();
const DISCOVERY_JSON = path.join(PROJECT_ROOT, 'test-results', 'discovery', 'discovery.json');
const FLOW_NARRATIVE_MD = path.join(PROJECT_ROOT, 'test-results', 'flows', 'flow-narrative.md');
const PLAYWRIGHT_RESULTS = path.join(PROJECT_ROOT, 'playwright-report', 'results.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'test-results');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'qa-report.md');

// Types
interface DiscoveryTab {
  url: string;
  loaded: boolean;
  screenshot: string;
  headings: string[];
  counters: Record<string, string>;
  testidsFound: string[];
  testidsExpected: string[];
  testidsMissing: string[];
  testidsExtra: string[];
  errors: string[];
}

interface DiscoveryResult {
  timestamp: string;
  baseUrl: string;
  tabs: Record<string, DiscoveryTab>;
  summary: {
    tabsLoaded: number;
    tabsFailed: number;
    totalTestidsFound: number;
    totalTestidsMissing: number;
  };
}

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tests: Array<{
    status: string;
    results: Array<{
      status: string;
      duration: number;
      errors: Array<{ message?: string }>;
    }>;
  }>;
}

interface PlaywrightSuite {
  title: string;
  file: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightResults {
  config: {
    version: string;
  };
  suites: PlaywrightSuite[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
}

interface FlowResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'did_not_run';
  effectiveStatus: 'passed' | 'degraded' | 'failed' | 'skipped';
  steps: number;
  duration: number;
  notes: string[];
}

// Expected flows - must match blog-flows.spec.ts
const EXPECTED_FLOWS = [
  'Blog Hub loads with all tabs',
  'Topics search filter',
  'Posts - open editor for existing post',
  'Create draft post with [E2E] prefix',
  'Set featured on post',
  'Set schedule date',
  'Set hero image from Image Bank',
  'Verify post appears in list',
  'AI Creator basic flow',
];

// Utility functions
function safeReadJson<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error}`);
  }
  return null;
}

function safeReadText(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error}`);
  }
  return null;
}

function getGitInfo(): { branch: string; commit: string } {
  let branch = process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'unknown';
  let commit = process.env.GITHUB_SHA?.slice(0, 7) || 'unknown';

  try {
    if (branch === 'unknown') {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    }
    if (commit === 'unknown') {
      commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    }
  } catch {
    // Not in a git repo or git not available
  }

  return { branch, commit };
}

function parseFlowNarrative(markdown: string): FlowResult[] {
  const results: FlowResult[] = [];
  const stepsRegex = /\*\*Steps:\*\*\n([\s\S]*?)(?=\n\*\*|$)/;
  const notesRegex = /\*\*Notes:\*\*\n([\s\S]*?)(?=\n\n##|---|\n\*\*|$)/;

  // Split by flow sections
  const sections = markdown.split(/(?=## Flow \d+:)/);

  // Track which flows were found in the narrative
  const foundFlows = new Set<string>();

  for (const section of sections) {
    const flowMatch = section.match(/## Flow (\d+): (.+)\n\n\*\*Status:\*\* (.*)/);
    if (!flowMatch) continue;

    const name = flowMatch[2].trim();
    const statusText = flowMatch[3].trim();
    const status: 'passed' | 'failed' | 'skipped' = statusText.includes('Passed')
      ? 'passed'
      : statusText.includes('Failed')
      ? 'failed'
      : 'skipped';

    foundFlows.add(name);

    // Count steps
    const stepsMatch = section.match(stepsRegex);
    const stepLines = stepsMatch ? stepsMatch[1].split('\n').filter(l => /^\d+\./.test(l.trim())).length : 0;

    // Extract notes
    const notesMatch = section.match(notesRegex);
    const notes: string[] = [];
    if (notesMatch) {
      const noteLines = notesMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
      notes.push(...noteLines.map(l => l.replace(/^-\s*/, '').trim()));
    }

    results.push({
      name,
      status,
      effectiveStatus: status === 'passed' ? 'passed' : 'failed', // Will be refined by classifyFlows()
      steps: stepLines,
      duration: 0, // Will be filled from Playwright results
      notes,
    });
  }

  // Add any expected flows that didn't run (due to serial mode stopping on failure)
  for (const expectedName of EXPECTED_FLOWS) {
    if (!foundFlows.has(expectedName)) {
      results.push({
        name: expectedName,
        status: 'did_not_run',
        effectiveStatus: 'skipped',
        steps: 0,
        duration: 0,
        notes: ['Did not run (previous flow failed)'],
      });
    }
  }

  // Sort results by expected flow order
  results.sort((a, b) => {
    const aIndex = EXPECTED_FLOWS.indexOf(a.name);
    const bIndex = EXPECTED_FLOWS.indexOf(b.name);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return results;
}

function extractFlowDurations(playwrightResults: PlaywrightResults, flows: FlowResult[]): void {
  // Find blog-flows suite
  const findSpecs = (suites: PlaywrightSuite[]): PlaywrightSpec[] => {
    const specs: PlaywrightSpec[] = [];
    for (const suite of suites) {
      specs.push(...suite.specs);
      if (suite.suites) {
        specs.push(...findSpecs(suite.suites));
      }
    }
    return specs;
  };

  const specs = findSpecs(playwrightResults.suites);

  for (const flow of flows) {
    // Find matching spec by name
    const matchingSpec = specs.find(spec => spec.title.includes(flow.name) || flow.name.includes(spec.title.replace(/^Flow \d+: /, '')));
    if (matchingSpec && matchingSpec.tests[0]?.results[0]) {
      flow.duration = matchingSpec.tests[0].results[0].duration / 1000; // Convert to seconds
    }
  }
}

/**
 * Classify flows into 4 tiers: passed, degraded, failed, or skipped
 * A flow is DEGRADED if it passed but skipped core logic
 * A flow is SKIPPED if it didn't run due to a previous flow failing
 */
function classifyFlows(flows: FlowResult[]): void {
  const degradedPatterns = [
    'skipped',
    'not found',
    'deleted',
    'may have been',
    'cleanup',
    'no topics',
    'no posts',
    '0 found',
    'server may have'
  ];

  for (const flow of flows) {
    if (flow.status === 'did_not_run') {
      flow.effectiveStatus = 'skipped'; // Keep as skipped
    } else if (flow.status === 'failed') {
      flow.effectiveStatus = 'failed';
    } else if (flow.status === 'skipped') {
      flow.effectiveStatus = 'failed'; // Treat Playwright skipped as failed for reporting
    } else {
      // Check if this "passed" flow should be degraded
      const notesLower = flow.notes.map(n => n.toLowerCase()).join(' ');
      const isDegraded = degradedPatterns.some(pattern => notesLower.includes(pattern)) ||
                         flow.steps <= 2;

      flow.effectiveStatus = isDegraded ? 'degraded' : 'passed';
    }
  }
}

/**
 * Generate impact description based on flow name
 */
function getFlowImpact(flowName: string): string {
  const nameLower = flowName.toLowerCase();

  if (nameLower.includes('search') || nameLower.includes('filter')) {
    return 'Search/filter not validated';
  }
  if (nameLower.includes('editor')) {
    return 'Editor loading not validated';
  }
  if (nameLower.includes('featured')) {
    return 'Featured persistence not verified';
  }
  if (nameLower.includes('schedule')) {
    return 'Schedule feature not tested';
  }
  if (nameLower.includes('hero') || nameLower.includes('image')) {
    return 'Hero image persistence not verified';
  }
  if (nameLower.includes('verify') || nameLower.includes('list')) {
    return 'List verification not tested';
  }
  if (nameLower.includes('ai creator')) {
    return 'AI Creator flow not validated';
  }
  if (nameLower.includes('create') || nameLower.includes('draft')) {
    return 'Post creation not validated';
  }

  return 'Core logic not executed';
}

/**
 * Extract degradation reason from flow notes
 */
function getDegradedReason(flow: FlowResult): string {
  for (const note of flow.notes) {
    const noteLower = note.toLowerCase();
    if (noteLower.includes('no topics') || noteLower.includes('0 found')) {
      return 'No topics on staging';
    }
    if (noteLower.includes('no posts')) {
      return 'No posts on staging';
    }
    if (noteLower.includes('deleted') || noteLower.includes('not found')) {
      return 'Post deleted before test';
    }
    if (noteLower.includes('skipped')) {
      return note.split('-')[0].trim() || 'Test skipped';
    }
    if (noteLower.includes('server may have')) {
      return 'Server cleanup removed test data';
    }
    if (noteLower.includes('rate limit') || noteLower.includes('429')) {
      return 'Rate limited during test';
    }
  }

  if (flow.steps <= 2) {
    return 'Flow exited early (≤2 steps)';
  }

  return 'Core logic skipped';
}

function generateReport(): void {
  console.log('Generating QA Report...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read input files
  const discovery = safeReadJson<DiscoveryResult>(DISCOVERY_JSON);
  const flowNarrative = safeReadText(FLOW_NARRATIVE_MD);
  const playwrightResults = safeReadJson<PlaywrightResults>(PLAYWRIGHT_RESULTS);

  // Get git info
  const { branch, commit } = getGitInfo();

  // Get environment info
  const baseUrl = discovery?.baseUrl || process.env.E2E_BASE_URL || 'unknown';
  const timestamp = new Date().toISOString();

  // Parse flow results
  let flowResults: FlowResult[] = [];
  if (flowNarrative) {
    flowResults = parseFlowNarrative(flowNarrative);
    if (playwrightResults) {
      extractFlowDurations(playwrightResults, flowResults);
    }
    // Classify flows into passed/degraded/failed
    classifyFlows(flowResults);
  }

  // Calculate summary stats with 4-tier classification
  const discoveryTabsLoaded = discovery?.summary?.tabsLoaded ?? 0;
  const discoveryTabsTotal = discovery ? Object.keys(discovery.tabs).length || 6 : 6;
  const flowsTotal = flowResults.length || 9;
  const flowsTrulyPassed = flowResults.filter(f => f.effectiveStatus === 'passed').length;
  const flowsDegraded = flowResults.filter(f => f.effectiveStatus === 'degraded').length;
  const flowsFailed = flowResults.filter(f => f.effectiveStatus === 'failed').length;
  const flowsSkipped = flowResults.filter(f => f.effectiveStatus === 'skipped').length;

  // Determine overall status with honest reporting
  // Note: skipped flows don't cause FAIL (they're expected when a previous flow fails)
  let overallStatus = '✅ PASS';
  if (flowsFailed > 0 || (discovery && discovery.summary.tabsFailed > 0)) {
    overallStatus = '❌ FAIL — do not deploy';
  } else if (flowsDegraded > 0 || flowsSkipped > 0 || discoveryTabsLoaded < discoveryTabsTotal) {
    overallStatus = '⚠️ PARTIAL — review before deploy';
  }

  // Build report
  const lines: string[] = [];

  // Header
  lines.push('# Blog Hub QA Report');
  lines.push('');
  lines.push(`**Generated:** ${timestamp}`);
  lines.push(`**Environment:** ${baseUrl}`);
  lines.push(`**Git Branch:** ${branch}`);
  lines.push(`**Commit:** ${commit}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  if (discovery) {
    lines.push(`- **Discovery:** ${discoveryTabsLoaded}/${discoveryTabsTotal} tabs loaded`);
  } else {
    lines.push('- **Discovery:** Not run');
  }
  if (flowResults.length > 0) {
    // Show 4-tier breakdown
    const parts: string[] = [];
    if (flowsTrulyPassed > 0) parts.push(`${flowsTrulyPassed} passed`);
    if (flowsDegraded > 0) parts.push(`${flowsDegraded} degraded`);
    if (flowsFailed > 0) parts.push(`${flowsFailed} failed`);
    if (flowsSkipped > 0) parts.push(`${flowsSkipped} skipped`);
    lines.push(`- **Flow Tests:** ${parts.join(', ')} (${flowsTotal} total)`);
  } else {
    lines.push('- **Flow Tests:** Not run');
  }
  lines.push(`- **Overall:** ${overallStatus}`);
  lines.push('');

  // Discovery Results
  lines.push('## Discovery Results');
  lines.push('');
  if (discovery) {
    lines.push('| Tab | Status | TestIDs Found | Issues |');
    lines.push('|-----|--------|---------------|--------|');

    const tabOrder = ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images'];
    for (const tabName of tabOrder) {
      const tab = discovery.tabs[tabName];
      if (!tab) {
        lines.push(`| ${tabName} | ❓ Not tested | - | - |`);
        continue;
      }

      const status = tab.loaded ? '✅' : '❌';
      const testidCount = tab.testidsFound.length;
      const issues: string[] = [];

      if (tab.testidsMissing.length > 0) {
        issues.push(`${tab.testidsMissing.length} missing testids`);
      }
      if (tab.errors.length > 0) {
        issues.push(`${tab.errors.length} errors`);
      }

      lines.push(`| ${tabName} | ${status} | ${testidCount} | ${issues.length > 0 ? issues.join(', ') : 'none'} |`);
    }
    lines.push('');

    // Missing testids detail
    const allMissingTestids = Object.entries(discovery.tabs)
      .filter(([_, tab]) => tab.testidsMissing.length > 0)
      .map(([name, tab]) => `**${name}:** ${tab.testidsMissing.join(', ')}`);

    if (allMissingTestids.length > 0) {
      lines.push('**Missing TestIDs:**');
      allMissingTestids.forEach(line => lines.push(`- ${line}`));
      lines.push('');
    }
  } else {
    lines.push('*Discovery tests were not run. Run `npm run e2e:discovery` first.*');
    lines.push('');
  }

  // Flow Test Results
  lines.push('## Flow Test Results');
  lines.push('');
  if (flowResults.length > 0) {
    lines.push('| Flow | Status | Duration | Notes |');
    lines.push('|------|--------|----------|-------|');

    for (let i = 0; i < flowResults.length; i++) {
      const flow = flowResults[i];
      // Use effectiveStatus for 4-tier icons: ✅ passed, ⏩ degraded, ❌ failed, ⏭️ skipped
      const statusIcon = flow.effectiveStatus === 'passed' ? '✅' :
                         flow.effectiveStatus === 'degraded' ? '⏩' :
                         flow.effectiveStatus === 'skipped' ? '⏭️' : '❌';
      const duration = flow.duration > 0 ? `${flow.duration.toFixed(1)}s` : '-';
      const notes = flow.notes.length > 0 ? flow.notes[0].slice(0, 40) + (flow.notes[0].length > 40 ? '...' : '') : '-';

      lines.push(`| ${i + 1}. ${flow.name.slice(0, 30)} | ${statusIcon} | ${duration} | ${notes} |`);
    }
    lines.push('');
  } else {
    lines.push('*Flow tests were not run. Run `npm run e2e:flows` first.*');
    lines.push('');
  }

  // Key Findings
  lines.push('## Key Findings');
  lines.push('');
  const keyFindings: string[] = [];

  // Extract notable findings from flow notes
  for (const flow of flowResults) {
    for (const note of flow.notes) {
      if (note.includes('NOTE:') || note.includes('Rate limit') || note.includes('not found')) {
        keyFindings.push(`**${flow.name}:** ${note}`);
      }
    }
  }

  if (keyFindings.length > 0) {
    keyFindings.forEach(finding => lines.push(`- ${finding}`));
  } else {
    lines.push('- No notable findings');
  }
  lines.push('');

  // Degraded Flows section (only if there are degraded flows)
  const degradedFlows = flowResults.filter(f => f.effectiveStatus === 'degraded');
  if (degradedFlows.length > 0) {
    lines.push('## ⏩ Degraded Flows');
    lines.push('');
    lines.push('These flows passed without errors but could not fully execute their core logic:');
    lines.push('');
    lines.push('| Flow | Reason | Impact |');
    lines.push('|------|--------|--------|');

    for (let i = 0; i < flowResults.length; i++) {
      const flow = flowResults[i];
      if (flow.effectiveStatus === 'degraded') {
        const reason = getDegradedReason(flow);
        const impact = getFlowImpact(flow.name);
        lines.push(`| ${i + 1}. ${flow.name.slice(0, 25)} | ${reason} | ${impact} |`);
      }
    }
    lines.push('');
  }

  // Screenshots Index
  lines.push('## Screenshots Index');
  lines.push('');
  lines.push('| File | Source | Description |');
  lines.push('|------|--------|-------------|');

  // Discovery screenshots
  if (discovery) {
    for (const [tabName, tab] of Object.entries(discovery.tabs)) {
      if (tab.screenshot) {
        lines.push(`| discovery/${tab.screenshot} | Discovery | ${tabName} tab |`);
      }
    }
  }

  // Flow screenshots
  const flowScreenshotPatterns = [
    { pattern: 'flow1-all-tabs.png', desc: 'All Blog Hub tabs' },
    { pattern: 'flow2-before-search.png', desc: 'Topics before search' },
    { pattern: 'flow2-after-search.png', desc: 'Topics after search' },
    { pattern: 'flow2-after-clear.png', desc: 'Topics after clear' },
    { pattern: 'flow3-editor-loaded.png', desc: 'Editor loaded' },
    { pattern: 'flow4-draft-filled.png', desc: 'Draft post filled' },
    { pattern: 'flow4-draft-saved.png', desc: 'Draft post saved' },
    { pattern: 'flow5-featured-set.png', desc: 'Featured toggle set' },
    { pattern: 'flow6-schedule-set.png', desc: 'Schedule date set' },
    { pattern: 'flow7-hero-image-set.png', desc: 'Hero image set' },
    { pattern: 'flow8-post-in-list.png', desc: 'Post in list' },
    { pattern: 'flow9-ai-creator-prompt.png', desc: 'AI Creator prompt' },
  ];

  for (const { pattern, desc } of flowScreenshotPatterns) {
    const screenshotPath = path.join(PROJECT_ROOT, 'test-results', 'flows', pattern);
    if (fs.existsSync(screenshotPath)) {
      lines.push(`| flows/${pattern} | Flow Tests | ${desc} |`);
    }
  }
  lines.push('');

  // Failures & Warnings
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check discovery failures
  if (discovery) {
    for (const [tabName, tab] of Object.entries(discovery.tabs)) {
      if (!tab.loaded) {
        failures.push(`Discovery: Tab '${tabName}' failed to load`);
      }
      for (const error of tab.errors) {
        warnings.push(`Discovery [${tabName}]: ${error}`);
      }
    }
  }

  // Check flow failures with expanded warning patterns
  const warningPatterns = [
    'error', 'failed',
    'skipped', 'not found',
    'deleted', 'cleanup',
    'rate limit', '429',
    'may have been',
    'timeout', 'retry'
  ];

  for (const flow of flowResults) {
    if (flow.effectiveStatus === 'failed') {
      failures.push(`Flow Test: '${flow.name}' failed`);
    }
    for (const note of flow.notes) {
      const noteLower = note.toLowerCase();
      if (warningPatterns.some(pattern => noteLower.includes(pattern))) {
        warnings.push(`Flow [${flow.name}]: ${note}`);
      }
    }
  }

  // Check Playwright results for errors
  if (playwrightResults && playwrightResults.stats.unexpected > 0) {
    failures.push(`Playwright: ${playwrightResults.stats.unexpected} unexpected test failures`);
  }

  if (failures.length > 0 || warnings.length > 0) {
    lines.push('## Failures & Warnings');
    lines.push('');

    if (failures.length > 0) {
      lines.push('**Failures:**');
      failures.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('**Warnings:**');
      warnings.forEach(w => lines.push(`- ${w}`));
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Generated by generate-report.ts*');

  // Write report
  const reportContent = lines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, reportContent);

  console.log(`✅ QA Report generated: ${OUTPUT_FILE}`);

  // Print summary to console with 4-tier breakdown
  console.log('\n--- QA Report Summary ---');
  console.log(`Environment: ${baseUrl}`);
  console.log(`Branch: ${branch} | Commit: ${commit}`);
  console.log(`Discovery: ${discovery ? `${discoveryTabsLoaded}/${discoveryTabsTotal} tabs` : 'Not run'}`);
  if (flowResults.length > 0) {
    const summaryParts: string[] = [];
    if (flowsTrulyPassed > 0) summaryParts.push(`${flowsTrulyPassed} passed`);
    if (flowsDegraded > 0) summaryParts.push(`${flowsDegraded} degraded`);
    if (flowsFailed > 0) summaryParts.push(`${flowsFailed} failed`);
    if (flowsSkipped > 0) summaryParts.push(`${flowsSkipped} skipped`);
    console.log(`Flows: ${summaryParts.join(', ')} (${flowsTotal} total)`);
  } else {
    console.log('Flows: Not run');
  }
  console.log(`Overall: ${overallStatus}`);
  console.log('-------------------------\n');
}

// Run
generateReport();
