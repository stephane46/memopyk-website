/**
 * GA4 Analytics Service
 *
 * Clean extraction of GA4 Data API query functions.
 * Used by the analytics dashboard routes for KPI cards, trends, video tables, etc.
 *
 * Exports:
 *   - client, PROPERTY  (raw GA4 client + property string)
 *   - q* functions       (KPI queries with locale/country filtering)
 */

import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || "501023254";
export const PROPERTY = `properties/${PROPERTY_ID}`;

const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;

let credentials: any = undefined;
if (SA_KEY) {
  try {
    const parsed = JSON.parse(SA_KEY);
    // Fix private_key newlines — Coolify/Docker env vars often escape \n as \\n
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    credentials = parsed;
    console.log('🔑 [GA4] Credentials loaded for:', parsed.client_email);
  } catch (e) {
    console.error('❌ [GA4] Failed to parse GA4_SERVICE_ACCOUNT_KEY:', e);
  }
}

export const client = new BetaAnalyticsDataClient(
  credentials ? { credentials } : {},
);

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

type Expr = protos.google.analytics.data.v1beta.IFilterExpression;
type DateRange = protos.google.analytics.data.v1beta.IDateRange;

const range = (start: string, end: string): DateRange => ({ startDate: start, endDate: end });

const basicFilter = (field: string, value: string): Expr => ({
  filter: { fieldName: field, stringFilter: { value } },
});

/** Locale filter — EN = everything except FR. */
function localeFilter(locale?: string): Expr | undefined {
  if (!locale || locale === "all") return undefined;
  if (locale === "en") {
    return { notExpression: { filter: { fieldName: "customEvent:locale", stringFilter: { value: "fr-FR" } } } };
  }
  const map: Record<string, string> = { en: "en-US", fr: "fr-FR" };
  return basicFilter("customEvent:locale", map[locale] ?? locale);
}

function countryFilter(country?: string): Expr | undefined {
  if (!country || country === "all") return undefined;
  return basicFilter("country", country);
}

/** Combine locale + country into a single AND filter expression. */
function combineFilters(locale?: string, country?: string): Expr | undefined {
  const l = localeFilter(locale);
  const c = countryFilter(country);
  if (!l && !c) return undefined;
  if (l && !c) return l;
  if (!l && c) return c;
  return { andGroup: { expressions: [l!, c!] } };
}

/** Spread-friendly: returns a single-element array or empty. */
function spreadFilter(expr: Expr | undefined): Expr[] {
  return expr ? [expr] : [];
}

/** Wrap a promise with a timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`GA4 timeout: ${label}`)), ms)),
  ]);
}

// Shorthand for optional dimensionFilter spread
function optFilter(expr: Expr | undefined) {
  return expr ? { dimensionFilter: expr } : {};
}

// ---------------------------------------------------------------------------
// KPI queries
// ---------------------------------------------------------------------------

export async function qAllLocales(start: string, end: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "customEvent:locale" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });
  return (res.rows ?? []).map((r) => ({
    locale: r.dimensionValues?.[0]?.value ?? "(not set)",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

export async function qSessions(start: string, end: string, locale?: string, country?: string) {
  // EN = ALL - FR to avoid overlap
  if (locale === "en") {
    const cf = countryFilter(country);
    const [allRes, frRes] = await withTimeout(
      Promise.all([
        client.runReport({ property: PROPERTY, dateRanges: [range(start, end)], metrics: [{ name: "sessions" }], ...optFilter(cf) }),
        client.runReport({ property: PROPERTY, dateRanges: [range(start, end)], metrics: [{ name: "sessions" }], ...optFilter(combineFilters("fr", country)) }),
      ]),
      4000,
      "qSessions-EN",
    );
    const all = Number(allRes[0].rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const fr = Number(frRes[0].rows?.[0]?.metricValues?.[0]?.value ?? 0);
    return Math.max(0, all - fr);
  }

  const [res] = await withTimeout(
    client.runReport({ property: PROPERTY, dateRanges: [range(start, end)], metrics: [{ name: "sessions" }], ...optFilter(combineFilters(locale, country)) }),
    2000,
    "qSessions",
  );
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

/** Count video_start events. */
export async function qPlays(start: string, end: string, locale?: string, country?: string) {
  return eventCount("video_start", start, end, locale, country);
}

/** Count video_complete events. */
export async function qCompletes(start: string, end: string, locale?: string, country?: string) {
  return eventCount("video_complete", start, end, locale, country);
}

export async function qWatchTimeTotal(start: string, end: string, locale?: string, country?: string) {
  const data = await qWatchTimeByVideo(start, end, locale, country);
  return Math.round(data.reduce((s, v) => s + v.watch_time_seconds, 0));
}

export async function qAverageSessionDuration(start: string, end: string, locale?: string, country?: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "averageSessionDuration" }],
    ...optFilter(combineFilters(locale, country)),
  });
  return Math.round(Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0));
}

export async function qTopLanguages(start: string, end: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "activeUsers" }],
    dimensions: [{ name: "language" }],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit: 10,
  });
  return (res.rows ?? []).map((r) => ({
    language: r.dimensionValues?.[0]?.value ?? "unknown",
    visitors: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

export async function qTopReferrers(start: string, end: string) {
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    });
    return (res.rows ?? []).map((r) => ({
      referrer: r.dimensionValues?.[0]?.value ?? "Unknown",
      visitors: Number(r.metricValues?.[0]?.value ?? 0),
    })).filter((r) => r.visitors > 0);
  } catch { return []; }
}

export async function qSiteLanguageChoice(start: string, end: string) {
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 1000,
    });
    let fr = 0, en = 0;
    for (const r of res.rows ?? []) {
      const p = r.dimensionValues?.[0]?.value ?? "";
      const v = Number(r.metricValues?.[0]?.value ?? 0);
      if (p.includes("/fr-FR") || p.includes("/fr/")) fr += v;
      else if (p.includes("/en-US/")) en += v;
    }
    const total = fr + en;
    return [
      { language: "French", visitors: fr, percentage: total > 0 ? Math.round((fr / total) * 100) : 0 },
      { language: "English", visitors: en, percentage: total > 0 ? Math.round((en / total) * 100) : 0 },
    ].filter((l) => l.visitors > 0);
  } catch { return []; }
}

export async function qTotalUsers(start: string, end: string, locale?: string, country?: string) {
  const [res] = await withTimeout(
    client.runReport({ property: PROPERTY, dateRanges: [range(start, end)], metrics: [{ name: "totalUsers" }], ...optFilter(combineFilters(locale, country)) }),
    2000,
    "qTotalUsers",
  );
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

export async function qReturningUsers(start: string, end: string, locale?: string, country?: string) {
  const [res] = await withTimeout(
    client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "newVsReturning" }],
      ...optFilter(combineFilters(locale, country)),
    }),
    2000,
    "qReturningUsers",
  );
  for (const row of res.rows ?? []) {
    if (row.dimensionValues?.[0]?.value === "returning") {
      return Number(row.metricValues?.[0]?.value ?? 0);
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Per-video queries
// ---------------------------------------------------------------------------

/** Plays broken down by video_id. */
export async function qPlaysByVideo(start: string, end: string, locale?: string, country?: string) {
  return videoEventBreakdown("video_start", "plays", start, end, locale, country);
}

/** Completes broken down by video_id. */
export async function qCompletesByVideo(start: string, end: string, locale?: string, country?: string) {
  return videoEventBreakdown("video_complete", "completes", start, end, locale, country);
}

/** Watch time by video using custom metric. */
export async function qWatchTimeByVideo(start: string, end: string, locale?: string, country?: string) {
  const filters: Expr[] = [basicFilter("eventName", "video_start"), ...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "customEvent:video_id" }, { name: "customEvent:video_title" }],
      metrics: [{ name: "eventCount" }, { name: "customEvent:watch_time_seconds" }],
      dimensionFilter: { andGroup: { expressions: filters } },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100,
    });
    return (res.rows ?? []).map((r) => ({
      video_id: r.dimensionValues?.[0]?.value ?? "unknown",
      title: r.dimensionValues?.[1]?.value ?? "Unknown Video",
      plays: Number(r.metricValues?.[0]?.value ?? 0),
      watch_time_seconds: Number(r.metricValues?.[1]?.value ?? 0),
    })).filter((v) => v.plays > 0);
  } catch { return []; }
}

/** Detailed watch-time calculation using position_sec from all video events. */
export async function qActualWatchTimeByVideo(start: string, end: string, locale?: string, country?: string) {
  const orFilter: Expr = {
    orGroup: {
      expressions: [basicFilter("eventName", "video_start"), basicFilter("eventName", "video_progress"), basicFilter("eventName", "video_complete")],
    },
  };
  const filters: Expr[] = [orFilter, ...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];

  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "customEvent:video_id" }, { name: "customEvent:video_title" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "customEvent:position_sec" }, { name: "customEvent:duration_sec" }],
    dimensionFilter: { andGroup: { expressions: filters } },
    limit: 500,
  });

  const map = new Map<string, { title: string; totalWatchTime: number; playCount: number }>();
  for (const row of res.rows ?? []) {
    const vid = row.dimensionValues?.[0]?.value ?? "unknown";
    const title = row.dimensionValues?.[1]?.value ?? "Unknown";
    const event = row.dimensionValues?.[2]?.value ?? "";
    const count = parseInt(row.metricValues?.[0]?.value ?? "0");
    const pos = parseFloat(row.metricValues?.[1]?.value ?? "0");
    const dur = parseFloat(row.metricValues?.[2]?.value ?? "0");

    const key = `${vid}:::${title}`;
    if (!map.has(key)) map.set(key, { title, totalWatchTime: 0, playCount: 0 });
    const cur = map.get(key)!;

    if (event === "video_start") {
      cur.playCount += count;
      cur.totalWatchTime += (pos || dur || 15) * count;
    } else if (event === "video_progress" && pos > 0) {
      cur.totalWatchTime += pos * count;
    } else if (event === "video_complete") {
      cur.totalWatchTime += (pos || dur || 30) * count;
    }
  }

  return Array.from(map.entries()).map(([key, d]) => ({
    video_id: key.split(":::")[0],
    title: d.title,
    watch_time_seconds: Math.round(d.totalWatchTime),
  }));
}

export async function qProgressByVideo(start: string, end: string, locale?: string, country?: string) {
  try {
    const plays = await qPlays(start, end, locale, country);
    const completes = await qCompletes(start, end, locale, country);
    const estimated50 = Math.round((plays + completes) / 2);
    const out = new Map<string, { title: string; p50: number; p100: number }>();
    if (plays > 0) out.set("all_videos", { title: "All Videos", p50: estimated50, p100: completes });
    return out;
  } catch { return new Map(); }
}

/** Aggregated top videos table for the dashboard. */
export async function getTopVideosTable(start: string, end: string, locale?: string, country?: string) {
  try {
    const [plays, completes, watchTimes] = await Promise.all([
      qPlaysByVideo(start, end, locale, country),
      qCompletesByVideo(start, end, locale, country),
      qWatchTimeByVideo(start, end, locale, country),
    ]);

    return plays.map((p: any) => {
      const c = completes.find((x: any) => x.video_id === p.video_id) || { completes: 0 };
      const w = watchTimes.find((x: any) => x.video_id === p.video_id) || { watch_time_seconds: 0 };
      const completePct = p.plays > 0 ? Math.round((Number(c.completes) / p.plays) * 100) : 0;
      const avgWatch = Number(w.watch_time_seconds) > 0 && p.plays > 0 ? Math.round(Number(w.watch_time_seconds) / p.plays) : 0;
      return {
        video_id: p.video_id,
        title: p.title,
        plays: p.plays,
        avgWatchSeconds: avgWatch,
        reach50Pct: Math.min(Math.round(completePct * 0.7), 100),
        completePct: Math.min(completePct, 100),
      };
    });
  } catch {
    return [{ video_id: "error", title: "Analytics temporarily unavailable", plays: 0, avgWatchSeconds: 0, reach50Pct: 0, completePct: 0 }];
  }
}

// ---------------------------------------------------------------------------
// Funnel & trend queries
// ---------------------------------------------------------------------------

export async function qVideoFunnel(start: string, end: string, videoId?: string, locale?: string, country?: string) {
  const buckets = [10, 25, 50, 75, 90];
  const extra: Expr[] = [...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];
  if (videoId) extra.push(basicFilter("customEvent:video_id", videoId));

  try {
    return await Promise.all(
      buckets.map(async (bucket) => {
        const [res] = await client.runReport({
          property: PROPERTY,
          dateRanges: [range(start, end)],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [basicFilter("eventName", "video_progress"), basicFilter("customEvent:progress_bucket", String(bucket)), ...extra],
            },
          },
        });
        return { bucket, count: Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0) };
      }),
    );
  } catch {
    return buckets.map((b) => ({ bucket: b, count: 0 }));
  }
}

export async function qTrendDaily(start: string, end: string, locale?: string, country?: string) {
  const extra: Expr[] = [...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "eventCount" }, { name: "customEvent:watch_time_seconds" }],
    dimensions: [{ name: "date" }],
    dimensionFilter: { andGroup: { expressions: [basicFilter("eventName", "video_start"), ...extra] } },
  });
  return (res.rows ?? []).map((r) => {
    const plays = Number(r.metricValues?.[0]?.value ?? 0);
    const watch = Number(r.metricValues?.[1]?.value ?? 0);
    return { date: r.dimensionValues?.[0]?.value, plays, avgWatch: plays > 0 ? watch / plays : 0 };
  });
}

export async function qTrend(start: string, end: string, locale?: string, country?: string) {
  const lf = spreadFilter(localeFilter(locale));
  const cf = spreadFilter(countryFilter(country));

  const [p] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { andGroup: { expressions: [basicFilter("eventName", "video_start"), ...lf, ...cf] } },
  });

  const [w] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "customEvent:watch_time_seconds" }],
    dimensionFilter: { andGroup: { expressions: [basicFilter("eventName", "video_watch_time"), ...lf, ...cf] } },
  });

  const wtByDate = new Map((w.rows ?? []).map((r) => [r.dimensionValues?.[0]?.value, Number(r.metricValues?.[0]?.value ?? 0)]));
  return (p.rows ?? []).map((r) => {
    const date = r.dimensionValues?.[0]?.value ?? "";
    const plays = Number(r.metricValues?.[0]?.value ?? 0);
    const wt = wtByDate.get(date) ?? 0;
    return { date, plays, avgWatchSeconds: plays > 0 ? Math.round(wt / plays) : 0 };
  });
}

export async function qSessionsTrend(start: string, end: string, locale?: string, country?: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "userEngagementDuration" }],
    ...optFilter(combineFilters(locale, country)),
  });
  return (res.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
    bounceRate: Number(r.metricValues?.[2]?.value ?? 0) * 100,
    avgSessionDuration: Math.round(Number(r.metricValues?.[3]?.value ?? 0)),
    totalEngagementSeconds: Math.round(Number(r.metricValues?.[4]?.value ?? 0)),
  }));
}

export async function qSessionsTrendWithComparison(start: string, end: string, locale?: string, country?: string) {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const startD = new Date(start);
  const endD = new Date(end);
  const days = Math.floor((endD.getTime() - startD.getTime()) / 86400000) + 1;

  const prevEnd = new Date(startD);
  prevEnd.setDate(startD.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - days + 1);

  const [currentData, previousData, periodSessions, periodUsers, prevSessions, prevUsers] = await Promise.all([
    qSessionsTrend(start, end, locale, country),
    qSessionsTrend(fmt(prevStart), fmt(prevEnd), locale, country),
    qSessions(start, end, locale, country),
    qTotalUsers(start, end, locale, country),
    qSessions(fmt(prevStart), fmt(prevEnd), locale, country),
    qTotalUsers(fmt(prevStart), fmt(prevEnd), locale, country),
  ]);

  const curEngagement = currentData.reduce((s, d) => s + d.totalEngagementSeconds, 0);
  const prevEngagement = previousData.reduce((s, d) => s + d.totalEngagementSeconds, 0);

  const dailyData = currentData.map((cur, i) => ({
    ...cur,
    previousSessions: previousData[i]?.sessions ?? 0,
    previousUsers: previousData[i]?.users ?? 0,
    previousBounceRate: previousData[i]?.bounceRate ?? 0,
    previousAvgDuration: previousData[i]?.avgSessionDuration ?? 0,
    previousTotalEngagementSeconds: previousData[i]?.totalEngagementSeconds ?? 0,
  }));

  return {
    dailyData,
    periodAggregates: {
      periodSessions,
      periodUsers,
      periodAverageWatchTime: periodSessions > 0 ? Math.round(curEngagement / periodSessions) : 0,
      periodTotalEngagement: curEngagement,
      prevPeriodSessions: prevSessions,
      prevPeriodUsers: prevUsers,
      prevPeriodAverageWatchTime: prevSessions > 0 ? Math.round(prevEngagement / prevSessions) : 0,
      prevPeriodTotalEngagement: prevEngagement,
    },
  };
}

// ---------------------------------------------------------------------------
// Core analytics
// ---------------------------------------------------------------------------

export async function qUniqueUsers(start: string, end: string, locale?: string, country?: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "activeUsers" }],
    ...optFilter(combineFilters(locale, country)),
  });
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

export async function qPageViews(start: string, end: string, locale?: string, country?: string) {
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "screenPageViews" }],
    ...optFilter(combineFilters(locale, country)),
  });
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

export async function qTopCountries(start: string, end: string) {
  const totalUsers = await qTotalUsers(start, end);
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit: 50,
  });

  let countries = (res.rows ?? []).map((r) => ({
    country: r.dimensionValues?.[0]?.value ?? "Unknown",
    visitors: Number(r.metricValues?.[0]?.value ?? 0),
    flag: "🌍",
  }));

  // Proportionally adjust to match authoritative totalUsers
  const sum = countries.reduce((s, c) => s + c.visitors, 0);
  if (sum !== totalUsers && sum > 0) {
    const ratio = totalUsers / sum;
    let acc = 0;
    countries = countries.map((c, i) => {
      if (i === countries.length - 1) return { ...c, visitors: Math.max(0, totalUsers - acc) };
      const adj = Math.round(c.visitors * ratio);
      acc += adj;
      return { ...c, visitors: adj };
    }).filter((c) => c.visitors > 0);
  }

  return countries;
}

export async function qAllEvents(start: string, end: string) {
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      metrics: [{ name: "eventCount" }],
      dimensions: [{ name: "eventName" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 50,
    });
    const allEvents = (res.rows ?? []).map((r) => ({
      eventName: r.dimensionValues?.[0]?.value ?? "unknown",
      count: Number(r.metricValues?.[0]?.value ?? 0),
    }));
    return { allEvents, videoEvents: allEvents.filter((e) => e.eventName.includes("video")) };
  } catch {
    return { allEvents: [], videoEvents: [] };
  }
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export async function qRealtime() {
  try {
    const [[users], [events]] = await Promise.all([
      client.runRealtimeReport({ property: PROPERTY, metrics: [{ name: "activeUsers" }] }),
      client.runRealtimeReport({ property: PROPERTY, metrics: [{ name: "eventCount" }], dimensions: [{ name: "eventName" }], limit: 20 }),
    ]);
    const activeUsers = Number(users.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const allEvents = (events.rows ?? [])
      .map((r) => ({ eventName: r.dimensionValues?.[0]?.value ?? "", count: Number(r.metricValues?.[0]?.value ?? 0) }))
      .filter((e) => e.count > 0);
    return { activeUsers, lastEvents: allEvents.filter((e) => e.eventName.startsWith("video_")), debug: { totalEvents: allEvents.length, allEvents: allEvents.slice(0, 10) } };
  } catch {
    return { activeUsers: 0, lastEvents: [] };
  }
}

// ---------------------------------------------------------------------------
// Blog analytics
// ---------------------------------------------------------------------------

function blogPathFilter(locale?: string): Expr {
  if (locale === "fr") {
    return {
      orGroup: {
        expressions: [
          { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/fr/blog/" } } },
          { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/fr-FR/blog/" } } },
        ],
      },
    };
  }
  if (locale === "en") {
    return {
      andGroup: {
        expressions: [
          { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/blog/" } } },
          { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/fr/blog/" } } } },
          { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/fr-FR/blog/" } } } },
        ],
      },
    };
  }
  return { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS" as any, value: "/blog/" } } };
}

export async function qBlogPageViews(start: string, end: string, locale?: string) {
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      dimensionFilter: blogPathFilter(locale),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 100,
    });
    return (res.rows ?? []).map((r) => ({
      pagePath: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
    }));
  } catch { return []; }
}

export async function qBlogViewsByDate(start: string, end: string, locale?: string) {
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "screenPageViews" }],
      dimensionFilter: blogPathFilter(locale),
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
    });
    return (res.rows ?? []).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
    }));
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Generic single-metric event count with locale/country filters. */
async function eventCount(eventName: string, start: string, end: string, locale?: string, country?: string): Promise<number> {
  const filters: Expr[] = [basicFilter("eventName", eventName), ...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];
  const [res] = await client.runReport({
    property: PROPERTY,
    dateRanges: [range(start, end)],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { andGroup: { expressions: filters } },
  });
  return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

/** Generic per-video event breakdown (used by qPlaysByVideo and qCompletesByVideo). */
async function videoEventBreakdown(eventName: string, countField: string, start: string, end: string, locale?: string, country?: string) {
  const filters: Expr[] = [basicFilter("eventName", eventName), ...spreadFilter(localeFilter(locale)), ...spreadFilter(countryFilter(country))];
  try {
    const [res] = await client.runReport({
      property: PROPERTY,
      dateRanges: [range(start, end)],
      dimensions: [{ name: "customEvent:video_id" }, { name: "customEvent:video_title" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { andGroup: { expressions: filters } },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100,
    });
    return (res.rows ?? []).map((r) => ({
      video_id: r.dimensionValues?.[0]?.value ?? "unknown",
      title: r.dimensionValues?.[1]?.value ?? "Unknown Video",
      [countField]: Number(r.metricValues?.[0]?.value ?? 0),
    })).filter((v) => Number(v[countField]) > 0);
  } catch { return []; }
}
