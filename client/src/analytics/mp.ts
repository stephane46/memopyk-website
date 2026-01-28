// client/src/analytics/mp.ts - Measurement Protocol client for ad-blocker bypass
const CID_KEY = "ga_cid";

function getCid() {
  let cid = localStorage.getItem(CID_KEY);
  if (!cid) {
    cid = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
    localStorage.setItem(CID_KEY, cid);
  }
  return cid;
}

export async function mpSend(
  name: "video_start" | "video_progress" | "video_complete", 
  params: Record<string, any>
) {
  // Skip on admin pages
  const isAdmin = window.location.pathname.startsWith('/fr-FR/admin') || 
                  window.location.pathname.startsWith('/en-US/admin') || 
                  window.location.pathname.startsWith('/admin');
  if (isAdmin) {
    console.log(`[MP] Skipped ${name} - admin page detected`);
    return;
  }

  const body = {
    client_id: getCid(),
    events: [{ name, params }],
  };

  console.log(`🚀 [MP] Sending ${name} via server relay:`, params);

  try {
    // Try beacon first (fire-and-forget), fall back to fetch
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    const beaconSent = "sendBeacon" in navigator && navigator.sendBeacon("/api/ga4/mp", blob);
    
    if (!beaconSent) {
      const response = await fetch("/api/ga4/mp", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[MP] Server returned ${response.status}:`, errorText);
      } else {
        const result = await response.json();
        console.log(`✅ [MP] Success:`, result);
      }
    } else {
      console.log(`✅ [MP] Beacon sent for ${name}`);
    }
  } catch (e) {
    // Swallow errors - we don't want UX to break on analytics
    console.warn("[MP] send failed", e);
  }
}