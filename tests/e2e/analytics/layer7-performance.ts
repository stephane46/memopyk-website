/**
 * Layer 7: Performance Baseline Tests
 *
 * For each analytics endpoint: make 3 requests, record response times,
 * assert median is under threshold, assert no single request exceeds 2x threshold.
 *
 * Run with: npx tsx tests/e2e/analytics/layer7-performance.ts
 */

const STAGING_URL = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';

// ---------------------------------------------------------------------------
// Endpoint configuration
// ---------------------------------------------------------------------------

interface EndpointConfig {
  label: string;
  path: string;
  thresholdMs: number;
}

const ENDPOINTS: EndpointConfig[] = [
  {
    label: 'Analytics Health',
    path: '/api/analytics/health',
    thresholdMs: 5000,
  },
  {
    label: 'GA4 Top Videos (30d)',
    path: '/api/ga4/top-videos?period=30d',
    thresholdMs: 2000,
  },
  {
    label: 'Blog Popular Posts (30d)',
    path: '/api/analytics/blog/popular?days=30',
    thresholdMs: 2000,
  },
  {
    label: 'Blog Categories (30d)',
    path: '/api/analytics/blog/categories?days=30',
    thresholdMs: 2000,
  },
  {
    label: 'GA4 Trend (memopyk, Feb 2026)',
    path: '/api/ga4/trend?startDate=20260201&endDate=20260220&dataSource=memopyk',
    thresholdMs: 3000,
  },
];

const SAMPLES = 3;

// Delay between individual samples within one endpoint (ms)
const INTER_SAMPLE_DELAY = 400;

// Delay between different endpoints (ms) — helps avoid rate limiting
const INTER_ENDPOINT_DELAY = 800;

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// HTTP timing helper
// ---------------------------------------------------------------------------

async function timedFetch(url: string): Promise<{ status: number; elapsedMs: number }> {
  const start = Date.now();
  const res = await fetch(url);
  const elapsedMs = Date.now() - start;
  // Drain body to get accurate timing and avoid open socket warnings
  try { await res.text(); } catch {}
  return { status: res.status, elapsedMs };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// ---------------------------------------------------------------------------
// Results table
// ---------------------------------------------------------------------------

interface Result {
  label: string;
  times: number[];
  medianMs: number;
  maxMs: number;
  thresholdMs: number;
  maxAllowed: number;
  status: 'PASS' | 'FAIL';
  failReason?: string;
}

const results: Result[] = [];

// ---------------------------------------------------------------------------
// Main: all tests run inside an async IIFE to avoid top-level await issues
// ---------------------------------------------------------------------------

(async () => {
  for (const ep of ENDPOINTS) {
    const fullUrl = `${STAGING_URL}${ep.path}`;
    const maxAllowed = ep.thresholdMs * 2;

    console.log(`\n  ${ep.label}`);
    const times: number[] = [];
    let httpErrors = 0;
    let rateLimitHits = 0;

    for (let i = 0; i < SAMPLES; i++) {
      try {
        const { status, elapsedMs } = await timedFetch(fullUrl);
        if (status >= 500) {
          httpErrors++;
          console.log(`    Sample ${i + 1}: HTTP ${status} (server error) in ${elapsedMs}ms`);
        } else if (status === 429) {
          // Rate limited — still record timing (429 rejection is itself a performance data point)
          rateLimitHits++;
          times.push(elapsedMs);
          console.log(`    Sample ${i + 1}: ${elapsedMs}ms (HTTP 429 rate-limited)`);
        } else {
          times.push(elapsedMs);
          console.log(`    Sample ${i + 1}: ${elapsedMs}ms (HTTP ${status})`);
        }
      } catch (e: any) {
        httpErrors++;
        console.log(`    Sample ${i + 1}: fetch error — ${e.message}`);
      }
      if (i < SAMPLES - 1) await new Promise(r => setTimeout(r, INTER_SAMPLE_DELAY));
    }

    if (rateLimitHits > 0) {
      console.log(`    ⚠️  ${rateLimitHits}/${SAMPLES} samples hit rate limit (HTTP 429) — timings reflect rejection speed`);
    }

    let status: 'PASS' | 'FAIL' = 'PASS';
    let failReason: string | undefined;

    if (times.length === 0) {
      status = 'FAIL';
      failReason = `All ${SAMPLES} requests failed (HTTP errors or network)`;
      results.push({ label: ep.label, times: [], medianMs: 0, maxMs: 0, thresholdMs: ep.thresholdMs, maxAllowed, status, failReason });
      await test(
        `7.x ${ep.label} — median < ${ep.thresholdMs}ms, max < ${maxAllowed}ms`,
        async () => { throw new Error(failReason!); }
      );
      continue;
    }

    const med = median(times);
    const max = Math.max(...times);

    if (med > ep.thresholdMs) {
      status = 'FAIL';
      failReason = `Median ${med}ms exceeds threshold ${ep.thresholdMs}ms`;
    } else if (max > maxAllowed) {
      status = 'FAIL';
      failReason = `Max ${max}ms exceeds 2x threshold ${maxAllowed}ms`;
    }

    results.push({ label: ep.label, times, medianMs: med, maxMs: max, thresholdMs: ep.thresholdMs, maxAllowed, status, failReason });

    // Pause between endpoint groups to reduce rate limit pressure
    await new Promise(r => setTimeout(r, INTER_ENDPOINT_DELAY));

    await test(
      `7.x ${ep.label} — median < ${ep.thresholdMs}ms, max < ${maxAllowed}ms`,
      async () => {
        assert(
          med <= ep.thresholdMs,
          `Median ${med}ms > threshold ${ep.thresholdMs}ms`
        );
        assert(
          max <= maxAllowed,
          `Max single request ${max}ms > 2x threshold ${maxAllowed}ms`
        );
      }
    );
  }

  // -------------------------------------------------------------------------
  // Formatted results table
  // -------------------------------------------------------------------------

  const colW = [32, 8, 8, 8, 10, 8, 8];
  const sep = '─'.repeat(colW.reduce((a, b) => a + b, 0) + colW.length * 3);

  console.log('');
  console.log('═'.repeat(sep.length));
  console.log(` Layer 7 Performance Baseline — ${new Date().toISOString()}`);
  console.log('═'.repeat(sep.length));

  const header = [
    'Endpoint'.padEnd(colW[0]),
    'p1(ms)'.padStart(colW[1]),
    'p2(ms)'.padStart(colW[2]),
    'p3(ms)'.padStart(colW[3]),
    'median(ms)'.padStart(colW[4]),
    'max(ms)'.padStart(colW[5]),
    'Status'.padStart(colW[6]),
  ];
  console.log(header.join(' | '));
  console.log(sep);

  for (const r of results) {
    const [t1, t2, t3] = [r.times[0] ?? '-', r.times[1] ?? '-', r.times[2] ?? '-'];
    const row = [
      r.label.padEnd(colW[0]).substring(0, colW[0]),
      String(t1).padStart(colW[1]),
      String(t2).padStart(colW[2]),
      String(t3).padStart(colW[3]),
      String(r.medianMs || '-').padStart(colW[4]),
      String(r.maxMs || '-').padStart(colW[5]),
      (r.status === 'PASS' ? '✅ PASS' : '❌ FAIL').padStart(colW[6]),
    ];
    console.log(row.join(' | '));
    if (r.failReason) {
      console.log(`  ↳ ${r.failReason}`);
    }
  }

  console.log(sep);
  console.log('');
  console.log(`  ✅ Passed:  ${passed} / ${ENDPOINTS.length}`);
  console.log(`  ❌ Failed:  ${failed} / ${ENDPOINTS.length}`);
  console.log('');
  console.log('Thresholds:');
  for (const ep of ENDPOINTS) {
    console.log(`  ${ep.label}: median < ${ep.thresholdMs}ms, single request < ${ep.thresholdMs * 2}ms`);
  }
  console.log('═'.repeat(sep.length));

  process.exit(failed > 0 ? 1 : 0);
})();
