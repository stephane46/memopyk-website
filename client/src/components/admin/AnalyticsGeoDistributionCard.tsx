// client/src/components/admin/AnalyticsGeoDistributionCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GlobalFilterContext } from "./GlobalFilterContext";
import GlobalComparisonBar, { PeriodMode } from "./GlobalComparisonBar";

type CountryRow = { country: string | null; sessions?: number; visitors?: number };
type CityRow = { country: string | null; city: string | null; sessions?: number; visitors?: number };

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

export default function AnalyticsGeoDistributionCard() {
  const { filters } = React.useContext(GlobalFilterContext);

  const [compareEnabled, setCompareEnabled] = React.useState<boolean>(false);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>("week");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [countriesBase, setCountriesBase] = React.useState<CountryRow[]>([]);
  const [citiesBase, setCitiesBase] = React.useState<CityRow[]>([]);
  const [countriesCmp, setCountriesCmp] = React.useState<CountryRow[] | null>(null);
  const [citiesCmp, setCitiesCmp] = React.useState<CityRow[] | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      let url = "/api/analytics/geo?limit=50";
      if (compareEnabled) url += `&compare=period&periodMode=${periodMode}`;
      const res = await fetch(withFilters(url, filters));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (compareEnabled && json?.baseline && json?.comparison) {
        // baseline/comparison shape
        setCountriesBase(json.baseline.countries || []);
        setCitiesBase(json.baseline.cities || []);
        setCountriesCmp(json.comparison.countries || []);
        setCitiesCmp(json.comparison.cities || []);
      } else {
        // single-shape: { countries:[], cities:[] }
        setCountriesBase(json.countries || []);
        setCitiesBase(json.cities || []);
        setCountriesCmp(null);
        setCitiesCmp(null);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load geo data.");
      setCountriesBase([]); setCitiesBase([]);
      setCountriesCmp(null); setCitiesCmp(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), compareEnabled, periodMode]);

  // Build comparison maps for quick lookup
  const countryCmpMap = new Map((countriesCmp ?? []).map(r => [r.country ?? "—", r]));
  const cityCmpMap = new Map((citiesCmp ?? []).map(r => [`${r.country ?? "—"}||${r.city ?? "—"}`, r]));

  // Top 10 countries by sessions (baseline)
  const topCountries = [...countriesBase].sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0)).slice(0, 10);

  // Chart data: one row per country, with baseline/comparison sessions
  const countryChartData = topCountries.map((c) => {
    const key = c.country ?? "—";
    const cmp = countryCmpMap.get(key);
    return {
      name: key,
      sessions_baseline: c.sessions ?? 0,
      sessions_comparison: cmp?.sessions ?? null,
      visitors_baseline: c.visitors ?? 0,
      visitors_comparison: cmp?.visitors ?? null,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Geo Distribution
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
          </CardTitle>
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

      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : countriesBase.length === 0 ? (
          <div className="text-sm text-muted-foreground">No geographic data for the selected filters.</div>
        ) : (
          <>
            {/* Countries chart */}
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Top countries by sessions</div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryChartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sessions_baseline" name="Current (Sessions)" fill="#011526" />
                    {compareEnabled && countriesCmp && (
                      <Bar dataKey="sessions_comparison" name="Previous (Sessions)" fill="#f97316" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cities table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1">Country</th>
                    <th className="px-2 py-1">City</th>
                    <th className="px-2 py-1">Sessions</th>
                    <th className="px-2 py-1">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {citiesBase
                    .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0))
                    .slice(0, 50)
                    .map((r, i) => {
                      const key = `${r.country ?? "—"}||${r.city ?? "—"}`;
                      const cmp = cityCmpMap.get(key);
                      const dSessions = deltaPct(r.sessions, cmp?.sessions);
                      const dVisitors = deltaPct(r.visitors, cmp?.visitors);
                      return (
                        <tr key={key + "-" + i} className="border-t">
                          <td className="px-2 py-1">{r.country ?? "—"}</td>
                          <td className="px-2 py-1">{r.city ?? "—"}</td>
                          <td className="px-2 py-1">
                            {r.sessions ?? 0}
                            {compareEnabled && citiesCmp && <Delta v={dSessions} />}
                          </td>
                          <td className="px-2 py-1">
                            {r.visitors ?? 0}
                            {compareEnabled && citiesCmp && <Delta v={dVisitors} />}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Data source: GA4 → BigQuery → Supabase (sessions-derived geography).
      </CardFooter>
    </Card>
  );
}