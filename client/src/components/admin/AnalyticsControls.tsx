// client/src/components/admin/AnalyticsControls.tsx
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Globe, RefreshCw } from "lucide-react";

export function AnalyticsControls() {
  const { startDate, endDate, locale, setFilters } = useDashboardFilters();

  const handleDateRangePreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 864e5);
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    setFilters({ startDate: toYMD(start), endDate: toYMD(end) });
  };

  // Check if current date range matches a preset
  const isActivePreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 864e5);
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    const presetStart = toYMD(start);
    const presetEnd = toYMD(end);
    const isActive = startDate === presetStart && endDate === presetEnd;
    
    // Calculate current range days for comparison
    const currentDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // If no exact match but current range matches expected days, consider it active
    const dayMatch = currentDays === days;
    const finalActive = isActive || (dayMatch && Math.abs(currentDays - days) <= 1);
    
    console.log(`🔍 Filter ${days}d check:`);
    console.log(`  Current range: ${startDate} to ${endDate} (${currentDays} days)`);
    console.log(`  Preset range: ${presetStart} to ${presetEnd} (${days} days)`);
    console.log(`  Exact match: ${isActive}`);
    console.log(`  Day match: ${dayMatch}`);
    console.log(`  Final active: ${finalActive}`);
    
    return finalActive;
  };

  return (
    <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input 
          type="date" 
          value={startDate} 
          onChange={e => setFilters({ startDate: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        />
        <span className="text-gray-400">to</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={e => setFilters({ endDate: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        />
      </div>

      {/* Date Presets */}
      <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
        <Button
          variant={isActivePreset(7) ? "default" : "outline"}
          size="sm"
          onClick={() => handleDateRangePreset(7)}
          style={{
            minWidth: '50px',
            backgroundColor: isActivePreset(7) ? '#D67C4A' : 'white',
            borderColor: isActivePreset(7) ? '#D67C4A' : '#d1d5db',
            color: isActivePreset(7) ? 'white' : '#374151',
            display: 'inline-flex',
            visibility: 'visible'
          }}
        >
          7d
        </Button>
        <Button
          variant={isActivePreset(30) ? "default" : "outline"}
          size="sm"
          onClick={() => handleDateRangePreset(30)}
          style={{
            minWidth: '50px',
            backgroundColor: isActivePreset(30) ? '#D67C4A' : 'white',
            borderColor: isActivePreset(30) ? '#D67C4A' : '#d1d5db',
            color: isActivePreset(30) ? 'white' : '#374151',
            display: 'inline-flex',
            visibility: 'visible'
          }}
        >
          30d
        </Button>
        <Button
          variant={isActivePreset(90) ? "default" : "outline"}
          size="sm"
          onClick={() => handleDateRangePreset(90)}
          style={{
            minWidth: '50px',
            backgroundColor: isActivePreset(90) ? '#D67C4A' : 'white',
            borderColor: isActivePreset(90) ? '#D67C4A' : '#d1d5db',
            color: isActivePreset(90) ? 'white' : '#374151',
            display: 'inline-flex',
            visibility: 'visible'
          }}
        >
          90d
        </Button>
      </div>

      {/* Locale Selection */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-500" />
        <Select value={locale} onValueChange={(value) => setFilters({ locale: value as any })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locales</SelectItem>
            <SelectItem value="fr-FR">fr-FR</SelectItem>
            <SelectItem value="en-US">en-US</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}