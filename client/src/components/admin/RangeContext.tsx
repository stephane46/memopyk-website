// client/src/components/admin/RangeContext.tsx
import * as React from "react";

export type DateRange = { from?: string; to?: string };
export const RangeContext = React.createContext<{
  range: DateRange;
  setRange: (r: DateRange) => void;
}>({ range: {}, setRange: () => {} });

export function RangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<DateRange>({});
  return <RangeContext.Provider value={{ range, setRange }}>{children}</RangeContext.Provider>;
}