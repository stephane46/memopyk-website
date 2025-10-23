import { FunnelChart as RC, Funnel, LabelList, Tooltip } from "recharts";
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { useFunnel } from "@/hooks/useFunnel";
import { ErrorBlock } from "./ErrorBlock";
import { formatInt, formatPercent } from "@/utils/format";

export function FunnelChart() {
  const { startDate, endDate, locale } = useDashboardFilters();
  const { data, loading, error, reload } = useFunnel({ startDate, endDate, locale });

  // Clean component - debugging removed

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading funnel…</div>;
  if (error || !data) return <ErrorBlock message={`Funnel data temporarily unavailable: ${error || "No data"}`} onRetry={reload} compact />;

  const rows = [
    { stage: "Plays", value: data.plays },
    { stage: "50% Reached", value: data.half },
    { stage: "100% Completed", value: data.completes },
  ];

  // Rows calculated successfully

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-sm font-semibold mb-2">Watch Progress Funnel</h3>
      <RC width={400} height={300}>
        <Tooltip formatter={(v:any)=>formatInt(v)} />
        <Funnel dataKey="value" data={rows} isAnimationActive fill="#2563eb">
          <LabelList position="right" fill="#111" stroke="none" dataKey="stage" />
        </Funnel>
      </RC>
      <div className="flex justify-between text-xs mt-2 text-gray-500">
        <div>Completion Rate: {formatPercent(data.completes / (data.plays||1) * 100,1)}</div>
        <div>50% Reach: {formatPercent(data.half / (data.plays||1) * 100,1)}</div>
      </div>
    </div>
  );
}