// scripts/ga4-sync-service.js
//
// GA4 BigQuery (raw events)  ->  Supabase (Postgres)
// - Pulls yesterday's table: analytics_JLRWHE1HV4.events_YYYYMMDD
// - Upserts into: analytics_sessions, analytics_pageviews, analytics_video_events, analytics_cta_clicks
//
// Env:
//   GA4_PROJECT_ID                (GCP project id hosting the dataset)
//   GA4_DATASET=analytics_JLRWHE1HV4
//   GA4_SERVICE_ACCOUNT_KEY       (stringified JSON for service account)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Run: node scripts/ga4-sync-service.js [YYYY-MM-DD]   // optional explicit date (UTC)
//
import { BigQuery } from "@google-cloud/bigquery";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// ---------- Helpers ----------
function assertEnv(name) {
  if (!process.env[name] || process.env[name].trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
}

function yyyymmdd(utcDate) {
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function toISO(tsMicros) {
  // GA4 export is microseconds; convert to ISO string in UTC
  return new Date(Number(tsMicros) / 1000).toISOString();
}

function hashId(...parts) {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex");
}

// ---------- Init ----------
assertEnv("GA4_PROJECT_ID");
assertEnv("GA4_DATASET");
assertEnv("GA4_SERVICE_ACCOUNT_KEY");
assertEnv("SUPABASE_URL");
assertEnv("SUPABASE_SERVICE_KEY");

const SERVICE_KEY = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY);
const bigquery = new BigQuery({
  projectId: process.env.GA4_PROJECT_ID,
  credentials: {
    client_email: SERVICE_KEY.client_email,
    private_key: SERVICE_KEY.private_key,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// Date target (UTC)
let target = new Date();
target.setUTCHours(0, 0, 0, 0);
target.setUTCDate(target.getUTCDate() - 1); // default: yesterday UTC
if (process.argv[2]) {
  const parts = process.argv[2].split("-"); // YYYY-MM-DD
  if (parts.length === 3) {
    target = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  }
}
const tableSuffix = yyyymmdd(target);
const dataset = process.env.GA4_DATASET;
const table = `\`${process.env.GA4_PROJECT_ID}.${dataset}.events_${tableSuffix}\``;

console.log(`[GA4→Supabase] Reading table: ${table}`);

// ---------- SQL fragments (extract GA4 params) ----------
const paramStr = (key) =>
  `(SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key='${key}')`;
const paramInt = (key) =>
  `(SELECT ep.value.int_value FROM UNNEST(event_params) ep WHERE ep.key='${key}')`;
const paramDbl = (key) =>
  `(SELECT ep.value.double_value FROM UNNEST(event_params) ep WHERE ep.key='${key}')`;

const userPropStr = (key) =>
  `(SELECT up.value.string_value FROM UNNEST(user_properties) up WHERE up.key='${key}')`;

// Important built-ins
const gaSessionId = paramInt("ga_session_id"); // per GA4 docs
const pageLocation = paramStr("page_location");
const pageReferrer = paramStr("page_referrer");
const pageTitle = paramStr("page_title");

// Your custom params
const videoId = paramStr("video_id");
const videoTitle = paramStr("video_title");
const gallery = paramStr("gallery");
const player = paramStr("player");
const locale = `COALESCE(${paramStr("locale")}, ${userPropStr("language")})`;
const currentTime = `COALESCE(${paramDbl("current_time")}, ${paramInt("current_time")})`;
const progressPercent = `CAST(${paramInt("progress_percent")} AS INT64)`;
const watchTimeSeconds =
  `COALESCE(${paramDbl("watch_time_seconds")}, CAST(${paramInt("watch_time_seconds")} AS FLOAT64))`;
const ctaId = paramStr("cta_id");
const pagePath = paramStr("page_path"); // if you send it; else derive from page_location

// ---------- Queries ----------
const qPageviews = `
SELECT
  event_timestamp,
  ${gaSessionId} AS ga_session_id,
  user_pseudo_id,
  ${pageLocation} AS page_location,
  ${pageReferrer} AS page_referrer,
  ${pageTitle} AS page_title,
  ${locale} AS locale,
  geo.country AS country,
  geo.city AS city
FROM ${table}
WHERE event_name = 'page_view'
`;

const qVideoEvents = `
SELECT
  event_name,
  event_timestamp,
  ${gaSessionId} AS ga_session_id,
  user_pseudo_id,
  ${videoId} AS video_id,
  ${videoTitle} AS video_title,
  ${gallery} AS gallery,
  ${player} AS player,
  ${locale} AS locale,
  ${currentTime} AS current_time_seconds,
  ${progressPercent} AS progress_percent,
  ${watchTimeSeconds} AS watch_time_seconds
FROM ${table}
WHERE event_name IN ('video_start','video_pause','video_progress','video_complete')
`;

const qCtaClicks = `
SELECT
  event_timestamp,
  ${gaSessionId} AS ga_session_id,
  user_pseudo_id,
  ${ctaId} AS cta_id,
  COALESCE(${pagePath}, ${pageLocation}) AS page_path,
  ${locale} AS locale
FROM ${table}
WHERE event_name = 'cta_click'
`;

// Session rollup for the day: earliest & latest event per (user_pseudo_id, ga_session_id)
const qSessions = `
WITH base AS (
  SELECT
    user_pseudo_id,
    ${gaSessionId} AS ga_session_id,
    event_timestamp,
    geo.country, geo.city,
    device.category AS device_category,
    device.operating_system AS os,
    device.browser AS browser,
    ${locale} AS language,
    ${pageReferrer} AS referrer
  FROM ${table}
  WHERE ${gaSessionId} IS NOT NULL
)
SELECT
  user_pseudo_id,
  ga_session_id,
  MIN(event_timestamp) AS first_ts,
  MAX(event_timestamp) AS last_ts,
  ANY_VALUE(country) AS country,
  ANY_VALUE(city) AS city,
  ANY_VALUE(language) AS language,
  ANY_VALUE(device_category) AS device_category,
  ANY_VALUE(os) AS os,
  ANY_VALUE(browser) AS browser,
  ANY_VALUE(referrer) AS referrer
FROM base
GROUP BY user_pseudo_id, ga_session_id
`;

// ---------- Upsert helpers ----------
async function upsertSessions(rows) {
  if (!rows.length) return;
  // Build rows with derived session_id and timestamps
  const payload = rows.map((r) => {
    const session_id = `${r.user_pseudo_id}_${r.ga_session_id}`;
    return {
      session_id,
      user_pseudo_id: r.user_pseudo_id,
      first_seen_at: toISO(r.first_ts),
      last_seen_at: toISO(r.last_ts),
      country: r.country || null,
      city: r.city || null,
      language: r.language || null,
      device_category: r.device_category || null,
      os: r.os || null,
      browser: r.browser || null,
      referrer: r.referrer || null,
      // is_returning is updated later based on first_seen history
    };
  });

  // Upsert one by one in batches to avoid exceeding payload limits
  await batchUpsert("analytics_sessions", payload, "session_id");
}

async function upsertPageviews(rows) {
  if (!rows.length) return;
  const payload = rows.map((r) => {
    const session_id = `${r.user_pseudo_id}_${r.ga_session_id}`;
    return {
      event_timestamp: toISO(r.event_timestamp),
      session_id,
      user_pseudo_id: r.user_pseudo_id,
      page_path: (r.page_location || "").replace(/^https?:\/\/[^/]+/, "") || "/",
      page_title: r.page_title || null,
      referrer: r.page_referrer || null,
      locale: r.locale || null,
      // deterministic id to avoid dupes if re-run
      id: BigInt("0x" + hashId(r.user_pseudo_id, String(r.event_timestamp), "page_view")).toString()
    };
  });

  await batchUpsert("analytics_pageviews", payload, "id");
}

async function upsertVideoEvents(rows) {
  if (!rows.length) return;
  const payload = rows.map((r) => {
    const session_id = `${r.user_pseudo_id}_${r.ga_session_id}`;
    return {
      event_name: r.event_name,
      event_timestamp: toISO(r.event_timestamp),
      session_id,
      user_pseudo_id: r.user_pseudo_id,
      video_id: r.video_id || null,
      video_title: r.video_title || null,
      gallery: r.gallery || null,
      player: r.player || null,
      locale: r.locale || null,
      current_time_seconds: r.current_time_seconds ?? null,
      progress_percent: r.progress_percent ?? null,
      watch_time_seconds: r.watch_time_seconds ?? null,
      id: BigInt("0x" + hashId(
        r.user_pseudo_id,
        String(r.event_timestamp),
        r.event_name,
        r.video_id || ""
      )).toString()
    };
  });

  await batchUpsert("analytics_video_events", payload, "id");
}

async function upsertCtaClicks(rows) {
  if (!rows.length) return;
  const payload = rows.map((r) => {
    const session_id = `${r.user_pseudo_id}_${r.ga_session_id}`;
    return {
      event_timestamp: toISO(r.event_timestamp),
      session_id,
      user_pseudo_id: r.user_pseudo_id,
      page_path: r.page_path || null,
      cta_id: r.cta_id || null,
      locale: r.locale || null,
      id: BigInt("0x" + hashId(
        r.user_pseudo_id,
        String(r.event_timestamp),
        r.cta_id || ""
      )).toString()
    };
  });

  await batchUpsert("analytics_cta_clicks", payload, "id");
}

async function batchUpsert(table, rows, conflictKey, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase
      .from(table)
      .upsert(slice, { onConflict: conflictKey, ignoreDuplicates: false });
    if (error) {
      console.error(`[UPSERT:${table}]`, error);
      throw error;
    }
  }
}

// After all inserts, mark returning users (seen before today)
async function markReturningUsers(asOfISO) {
  // Simple rule: if first_seen_at < start of the target day, then returning
  const { error } = await supabase.rpc("mark_returning_users", { as_of: asOfISO });
  if (error) {
    console.warn("[mark_returning_users] function missing; skipping (optional).");
  }
}

// ---------- Main ----------
(async () => {
  try {
    // 1) Sessions
    const [sessRows] = await bigquery.query({ query: qSessions, location: "US" });
    await upsertSessions(sessRows);

    // 2) Pageviews
    const [pvRows] = await bigquery.query({ query: qPageviews, location: "US" });
    await upsertPageviews(pvRows);

    // 3) Video events
    const [veRows] = await bigquery.query({ query: qVideoEvents, location: "US" });
    await upsertVideoEvents(veRows);

    // 4) CTA clicks
    const [ctaRows] = await bigquery.query({ query: qCtaClicks, location: "US" });
    await upsertCtaClicks(ctaRows);

    // 5) Returning users flag (optional, via SQL func)
    const startOfDayISO = new Date(Date.UTC(
      target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0
    )).toISOString();
    await markReturningUsers(startOfDayISO);

    console.log(`[GA4→Supabase] Done for ${tableSuffix} ✓`);
  } catch (err) {
    console.error("[GA4→Supabase] FAILED:", err);
    process.exitCode = 1;
  }
})();