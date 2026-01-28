// client/src/utils/format.ts
export const formatSeconds = (secs: number | null | undefined) => {
  const s = Math.max(0, Number(secs || 0));
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`; // 71 → "1:11"
};

export const formatPercent = (value: number | null | undefined, digits = 1) => {
  const v = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${v.toFixed(digits)}%`;
};

export const formatInt = (n: number | null | undefined) =>
  new Intl.NumberFormat().format(Number(n || 0));

export const safe = <T>(v: T | null | undefined, fallback: T): T =>
  (v === null || v === undefined ? fallback : v);

// Optional: color helper for % cells
export const percentClass = (p: number) => {
  if (p >= 75) return "text-green-600";
  if (p >= 50) return "text-emerald-600";
  if (p >= 25) return "text-amber-600";
  return "text-gray-600";
};