// client/src/components/admin/TopVideosColumns.tsx
import { formatSeconds, formatPercent, formatInt, percentClass } from "@/utils/format";
import { ChevronUp, ChevronDown } from "lucide-react";

const HeaderWithTip = ({ label, tip, sortable, sortDirection, onSort }: { 
  label: string; 
  tip: string; 
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}) => (
  <div 
    className={`cursor-help flex items-center gap-1 ${sortable ? 'hover:text-blue-600' : ''}`} 
    title={tip}
    onClick={sortable ? onSort : undefined}
  >
    <span>{label}</span>
    {sortable && (
      <div className="flex flex-col">
        <ChevronUp className={`w-3 h-3 ${sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
        <ChevronDown className={`w-3 h-3 -mt-1 ${sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
    )}
  </div>
);

export const topVideosColumns = [
  {
    key: "title",
    header: ({ sortDirection, onSort }: { sortDirection?: 'asc' | 'desc' | null; onSort?: () => void }) => (
      <HeaderWithTip label="Video" tip="Video title from GA4 tracking" sortable onSort={onSort} sortDirection={sortDirection} />
    ),
    cell: (row: any) => row.title || "(Untitled)",
    sortFn: (a: any, b: any) => (a.title || "").localeCompare(b.title || ""),
  },
  {
    key: "plays",
    header: ({ sortDirection, onSort }: { sortDirection?: 'asc' | 'desc' | null; onSort?: () => void }) => (
      <HeaderWithTip label="Plays" tip="Number of times the video was started (video_start events)" sortable onSort={onSort} sortDirection={sortDirection} />
    ),
    cell: (row: any) => formatInt(row.plays),
    sortFn: (a: any, b: any) => a.plays - b.plays,
  },
  {
    key: "avgWatchSeconds",
    header: ({ sortDirection, onSort }: { sortDirection?: 'asc' | 'desc' | null; onSort?: () => void }) => (
      <HeaderWithTip label="Avg Watch Time" tip="Average watch time per play (total watch time ÷ plays)" sortable onSort={onSort} sortDirection={sortDirection} />
    ),
    cell: (row: any) => formatSeconds(row.avgWatchSeconds),
    sortFn: (a: any, b: any) => a.avgWatchSeconds - b.avgWatchSeconds,
  },
  {
    key: "reach50Pct",
    header: ({ sortDirection, onSort }: { sortDirection?: 'asc' | 'desc' | null; onSort?: () => void }) => (
      <HeaderWithTip label="50% Reach" tip="Percentage of viewers who reached halfway through the video" sortable onSort={onSort} sortDirection={sortDirection} />
    ),
    cell: (row: any) => (
      <span className={percentClass(row.reach50Pct)}>
        {formatPercent(row.reach50Pct)}
      </span>
    ),
    sortFn: (a: any, b: any) => a.reach50Pct - b.reach50Pct,
  },
  {
    key: "completePct",
    header: ({ sortDirection, onSort }: { sortDirection?: 'asc' | 'desc' | null; onSort?: () => void }) => (
      <HeaderWithTip label="100% Complete" tip="Percentage of viewers who watched the entire video" sortable onSort={onSort} sortDirection={sortDirection} />
    ),
    cell: (row: any) => (
      <span className={percentClass(row.completePct)}>
        {formatPercent(row.completePct)}
      </span>
    ),
    sortFn: (a: any, b: any) => a.completePct - b.completePct,
  },
];