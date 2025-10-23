import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Eye,
  MapPin,
  Activity,
  BarChart3,
  Download,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useFilteredGeo, CountryData, CityData, GeoAnalyticsData } from './hooks/useFilteredReports';
import { CountryFlag } from '@/components/admin/CountryFlag';
import './analyticsNew.tokens.css';

// World atlas data for map visualization
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface GeoKpiCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  explanation?: string;
}

const GeoKpiCard: React.FC<GeoKpiCardProps> = ({ title, value, subtitle, icon: Icon, color, explanation }) => {
  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'string' ? value : value}
        </div>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {explanation && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{explanation}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface CountryRowProps {
  country: string;
  sessions: number;
  visitors: number;
  rank: number;
  engagement?: number;
}

const CountryRow: React.FC<CountryRowProps> = ({ country, sessions, visitors, rank, engagement }) => {
  const engagementRate = engagement || Math.round((sessions / visitors) * 100);
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
          {rank}
        </div>
        <div className="flex items-center space-x-2">
          <CountryFlag country={country} size={16} />
          <span className="font-medium text-gray-900">{country}</span>
        </div>
      </div>
      <div className="flex items-center space-x-6 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900">{sessions.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Sessions</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{visitors.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Visitors</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{engagementRate}%</div>
          <div className="text-gray-500 text-xs">Engagement</div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsNewGeo: React.FC = () => {
  // Use centralized filtering system with the useFilteredGeo hook
  const { data: geoData, isLoading: geoLoading, error: geoError, refetch, appliedFilters } = useFilteredGeo();
  
  // Map position state for recenter functionality
  const [position, setPosition] = useState({ coordinates: [0, 10] as [number, number], zoom: 1 });
  const [mapKey, setMapKey] = useState(0); // Force re-render key
  
  // Tooltip state for map
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    content: string;
    x: number;
    y: number;
  }>({ show: false, content: '', x: 0, y: 0 });
  
  // Function to recenter map to original position
  const recenterMap = () => {
    setPosition({ coordinates: [0, 10], zoom: 1 });
    setMapKey(prev => prev + 1); // Force map re-render
  };

  // Process data for visualizations - now using centralized hook data with totals included
  const processedData = React.useMemo(() => {
    if (!geoData?.countries) return null;
    
    // Data already processed by centralized hook, just organize for display
    const countries = geoData.countries;
    const { totalSessions, totalVisitors, coverageCount } = geoData;
    
    // Sort countries by sessions for ranking
    const sortedCountries = [...countries].sort((a, b) => b.sessions - a.sessions);
    
    // Find insights
    const topMarket = sortedCountries[0];
    const bestEngagement = sortedCountries.reduce((best, country) => {
      const rate = country.sessions / (country.visitors || 1);
      const bestRate = best.sessions / (best.visitors || 1);
      return rate > bestRate ? country : best;
    }, sortedCountries[0] || { country: '', sessions: 0, visitors: 1 });

    return {
      countries: sortedCountries,
      totalSessions,
      totalVisitors,
      topMarket,
      bestEngagement,
      coverageCount
    };
  }, [geoData]);

  if (geoLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            🌍 Market Intelligence
          </Badge>
        </div>

        {/* Loading KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Map and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (geoError || !processedData) {
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card className="bg-white border border-red-200">
          <CardContent className="text-center py-8">
            <div className="text-red-600 text-lg font-medium mb-2">Geographic Data Unavailable</div>
            <div className="text-gray-600 mb-4">Unable to load geographic analytics data</div>
            <Button onClick={() => refetch()} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { countries, totalSessions, totalVisitors, topMarket, bestEngagement, coverageCount } = processedData;

  return (
    <div className="analytics-new-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-gray-900">Geographic Market Analysis</h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
            Centralized Filters
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
            Source: GA4
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            🌍 {coverageCount} Markets
          </Badge>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Market Intelligence KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GeoKpiCard
          title="Top Market"
          value={
            <div className="flex items-center space-x-2">
              <CountryFlag country={topMarket?.country || ''} size={20} />
              <span>{topMarket?.country || 'N/A'}</span>
            </div>
          }
          subtitle={`${topMarket?.sessions.toLocaleString() || 0} sessions`}
          icon={Globe}
          color="text-blue-600"
        />
        <GeoKpiCard
          title="Market Coverage"
          value={coverageCount.toString()}
          subtitle="countries reached"
          icon={MapPin}
          color="text-green-600"
        />
        <GeoKpiCard
          title="Best Engagement"
          value={
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CountryFlag country={bestEngagement?.country || ''} size={20} />
                <span className="font-bold">{bestEngagement?.country || 'N/A'}</span>
              </div>
              <div className="text-xl font-semibold text-orange-600">
                {Math.round((bestEngagement?.sessions / bestEngagement?.visitors) * 100) || 0}% return rate
              </div>
            </div>
          }
          subtitle=""
          icon={Activity}
          color="text-orange-600"
          explanation="Rates above 100% show repeat visits."
        />
        <GeoKpiCard
          title="Global Reach"
          value={`${totalVisitors.toLocaleString()} unique visitors`}
          subtitle=""
          icon={Users}
          color="text-purple-600"
          explanation="Total number of distinct users worldwide."
        />
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* World Map Visualization */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Interactive Map
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Interactive Map</Badge>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={recenterMap}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                data-testid="recenter-map"
                title="Recenter Map"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 relative">
              <ComposableMap
                key={mapKey}
                projection="geoMercator"
                projectionConfig={{
                  rotate: [0, 0, 0],
                  scale: 120,
                }}
                width={800}
                height={320}
                className="w-full h-full"
              >
                <ZoomableGroup 
                  zoom={position.zoom} 
                  center={position.coordinates}
                  onMoveEnd={(position) => setPosition(position)}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const countryName = geo.properties?.name;
                        
                        // Enhanced country name matching with common variations
                        const countryData = countries.find(c => {
                          if (!countryName || !c.country) return false;
                          
                          const geoNameLower = countryName.toLowerCase();
                          const ga4NameLower = c.country.toLowerCase();
                          
                          // Direct match
                          if (geoNameLower === ga4NameLower) return true;
                          
                          // Common country name mappings
                          const countryMappings: Record<string, string[]> = {
                            'vietnam': ['viet nam', 'vietnam'],
                            'france': ['france', 'french republic'],
                            'united states': ['united states of america', 'usa', 'us'],
                            'united kingdom': ['uk', 'great britain', 'britain'],
                            'germany': ['deutschland'],
                          };
                          
                          // Check if either name appears in the other
                          if (geoNameLower.includes(ga4NameLower) || ga4NameLower.includes(geoNameLower)) {
                            return true;
                          }
                          
                          // Check mapping variations
                          for (const [key, variations] of Object.entries(countryMappings)) {
                            if ((variations.includes(geoNameLower) && ga4NameLower === key) ||
                                (variations.includes(ga4NameLower) && geoNameLower === key)) {
                              return true;
                            }
                          }
                          
                          return false;
                        });
                        
                        const sessions = countryData?.sessions || 0;
                        const maxSessions = Math.max(...countries.map(c => c.sessions));
                        const intensity = sessions > 0 ? sessions / maxSessions : 0;
                        
                        // Color scale from light blue to dark blue
                        const colorScale = scaleSequential(interpolateBlues).domain([0, 1]);
                        const fillColor = sessions > 0 ? colorScale(intensity) : '#f3f4f6';
                        
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor}
                            stroke="#e2e8f0"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { 
                                fill: sessions > 0 ? colorScale(Math.min(intensity + 0.2, 1)) : "#e5e7eb",
                                outline: "none",
                                cursor: "pointer",
                                filter: sessions > 0 ? "brightness(0.9)" : "none"
                              },
                              pressed: { outline: "none" }
                            }}
                            onMouseEnter={(event) => {
                              if (sessions > 0 && countryData) {
                                const engagementRate = Math.round((countryData.sessions / countryData.visitors) * 100);
                                setTooltip({
                                  show: true,
                                  content: `${countryData.country}\n${countryData.sessions.toLocaleString()} sessions\n${countryData.visitors.toLocaleString()} visitors\n${engagementRate}% engagement`,
                                  x: event.clientX,
                                  y: event.clientY
                                });
                                // Set legend highlight based on country's intensity
                              }
                            }}
                            onMouseMove={(event) => {
                              if (tooltip.show) {
                                setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
                              }
                            }}
                            onMouseLeave={() => {
                              setTooltip({ show: false, content: '', x: 0, y: 0 });
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
              
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md border">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Sessions</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Low</span>
                  <div className="flex space-x-1">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, index) => {
                      return (
                        <div
                          key={index}
                          className={`legend-square-${index}`}
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '1px solid #e5e7eb',
                            display: 'block'
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-500">High</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {countries.length > 0 ? `Max: ${Math.max(...countries.map(c => c.sessions))} sessions` : 'No data'}
                </div>
              </div>

              {/* Tooltip */}
              {tooltip.show && (
                <div 
                  className="fixed z-50 bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg pointer-events-none"
                  style={{
                    left: tooltip.x + 10,
                    top: tooltip.y - 10,
                    transform: 'translateY(-100%)'
                  }}
                >
                  {tooltip.content.split('\n').map((line, index) => (
                    <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-500">
                ✨ Hover over countries to see visitor metrics and engagement rates
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Markets Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-orange-600" />
              Top Markets
            </CardTitle>
            <Badge variant="outline">Ranked by Sessions</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {countries.slice(0, 10).map((country, index) => (
                <CountryRow
                  key={`${country.country}-${index}-${country.sessions}-${country.visitors}`}
                  rank={index + 1}
                  country={country.country}
                  sessions={country.sessions}
                  visitors={country.visitors}
                />
              ))}
              {countries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div>No geographic data available</div>
                  <div className="text-xs">Location data will appear as visitors arrive</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions by Country */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Sessions by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countries.slice(0, 8).map((country, index) => ({
                      name: country.country,
                      sessions: country.sessions,
                      visitors: country.visitors,
                      value: country.sessions,
                      fill: `hsl(${(index * 45) % 360}, 70%, 60%)`
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={30}
                    paddingAngle={2}
                  >
                    {countries.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 60%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        const sessionsPercent = totalSessions > 0 ? Math.ceil((data.sessions / totalSessions) * 100) : 0;
                        const visitorsPercent = totalVisitors > 0 ? Math.ceil((data.visitors / totalVisitors) * 100) : 0;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900 underline">{data.name}</p>
                            <p className="text-sm">
                              <span className="font-bold text-gray-900">Sessions: {data.sessions.toLocaleString()} ({sessionsPercent}%)</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Visitors: {data.visitors.toLocaleString()} ({visitorsPercent}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#374151' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Visitors by Country */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Visitors by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countries.slice(0, 8).map((country, index) => ({
                      name: country.country,
                      sessions: country.sessions,
                      visitors: country.visitors,
                      value: country.visitors,
                      fill: `hsl(${120 + (index * 35) % 360}, 65%, 55%)`
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={30}
                    paddingAngle={2}
                  >
                    {countries.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${120 + (index * 35) % 360}, 65%, 55%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        const sessionsPercent = totalSessions > 0 ? Math.ceil((data.sessions / totalSessions) * 100) : 0;
                        const visitorsPercent = totalVisitors > 0 ? Math.ceil((data.visitors / totalVisitors) * 100) : 0;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900 underline">{data.name}</p>
                            <p className="text-sm">
                              <span className="font-bold text-gray-900">Visitors: {data.visitors.toLocaleString()} ({visitorsPercent}%)</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Sessions: {data.sessions.toLocaleString()} ({sessionsPercent}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#374151' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};