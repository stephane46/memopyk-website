// client/src/components/admin/TopVideosSection.tsx
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { TopVideosTable } from "./TopVideosTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AsyncState } from "./AsyncState";
import { ErrorBlock } from "./ErrorBlock";
import { useTopVideos } from "@/hooks/useTopVideos";

export function TopVideosSection() {
  const { startDate, endDate, locale } = useDashboardFilters();
  const { data, loading, error, reload } = useTopVideos({ startDate, endDate, locale });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">A. Top Videos Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBlock message={`Analytics temporarily unavailable: ${error}`} onRetry={reload} />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">A. Top Videos Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <AsyncState
          loading={loading}
          error={null}
          hasData={!!data && data.length > 0}
          emptyText="No videos found for this date range."
          loadingText="Loading top videos…"
        >
          <TopVideosTable 
            data={data} 
          />
        </AsyncState>
      </CardContent>
    </Card>
  );
}