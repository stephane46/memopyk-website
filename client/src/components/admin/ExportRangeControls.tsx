// client/src/components/admin/ExportRangeControls.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Calendar } from "lucide-react";
import { downloadFile } from "@/utils/downloadFile";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

type Props = {
  report: "overview" | "video" | "cta" | "geo";
  className?: string;
};

function buildExportUrl(report: string, from?: string, to?: string) {
  const params = new URLSearchParams({ report });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/analytics/export/csv?${params.toString()}`;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function ExportRangeControls({ report, className }: Props) {
  const storageKey = `export-range-${report}`;
  const [from, setFrom] = React.useState<string | undefined>();
  const [to, setTo] = React.useState<string | undefined>();

  // load remembered
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { from, to } = JSON.parse(saved);
        setFrom(from);
        setTo(to);
      } catch {}
    }
  }, [storageKey]);

  // save whenever changes
  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ from, to }));
  }, [from, to, storageKey]);

  // apply preset
  function applyPreset(days: number) {
    const end = new Date();
    end.setUTCHours(0,0,0,0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    setFrom(toIsoDate(start));
    setTo(toIsoDate(end));
  }

  const filename = React.useMemo(() => {
    const base = `analytics_${report}`;
    if (from || to) return `${base}_${from ?? "start"}_${to ?? "now"}.csv`;
    return `${base}.csv`;
  }, [report, from, to]);

  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
      {/* Preset selector */}
      <Select onValueChange={(val) => applyPreset(Number(val))}>
        <SelectTrigger className="w-[110px] h-9">
          <SelectValue placeholder="Presets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom date range */}
      <input
        type="date"
        value={from ?? ""}
        onChange={(e) => setFrom(e.target.value || undefined)}
        className="h-9 rounded-md border px-2 text-sm"
        style={{ direction: 'ltr' }}
        lang="fr-FR"
        aria-label="From date"
      />
      <span className="text-sm text-muted-foreground">→</span>
      <input
        type="date"
        value={to ?? ""}
        onChange={(e) => setTo(e.target.value || undefined)}
        className="h-9 rounded-md border px-2 text-sm"
        style={{ direction: 'ltr' }}
        lang="fr-FR"
        aria-label="To date"
      />

      {/* Export */}
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => {
          const url = buildExportUrl(report, from, to);
          downloadFile(url, filename);
        }}
      >
        <FileDown className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}