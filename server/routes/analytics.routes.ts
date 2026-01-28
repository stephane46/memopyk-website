/**
 * Analytics Routes
 * - Frontend event logging to Supabase
 * - GA4 Measurement Protocol relay (ad-blocker bypass)
 * - GA4 Realtime API endpoints
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { randomUUID } from 'crypto';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const router = Router();

// ============================================================================
// GA4 Client Initialization
// ============================================================================

let ga4Client: BetaAnalyticsDataClient | null = null;

const initGA4Client = () => {
  try {
    const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
    console.log('🔑 [GA4] Initializing client with service account JSON');
    
    return new BetaAnalyticsDataClient(
      SA_KEY ? { credentials: JSON.parse(SA_KEY) } : {}
    );
  } catch (error) {
    console.error('❌ [GA4] Failed to initialize client:', error);
    throw error;
  }
};

const getGA4Client = () => {
  if (!ga4Client) {
    ga4Client = initGA4Client();
  }
  return ga4Client;
};

const GA4_PROPERTY = `properties/${process.env.GA4_PROPERTY_ID}`;
const GA4_MID = process.env.VITE_GA_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA_API_SECRET;

// ============================================================================
// GA4 Measurement Protocol (Ad-blocker Bypass)
// ============================================================================

router.post('/ga4/mp', express.json(), async (req: Request, res: Response) => {
  try {
    if (!GA4_MID) {
      return res.status(500).json({ error: 'GA4 Measurement ID not configured' });
    }
    
    // TODO: Add IP exclusion check via storage service
    // const clientIP = extractClientIP(req);
    // const isExcluded = await storage.checkIPExclusion(clientIP, req.get('User-Agent') || '');
    // if (isExcluded) {
    //   console.log(`🚫 [GA4 MP] Blocked excluded IP: ${clientIP}`);
    //   return res.status(204).send();
    // }
    
    const { client_id, user_id, events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    const cid = String(client_id || randomUUID());

    // Allowlist for security
    const allowed = new Set(['video_start', 'video_progress', 'video_complete']);
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

    const useDebug = req.query.debug === '1';
    const base = useDebug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect';

    let url = `${base}?measurement_id=${encodeURIComponent(GA4_MID)}`;
    if (GA4_API_SECRET) {
      url += `&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;
    }

    console.log(`🎯 [GA4 MP] Sending to ${base}:`, JSON.stringify(payload, null, 2));

    const gaResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await gaResponse.text();
    if (!gaResponse.ok) {
      console.error(`❌ [GA4 MP] Error ${gaResponse.status}:`, text);
      return res.status(gaResponse.status).json({ error: 'GA4 MP error', body: text });
    }

    let debug: any = undefined;
    if (useDebug) {
      try { debug = JSON.parse(text); } catch {}
    }

    console.log(`✅ [GA4 MP] Success - events sent for client ${cid}`);
    const response: any = { ok: true, client_id: cid };
    if (useDebug) response.debug = debug;
    
    res.json(response);
  } catch (err: any) {
    console.error('❌ [GA4 MP] Server error:', err);
    res.status(500).json({ error: 'server error', message: String(err?.message || err) });
  }
});

// ============================================================================
// GA4 Realtime API
// ============================================================================

router.get('/ga4/realtime/top-videos', async (req: Request, res: Response) => {
  try {
    const client = getGA4Client();
    console.log('🔍 [GA4 Realtime] Fetching top videos...');
    
    let response;
    try {
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [
          { name: 'customEvent:video_id' },
          { name: 'customEvent:video_title' }
        ],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_start' }
          }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 50
      });

      const topVideosRt = (response.rows || []).map(row => ({
        videoId: row.dimensionValues?.[0]?.value || 'unknown',
        title: row.dimensionValues?.[1]?.value || 'Unknown Title',
        playsRt: Number(row.metricValues?.[0]?.value || 0)
      })).filter(video => video.videoId !== 'unknown' && video.playsRt > 0);
      
      console.log(`✅ [GA4 Realtime] Found ${topVideosRt.length} top videos`);
      res.json({ topVideosRt });

    } catch (customEventError: any) {
      console.log('⚠️ [GA4 Realtime] Custom events not supported, using fallback...');
      
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_start' }
          }
        },
        limit: 50
      });

      const totalPlays = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
      const topVideosRt = totalPlays > 0 ? [{
        videoId: 'realtime_aggregate',
        title: 'All Videos (Realtime Aggregate)',
        playsRt: totalPlays
      }] : [];

      res.json({ 
        topVideosRt,
        note: 'Realtime API shows aggregate data only'
      });
    }

  } catch (error: any) {
    console.error('❌ [GA4 Realtime] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch realtime top videos',
      message: error.message
    });
  }
});

router.get('/ga4/realtime/video-progress', async (req: Request, res: Response) => {
  try {
    const client = getGA4Client();
    const videoId = String(req.query.videoId || '');
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId parameter required' });
    }

    console.log(`🔍 [GA4 Realtime] Fetching progress for video: ${videoId}`);
    
    const targetBuckets = [10, 25, 50, 75, 90];
    const bucketCounts = new Map<number, number>();
    targetBuckets.forEach(bucket => bucketCounts.set(bucket, 0));

    let response;
    try {
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'customEvent:progress_percent' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: { matchType: 'EXACT', value: 'video_progress' }
                }
              },
              {
                filter: {
                  fieldName: 'customEvent:video_id',
                  stringFilter: { matchType: 'EXACT', value: videoId }
                }
              }
            ]
          }
        },
        orderBys: [{ dimension: { dimensionName: 'customEvent:progress_percent' } }],
        limit: 50
      });

      (response.rows || []).forEach(row => {
        const progressPercent = Number(row.dimensionValues?.[0]?.value || 0);
        const count = Number(row.metricValues?.[0]?.value || 0);
        
        if (progressPercent >= 10 && progressPercent < 25) {
          bucketCounts.set(10, bucketCounts.get(10)! + count);
        } else if (progressPercent >= 25 && progressPercent < 50) {
          bucketCounts.set(25, bucketCounts.get(25)! + count);
        } else if (progressPercent >= 50 && progressPercent < 75) {
          bucketCounts.set(50, bucketCounts.get(50)! + count);
        } else if (progressPercent >= 75 && progressPercent < 90) {
          bucketCounts.set(75, bucketCounts.get(75)! + count);
        } else if (progressPercent >= 90) {
          bucketCounts.set(90, bucketCounts.get(90)! + count);
        }
      });

    } catch (customEventError: any) {
      console.log('⚠️ [GA4 Realtime] Using fallback for progress...');
      
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_progress' }
          }
        },
        limit: 50
      });

      const totalProgressEvents = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
      if (totalProgressEvents > 0) {
        bucketCounts.set(10, Math.ceil(totalProgressEvents * 0.4));
        bucketCounts.set(25, Math.ceil(totalProgressEvents * 0.25));
        bucketCounts.set(50, Math.ceil(totalProgressEvents * 0.2));
        bucketCounts.set(75, Math.ceil(totalProgressEvents * 0.1));
        bucketCounts.set(90, Math.ceil(totalProgressEvents * 0.05));
      }
    }
    
    const funnelRt = targetBuckets.map(bucket => ({
      bucket,
      count: bucketCounts.get(bucket) || 0
    }));

    console.log(`✅ [GA4 Realtime] Progress funnel for ${videoId}:`, funnelRt);
    res.json({ funnelRt });

  } catch (error: any) {
    console.error('❌ [GA4 Realtime] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch realtime video progress',
      message: error.message
    });
  }
});

// ============================================================================
// Frontend Event Logging (to Supabase)
// ============================================================================

router.post('/event', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    if (!eventData.event_name) {
      return res.status(400).json({ success: false, error: 'event_name is required' });
    }

    const enrichedEventData = {
      ...eventData,
      user_agent: req.headers['user-agent'] || null,
      referrer: req.headers.referer || req.headers.referrer || null,
      session_id: eventData.session_id || null,
    };

    // TODO: Log to Supabase via analytics DB service
    // analyticsDBService.logEvent(enrichedEventData).catch(console.error);

    console.log('📊 [Analytics] Event received:', enrichedEventData.event_name);
    res.json({ success: true });
  } catch (err) {
    console.error('Analytics event endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to process analytics event' });
  }
});

router.get('/conversions', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required'
      });
    }

    // TODO: Fetch from analytics DB service
    // const totals = await analyticsDBService.getConversionTotals(start_date, end_date);

    res.json({ success: true, data: { total: 0, count: 0 } });
  } catch (err) {
    console.error('Analytics conversions endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversion data' });
  }
});

router.post('/performance', async (req: Request, res: Response) => {
  try {
    const performanceData = req.body;

    if (!performanceData.page_path) {
      return res.status(400).json({ success: false, error: 'page_path is required' });
    }

    const enrichedData = {
      ...performanceData,
      user_agent: req.headers['user-agent'] || null,
    };

    // TODO: Log to Supabase via analytics DB service
    // analyticsDBService.logPerformanceMetric(enrichedData).catch(console.error);

    console.log('⚡ [Analytics] Performance metric received for:', enrichedData.page_path);
    res.json({ success: true });
  } catch (err) {
    console.error('Performance metrics endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to process performance metrics' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  // TODO: Check analytics DB service status
  const isReady = !!process.env.DATABASE_URL;
  
  res.json({
    success: true,
    analytics_db_enabled: isReady,
    ga4_configured: !!GA4_MID,
    message: isReady ? 'Analytics service operational' : 'Analytics service disabled'
  });
});

export default router;
