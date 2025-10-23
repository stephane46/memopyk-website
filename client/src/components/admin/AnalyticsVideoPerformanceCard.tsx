// client/src/components/admin/AnalyticsVideoPerformanceCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GlobalFilterContext } from "./GlobalFilterContext";
import GlobalComparisonBar, { PeriodMode } from "./GlobalComparisonBar";

type Row = {
  video_id: string;
  video_title?: string;
  starts?: number;
  completed_90?: number;
  avg_watch_time?: number;
  median_watch_time?: number;
  // percent milestones
  pct_0?: number; pct_10?: number; pct_20?: number; pct_30?: number; pct_40?: number;
  pct_50?: number; pct_60?: number; pct_70?: number; pct_80?: number; pct_90?: number; pct_100?: number;
  // time milestones
  sec_60?: number; sec_120?: number; sec_180?: number; sec_240?: number; sec_300?: number;
};

function withFilters(url: string, filters: any) {
  const u = new URL(url, window.location.origin);
  if (filters.range?.from) u.searchParams.set("from", filters.range.from);
  if (filters.range?.to) u.searchParams.set("to", filters.range.to);
  if (filters.language) u.searchParams.set("lang", filters.language);
  if (filters.source) u.searchParams.set("source", filters.source);
  if (filters.device) u.searchParams.set("device", filters.device);
  return u.pathname + u.search;
}

function deltaPct(curr?: number, prev?: number) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
function secondsToHMS(sec?: number) {
  if (sec == null) return "—";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}
function Delta({ v }: { v: number | null }) {
  if (v == null) return null;
  const pos = v >= 0;
  return <span className={`ml-2 text-xs ${pos ? "text-green-600" : "text-red-600"}`}>{pos ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
}

export function AnalyticsVideoPerformanceCard() {
  const { filters } = React.useContext(GlobalFilterContext);

  const [compareEnabled, setCompareEnabled] = React.useState<boolean>(false);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>("week");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [baseline, setBaseline] = React.useState<Row[]>([]);
  const [comparison, setComparison] = React.useState<Row[] | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      let url = "/api/analytics/video-performance";
      if (compareEnabled) {
        url += `?compare=period&periodMode=${periodMode}`;
      }
      const res = await fetch(withFilters(url, filters));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (compareEnabled && json?.baseline && json?.comparison) {
        setBaseline(json.baseline);
        setComparison(json.comparison);
      } else if (Array.isArray(json)) {
        setBaseline(json);
        setComparison(null);
      } else {
        // Some backends return {rows: []}
        setBaseline(json.rows ?? []);
        setComparison(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load video performance.");
      setBaseline([]);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), compareEnabled, periodMode]);

  // Build chart series
  const percentMilestones = [
    { key: "pct_0", label: "0%" }, { key: "pct_10", label: "10%" }, { key: "pct_20", label: "20%" },
    { key: "pct_30", label: "30%" }, { key: "pct_40", label: "40%" }, { key: "pct_50", label: "50%" },
    { key: "pct_60", label: "60%" }, { key: "pct_70", label: "70%" }, { key: "pct_80", label: "80%" },
    { key: "pct_90", label: "90%" }, { key: "pct_100", label: "100%" },
  ] as const;

  const timeMilestones = [
    { key: "sec_60", label: "≥60s" },
    { key: "sec_120", label: "≥120s" },
    { key: "sec_180", label: "≥180s" },
    { key: "sec_240", label: "≥240s" },
    { key: "sec_300", label: "≥300s" },
  ] as const;

  // For charts, we'll show top 6 videos by starts
  const sorted = [...baseline].sort((a, b) => (b.starts ?? 0) - (a.starts ?? 0)).slice(0, 6);
  const compIndex = new Map((comparison ?? []).map(r => [r.video_id, r]));

  const percentChartData = percentMilestones.map(m => {
    const row: any = { milestone: m.label };
    sorted.forEach(v => {
      const baseVal = (v as any)[m.key] ?? 0;
      const compVal = (compIndex.get(v.video_id) as any)?.[m.key] ?? null;
      row[`${v.video_title || v.video_id}_baseline`] = baseVal;
      if (compVal != null) row[`${v.video_title || v.video_id}_comparison`] = compVal;
    });
    return row;
  });

  const timeChartData = timeMilestones.map(m => {
    const row: any = { milestone: m.label };
    sorted.forEach(v => {
      const baseVal = (v as any)[m.key] ?? 0;
      const compVal = (compIndex.get(v.video_id) as any)?.[m.key] ?? null;
      row[`${v.video_title || v.video_id}_baseline`] = baseVal;
      if (compVal != null) row[`${v.video_title || v.video_id}_comparison`] = compVal;
    });
    return row;
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Video Performance</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={load} disabled={loading} className="gap-2">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <GlobalComparisonBar
          enabled={compareEnabled}
          setEnabled={setCompareEnabled}
          mode={periodMode}
          setMode={setPeriodMode}
        />
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-[280px] w-full" />
            <Skeleton className="h-[280px] w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : baseline.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data for the selected filters.</div>
        ) : (
          <>
            {/* Percent milestones: 0–100% every 10% */}
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Percent milestones (unique viewers who reached ≥ milestone)</div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={percentChartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="milestone" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {sorted.map((v, idx) => {
                      const keyBase = `${v.video_title || v.video_id}_baseline`;
                      const keyCmp = `${v.video_title || v.video_id}_comparison`;
                      const baseName = `${v.video_title || v.video_id} (Current)`;
                      const cmpName  = `${v.video_title || v.video_id} (Previous)`;
                      return (
                        <React.Fragment key={v.video_id}>
                          <Bar dataKey={keyBase} name={baseName} fill="#011526" />
                          {compareEnabled && comparison && <Bar dataKey={keyCmp} name={cmpName} fill="#f97316" />}
                        </React.Fragment>
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time milestones: ≥60s, ≥120s, ≥180s, ≥240s, ≥300s */}
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Time milestones (unique viewers who watched ≥ threshold)</div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="milestone" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {sorted.map((v) => {
                      const keyBase = `${v.video_title || v.video_id}_baseline`;
                      const keyCmp = `${v.video_title || v.video_id}_comparison`;
                      const baseName = `${v.video_title || v.video_id} (Current)`;
                      const cmpName  = `${v.video_title || v.video_id} (Previous)`;
                      return (
                        <React.Fragment key={v.video_id}>
                          <Bar dataKey={keyBase} name={baseName} fill="#011526" />
                          {compareEnabled && comparison && <Bar dataKey={keyCmp} name={cmpName} fill="#f97316" />}
                        </React.Fragment>
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Summary table with deltas */}
      {!loading && !error && baseline.length > 0 && (
        <CardFooter className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">Video</th>
                <th className="px-2 py-1">Starts</th>
                <th className="px-2 py-1">Completed ≥90%</th>
                <th className="px-2 py-1">Avg Watch</th>
                <th className="px-2 py-1">Median Watch</th>
                <th className="px-2 py-1">≥60s</th>
                <th className="px-2 py-1">≥120s</th>
                <th className="px-2 py-1">≥180s</th>
                <th className="px-2 py-1">≥240s</th>
                <th className="px-2 py-1">≥300s</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => {
                const cmp = compIndex.get(v.video_id) || {};
                return (
                  <tr key={v.video_id} className="border-t">
                    <td className="px-2 py-1">{v.video_title || v.video_id}</td>
                    <td className="px-2 py-1">
                      {v.starts ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.starts, (cmp as any).starts)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.completed_90 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.completed_90, (cmp as any).completed_90)} />}
                    </td>
                    <td className="px-2 py-1">
                      {secondsToHMS(v.avg_watch_time)}
                      {compareEnabled && <Delta v={deltaPct(v.avg_watch_time, (cmp as any).avg_watch_time)} />}
                    </td>
                    <td className="px-2 py-1">
                      {secondsToHMS(v.median_watch_time)}
                      {compareEnabled && <Delta v={deltaPct(v.median_watch_time, (cmp as any).median_watch_time)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.sec_60 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.sec_60, (cmp as any).sec_60)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.sec_120 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.sec_120, (cmp as any).sec_120)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.sec_180 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.sec_180, (cmp as any).sec_180)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.sec_240 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.sec_240, (cmp as any).sec_240)} />}
                    </td>
                    <td className="px-2 py-1">
                      {v.sec_300 ?? 0}
                      {compareEnabled && <Delta v={deltaPct(v.sec_300, (cmp as any).sec_300)} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardFooter>
      )}
    </Card>
  );
}