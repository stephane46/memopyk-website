// server/utils/resolveDates.ts
type DateRange = { startDate: string; endDate: string };
type Preset = "7d" | "30d" | "90d";

function toIsoDate(d: Date): string {
  // Format YYYY-MM-DD in UTC (GA4 expects this)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns GA4 date range { startDate, endDate }.
 * Behavior:
 * - If preset provided, it overrides explicit dates.
 * - Presets end at "today (UTC)" and start N-1 days earlier.
 * - If no preset:
 *    - If both startDate/endDate are provided, use them (assumed ISO YYYY-MM-DD).
 *    - Else default to last 7 days.
 */
export function resolveDates(
  preset?: Preset,
  startDate?: string,
  endDate?: string
): DateRange {
  if (preset) {
    const now = new Date(); // now in UTC
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end); // clone
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    // include today → subtract (days - 1)
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  if (startDate && endDate) {
    return { startDate, endDate };
  }

  // default to 7d window
  return resolveDates("7d");
}