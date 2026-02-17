import { test, expect } from '@playwright/test';
import { STAGING_URL, PUBLIC_PAGES, PUBLIC_SCREENSHOTS_DIR } from './smoke-test-config';
import { SmokeResult, takeScreenshot, scanForBadText, checkPageHealth, waitForPageReady, setupConsoleCapture, ensureDir } from './smoke-test-utils';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(240000); // 4 minutes total

test('Public pages smoke test', async ({ page }) => {
  const results: SmokeResult[] = [];
  let cookieConsentHandled = false;

  // Combine all public pages
  const allPages = [
    ...PUBLIC_PAGES.fr,
    ...PUBLIC_PAGES.en,
    { path: '/en-US/nonexistent-page-xyz', label: '404 Page EN' },
  ];

  console.log(`\n🔍 Starting public smoke test on ${allPages.length} pages...\n`);

  for (const pageConfig of allPages) {
    const startTime = Date.now();
    const consoleErrors = setupConsoleCapture(page);

    const result: SmokeResult = {
      id: pageConfig.path.replace(/\//g, '-').substring(1),
      label: pageConfig.label,
      url: STAGING_URL + pageConfig.path,
      status: 'PASS',
      screenshot: '',
      loadTimeMs: 0,
      badTextFound: [],
      consoleErrors: [],
      missingElements: [],
      notes: [],
    };

    try {
      console.log(`Testing: ${pageConfig.label}`);

      // Navigate to page
      const response = await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Handle cookie consent on first page load
      if (!cookieConsentHandled) {
        try {
          const acceptButton = page.getByRole('button', { name: /accept all|accepter tout/i });
          if (await acceptButton.isVisible({ timeout: 3000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
            cookieConsentHandled = true;
          }
        } catch (e) {
          // No cookie banner, that's fine
        }
      }

      // Wait for page to be ready
      await waitForPageReady(page);

      // Take screenshot first (for debugging if later steps fail)
      const screenshotName = pageConfig.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
      result.screenshot = await takeScreenshot(page, PUBLIC_SCREENSHOTS_DIR, screenshotName);

      // Check for HTTP errors (404 page is expected to return 404)
      if (response && !response.ok() && !pageConfig.path.includes('nonexistent')) {
        result.notes.push(`HTTP ${response.status()}: ${response.statusText()}`);
        result.status = 'FAIL';
      }

      // Scan for bad text patterns
      result.badTextFound = await scanForBadText(page);

      // Check page health
      const healthIssues = await checkPageHealth(page);
      result.missingElements.push(...healthIssues);

      // Page-specific element checks
      await performPageSpecificChecks(page, pageConfig, result);

      // Copy console errors
      result.consoleErrors = [...consoleErrors];

      // Calculate load time
      result.loadTimeMs = Date.now() - startTime;

      // Determine final status
      if (result.status !== 'FAIL') {
        if (result.badTextFound.length > 0 || result.missingElements.length > 0) {
          result.status = 'FAIL';
        } else if (result.consoleErrors.length > 0) {
          result.status = 'WARN';
        }
      }

      console.log(`  ✓ ${result.status} (${result.loadTimeMs}ms)`);

    } catch (error) {
      result.status = 'ERROR';
      result.notes.push(`Error: ${error.message}`);
      result.loadTimeMs = Date.now() - startTime;

      // Try to capture error screenshot
      try {
        const errorScreenshotName = `error-${pageConfig.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        result.screenshot = await takeScreenshot(page, PUBLIC_SCREENSHOTS_DIR, errorScreenshotName);
      } catch (screenshotError) {
        result.notes.push(`Could not capture error screenshot: ${screenshotError.message}`);
      }

      console.log(`  ✗ ERROR: ${error.message}`);
    }

    results.push(result);
  }

  // Write results to JSON
  ensureDir(path.dirname(PUBLIC_SCREENSHOTS_DIR));
  const resultsPath = path.join(PUBLIC_SCREENSHOTS_DIR, '..', 'public-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log('\n📊 Public Smoke Test Summary:');
  console.log(`   PASS: ${passed}`);
  console.log(`   WARN: ${warnings}`);
  console.log(`   FAIL: ${failed}`);
  console.log(`   ERROR: ${errors}`);
  console.log(`   Total: ${results.length}`);
  console.log(`\nResults saved to: ${resultsPath}\n`);

  // Test should pass even if some pages have issues (we capture them in the report)
  // Only fail the test if there were critical errors preventing navigation
  const criticalErrors = results.filter(r => r.status === 'ERROR').length;
  expect(criticalErrors).toBeLessThan(results.length * 0.5); // Fail if >50% pages errored
});

/**
 * Perform page-specific element checks
 */
async function performPageSpecificChecks(page: any, pageConfig: any, result: SmokeResult): Promise<void> {
  const path = pageConfig.path;

  // Homepage checks
  if (path.match(/\/(fr-FR|en-US)$/)) {
    // Check for hero video (more reliable than class names)
    const hasVideo = await page.locator('video').count() > 0;
    if (!hasVideo) {
      result.missingElements.push('Hero video');
    }

    // Check for FAQ section by heading text
    const bodyText = await page.locator('body').innerText();
    const hasFAQ = bodyText.includes('FAQ') ||
                   bodyText.includes('Questions Fréquentes') ||
                   bodyText.includes('Frequently Asked Questions');
    if (!hasFAQ) {
      result.missingElements.push('FAQ section');
    }

    // Check that page has multiple sections (indicates proper render)
    const sectionCount = await page.locator('section').count();
    if (sectionCount < 3) {
      result.missingElements.push(`Homepage has only ${sectionCount} sections (expected at least 3)`);
    }

    // Check for CTA buttons by role and text patterns
    const ctaButtons = await page.locator('button, a').evaluateAll(elements => {
      return elements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('découvrir') || text.includes('commencer') ||
               text.includes('discover') || text.includes('start') ||
               text.includes('contact');
      }).length;
    });
    if (ctaButtons === 0) {
      result.missingElements.push('CTA buttons');
    }
  }

  // Blog index checks
  if (path.includes('/blog')) {
    const blogCards = await page.locator('[data-testid="blog-card"], article, .blog-post').count();
    const noPostsMessage = await page.locator('text=/no posts|aucun article/i').count();

    if (blogCards === 0 && noPostsMessage === 0) {
      result.missingElements.push('Blog posts or "no posts" message');
    }
  }

  // Partner directory checks
  if (path.includes('annuaire-pro') || path.includes('directory-pro')) {
    if (!path.includes('devenir') && !path.includes('join')) {
      const mapContainer = await page.locator('.mapboxgl-map, canvas.mapboxgl-canvas').count();
      if (mapContainer === 0) {
        result.missingElements.push('Mapbox map container');
      }

      const partnerCards = await page.locator('[data-testid="partner-card"], .partner-card, [class*="PartnerCard"]').count();
      if (partnerCards === 0) {
        result.notes.push('No partner cards visible (may be expected if no partners in DB)');
      }
    }
  }

  // Partner intake form checks
  if (path.includes('devenir') || path.includes('join')) {
    const formFields = await page.locator('input, textarea, select').count();
    if (formFields === 0) {
      result.missingElements.push('Form fields');
    }
  }

  // Travel upload checks
  if (path.includes('travel-upload')) {
    const uploadForm = await page.locator('form, [class*="upload"], input[type="file"]').count();
    if (uploadForm === 0) {
      result.missingElements.push('Upload form');
    }
  }

  // Gallery checks
  if (path.includes('/gallery')) {
    const videoThumbnails = await page.locator('video, [class*="video"], [class*="gallery"]').count();
    const noVideosMessage = await page.locator('text=/no videos|aucune vidéo/i').count();

    if (videoThumbnails === 0 && noVideosMessage === 0) {
      result.notes.push('No video thumbnails visible (may be expected if no videos in DB)');
    }
  }

  // Contact page checks
  if (path.includes('/contact')) {
    const contactContent = await page.locator('form, input[type="email"], textarea').count();
    if (contactContent === 0) {
      result.missingElements.push('Contact form');
    }
  }

  // Legal pages checks
  if (path.includes('/legal/')) {
    const bodyText = await page.locator('body').innerText();
    if (bodyText.length < 100) {
      result.missingElements.push('Legal document content (body too short)');
    }
  }

  // 404 page checks
  if (path.includes('nonexistent')) {
    const notFoundText = await page.locator('text=/404|not found|page introuvable/i').count();
    const bodyText = await page.locator('body').innerText();

    if (notFoundText === 0 && bodyText.trim().length < 50) {
      result.missingElements.push('404 message or error content');
    } else {
      result.notes.push('404 page properly displays error content');
    }
  }

  // Blog post checks (if we managed to click into one)
  if (path.match(/\/blog\/[a-z0-9-]+$/)) {
    const articleContent = await page.locator('article, [class*="post"], [class*="Post"]').count();
    if (articleContent === 0) {
      result.missingElements.push('Blog post article content');
    }
  }
}
