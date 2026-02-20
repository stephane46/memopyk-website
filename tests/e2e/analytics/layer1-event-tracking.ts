/**
 * Layer 1: Event Tracking Tests
 *
 * Tests that the correct analytics events are fired and accepted by the backend.
 * Verifies HTTP responses, deduplication logic, and event classification.
 *
 * Regressions covered:
 *   - 60s dedup swallowing video completions for different sessions
 *   - Blog page view double-firing (same IP+page within 30s dedup window)
 *   - Scroll events misclassified as page views
 *
 * Run: npx tsx tests/e2e/analytics/layer1-event-tracking.ts
 */

const STAGING = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';

// ── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: Array<{ name: string; status: string; detail?: string }> = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (e: any) {
    failed++;
    results.push({ name, status: 'FAIL', detail: e.message });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function postJson(
  path: string,
  body: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${STAGING}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// ── Test 1.1: Video play event ───────────────────────────────────────────────

await test('1.1 Video play event — POST /api/analytics/event returns 200 + success:true', async () => {
  const ts = Date.now();
  const sessionId = `e2e-test-layer1-play-${ts}`;

  const { status, data } = await postJson('/api/analytics/event', {
    type: 'video_interaction',
    event_name: 'video_interaction',
    videoId: 'test-layer1-play.mp4',
    action: 'play',
    sessionId,
  });

  assert(status === 200, `Expected HTTP 200, got ${status} — response: ${JSON.stringify(data)}`);
  assert(
    data !== null && typeof data === 'object',
    `Expected JSON response, got: ${JSON.stringify(data)}`
  );
  assert(data.success === true, `Expected success:true, got: ${JSON.stringify(data)}`);
});

// ── Test 1.2: Video completion — REGRESSION: 60s dedup swallowing completions ─

await test(
  '1.2 Video completion — REGRESSION: second completion (different session) not blocked by dedup',
  async () => {
    const ts = Date.now();
    const videoId = `test-layer1-complete-${ts}.mp4`;
    const sessionA = `e2e-test-layer1-complete-${ts}-A`;
    const sessionB = `e2e-test-layer1-complete-${ts}-B`;

    // First completion
    const first = await postJson('/api/analytics/video-view', {
      video_id: videoId,
      completed: true,
      completion_percentage: 95,
      duration_watched: 60,
      session_id: sessionA,
    });

    assert(
      first.status === 200,
      `First completion: expected HTTP 200, got ${first.status} — ${JSON.stringify(first.data)}`
    );
    assert(
      first.data?.success === true,
      `First completion: expected success:true, got: ${JSON.stringify(first.data)}`
    );

    // Second completion — DIFFERENT session ID (must NOT be blocked)
    // The 60s dedup regression: the in-memory dedup key is IP+video+action,
    // so from the same runner IP the video-view endpoint's session-based dedup
    // should allow it through because session_id differs.
    const second = await postJson('/api/analytics/video-view', {
      video_id: videoId,
      completed: true,
      completion_percentage: 95,
      duration_watched: 60,
      session_id: sessionB,
    });

    assert(
      second.status === 200,
      `Second completion: expected HTTP 200, got ${second.status} — ${JSON.stringify(second.data)}`
    );
    assert(
      second.data?.success === true,
      `REGRESSION: second completion with different session was blocked. Got: ${JSON.stringify(second.data)}`
    );

    // If the second was deduplicated at the session level that's wrong — different sessions
    // The endpoint returns { success: true, deduplicated: true } only if SAME session+video
    assert(
      second.data?.deduplicated !== true,
      `REGRESSION: server reported deduplicated:true for different-session completion. ` +
        `This means 60s dedup is incorrectly swallowing cross-session completions. ` +
        `Response: ${JSON.stringify(second.data)}`
    );
  }
);

// ── Test 1.3: Blog page view — single fire only (REGRESSION: double-firing) ──

await test(
  '1.3 Blog page view — first view accepted, second identical view deduplicated within 30s window',
  async () => {
    const ts = Date.now();
    const pageUrl = `/fr/blog/e2e-test-single-fire-${ts}`;

    // Create a session
    const sessionRes = await postJson('/api/analytics/session', {
      language: 'fr-FR',
      page_url: `${STAGING}${pageUrl}`,
    });

    assert(
      sessionRes.status === 200,
      `Session creation failed: HTTP ${sessionRes.status}`
    );

    const sessionId =
      sessionRes.data?.session?.sessionId ?? `e2e-fallback-${ts}`;

    // First page view — must succeed
    const pv1 = await postJson('/api/analytics/session-page-view', {
      sessionId,
      pageUrl,
      pageCount: 1,
    });

    assert(pv1.status === 200, `First page view: expected HTTP 200, got ${pv1.status}`);
    assert(
      pv1.data?.success === true,
      `First page view: expected success:true, got: ${JSON.stringify(pv1.data)}`
    );

    // Wait 1s, then send identical page view from same IP
    await new Promise((r) => setTimeout(r, 1000));

    const pv2 = await postJson('/api/analytics/session-page-view', {
      sessionId,
      pageUrl,
      pageCount: 1,
    });

    assert(pv2.status === 200, `Second page view: expected HTTP 200, got ${pv2.status}`);
    assert(
      pv2.data?.success === true,
      `Second page view: expected success:true, got: ${JSON.stringify(pv2.data)}`
    );

    // Key regression check: the second view should be deduplicated.
    // The dedup key in event-recorder.service is: pageview:{IP}:{normalizedUrl}
    // Within the 30s window, same IP + same page = recorded:false
    assert(
      pv2.data?.recorded === false,
      `REGRESSION: second identical page view was NOT deduplicated within 30s window. ` +
        `recorded=${pv2.data?.recorded}. Double-firing regression may be present. ` +
        `Full response: ${JSON.stringify(pv2.data)}`
    );
  }
);

// ── Test 1.4: CTA click event ────────────────────────────────────────────────

await test('1.4 CTA click event — POST /api/event returns 200 + success:true', async () => {
  const { status, data } = await postJson('/api/event', {
    event_name: 'cta_click',
    cta_id: 'e2e_test_cta',
    page_path: '/fr',
    language: 'fr-FR',
  });

  assert(
    status === 200,
    `Expected HTTP 200, got ${status} — response: ${JSON.stringify(data)}`
  );
  assert(
    data !== null && typeof data === 'object',
    `Expected JSON response, got: ${JSON.stringify(data)}`
  );
  assert(data.success === true, `Expected success:true, got: ${JSON.stringify(data)}`);
});

// ── Test 1.5: Scroll engagement NOT a page view (REGRESSION: misclassification) ─

await test(
  '1.5 Scroll engagement — classified as "logged" NOT as pageview (regression check)',
  async () => {
    const ts = Date.now();
    const sessionId = `e2e-test-layer1-scroll-${ts}`;

    const { status, data } = await postJson('/api/analytics/event', {
      type: 'scroll_engagement',
      event_name: 'scroll_engagement',
      page_path: '/fr',
      scroll_percent: 50,
      sessionId,
    });

    assert(
      status === 200,
      `Expected HTTP 200, got ${status} — response: ${JSON.stringify(data)}`
    );
    assert(
      data?.success === true,
      `Expected success:true, got: ${JSON.stringify(data)}`
    );

    // Key regression: scroll events must return type:'logged', not create a DB record.
    // The /api/analytics/event handler routes:
    //   - type === 'video' + videoId  -> recordVideoEvent (gets an 'id')
    //   - type === 'pageview'          -> recordPageView   (gets an 'id')
    //   - anything else                -> logged only      (returns { success:true, type:'logged' })
    assert(
      data?.type === 'logged',
      `REGRESSION: scroll_engagement not classified as 'logged'. ` +
        `Got type: '${data?.type}'. ` +
        `This means scroll events may be creating pageview DB records. ` +
        `Full response: ${JSON.stringify(data)}`
    );

    // Must NOT have an 'id' field (which would indicate a pageview/video row was inserted)
    assert(
      data?.id === undefined,
      `REGRESSION: scroll event created a DB record (id=${data?.id}). ` +
        `Scroll events must only be logged, not persisted as page views.`
    );
  }
);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`📊 Layer 1 Results: ${passed} passed, ${failed} failed`);
console.log('─'.repeat(60));

for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${r.name}`);
  if (r.detail) console.log(`       ${r.detail}`);
}

process.exit(failed > 0 ? 1 : 0);
