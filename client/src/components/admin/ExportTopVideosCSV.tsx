import { utils, writeFile } from "xlsx";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportTopVideosCSV({ rows }: { rows: any[] }) {
  const onExport = () => {
    if (!rows.length) return;
    
    // Convert data to CSV-friendly format
    const csvData = rows.map(row => ({
      "Video ID": row.video_id,
      "Title": row.title || "(Untitled)",
      "Plays": row.plays,
      "Avg Watch Time (seconds)": row.avgWatchSeconds,
      "50% Reach": row.reach50Pct,
      "100% Complete": row.completePct,
    }));
    
    const ws = utils.json_to_sheet(csvData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Top Videos");
    writeFile(wb, `top_videos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <Button 
      onClick={onExport} 
      variant="outline" 
      size="sm"
      disabled={!rows.length}
      className="flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}