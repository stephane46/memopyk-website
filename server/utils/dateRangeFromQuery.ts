// server/utils/dateRangeFromQuery.ts
import { resolveDates } from "./resolveDates";

type ReportKind = "kpis" | "topVideos" | "videoFunnel";
type Preset = "7d" | "30d" | "90d" | "today" | "yesterday";

export type Ga4Parsed = {
  report: ReportKind;
  videoId?: string;
  dateRange: { startDate: string; endDate: string };
  lang?: string;
  country?: string;
  sinceDate?: string; // For "Since Date" filtering
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(d: string): boolean {
  if (!ISO_RE.test(d)) return false;
  const dt = new Date(d + "T00:00:00Z");
  return dt instanceof Date && !isNaN(dt.getTime()) && d === d; // format already checked
}

function normalizeLang(lang?: string): string | undefined {
  if (!lang) return undefined;
  // Simple BCP-47 casing: xx-YY -> language lower, region upper
  const parts = lang.split("-");
  if (parts.length === 2) {
    return parts[0].toLowerCase() + "-" + parts[1].toUpperCase();
  }
  return lang.toLowerCase();
}

function normalizeCountry(country?: string): string | undefined {
  if (!country) return undefined;
  return country.trim().toUpperCase();
}

function badRequest(msg: string): never {
  const err: any = new Error(msg);
  err.status = 400;
  throw err;
}

export function dateRangeFromQuery(q: any): Ga4Parsed {
  const report = String(q.report || "");
  if (!report || !["kpis", "topVideos", "videoFunnel"].includes(report)) {
    badRequest('Invalid "report" param. Use kpis | topVideos | videoFunnel.');
  }

  const presetRaw = q.preset ? String(q.preset) : undefined;
  let preset: Preset | undefined;
  if (presetRaw) {
    if (!["7d", "30d", "90d", "today", "yesterday"].includes(presetRaw)) {
      badRequest('Invalid "preset". Use 7d | 30d | 90d | today | yesterday.');
    }
    preset = presetRaw as Preset;
  }

  const startDate = q.startDate ? String(q.startDate) : undefined;
  const endDate   = q.endDate ? String(q.endDate) : undefined;
  const sinceDate = q.sinceDate ? String(q.sinceDate) : undefined;

  // Validate sinceDate if provided
  if (sinceDate && !isValidISODate(sinceDate)) {
    badRequest('Since date must be a valid ISO string YYYY-MM-DD.');
  }

  let dateRange: { startDate: string; endDate: string };
  if (preset && ["7d", "30d", "90d"].includes(preset)) {
    // Use preset for supported day-based ranges
    dateRange = resolveDates(preset as "7d" | "30d" | "90d");
    // If sinceDate is provided and is later than preset start, use sinceDate instead
    if (sinceDate && sinceDate > dateRange.startDate) {
      dateRange.startDate = sinceDate;
    }
  } else if (startDate || endDate) {
    if (!startDate || !endDate) {
      badRequest('When using explicit dates, provide both "startDate" and "endDate" (YYYY-MM-DD).');
    }
    if (!isValidISODate(startDate!) || !isValidISODate(endDate!)) {
      badRequest('Dates must be valid ISO strings YYYY-MM-DD.');
    }
    if (startDate! > endDate!) {
      badRequest('"startDate" cannot be after "endDate".');
    }
    dateRange = { startDate: startDate!, endDate: endDate! };
    // If sinceDate is provided and is later than explicit start, use sinceDate instead
    if (sinceDate && sinceDate > dateRange.startDate) {
      dateRange.startDate = sinceDate;
    }
  } else {
    // default window
    dateRange = resolveDates("7d");
    // If sinceDate is provided and is later than default start, use sinceDate instead
    if (sinceDate && sinceDate > dateRange.startDate) {
      dateRange.startDate = sinceDate;
    }
  }

  const lang = normalizeLang(q.lang);
  const country = normalizeCountry(q.country);

  const out: Ga4Parsed = { report: report as ReportKind, dateRange, lang, country, sinceDate };

  if (report === "videoFunnel") {
    const videoId = String(q.videoId || "");
    if (!videoId) badRequest('Missing "videoId" for report=videoFunnel.');
    out.videoId = videoId;
  }

  return out;
}