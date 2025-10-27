/**
 * Analytics Events API Routes
 * Endpoint for receiving frontend analytics events and logging to Supabase
 */

import { Router, Request, Response } from 'express';
import analyticsDBService from '../analytics-db-service';
import { analyticsService } from '../analytics-service';

const router = Router();

/**
 * POST /api/analytics/event
 * Receive analytics events from frontend and log to database + GA4 Measurement Protocol
 */
router.post('/event', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    // Validate required fields
    if (!eventData.event_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'event_name is required' 
      });
    }

    // Extract user metadata from request
    const enrichedEventData = {
      ...eventData,
      user_agent: req.headers['user-agent'] || null,
      referrer: req.headers.referer || req.headers.referrer || null,
      // Use session ID from client (session management handled by client)
      session_id: eventData.session_id || null,
    };

    // Log to Supabase database (async, non-blocking)
    analyticsDBService.logEvent(enrichedEventData).catch((err: any) => {
      console.error('Background error logging event to database:', err);
    });

    // Optionally send high-value conversions to GA4 via Measurement Protocol
    // This provides server-side verification in addition to frontend gtag tracking
    if (eventData.event_value && eventData.event_value > 0) {
      analyticsService.trackConversion({
        event_name: eventData.event_name,
        value: eventData.event_value,
        currency: eventData.currency || 'EUR',
        user_id: enrichedEventData.user_id,
        session_id: enrichedEventData.session_id
      }).catch((err: any) => {
        console.error('Background error sending conversion to GA4:', err);
      });
    }

    // Respond immediately to avoid blocking frontend
    res.json({ success: true });
  } catch (err) {
    console.error('Analytics event endpoint error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process analytics event' 
    });
  }
});

/**
 * GET /api/analytics/conversions
 * Get conversion totals for a date range (for admin dashboard)
 */
router.get('/conversions', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required'
      });
    }

    const totals = await analyticsDBService.getConversionTotals(
      start_date as string,
      end_date as string
    );

    res.json({
      success: true,
      data: totals
    });
  } catch (err) {
    console.error('Analytics conversions endpoint error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion data'
    });
  }
});

/**
 * POST /api/analytics/daily-summary
 * Manually trigger daily summary update (can be called by cron job)
 */
router.post('/daily-summary', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    
    const result = await analyticsDBService.updateDailySummary(date);
    
    res.json({
      success: true,
      message: 'Daily summary updated',
      data: result
    });
  } catch (err) {
    console.error('Daily summary endpoint error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update daily summary'
    });
  }
});

/**
 * POST /api/analytics/performance
 * Receive performance metrics from frontend and log to database
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const performanceData = req.body;

    // Validate required fields
    if (!performanceData.page_path) {
      return res.status(400).json({
        success: false,
        error: 'page_path is required'
      });
    }

    // Enrich with request metadata
    const enrichedData = {
      ...performanceData,
      user_agent: req.headers['user-agent'] || null,
    };

    // Log to Supabase database (async, non-blocking)
    analyticsDBService.logPerformanceMetric(enrichedData).catch((err: any) => {
      console.error('Background error logging performance metric:', err);
    });

    // Respond immediately to avoid blocking frontend
    res.json({ success: true });
  } catch (err) {
    console.error('Performance metrics endpoint error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to process performance metrics'
    });
  }
});

/**
 * POST /api/analytics/performance-summary
 * Manually trigger daily performance summary update
 */
router.post('/performance-summary', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    
    const result = await analyticsDBService.updateDailyPerformanceSummary(date);
    
    res.json({
      success: true,
      message: 'Daily performance summary updated',
      data: result
    });
  } catch (err) {
    console.error('Performance summary endpoint error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update performance summary'
    });
  }
});

/**
 * GET /api/analytics/health
 * Check if analytics database service is ready
 */
router.get('/health', (req: Request, res: Response) => {
  const isReady = analyticsDBService.isReady();
  
  res.json({
    success: true,
    analytics_db_enabled: isReady,
    message: isReady 
      ? 'Analytics database service is operational' 
      : 'Analytics database service is disabled (check SUPABASE_URL and SUPABASE_SERVICE_KEY)'
  });
});

export default router;
