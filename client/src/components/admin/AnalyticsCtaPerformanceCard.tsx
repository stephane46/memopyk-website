// client/src/components/admin/AnalyticsCtaPerformanceCard.tsx
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
  cta_id: string;
  total_clicks?: number;
  unique_users?: number;
  ctr?: number; // optional: clicks / visitors if you compute in backend
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
function Delta({ v }: { v: number | null }) {
  if (v == null) return null;
  const pos = v >= 0;
  return <span className={`ml-2 text-xs ${pos ? "text-green-600" : "text-red-600"}`}>{pos ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
}

export default function AnalyticsCtaPerformanceCard() {
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
      let url = "/api/analytics/cta-performance";
      if (compareEnabled) url += `?compare=period&periodMode=${periodMode}`;
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
        setBaseline(json.rows ?? []);
        setComparison(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load CTA performance.");
      setBaseline([]);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), compareEnabled, periodMode]);

  const compIndex = new Map((comparison ?? []).map(r => [r.cta_id, r]));

  // Build chart data (grouped bars per CTA)
  const chartData = baseline.map(b => {
    const c = compIndex.get(b.cta_id) || {};
    return {
      cta: b.cta_id,
      clicks_baseline: b.total_clicks ?? 0,
      clicks_comparison: (c as any).total_clicks ?? null,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>CTA Performance</CardTitle>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <GlobalComparisonBar
          enabled={compareEnabled}
          setEnabled={setCompareEnabled}
          mode={periodMode}
          setMode={setPeriodMode}
        />
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : baseline.length === 0 ? (
          <div className="text-sm text-muted-foreground">No CTA data for selected filters.</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cta" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clicks_baseline" name="Current" fill="#011526" />
                {compareEnabled && comparison && (
                  <Bar dataKey="clicks_comparison" name="Previous" fill="#f97316" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>

      {/* Summary table */}
      {!loading && !error && baseline.length > 0 && (
        <CardFooter className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1">CTA</th>
                <th className="px-2 py-1">Clicks</th>
                <th className="px-2 py-1">Unique Users</th>
                <th className="px-2 py-1">CTR</th>
              </tr>
            </thead>
            <tbody>
              {baseline.map((b) => {
                const c = compIndex.get(b.cta_id) || {};
                return (
                  <tr key={b.cta_id} className="border-t">
                    <td className="px-2 py-1">{b.cta_id}</td>
                    <td className="px-2 py-1">
                      {b.total_clicks ?? 0}
                      {compareEnabled && <Delta v={deltaPct(b.total_clicks, (c as any).total_clicks)} />}
                    </td>
                    <td className="px-2 py-1">
                      {b.unique_users ?? 0}
                      {compareEnabled && <Delta v={deltaPct(b.unique_users, (c as any).unique_users)} />}
                    </td>
                    <td className="px-2 py-1">
                      {(b.ctr ?? 0).toFixed(2)}%
                      {compareEnabled && <Delta v={deltaPct(b.ctr, (c as any).ctr)} />}
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