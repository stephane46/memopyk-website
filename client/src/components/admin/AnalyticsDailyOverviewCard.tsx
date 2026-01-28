// client/src/components/admin/AnalyticsDailyOverviewCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GlobalFilterContext } from "./GlobalFilterContext";
import GlobalComparisonBar, { PeriodMode } from "./GlobalComparisonBar";

// ---- helpers ----
function secondsToHMS(sec?: number) {
  if (sec == null) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}
function deltaPct(curr?: number, prev?: number) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
function formatFR(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00Z");
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d);
}

// Merge rows by day; expects arrays of { day, sessions, unique_visitors, avg_session_duration }
function mergeByDay(
  baseline: any[] = [],
  comparison: any[] = []
) {
  const map = new Map<string, any>();
  for (const r of baseline) {
    map.set(r.day, {
      day: r.day,
      label: formatFR(r.day),
      sessions: Number(r.sessions ?? 0),
      unique_visitors: Number(r.unique_visitors ?? 0),
      avg_session_duration: Number(r.avg_session_duration ?? 0),
    });
  }
  for (const r of comparison) {
    const row = map.get(r.day) || { day: r.day, label: formatFR(r.day) };
    row.sessions_compare = Number(r.sessions ?? 0);
    row.unique_visitors_compare = Number(r.unique_visitors ?? 0);
    row.avg_session_duration_compare = Number(r.avg_session_duration ?? 0);
    map.set(r.day, row);
  }
  return Array.from(map.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
}

export default function AnalyticsDailyOverviewCard() {
  const { filters } = React.useContext(GlobalFilterContext);
  // local state for "range selector" inside this card (kept for Yesterday vs 7/30/90 UX)
  const [days, setDays] = React.useState<number>(30);

  // comparison UI state (kept here; you can also lift into GlobalFilterContext if preferred)
  const [compareEnabled, setCompareEnabled] = React.useState<boolean>(false);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>("week");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [latest, setLatest] = React.useState<any | null>(null);
  const [latestCompare, setLatestCompare] = React.useState<any | null>(null);

  function withFilters(url: string) {
    const u = new URL(url, window.location.origin);
    if (filters.range.from) u.searchParams.set("from", filters.range.from);
    if (filters.range.to) u.searchParams.set("to", filters.range.to);
    if (filters.language) u.searchParams.set("lang", filters.language);
    if (filters.source) u.searchParams.set("source", filters.source);
    if (filters.device) u.searchParams.set("device", filters.device);
    return u.pathname + u.search;
  }

  async function fetchOverview() {
    setLoading(true); setError(null);
    try {
      let url = `/api/analytics/overview?days=${days}`;
      if (days === 1) {
        // Yesterday mode: backend should return just one row (yesterday)
        url = `/api/analytics/overview?days=1`;
      }
      if (compareEnabled) {
        url += `${url.includes("?") ? "&" : "?"}compare=period&periodMode=${periodMode}`;
      }
      const res = await fetch(withFilters(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (compareEnabled && json && json.baseline && json.comparison) {
        const merged = mergeByDay(json.baseline, json.comparison);
        setChartData(merged);
        const last = merged[merged.length - 1] || null;
        setLatest(last);
        setLatestCompare(last ? {
          sessions: last.sessions_compare,
          unique_visitors: last.unique_visitors_compare,
          avg_session_duration: last.avg_session_duration_compare
        } : null);
      } else {
        const rows = Array.isArray(json) ? json : [];
        const merged = mergeByDay(rows, []);
        setChartData(merged);
        setLatest(merged[merged.length - 1] || null);
        setLatestCompare(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load daily overview.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchOverview(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), days, compareEnabled, periodMode]);

  const deltaSessions = deltaPct(latest?.sessions, latestCompare?.sessions);
  const deltaVisitors = deltaPct(latest?.unique_visitors, latestCompare?.unique_visitors);
  const deltaAvg = deltaPct(latest?.avg_session_duration, latestCompare?.avg_session_duration);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Daily Overview
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-md border px-2 text-sm"
              aria-label="Range"
            >
              <option value="1">Yesterday</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <Button size="sm" variant="secondary" onClick={fetchOverview} disabled={loading} className="gap-2">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Comparison toggle + mode */}
        <div className="flex items-center gap-3">
          <GlobalComparisonBar
            enabled={compareEnabled}
            setEnabled={setCompareEnabled}
            mode={periodMode}
            setMode={setPeriodMode}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[260px] w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : days === 1 ? (
          // Yesterday only → stat cards only
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Sessions</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {latest?.sessions ?? "—"}
                {compareEnabled && latestCompare?.sessions != null && (
                  <DeltaBadge value={deltaSessions} />
                )}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Unique Visitors</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {latest?.unique_visitors ?? "—"}
                {compareEnabled && latestCompare?.unique_visitors != null && (
                  <DeltaBadge value={deltaVisitors} />
                )}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Returning Visitors</div>
              <div className="text-xl font-semibold">
                {/* If your backend adds returning_visitors, display it here similarly */}
                {/* Otherwise compute on server and include in API */}
                —
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Avg. Session Duration</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {secondsToHMS(latest?.avg_session_duration)}
                {compareEnabled && latestCompare?.avg_session_duration != null && (
                  <DeltaBadge value={deltaAvg} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stat tiles (latest day) */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Latest Sessions</div>
                <div className="text-xl font-semibold flex items-center gap-2">
                  {latest?.sessions ?? "—"}
                  {compareEnabled && latestCompare?.sessions != null && (
                    <DeltaBadge value={deltaSessions} />
                  )}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Latest Unique Visitors</div>
                <div className="text-xl font-semibold flex items-center gap-2">
                  {latest?.unique_visitors ?? "—"}
                  {compareEnabled && latestCompare?.unique_visitors != null && (
                    <DeltaBadge value={deltaVisitors} />
                  )}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Avg. Session Duration (latest)</div>
                <div className="text-xl font-semibold flex items-center gap-2">
                  {secondsToHMS(latest?.avg_session_duration)}
                  {compareEnabled && latestCompare?.avg_session_duration != null && (
                    <DeltaBadge value={deltaAvg} />
                  )}
                </div>
              </div>
            </div>

            {/* Dual-line chart */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: 12 }}
                    height={60}
                  />
                  <YAxis 
                    axisLine={true}
                    tickLine={true}
                    tick={{ fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId={0} type="monotone" dataKey="sessions" name="Sessions (Current)" stroke="#011526" dot={false} strokeWidth={2} />
                  {compareEnabled && (
                    <Line yAxisId={0} type="monotone" dataKey="sessions_compare" name="Sessions (Previous)" stroke="#f97316" dot={false} strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Data source: GA4 → BigQuery → Supabase (overview).
      </CardFooter>
    </Card>
  );
}

// Tiny badge component for ▲/▼ deltas
function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return null;
  const sign = value >= 0 ? "▲" : "▼";
  const color = value >= 0 ? "text-green-600" : "text-red-600";
  return <span className={`text-xs ${color}`}>{sign} {Math.abs(value).toFixed(1)}%</span>;
}