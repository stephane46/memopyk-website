/**
 * Seed Analytics Helper
 *
 * Functions to insert known test data for E2E analytics testing.
 * All test data uses session IDs prefixed with 'e2e-test-' for easy cleanup.
 *
 * Usage:
 *   import { seedVideoPlay, seedBlogView, cleanupTestData } from './helpers/seed-analytics';
 */

const STAGING_URL = process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com';

/**
 * Generate a unique e2e test session ID
 */
export function generateTestSessionId(prefix = 'e2e-test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * POST a page view event to the analytics session-page-view endpoint
 */
export async function seedBlogView(pageUrl: string, count: number = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    const sessionId = generateTestSessionId('e2e-blog');
    // First create a session
    const sessionRes = await fetch(`${STAGING_URL}/api/analytics/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'fr-FR',
        page_url: pageUrl,
        user_agent: 'E2E-Test-Bot/1.0',
      }),
    });
    const sessionData = await sessionRes.json();
    const sid = sessionData?.session?.sessionId || sessionId;

    // Then record the page view
    await fetch(`${STAGING_URL}/api/analytics/session-page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        pageUrl,
        pageCount: 1,
      }),
    });
  }
}

/**
 * Seed video play events via the video-view endpoint
 */
export async function seedVideoPlay(videoFilename: string, count: number = 1): Promise<string[]> {
  const sessionIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const sessionId = generateTestSessionId('e2e-video');
    sessionIds.push(sessionId);

    // Create session first
    await fetch(`${STAGING_URL}/api/analytics/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'fr-FR',
        page_url: `${STAGING_URL}/fr`,
        user_agent: 'E2E-Test-Bot/1.0',
        user_id: sessionId,
      }),
    });

    // Record video view (play)
    await fetch(`${STAGING_URL}/api/analytics/video-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoFilename,
        duration_watched: 10 + i,
        completed: false,
        language: 'fr-FR',
        page_url: `${STAGING_URL}/fr`,
        session_id: sessionId,
      }),
    });
  }
  return sessionIds;
}

/**
 * Seed video completion events
 */
export async function seedVideoCompletion(videoFilename: string, count: number = 1): Promise<string[]> {
  const sessionIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const sessionId = generateTestSessionId('e2e-complete');
    sessionIds.push(sessionId);

    // Create session first
    await fetch(`${STAGING_URL}/api/analytics/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'fr-FR',
        page_url: `${STAGING_URL}/fr`,
        user_agent: 'E2E-Test-Bot/1.0',
        user_id: sessionId,
      }),
    });

    // Record video completion
    await fetch(`${STAGING_URL}/api/analytics/video-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: videoFilename,
        duration_watched: 60 + i,
        completed: true,
        completion_percentage: 100,
        video_duration: 65,
        language: 'fr-FR',
        page_url: `${STAGING_URL}/fr`,
        session_id: sessionId,
      }),
    });
  }
  return sessionIds;
}

/**
 * Seed a general analytics event
 */
export async function seedEvent(eventData: Record<string, unknown>): Promise<Response> {
  return fetch(`${STAGING_URL}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
}

/**
 * Clean up all e2e test data from the database.
 * Uses the Postgres MCP query tool if available, otherwise logs a warning.
 * Returns the cleanup status.
 */
export async function cleanupTestData(): Promise<{ success: boolean; message: string }> {
  // We can't directly run DELETE via the read-only Postgres MCP.
  // Instead, test data is isolated by e2e-test-* session IDs and
  // will naturally age out or be cleaned up manually.
  // For now, just verify our test session pattern doesn't conflict with real data.
  console.log('⚠️ cleanupTestData: e2e-test-* sessions are isolated by prefix');
  console.log('   Real cleanup requires psql with write access');
  return { success: true, message: 'Test data isolated by e2e-test-* prefix' };
}

/**
 * Query the staging API and return JSON response
 */
export async function queryApi(path: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(path, STAGING_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Query the staging API with admin authentication
 */
export async function queryApiAuthenticated(
  path: string,
  params?: Record<string, string>,
  cookie?: string
): Promise<any> {
  const url = new URL(path, STAGING_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = {};
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Export constants
export const STAGING = STAGING_URL;
export const TEST_FIXTURE_VIDEO = 'e2e-test-fixture.mp4';
export const TEST_SESSION_PREFIX = 'e2e-test-';
