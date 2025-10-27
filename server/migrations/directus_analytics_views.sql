-- MEMOPYK Analytics Dashboard Views for Directus
-- Run this in Supabase SQL Editor to create dashboard-friendly views
-- Date: October 27, 2025

-- View 1: Daily KPI Summary
-- Combines analytics and performance metrics for dashboard overview
CREATE OR REPLACE VIEW directus_daily_kpi_summary AS
SELECT
  a.summary_date,
  a.total_events,
  a.total_conversions,
  a.total_conversion_value,
  a.total_revenue,
  a.unique_users,
  a.unique_sessions,
  a.page_views,
  a.form_submissions,
  a.video_interactions,
  a.avg_scroll_depth,
  ROUND(a.total_revenue / NULLIF(a.unique_users, 0), 2) as revenue_per_user,
  ROUND(a.total_conversions::numeric / NULLIF(a.total_events, 0) * 100, 2) as conversion_rate,
  p.avg_lcp,
  p.avg_cls,
  p.avg_page_load_time,
  p.avg_performance_score
FROM analytics_daily_summary a
LEFT JOIN performance_daily_summary p ON a.summary_date = p.summary_date
ORDER BY a.summary_date DESC;

-- View 2: Performance by Page
-- Shows average performance metrics for each page
CREATE OR REPLACE VIEW directus_performance_by_page AS
SELECT
  page_name,
  page_path,
  ROUND(AVG(lcp_value), 0) as avg_lcp_ms,
  ROUND(AVG(cls_value), 3) as avg_cls_score,
  ROUND(AVG(inp_value), 0) as avg_inp_ms,
  ROUND(AVG(fid_value), 0) as avg_fid_ms,
  ROUND(AVG(page_load_time), 0) as avg_page_load_ms,
  ROUND(AVG(ttfb), 0) as avg_ttfb_ms,
  COUNT(*) as measurement_count,
  COUNT(CASE WHEN lcp_rating = 'good' THEN 1 END) as lcp_good_count,
  COUNT(CASE WHEN lcp_rating = 'poor' THEN 1 END) as lcp_poor_count,
  MAX(created_at) as last_measured
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY page_name, page_path
ORDER BY measurement_count DESC;

-- View 3: Top Conversion Events
-- Shows highest-value conversion events
CREATE OR REPLACE VIEW directus_top_conversions AS
SELECT
  conversion_type,
  COUNT(*) as conversion_count,
  SUM(conversion_value) as total_value,
  ROUND(AVG(conversion_value), 2) as avg_value,
  currency,
  MAX(conversion_date) as last_conversion_date
FROM analytics_conversions
WHERE conversion_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY conversion_type, currency
ORDER BY total_value DESC;

-- View 4: Recent High-Value Events
-- Shows recent events with conversion values for monitoring
CREATE OR REPLACE VIEW directus_recent_high_value_events AS
SELECT
  event_id,
  event_name,
  event_value,
  currency,
  page_name,
  page_path,
  form_name,
  partner_country,
  user_language,
  created_at,
  CASE 
    WHEN event_value >= 50 THEN 'high'
    WHEN event_value >= 20 THEN 'medium'
    ELSE 'low'
  END as value_tier
FROM analytics_events
WHERE event_value > 0
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- View 5: Event Distribution
-- Shows distribution of events by type for pie charts
CREATE OR REPLACE VIEW directus_event_distribution AS
SELECT
  event_name,
  COUNT(*) as event_count,
  SUM(CASE WHEN event_value > 0 THEN 1 ELSE 0 END) as valued_event_count,
  SUM(event_value) as total_value,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_name
ORDER BY event_count DESC;

-- View 6: Performance Issues
-- Identifies pages with performance problems
CREATE OR REPLACE VIEW directus_performance_issues AS
SELECT
  page_name,
  page_path,
  lcp_value as lcp_ms,
  cls_value as cls_score,
  inp_value as inp_ms,
  page_load_time as page_load_ms,
  device_type,
  browser_name,
  created_at,
  CASE 
    WHEN lcp_value > 4000 THEN 'Critical - LCP > 4s'
    WHEN cls_value > 0.25 THEN 'Critical - CLS > 0.25'
    WHEN page_load_time > 5000 THEN 'Warning - Load > 5s'
    ELSE 'OK'
  END as issue_severity
FROM performance_metrics
WHERE 
  (lcp_value > 4000 OR cls_value > 0.25 OR page_load_time > 5000)
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- View 7: Conversion Funnel
-- Shows conversion rates across different event types
CREATE OR REPLACE VIEW directus_conversion_funnel AS
WITH event_counts AS (
  SELECT
    COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN event_name = 'scroll_engagement' AND scroll_percent >= 50 THEN 1 END) as engaged_users,
    COUNT(CASE WHEN event_name = 'cta_click' THEN 1 END) as cta_clicks,
    COUNT(CASE WHEN event_name = 'form_submit' THEN 1 END) as form_submissions
  FROM analytics_events
  WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT
  'Page Views' as funnel_step,
  1 as step_order,
  page_views as count,
  100.0 as conversion_rate_from_previous
FROM event_counts
UNION ALL
SELECT
  'Engaged Users (50%+ scroll)',
  2,
  engaged_users,
  ROUND(engaged_users::numeric / NULLIF(page_views, 0) * 100, 2)
FROM event_counts
UNION ALL
SELECT
  'CTA Clicks',
  3,
  cta_clicks,
  ROUND(cta_clicks::numeric / NULLIF(engaged_users, 0) * 100, 2)
FROM event_counts
UNION ALL
SELECT
  'Form Submissions',
  4,
  form_submissions,
  ROUND(form_submissions::numeric / NULLIF(cta_clicks, 0) * 100, 2)
FROM event_counts
ORDER BY step_order;

-- View 8: Real-Time Dashboard (Last 24 Hours)
-- Recent activity for real-time monitoring
CREATE OR REPLACE VIEW directus_realtime_dashboard AS
WITH recent_stats AS (
  SELECT
    COUNT(*) as total_events_24h,
    COUNT(DISTINCT CASE WHEN event_value > 0 THEN event_id END) as conversions_24h,
    SUM(event_value) as revenue_24h,
    COUNT(DISTINCT session_id) as active_sessions_24h,
    MAX(created_at) as last_event_time
  FROM analytics_events
  WHERE created_at > NOW() - INTERVAL '24 hours'
),
recent_performance AS (
  SELECT
    ROUND(AVG(lcp_value), 0) as avg_lcp_24h,
    ROUND(AVG(cls_value), 3) as avg_cls_24h,
    ROUND(AVG(page_load_time), 0) as avg_load_time_24h
  FROM performance_metrics
  WHERE created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  r.*,
  p.avg_lcp_24h,
  p.avg_cls_24h,
  p.avg_load_time_24h,
  NOW() as snapshot_time
FROM recent_stats r
CROSS JOIN recent_performance p;

-- View 9: Device & Browser Analytics
-- Breakdown by device type and browser for optimization
CREATE OR REPLACE VIEW directus_device_browser_stats AS
SELECT
  device_type,
  browser_name,
  COUNT(*) as session_count,
  ROUND(AVG(lcp_value), 0) as avg_lcp,
  ROUND(AVG(page_load_time), 0) as avg_load_time,
  COUNT(CASE WHEN lcp_rating = 'poor' THEN 1 END) as poor_performance_count
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY device_type, browser_name
ORDER BY session_count DESC;

-- View 10: Monthly Trends
-- Month-over-month comparison for trend analysis
CREATE OR REPLACE VIEW directus_monthly_trends AS
SELECT
  DATE_TRUNC('month', summary_date) as month,
  SUM(total_events) as total_events,
  SUM(total_conversions) as total_conversions,
  SUM(total_revenue) as total_revenue,
  AVG(unique_users) as avg_daily_users,
  ROUND(AVG(total_conversion_value), 2) as avg_conversion_value
FROM analytics_daily_summary
WHERE summary_date > NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', summary_date)
ORDER BY month DESC;

-- Grant read permissions to service role (adjust based on your Supabase setup)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics dashboard views created successfully!';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - directus_daily_kpi_summary';
  RAISE NOTICE '  - directus_performance_by_page';
  RAISE NOTICE '  - directus_top_conversions';
  RAISE NOTICE '  - directus_recent_high_value_events';
  RAISE NOTICE '  - directus_event_distribution';
  RAISE NOTICE '  - directus_performance_issues';
  RAISE NOTICE '  - directus_conversion_funnel';
  RAISE NOTICE '  - directus_realtime_dashboard';
  RAISE NOTICE '  - directus_device_browser_stats';
  RAISE NOTICE '  - directus_monthly_trends';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now create Directus collections pointing to these views!';
END $$;
