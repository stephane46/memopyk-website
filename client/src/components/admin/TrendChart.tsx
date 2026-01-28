import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { useTrend } from "@/hooks/useTrend";
import { ErrorBlock } from "./ErrorBlock";
import { formatInt, formatSeconds } from "@/utils/format";

// Format date for x-axis display
const formatDateTick = (dateStr: string) => {
  if (!dateStr) return "";
  // Handle both YYYYMMDD format and ISO date strings
  let date: Date;
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    // YYYYMMDD format
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    date = new Date(year, month, day);
  } else {
    date = new Date(dateStr);
  }
  
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export function TrendChart() {
  const { startDate, endDate, locale } = useDashboardFilters();
  const { data, loading, error, reload } = useTrend({ startDate, endDate, locale });

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading trend…</div>;
  if (error || !data) return <ErrorBlock message={`Trend data temporarily unavailable: ${error || "No data"}`} onRetry={reload} compact />;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-sm font-semibold mb-2">Trend Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateTick}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="plays" 
            tickFormatter={formatInt}
            label={{ value: 'Video Plays', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="watch" 
            orientation="right" 
            tickFormatter={formatSeconds}
            label={{ value: 'Avg Watch Time', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(v:any, n:any)=> n==="avgWatch" ? formatSeconds(v) : formatInt(v)}
            labelFormatter={formatDateTick}
          />
          <Legend />
          <Line type="monotone" dataKey="plays" yAxisId="plays" stroke="#2563eb" name="Plays" strokeWidth={2} />
          <Line type="monotone" dataKey="avgWatch" yAxisId="watch" stroke="#16a34a" name="Avg Watch" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}