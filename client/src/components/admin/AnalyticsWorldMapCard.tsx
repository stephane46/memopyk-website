// client/src/components/admin/AnalyticsWorldMapCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleSequential, scaleLinear, scaleDiverging } from "d3-scale";
import { interpolateBlues, interpolateRdYlGn } from "d3-scale-chromatic";
import { geoCentroid } from "d3-geo";

// Extend Window interface for worldMapInitialized flag
declare global {
  interface Window {
    worldMapInitialized?: boolean;
  }
}

type CountryRow = { iso3: string; country: string; sessions: number; visitors: number };
type CityRow = { iso3: string; country: string; city: string; sessions: number; visitors: number };
type GeoResp =
  | { countries: CountryRow[]; cities: CityRow[] }
  | { baseline: { countries: CountryRow[]; cities: CityRow[] }; comparison: { countries: CountryRow[]; cities: CityRow[] }; baseline_range: any; comparison_range: any };

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function deltaPct(curr?: number, prev?: number) {
  if (curr == null || prev == null || prev === 0) return null;
  return (curr - prev) / prev;
}
function DeltaBadge({ v }: { v: number | null }) {
  if (v == null) return null;
  const pos = v >= 0;
  return (
    <span className={`ml-2 text-xs ${pos ? "text-green-600" : "text-red-600"}`}>
      {pos ? "▲" : "▼"} {(v * 100).toFixed(1)}%
    </span>
  );
}

export default function AnalyticsWorldMapCard() {
  const { filters, setFilters, comparison } = React.useContext(GlobalFilterContext);

  const [loading, setLoading] = React.useState(true);
  const [geoLoading, setGeoLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [baselineCountries, setBaselineCountries] = React.useState<CountryRow[]>([]);
  const [comparisonCountries, setComparisonCountries] = React.useState<CountryRow[] | null>(null);
  const [cities, setCities] = React.useState<CityRow[]>([]);

  const [tooltip, setTooltip] = React.useState<{ visible: boolean; x: number; y: number; iso3?: string; country?: string; sessions?: number; visitors?: number; delta?: number | null }>({ visible: false, x: 0, y: 0 });
  const [tooltipLocked, setTooltipLocked] = React.useState(false);

  const [position, setPosition] = React.useState<{ coordinates: [number, number]; zoom: number }>({ 
    coordinates: [0, 10], // Longitude: 0 (Greenwich), Latitude: 10 (slightly north)
    zoom: 1 
  });
  const [selectedIso3, setSelectedIso3] = React.useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = React.useState<string | null>(null);
  const [countryCities, setCountryCities] = React.useState<CityRow[] | null>(null);
  const [loadingCountry, setLoadingCountry] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/analytics/geo?limit=500";
      if (comparison.enabled) url += `&compare=period&periodMode=${comparison.mode}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GeoResp = await res.json();
      if ("baseline" in json) {
        setBaselineCountries(json.baseline.countries);
        setComparisonCountries(json.comparison.countries);
        setCities(json.baseline.cities);
      } else {
        setBaselineCountries(json.countries);
        setComparisonCountries(null);
        setCities(json.cities);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load geo data.");
      setBaselineCountries([]); setComparisonCountries(null); setCities([]);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), comparison.enabled, comparison.mode]);

  const baselineMap = new Map(baselineCountries.map(r => [r.iso3, r]));
  const comparisonMap = new Map((comparisonCountries ?? []).map(r => [r.iso3, r]));

  const maxSessions = baselineCountries.reduce((acc, r) => Math.max(acc, r.sessions), 0);
  const colorSessions = maxSessions > 0 ? scaleSequential(interpolateBlues).domain([0, maxSessions]) : scaleLinear<string>().domain([0, 1]).range(["#f3f4f6", "#e5e7eb"]);
  const colorDelta = scaleDiverging(interpolateRdYlGn).domain([-1, 0, 1]);

  function resetView() {
    setPosition({ coordinates: [0, 20], zoom: 1 });
    setSelectedIso3(null);
    setCountryCities(null);
    setTooltipLocked(false);
  }

  async function loadCountryCities(iso3: string) {
    setLoadingCountry(true);
    try {
      const res = await fetch(`/api/analytics/geo?limit=500&countryIso3=${iso3}`);
      if (res.ok) {
        const json: any = await res.json();
        setCountryCities(json.cities ?? []);
      } else {
        setCountryCities(null);
      }
    } finally {
      setLoadingCountry(false);
    }
  }

  function exportCountryCsv(iso3: string) {
    window.open(`/api/analytics/export/csv?report=geo&countryIso3=${iso3}`, "_blank");
  }

  return (
    <Card className="w-full relative">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>World Map — Sessions by Country</CardTitle>
        <Button variant="outline" size="sm" onClick={resetView}>Reset</Button>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-[480px] w-full" />
        ) : error ? (
          <div className="border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <div className="relative flex flex-col lg:flex-row gap-4">
            {/* Map */}
            <div className={`w-full ${selectedIso3 ? "lg:w-2/3" : ""}`}>
              <div className="h-[420px] w-full overflow-hidden border border-gray-200 rounded-lg">
                <ComposableMap 
                  projection="geoNaturalEarth1"
                  projectionConfig={{ 
                    scale: 160,
                    center: [0, 0] 
                  }}
                  width={800} 
                  height={420}
                  style={{ width: '100%', height: '100%' }}
                >
                  <ZoomableGroup
                    zoom={position.zoom}
                    center={position.coordinates}
                    onMoveEnd={(pos) => setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })}
                    filterZoomEvent={(evt) => {
                      // Optimize event handling for better performance
                      if (evt.type === 'wheel') {
                        evt.preventDefault?.();
                        return evt;
                      }
                      return evt;
                    }}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) => {
                        // Clean initialization - log only once
                        if (!window.worldMapInitialized && geographies.length > 0) {
                          window.worldMapInitialized = true;
                          console.log(`🗺️ World map loaded: ${geographies.length} countries, ${baselineCountries.length} with analytics data`);
                        }
                        return geographies.map((geo) => {
                          // Map geography country names to ISO3 codes for analytics lookup
                          const props = geo.properties || {};
                          const countryName = Object.values(props)[0] as string;
                          
                          // Comprehensive country mapping for better analytics coverage
                          const getISO3Code = (name: string): string | null => {
                            const countryMap: Record<string, string> = {
                              // Major countries with common variations
                              'France': 'FRA',
                              'United States of America': 'USA',
                              'United States': 'USA',
                              'Brazil': 'BRA',
                              'Australia': 'AUS',
                              'Germany': 'DEU',
                              'United Kingdom': 'GBR',
                              'Canada': 'CAN',
                              'Italy': 'ITA',
                              'Spain': 'ESP',
                              'Netherlands': 'NLD',
                              'Belgium': 'BEL',
                              'Switzerland': 'CHE',
                              'Austria': 'AUT',
                              'Portugal': 'PRT',
                              'Japan': 'JPN',
                              'China': 'CHN',
                              'India': 'IND',
                              'Russia': 'RUS',
                              'Mexico': 'MEX',
                              'Argentina': 'ARG',
                              'Chile': 'CHL',
                              'Colombia': 'COL',
                              'Peru': 'PER',
                              'Venezuela': 'VEN',
                              'Norway': 'NOR',
                              'Sweden': 'SWE',
                              'Denmark': 'DNK',
                              'Finland': 'FIN',
                              'Ireland': 'IRL',
                              'Poland': 'POL',
                              'Czech Republic': 'CZE',
                              'Hungary': 'HUN',
                              'Romania': 'ROU',
                              'Greece': 'GRC',
                              'Turkey': 'TUR',
                              'South Africa': 'ZAF',
                              'Egypt': 'EGY',
                              'Morocco': 'MAR',
                              'Nigeria': 'NGA',
                              'South Korea': 'KOR',
                              'Thailand': 'THA',
                              'Vietnam': 'VNM',
                              'Indonesia': 'IDN',
                              'Philippines': 'PHL',
                              'Malaysia': 'MYS',
                              'Singapore': 'SGP',
                              'New Zealand': 'NZL',
                              'Israel': 'ISR',
                              'Saudi Arabia': 'SAU',
                              'United Arab Emirates': 'ARE',
                              'Ukraine': 'UKR'
                            };
                            return countryMap[name] || null;
                          };
                          
                          const iso3 = getISO3Code(countryName);
                          if (!iso3) return null;
                          const base = baselineMap.get(iso3);
                          const cmp = comparisonMap.get(iso3);
                          const sessions = base?.sessions ?? 0;
                          const visitors = base?.visitors ?? 0;
                          const delta = comparison.enabled ? deltaPct(sessions, cmp?.sessions) : null;
                          const fill = comparison.enabled
                            ? (delta != null ? (colorDelta as any)(Math.max(-1, Math.min(1, delta))) : "#f3f4f6")
                            : (sessions > 0 ? (colorSessions as any)(sessions) : "#f3f4f6");

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fill}
                              stroke="#fff"
                              strokeWidth={0.5}
                              style={{ default: { outline: "none", cursor: "grab" }, hover: { outline: "none", cursor: "pointer" }, pressed: { outline: "none", cursor: "grabbing" } }}
                              onMouseEnter={(evt) => {
                                if (tooltipLocked) return;
                                setTooltip({ visible: true, x: evt.clientX, y: evt.clientY, iso3: iso3 || '', country: base?.country, sessions, visitors, delta });
                              }}
                              onMouseMove={(evt) => { if (tooltipLocked) setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY })); }}
                              onMouseLeave={() => { if (!tooltipLocked) setTooltip((t) => ({ ...t, visible: false })); }}
                              onClick={() => {
                                setTooltipLocked(!tooltipLocked);
                                setTooltip((t) => ({ ...t, iso3: iso3 || '', country: base?.country, sessions, visitors, delta }));
                                const [cx, cy] = geoCentroid(geo as any) as [number, number];
                                setPosition({ coordinates: [cx, cy], zoom: 2.5 });
                                setSelectedIso3(iso3);
                                setSelectedCountryName(base?.country || iso3);
                                loadCountryCities(iso3);
                              }}
                              onDoubleClick={() => {
                                setPosition((p) => (p.zoom > 1.5 ? { coordinates: [0, 20], zoom: 1 } : { coordinates: geoCentroid(geo as any) as [number, number], zoom: 2.5 }));
                              }}
                            />
                          );
                        });
                      }}
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {comparison.enabled ? (
                  <>
                    <span>Growth / Decline</span>
                    <div className="flex h-2 w-40 overflow-hidden rounded">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const v = (i / 19) * 2 - 1;
                        return <div key={i} style={{ width: "5%", background: (colorDelta as any)(v) }} />;
                      })}
                    </div>
                    <span>-100%</span>
                    <span className="ml-auto">+100%</span>
                  </>
                ) : (
                  <>
                    <span>Sessions</span>
                    <div className="flex h-2 w-40 overflow-hidden rounded">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const v = (i / 19) * (maxSessions || 1);
                        return <div key={i} style={{ width: "5%", background: (colorSessions as any)(v) }} />;
                      })}
                    </div>
                    <span>0</span>
                    <span className="ml-auto">
                      Max: {maxSessions}
                      {(() => {
                        const maxCountry = baselineCountries.reduce((max, country) => {
                          return (country.sessions ?? 0) > (max?.sessions ?? 0) ? country : max;
                        }, null as any);
                        
                        if (maxCountry) {
                          return (
                            <span className="ml-1">
                              (<button 
                                onClick={() => {
                                  // Simplified: use predefined coordinates for major countries
                                  const countryCoordinates: Record<string, [number, number]> = {
                                    'FRA': [2.0, 46.0],  // France
                                    'USA': [-98.0, 39.0], // United States
                                    'DEU': [10.0, 51.0],  // Germany
                                    'GBR': [-2.0, 54.0],  // United Kingdom
                                    'CAN': [-106.0, 60.0], // Canada
                                    'AUS': [133.0, -25.0], // Australia
                                    'JPN': [138.0, 36.0],  // Japan
                                    'CHN': [104.0, 35.0],  // China
                                    'IND': [78.0, 20.0],   // India
                                    'BRA': [-55.0, -10.0], // Brazil
                                    'RUS': [105.0, 61.0],  // Russia
                                    'ESP': [-4.0, 40.0],   // Spain
                                    'ITA': [12.0, 42.0],   // Italy
                                    'NLD': [5.0, 52.0],    // Netherlands
                                  };
                                  
                                  const coords = countryCoordinates[maxCountry.iso3];
                                  if (coords) {
                                    setPosition({ coordinates: coords, zoom: 3 });
                                    setSelectedIso3(maxCountry.iso3);
                                    setSelectedCountryName(maxCountry.country);
                                    loadCountryCities(maxCountry.iso3);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0 font-inherit"
                              >
                                {maxCountry.country}
                              </button>)
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Side Panel */}
            {selectedIso3 && (
              <div className="lg:w-1/3 w-full border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{selectedCountryName ?? selectedIso3}</div>
                  <button onClick={() => { setSelectedIso3(null); setCountryCities(null); }} className="text-xs underline">Close</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => exportCountryCsv(selectedIso3)}>Export CSV</Button>
                  <Button size="sm" variant="secondary" onClick={() => setFilters({ ...filters, countryIso3: selectedIso3 })}>Filter Dashboard</Button>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">Top Cities</div>
                {loadingCountry ? (
                  <Skeleton className="h-6 w-full mt-2" />
                ) : !countryCities ? (
                  <div className="mt-2 text-sm text-muted-foreground">No city data.</div>
                ) : (
                  <div className="mt-2 max-h-[340px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1">City</th>
                          <th className="px-2 py-1">Sessions</th>
                          <th className="px-2 py-1">Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countryCities
                          .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0))
                          .slice(0, 50)
                          .map((r, i) => {
                            const cmp = comparison.enabled ? comparisonMap.get(r.iso3) : null;
                            const dSessions = cmp ? deltaPct(r.sessions, cmp.sessions) : null;
                            const dVisitors = cmp ? deltaPct(r.visitors, cmp.visitors) : null;
                            return (
                              <tr key={(r.city ?? "—") + i} className="border-t">
                                <td className="px-2 py-1">{r.city ?? "—"}</td>
                                <td className="px-2 py-1">{r.sessions ?? 0}{comparison.enabled && <DeltaBadge v={dSessions} />}</td>
                                <td className="px-2 py-1">{r.visitors ?? 0}{comparison.enabled && <DeltaBadge v={dVisitors} />}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tooltip */}
            {tooltip.visible && (
              <div className="pointer-events-none absolute z-10 rounded-md border bg-white p-2 text-xs shadow" style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}>
                <div className="font-medium">{tooltip.country ?? tooltip.iso3}</div>
                <div>Sessions: {tooltip.sessions}</div>
                <div>Visitors: {tooltip.visitors}</div>
                {comparison.enabled && tooltip.delta != null && (
                  <div>Change: {(tooltip.delta * 100).toFixed(1)}%</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}