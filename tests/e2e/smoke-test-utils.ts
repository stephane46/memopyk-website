import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BAD_PATTERNS, PATTERN_EXCEPTIONS } from './smoke-test-config';

export interface SmokeResult {
  id: string;
  label: string;
  url: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR';
  screenshot: string;
  loadTimeMs: number;
  badTextFound: string[];
  consoleErrors: string[];
  missingElements: string[];
  notes: string[];
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Take a screenshot with a clean filename
 */
export async function takeScreenshot(page: Page, dir: string, name: string): Promise<string> {
  ensureDir(dir);
  const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const filename = `${cleanName}.png`;
  const filepath = path.join(dir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

/**
 * Scan visible page text for problematic patterns.
 * Returns array of findings like: ["Found 'undefined' in: 'Section: undefined'"]
 */
export async function scanForBadText(page: Page): Promise<string[]> {
  const findings: string[] = [];

  // Get all visible text from the page body
  const bodyText = await page.locator('body').innerText().catch(() => '');

  // Patterns that need word boundaries to avoid false positives
  const WORD_BOUNDARY_PATTERNS = ['500', '404', 'NaN', 'null'];
  // Patterns that need error context to be flagged
  const ERROR_CONTEXT_PATTERNS = ['500'];
  const ERROR_KEYWORDS = ['error', 'internal', 'server', 'http', 'status', 'failed', 'erreur'];

  for (const pattern of BAD_PATTERNS) {
    const lowerPattern = pattern.toLowerCase();
    const lowerBody = bodyText.toLowerCase();

    // Skip if pattern not in body at all
    if (!lowerBody.includes(lowerPattern)) continue;

    const exceptions = PATTERN_EXCEPTIONS[pattern] || [];
    const isWordBoundary = WORD_BOUNDARY_PATTERNS.includes(pattern);
    const needsErrorContext = ERROR_CONTEXT_PATTERNS.includes(pattern);

    if (isWordBoundary) {
      // Use regex with word boundaries for short/numeric patterns
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      let match;

      while ((match = regex.exec(bodyText)) !== null) {
        // Extract surrounding context (100 chars before and after)
        const start = Math.max(0, match.index - 100);
        const end = Math.min(bodyText.length, match.index + pattern.length + 100);
        const context = bodyText.substring(start, end).trim().substring(0, 200);
        const lowerContext = context.toLowerCase();

        // Check if it's an exception
        const isException = exceptions.some(exc => lowerContext.includes(exc.toLowerCase()));
        if (isException) continue;

        // For error context patterns, check for error-related keywords
        if (needsErrorContext) {
          const hasErrorContext = ERROR_KEYWORDS.some(keyword => lowerContext.includes(keyword));
          if (!hasErrorContext) continue; // Not an error, just a number
        }

        findings.push(`Found '${pattern}' in: "${context}"`);
      }
    } else {
      // Use includes() for longer patterns (less likely to have false positives)
      const lines = bodyText.split('\n').filter(line => line.toLowerCase().includes(lowerPattern));

      for (const line of lines) {
        const trimmedLine = line.trim().substring(0, 200);
        const isException = exceptions.some(exc => trimmedLine.toLowerCase().includes(exc.toLowerCase()));
        if (!isException && trimmedLine.length > 0) {
          findings.push(`Found '${pattern}' in: "${trimmedLine}"`);
        }
      }
    }
  }

  // Also check for empty tables/lists that should have data
  const emptyTables = await page.locator('table tbody').count();
  for (let i = 0; i < emptyTables; i++) {
    const rows = await page.locator('table tbody').nth(i).locator('tr').count();
    if (rows === 0) {
      const tableHeader = await page.locator('table').nth(i).locator('thead th').first().innerText().catch(() => 'unknown');
      findings.push(`Empty table found (header: "${tableHeader}")`);
    }
  }

  return findings;
}

/**
 * Collect console errors from the page.
 * Call this AFTER navigating to the page.
 * Returns accumulated errors.
 */
export function setupConsoleCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text().substring(0, 300);
      const lowerText = text.toLowerCase();

      // Skip common noise and non-specific errors
      if (text.includes('favicon') ||
          text.includes('gtag') ||
          text.includes('clarity') ||
          text.includes('fonts.googleapis.com') ||
          text.includes('fonts.gstatic.com') ||
          text.includes('api.mapbox.com') ||
          text.includes('x-e2e-token') ||
          (lowerText.includes('cors') && lowerText.includes('font')) ||
          (lowerText.includes('cors') && lowerText.includes('mapbox')) ||
          text === 'Failed to load resource: net::ERR_FAILED' ||
          text === 'Failed to load resource: the server responded with a status of 400 (Bad Request)' ||
          text === 'Failed to load resource: the server responded with a status of 404 ()' ||
          text === 'Failed to load resource: the server responded with a status of 500 ()') {
        return;
      }

      errors.push(text);
    }
  });
  return errors;
}

/**
 * Check for specific elements that indicate the page loaded properly
 */
export async function checkPageHealth(page: Page): Promise<string[]> {
  const issues: string[] = [];

  // Check for React error boundaries
  const errorBoundary = await page.locator('[class*="error-boundary"], [class*="ErrorBoundary"]').count();
  if (errorBoundary > 0) {
    issues.push('React error boundary triggered');
  }

  // Check for Suspense fallbacks still showing (lazy load failed)
  const spinners = await page.locator('.animate-spin').count();
  if (spinners > 3) {
    issues.push(`${spinners} loading spinners visible (possible lazy load failure)`);
  }

  // Check for broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const broken: string[] = [];
    imgs.forEach(img => {
      if (img.naturalWidth === 0 && img.src && !img.src.includes('data:')) {
        broken.push(img.src.substring(0, 100));
      }
    });
    return broken;
  });
  if (brokenImages.length > 0) {
    issues.push(`Broken images: ${brokenImages.join(', ')}`);
  }

  return issues;
}

/**
 * Wait for page to be fully loaded (network idle + no spinners)
 */
export async function waitForPageReady(page: Page, timeoutMs: number = 15000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
  // Extra wait for lazy-loaded content and animations
  await page.waitForTimeout(1500);
}

/**
 * Generate the final markdown report from all results
 */
export function generateReport(adminResults: SmokeResult[], publicResults: SmokeResult[]): string {
  const allResults = [...adminResults, ...publicResults];
  const passed = allResults.filter(r => r.status === 'PASS').length;
  const warnings = allResults.filter(r => r.status === 'WARN').length;
  const failed = allResults.filter(r => r.status === 'FAIL').length;
  const errors = allResults.filter(r => r.status === 'ERROR').length;

  const lines: string[] = [];
  lines.push('# MEMOPYK Full-Site Smoke Test Report');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push(`**Target:** https://memopyk.memopyk.com (staging)`);
  lines.push(`**Total screens tested:** ${allResults.length}`);
  lines.push('');
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| PASS | ${passed} |`);
  lines.push(`| WARN | ${warnings} |`);
  lines.push(`| FAIL | ${failed} |`);
  lines.push(`| ERROR | ${errors} |`);
  lines.push('');

  // Issues summary (only WARN, FAIL, ERROR)
  const issueResults = allResults.filter(r => r.status !== 'PASS');
  if (issueResults.length > 0) {
    lines.push('## Issues Found');
    lines.push('');
    for (const r of issueResults) {
      const icon = r.status === 'WARN' ? 'WARN' : r.status === 'FAIL' ? 'FAIL' : 'ERROR';
      lines.push(`### ${icon}: ${r.label} (${r.status})`);
      lines.push(`- **URL:** ${r.url}`);
      lines.push(`- **Screenshot:** ${r.screenshot}`);
      if (r.badTextFound.length > 0) {
        lines.push(`- **Bad text:**`);
        r.badTextFound.forEach(t => lines.push(`  - ${t}`));
      }
      if (r.consoleErrors.length > 0) {
        lines.push(`- **Console errors:**`);
        r.consoleErrors.forEach(e => lines.push(`  - ${e}`));
      }
      if (r.missingElements.length > 0) {
        lines.push(`- **Missing elements:**`);
        r.missingElements.forEach(e => lines.push(`  - ${e}`));
      }
      if (r.notes.length > 0) {
        lines.push(`- **Notes:**`);
        r.notes.forEach(n => lines.push(`  - ${n}`));
      }
      lines.push('');
    }
  } else {
    lines.push('## No Issues Found');
    lines.push('');
    lines.push('All screens passed the smoke test.');
    lines.push('');
  }

  // Full results table
  lines.push('---');
  lines.push('');
  lines.push('## Full Results');
  lines.push('');

  // Admin results
  lines.push('### Admin Sections');
  lines.push('');
  lines.push('| Section | Status | Load Time | Issues |');
  lines.push('|---------|--------|-----------|--------|');
  for (const r of adminResults) {
    const issueCount = r.badTextFound.length + r.consoleErrors.length + r.missingElements.length;
    lines.push(`| ${r.label} | ${r.status} | ${r.loadTimeMs}ms | ${issueCount > 0 ? `${issueCount} issues` : 'none'} |`);
  }
  lines.push('');

  // Public results
  lines.push('### Public Pages');
  lines.push('');
  lines.push('| Page | Status | Load Time | Issues |');
  lines.push('|------|--------|-----------|--------|');
  for (const r of publicResults) {
    const issueCount = r.badTextFound.length + r.consoleErrors.length + r.missingElements.length;
    lines.push(`| ${r.label} | ${r.status} | ${r.loadTimeMs}ms | ${issueCount > 0 ? `${issueCount} issues` : 'none'} |`);
  }
  lines.push('');

  lines.push('---');
  lines.push(`*Generated by smoke-test suite at ${new Date().toISOString()}*`);

  return lines.join('\n');
}
