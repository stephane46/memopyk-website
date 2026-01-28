import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export type PeriodMode = "week" | "month" | "auto";

export default function GlobalComparisonBar({
  enabled, setEnabled, mode, setMode,
}: {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  mode: PeriodMode;
  setMode: (m: PeriodMode) => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <Switch id="period-comparison" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="period-comparison" className="text-sm font-medium">
          Compare period
        </Label>
      </div>
      {enabled && (
        <Select value={mode} onValueChange={(v) => setMode(v as PeriodMode)}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This week vs last week</SelectItem>
            <SelectItem value="month">This month vs last month</SelectItem>
            <SelectItem value="auto">Auto (derive from picked range)</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}