import { mockReport } from "./mockReport";
import type { ReportParams } from "./types";
import { setDataSource } from "./dataSource";

const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

export async function fetchReport<T>(params: ReportParams): Promise<T> {
  // Simulations can be layered on top of mock or live:
  const SIMULATE_ERROR = import.meta.env?.VITE_SIMULATE_ERROR === "true";
  const SIMULATE_EMPTY = import.meta.env?.VITE_SIMULATE_EMPTY === "true";

  if (SIMULATE_ERROR) {
    await new Promise(r => setTimeout(r, 300));
    throw new Error("Simulated error for testing");
  }

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 150)); // mimic latency
    const res = mockReport(params) as T;
    
    if (SIMULATE_EMPTY) {
      // Return empty counterparts depending on report
      if (params.report === "kpis") {
        return { 
          kpis: {
            sessions: { value: 0, trend: [] },
            plays: { value: 0, trend: [] },
            completions: { value: 0, trend: [] },
            avgWatch: { value: 0, trend: [] },
          },
          timestamp: new Date().toISOString(),
          cached: false
        } as T;
      }
      if (params.report === "topVideos") {
        return { 
          topVideos: [],
          timestamp: new Date().toISOString(),
          cached: false
        } as T;
      }
      if (params.report === "videoFunnel") {
        return { 
          funnel: [],
          timestamp: new Date().toISOString(),
          cached: false
        } as T;
      }
    }
    return res;
  }

  // Live mode: call backend
  let url = "/api/ga4/report";
  const qs = new URLSearchParams();
  
  if (params.report === "kpis") {
    // KPIs should use the dedicated /api/ga4/kpis endpoint that supports today/yesterday presets
    url = "/api/ga4/kpis";
    if (params.preset) qs.set("preset", params.preset);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    if (params.lang) qs.set("locale", params.lang === "all" ? "all" : params.lang);
    else qs.set("locale", "all");
    // 🚨 CRITICAL FIX: Add sinceDate parameter for exclusion filters
    if (params.sinceDate) qs.set("since", params.sinceDate);
  } else {
    // Standard endpoints
    qs.set("report", params.report);
    if (params.videoId) qs.set("videoId", params.videoId);
    if (params.preset) qs.set("preset", params.preset);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);
    if (params.lang) qs.set("lang", params.lang);
    if (params.country) qs.set("country", params.country);
    // 🚨 CRITICAL FIX: Add sinceDate parameter for exclusion filters
    if (params.sinceDate) qs.set("since", params.sinceDate);
  }

  const resp = await fetch(`${url}?${qs.toString()}`);
  
  // Read X-Data-Source header and update state
  const ds = (resp.headers.get("x-data-source") || "unknown").toLowerCase();
  if (ds === "live" || ds === "mock") setDataSource(ds as any);
  
  const json = await resp.json();
  
  if (!resp.ok) {
    // Parse enhanced error response from server
    const errorMessage = json.message || json.error || `API error ${resp.status}`;
    const enhancedError = new Error(errorMessage);
    
    // Preserve additional error details from the enhanced GA4 error handling
    if (json.error) (enhancedError as any).errorType = json.error;
    if (json.instructions) (enhancedError as any).instructions = json.instructions;
    if (json.missingDimensions) (enhancedError as any).missingDimensions = json.missingDimensions;
    if (json.ga4Code) (enhancedError as any).ga4Code = json.ga4Code;
    
    throw enhancedError;
  }
  
  if (SIMULATE_EMPTY) {
    if (params.report === "kpis") {
      json.kpis.sessions.trend = [];
      json.kpis.plays.trend = [];
      json.kpis.completions.trend = [];
      json.kpis.avgWatch.trend = [];
      json.kpis.sessions.value = 0;
      json.kpis.plays.value = 0;
      json.kpis.completions.value = 0;
      json.kpis.avgWatch.value = 0;
    }
    if (params.report === "topVideos") json.topVideos = [];
    if (params.report === "videoFunnel") json.funnel = [];
  }
  
  return json as T;
}