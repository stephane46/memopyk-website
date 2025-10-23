import { useDataSource } from "../data/dataSource";

export default function DataSourceBadge() {
  const s = useDataSource();
  if (s === "unknown") return null;
  const label = s === "live" ? "Live GA4" : "Mock data";
  const cn = s === "live"
    ? "bg-green-100 text-green-700"
    : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${cn}`}>
      {label}
    </span>
  );
}