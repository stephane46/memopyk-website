// client/src/components/admin/TopVideosTable.tsx
import { useState, useMemo } from "react";
import { topVideosColumns } from "./TopVideosColumns";
import { ExportTopVideosCSV } from "./ExportTopVideosCSV";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TopVideosTable({ data = [] }: { data?: any[] }) {
  // Ensure data is always an array, even if something else is passed
  const safeData = Array.isArray(data) ? data : [];
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedData = useMemo(() => {
    // Use the safe data array
    if (safeData.length === 0) return [];
    if (!sortColumn) return safeData;
    
    const column = topVideosColumns.find(col => col.key === sortColumn);
    if (!column?.sortFn) return safeData;
    
    const sorted = [...safeData].sort(column.sortFn);
    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [safeData, sortColumn, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
  };

  // AsyncState now handles loading, error, and empty states

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportTopVideosCSV rows={sortedData} />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {topVideosColumns.map((column) => (
                <TableHead key={column.key}>
                  {column.header({
                    sortDirection: sortColumn === column.key ? sortDirection : null,
                    onSort: () => handleSort(column.key)
                  })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow key={`${row.video_id || 'video'}-${index}-${row.video_filename || 'unknown'}`}>
                {topVideosColumns.map((column) => (
                  <TableCell key={`${column.key}-${index}`}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}