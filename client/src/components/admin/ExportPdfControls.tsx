// client/src/components/admin/ExportPdfControls.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { withFilters } from "@/lib/withFilters";

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ExportPdfControls() {
  const { filters } = React.useContext(GlobalFilterContext);

  function buildUrl() {
    return withFilters("/api/analytics/export/pdf", filters);
  }

  const filename = React.useMemo(() => {
    const rangeDesc = filters.range?.from && filters.range?.to 
      ? `${filters.range.from}_to_${filters.range.to}`
      : 'current_range';
    const langDesc = filters.language ? `_${filters.language}` : '';
    const deviceDesc = filters.device ? `_${filters.device}` : '';
    const sourceDesc = filters.source ? `_${filters.source.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    return `analytics_dashboard_${rangeDesc}${langDesc}${deviceDesc}${sourceDesc}.pdf`;
  }, [filters]);

  return (
    <Button
      size="sm"
      className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
      onClick={() => downloadFile(buildUrl(), filename)}
    >
      <FileDown className="h-4 w-4" />
      Export Full Report (PDF)
    </Button>
  );
}