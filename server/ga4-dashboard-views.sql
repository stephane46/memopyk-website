-- GA4 Analytics Dashboard Views
-- Ready-to-use SQL views for dashboard queries

-- Video Performance Leaderboard
CREATE OR REPLACE VIEW view_video_leaderboard AS
SELECT 
  video_id,
  video_title,
  COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END) as total_views,
  AVG(watch_time_seconds) as avg_watch_time,
  COUNT(DISTINCT CASE WHEN progress_percent >= 10 THEN session_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END), 0) as completion_10_percent,
  COUNT(DISTINCT CASE WHEN progress_percent >= 25 THEN session_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END), 0) as completion_25_percent,
  COUNT(DISTINCT CASE WHEN progress_percent >= 50 THEN session_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END), 0) as completion_50_percent,
  COUNT(DISTINCT CASE WHEN progress_percent >= 75 THEN session_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END), 0) as completion_75_percent,
  COUNT(DISTINCT CASE WHEN progress_percent >= 100 THEN session_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'video_start' THEN session_id END), 0) as completion_100_percent,
  -- Top drop-off point calculation
  MODE() WITHIN GROUP (ORDER BY 
    CASE 
      WHEN event_name = 'video_pause' OR 
           (event_name = 'video_progress' AND 
            LAG(event_name) OVER (PARTITION BY session_id, video_id ORDER BY event_timestamp) != 'video_progress')
      THEN progress_percent 
    END
  ) as top_dropoff_percent
FROM analytics_video_events
WHERE video_id IS NOT NULL
GROUP BY video_id, video_title
ORDER BY total_views DESC;

-- Video Watch Distribution (Progress Buckets)
CREATE OR REPLACE VIEW view_video_watch_distribution AS
SELECT 
  video_id,
  video_title,
  CASE 
    WHEN progress_percent BETWEEN 0 AND 10 THEN '0-10%'
    WHEN progress_percent BETWEEN 11 AND 25 THEN '11-25%'
    WHEN progress_percent BETWEEN 26 AND 50 THEN '26-50%'
    WHEN progress_percent BETWEEN 51 AND 75 THEN '51-75%'
    WHEN progress_percent BETWEEN 76 AND 100 THEN '76-100%'
  END as progress_bucket,
  COUNT(DISTINCT session_id) as unique_viewers,
  COUNT(*) as total_events
FROM analytics_video_events
WHERE event_name = 'video_progress' 
  AND progress_percent IS NOT NULL
  AND video_id IS NOT NULL
GROUP BY video_id, video_title, progress_bucket
ORDER BY video_id, progress_bucket;

-- CTA Performance Analysis
CREATE OR REPLACE VIEW view_cta_performance AS
WITH page_views AS (
  SELECT 
    page_path,
    locale,
    COUNT(DISTINCT session_id) as total_pageviews
  FROM analytics_pageviews
  GROUP BY page_path, locale
),
cta_clicks AS (
  SELECT 
    cta_id,
    page_path,
    locale,
    COUNT(DISTINCT session_id) as total_clicks,
    COUNT(*) as total_click_events
  FROM analytics_cta_clicks
  GROUP BY cta_id, page_path, locale
)
SELECT 
  c.cta_id,
  c.page_path,
  c.locale,
  c.total_clicks,
  c.total_click_events,
  pv.total_pageviews,
  ROUND(c.total_clicks * 100.0 / NULLIF(pv.total_pageviews, 0), 2) as ctr_percent
FROM cta_clicks c
LEFT JOIN page_views pv ON c.page_path = pv.page_path AND c.locale = pv.locale
ORDER BY c.total_clicks DESC;

-- Visitor Overview
CREATE OR REPLACE VIEW view_visitor_overview AS
SELECT 
  COUNT(DISTINCT user_pseudo_id) as total_unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT CASE WHEN is_returning = true THEN user_pseudo_id END) as returning_visitors,
  COUNT(DISTINCT CASE WHEN is_returning = false THEN user_pseudo_id END) as new_visitors,
  ROUND(
    COUNT(DISTINCT CASE WHEN is_returning = true THEN user_pseudo_id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT user_pseudo_id), 0), 2
  ) as returning_visitor_percent,
  AVG(session_duration_seconds) as avg_session_duration_seconds,
  SUM(total_pageviews) as total_pageviews,
  AVG(total_pageviews) as avg_pageviews_per_session
FROM analytics_sessions
WHERE first_seen_at >= CURRENT_DATE - INTERVAL '30 days';

-- Geographic Distribution
CREATE OR REPLACE VIEW view_geographic_distribution AS
SELECT 
  country,
  city,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions,
  AVG(session_duration_seconds) as avg_session_duration_seconds,
  SUM(total_pageviews) as total_pageviews
FROM analytics_sessions
WHERE country IS NOT NULL
  AND first_seen_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY country, city
ORDER BY unique_visitors DESC;

-- Language Preferences
CREATE OR REPLACE VIEW view_language_preferences AS
SELECT 
  language,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions,
  ROUND(
    COUNT(DISTINCT user_pseudo_id) * 100.0 / 
    (SELECT COUNT(DISTINCT user_pseudo_id) FROM analytics_sessions WHERE first_seen_at >= CURRENT_DATE - INTERVAL '30 days'), 2
  ) as visitor_percentage
FROM analytics_sessions
WHERE language IS NOT NULL
  AND first_seen_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY language
ORDER BY unique_visitors DESC;

-- Daily/Weekly Trends
CREATE OR REPLACE VIEW view_daily_trends AS
SELECT 
  DATE(first_seen_at) as date,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT CASE WHEN is_returning = false THEN user_pseudo_id END) as new_visitors,
  SUM(total_pageviews) as total_pageviews,
  AVG(session_duration_seconds) as avg_session_duration_seconds,
  -- Video metrics
  COALESCE(video_stats.total_video_starts, 0) as total_video_starts,
  COALESCE(video_stats.total_video_completions, 0) as total_video_completions,
  -- CTA metrics  
  COALESCE(cta_stats.total_cta_clicks, 0) as total_cta_clicks
FROM analytics_sessions s
LEFT JOIN (
  SELECT 
    DATE(event_timestamp) as date,
    COUNT(CASE WHEN event_name = 'video_start' THEN 1 END) as total_video_starts,
    COUNT(CASE WHEN event_name = 'video_complete' THEN 1 END) as total_video_completions
  FROM analytics_video_events
  GROUP BY DATE(event_timestamp)
) video_stats ON DATE(s.first_seen_at) = video_stats.date
LEFT JOIN (
  SELECT 
    DATE(event_timestamp) as date,
    COUNT(*) as total_cta_clicks
  FROM analytics_cta_clicks
  GROUP BY DATE(event_timestamp)
) cta_stats ON DATE(s.first_seen_at) = cta_stats.date
WHERE s.first_seen_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(s.first_seen_at), video_stats.total_video_starts, video_stats.total_video_completions, cta_stats.total_cta_clicks
ORDER BY date DESC;

-- Traffic Sources
CREATE OR REPLACE VIEW view_traffic_sources AS
SELECT 
  COALESCE(referrer, 'Direct') as source,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions,
  ROUND(
    COUNT(DISTINCT user_pseudo_id) * 100.0 / 
    (SELECT COUNT(DISTINCT user_pseudo_id) FROM analytics_sessions WHERE first_seen_at >= CURRENT_DATE - INTERVAL '30 days'), 2
  ) as visitor_percentage,
  AVG(session_duration_seconds) as avg_session_duration_seconds
FROM analytics_sessions
WHERE first_seen_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY referrer
ORDER BY unique_visitors DESC;