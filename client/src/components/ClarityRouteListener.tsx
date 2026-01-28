import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ClarityRouteListener() {
  const [location] = useLocation();

  useEffect(() => {
    // Don't run Clarity on admin pages
    if (location.startsWith('/admin') || location.startsWith('/fr-FR/admin') || location.startsWith('/en-US/admin')) return;
    
    if (typeof window === "undefined" || !(window as any).clarity) return;

    // Reconstruct the visible URL (Wouter gives only the path; add QS + hash)
    const qs = window.location.search || "";
    const hash = window.location.hash || "";
    const path = `${location}${qs}${hash}`;

    (window as any).clarity("event", "route_change", { path });
  }, [location]);

  return null;
}