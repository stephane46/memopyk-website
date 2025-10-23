import express from "express";
import { randomUUID } from "crypto";
import { geoResolver } from "../geoResolver";
import { HybridStorage } from "../hybrid-storage";

const router = express.Router();
const storage = new HybridStorage();

// Use VITE_GA_MEASUREMENT_ID since it's already available
const MID = process.env.VITE_GA_MEASUREMENT_ID; // e.g., G-JLRWHE1HV4
const API_SECRET = process.env.GA_API_SECRET; // Optional - can work without it

router.post("/ga4/mp", express.json(), async (req, res) => {
  try {
    if (!MID) {
      return res.status(500).json({ error: "GA4 Measurement ID not configured" });
    }
    
    // Check IP exclusions first
    const clientIP = geoResolver.extractClientIP(req);
    const isExcluded = await storage.checkIPExclusion(clientIP, req.get('User-Agent') || '');
    if (isExcluded) {
      console.log(`🚫 [GA4 MP] Blocked excluded IP: ${clientIP}`);
      return res.status(204).send(); // Silent success to avoid detection
    }
    
    const { client_id, user_id, events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "events array required" });
    }

    // Generate/persist a client_id if not provided
    const cid = String(client_id || randomUUID());

    // Basic allowlist for security
    const allowed = new Set(["video_start", "video_progress", "video_complete"]);
    for (const e of events) {
      if (!allowed.has(e?.name)) {
        return res.status(400).json({ error: `event not allowed: ${e?.name}` });
      }
    }

    const payload = {
      client_id: cid,
      user_id,
      non_personalized_ads: false,
      events,
    };

    // Choose endpoint by query flag
    const useDebug = req.query.debug === "1";
    const base = useDebug
      ? "https://www.google-analytics.com/debug/mp/collect"
      : "https://www.google-analytics.com/mp/collect"; // <-- ingest

    // Build URL with API_SECRET if available
    let url = `${base}?measurement_id=${encodeURIComponent(MID)}`;
    if (API_SECRET) {
      url += `&api_secret=${encodeURIComponent(API_SECRET)}`;
    }

    console.log(`🎯 [GA4 MP] Sending to ${base}:`, JSON.stringify(payload, null, 2));

    const gaResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await gaResponse.text();
    if (!gaResponse.ok) {
      console.error(`❌ [GA4 MP] Error ${gaResponse.status}:`, text);
      return res.status(gaResponse.status).json({ error: "GA4 MP error", body: text });
    }

    // Parse debug response if in debug mode
    let debug: any = undefined;
    if (useDebug) {
      try { 
        debug = JSON.parse(text); 
      } catch {
        // Debug endpoint should return JSON, but handle parse errors
      }
    }

    console.log(`✅ [GA4 MP] Success - events sent for client ${cid}`);
    const response: any = { ok: true, client_id: cid };
    if (useDebug) {
      response.debug = debug;
    }
    res.json(response);
  } catch (err: any) {
    console.error('❌ [GA4 MP] Server error:', err);
    res.status(500).json({ error: "server error", message: String(err?.message || err) });
  }
});

export default router;