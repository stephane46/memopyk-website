/**
 * Layer 3: API Tests
 *
 * Regression tests for analytics API endpoints on staging.
 * Run with: npx tsx tests/e2e/analytics/layer3-api.ts
 *
 * Regressions covered:
 *   3.1 Video completion rate 100% when plays=0
 *   3.2 Blog popular posts route returning 404 (/ga4/ vs /analytics/)
 *   3.3 Published post with topic appearing as "Uncategorized"
 *   3.4 Trends comparative period missing (flat dotted line)
 *   3.5 Analytics health endpoint liveness
 *   3.6 completions field missing from top-videos response
 */

import * as fs from 'fs';
import * as path from 'path';

const STAGING_URL = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let blocked = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
  }
}

function block(name: string, reason: string): void {
  blocked++;
  console.log(`⚠️  BLOCKED ${name}: ${reason}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function get(
  urlPath: string,
  params?: Record<string, string>
): Promise<{ status: number; body: any; elapsedMs: number }> {
  const url = new URL(urlPath, STAGING_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const start = Date.now();
  const res = await fetch(url.toString());
  const elapsedMs = Date.now() - start;
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, elapsedMs };
}

// ---------------------------------------------------------------------------
// Postgres DB query helper
// Falls back gracefully if DATABASE_URL is not set locally.
// ---------------------------------------------------------------------------

async function queryDB(sql: string): Promise<any[] | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  // Dynamic import to avoid hard dependency when DB not needed
  const pg = await import('pg');
  const Client = (pg.default || pg).Client;
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const result = await client.query(sql);
    return result.rows;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Main: all tests run inside an async IIFE to avoid top-level await issues
// ---------------------------------------------------------------------------

(async () => {
  // -------------------------------------------------------------------------
  // 3.1 Video top videos — mathematical consistency
  // REGRESSION: completion rate 100% when plays=0
  // -------------------------------------------------------------------------

  await test('3.1 Top videos — completion rate never 100% when plays=0', async () => {
    const { status, body } = await get('/api/ga4/top-videos', { period: '30d' });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body !== null, 'Response body is null');
    assert(Array.isArray(body.topVideos), 'Response must have topVideos array');

    for (const v of body.topVideos as any[]) {
      const plays = v.plays ?? v.views ?? 0;
      const completions = v.completions ?? 0;
      const completionRate = v.completionRate ?? v.completePct ?? 0;

      // If no plays and no completions, completion rate must not be 100
      if (plays === 0 && completions === 0) {
        assert(
          completionRate !== 100,
          `Video "${v.videoId || v.title}" has plays=0, completions=0 but completionRate=${completionRate} (should not be 100)`
        );
      }

      // If plays > 0, verify mathematical consistency (allow ±2 for rounding)
      if (plays > 0 && completions >= 0) {
        const expected = Math.round((completions / plays) * 100);
        const actual = completionRate;
        const diff = Math.abs(actual - expected);
        assert(
          diff <= 2,
          `Video "${v.videoId || v.title}": completionRate=${actual} but expected ≈${expected} (completions=${completions}/plays=${plays})`
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // 3.2 Blog popular posts — correct route (REGRESSION: /ga4/ 404)
  // -------------------------------------------------------------------------

  await test('3.2 Blog popular posts — HTTP 200 (not 404)', async () => {
    const { status, body } = await get('/api/analytics/blog/popular', { days: '30' });
    assert(status === 200, `Expected 200, got ${status} — route may be mounted under wrong prefix`);
    assert(Array.isArray(body), `Expected array response, got: ${typeof body}`);
  });

  // -------------------------------------------------------------------------
  // 3.3 Blog categories — no "Uncategorized" for posts with a linked topic
  // REGRESSION: FR post with source_topic_id appearing as "Uncategorized"
  // -------------------------------------------------------------------------

  // Try to find a published post with a linked topic via DB query
  const linkedPostRows = await queryDB(`
    SELECT bp.slug, ct.title AS topic_name
    FROM blog_posts bp
    JOIN content_topics ct ON bp.source_topic_id = ct.id
    WHERE bp.status = 'published' AND bp.source_topic_id IS NOT NULL
    LIMIT 1
  `);

  if (linkedPostRows === null) {
    // DATABASE_URL not available locally — verify via API shape only
    await test('3.3 Blog categories — response is valid array with category strings', async () => {
      const { status, body } = await get('/api/analytics/blog/categories', { days: '90' });
      assert(status === 200, `Expected 200, got ${status}`);
      assert(Array.isArray(body), `Expected array response`);
      for (const item of body as any[]) {
        assert(
          typeof item.category === 'string',
          `Category item missing 'category' string field: ${JSON.stringify(item)}`
        );
      }
    });
  } else if (linkedPostRows.length === 0) {
    block(
      '3.3 Blog categories — linked post not Uncategorized',
      'No published posts with source_topic_id found in DB — cannot verify category assignment'
    );

    // Append to BLOCKED.md
    const blockedPath = path.join(
      process.cwd(),
      'tests/e2e/analytics/BLOCKED.md'
    );
    try {
      const current = fs.readFileSync(blockedPath, 'utf-8');
      if (!current.includes('3.3')) {
        const entry = `| 3.3 | No published posts with source_topic_id found | Publish a post linked to a content topic, then re-run |\n`;
        fs.writeFileSync(
          blockedPath,
          current.replace('| (none yet) | | |', entry + '| (none yet) | | |')
        );
      }
    } catch {}
  } else {
    const { slug, topic_name } = linkedPostRows[0];
    await test(
      `3.3 Blog categories — post "${slug}" (topic: ${topic_name}) not entirely in Uncategorized`,
      async () => {
        const { status, body } = await get('/api/analytics/blog/categories', { days: '90' });
        assert(status === 200, `Expected 200, got ${status}`);
        assert(Array.isArray(body), `Expected array response`);

        if ((body as any[]).length === 0) return; // No views yet — not meaningful

        const uncategorized = (body as any[]).find(
          (c: any) => c.category === 'Uncategorized'
        );
        const totalViews = (body as any[]).reduce(
          (sum: number, c: any) => sum + (c.viewCount || 0),
          0
        );

        if (uncategorized && totalViews > 0) {
          const uncatPct = Math.round((uncategorized.viewCount / totalViews) * 100);
          assert(
            uncatPct < 100,
            `100% of blog views are Uncategorized despite topic-linked post "${slug}" — category JOIN broken`
          );
        }
      }
    );
  }

  // -------------------------------------------------------------------------
  // 3.4 Trends comparative period (REGRESSION: flat dotted line)
  // -------------------------------------------------------------------------

  await test('3.4 Trends — periodAggregates has prevPeriodSessions field', async () => {
    const { status, body } = await get('/api/ga4/trend', {
      startDate: '20260201',
      endDate: '20260220',
      dataSource: 'memopyk',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body !== null, 'Response body is null');
    assert(Array.isArray(body.dailyData), 'Response must have dailyData array');
    assert(
      body.periodAggregates !== undefined,
      'Response must have periodAggregates object'
    );
    assert(
      typeof body.periodAggregates === 'object',
      'periodAggregates must be an object'
    );
    assert(
      'prevPeriodSessions' in body.periodAggregates,
      `periodAggregates missing prevPeriodSessions — comparative period not computed. Keys: ${Object.keys(body.periodAggregates).join(', ')}`
    );
    assert(
      typeof body.periodAggregates.prevPeriodSessions === 'number',
      `prevPeriodSessions must be a number, got ${typeof body.periodAggregates.prevPeriodSessions}`
    );
  });

  // -------------------------------------------------------------------------
  // 3.5 Health endpoint — live checks
  // -------------------------------------------------------------------------

  await test('3.5 Analytics health — HTTP 200 with expected fields', async () => {
    const { status, body, elapsedMs } = await get('/api/analytics/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body !== null, 'Response body is null');
    assert(body.success === true, `Expected success=true, got: ${JSON.stringify(body)}`);
    assert(
      'analytics_db_enabled' in body,
      `Missing analytics_db_enabled field. Got: ${JSON.stringify(body)}`
    );
    assert(
      'ga4_configured' in body,
      `Missing ga4_configured field. Got: ${JSON.stringify(body)}`
    );
    assert(
      elapsedMs < 5000,
      `Health check took ${elapsedMs}ms — must be < 5000ms`
    );
  });

  // -------------------------------------------------------------------------
  // 3.6 Video completions field included in response
  // REGRESSION: completions field was never sent in top-videos response
  // -------------------------------------------------------------------------

  await test('3.6 Top videos — each item has completions field (not undefined)', async () => {
    const { status, body } = await get('/api/ga4/top-videos', { period: '30d' });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.topVideos), 'Response must have topVideos array');

    for (const v of body.topVideos as any[]) {
      assert(
        'completions' in v,
        `topVideos item "${v.videoId || v.title}" is missing the 'completions' field — regression: field was never sent`
      );
      assert(
        typeof v.completions === 'number',
        `topVideos item "${v.videoId || v.title}" has completions=${v.completions} (must be a number)`
      );
    }

    // Also verify via /api/ga4/report?report=topVideos
    const { status: s2, body: b2 } = await get('/api/ga4/report', {
      report: 'topVideos',
      period: '30d',
    });
    assert(s2 === 200, `Expected 200 on /api/ga4/report?report=topVideos, got ${s2}`);
    assert(Array.isArray(b2.topVideos), '/api/ga4/report?report=topVideos must have topVideos array');
    for (const v of b2.topVideos as any[]) {
      assert(
        'completions' in v,
        `topVideos item "${v.videoId || v.title}" from /ga4/report missing 'completions' field`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log('');
  console.log('────────────────────────────────────────');
  console.log(`Layer 3 API Tests — ${new Date().toISOString()}`);
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⚠️  Blocked: ${blocked}`);
  console.log('────────────────────────────────────────');

  process.exit(failed > 0 ? 1 : 0);
})();
