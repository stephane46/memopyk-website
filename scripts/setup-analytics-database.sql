-- MEMOPYK Analytics Database Schema
-- Creates all tables, views, and functions for GA4 → Supabase analytics pipeline

-- ============================================================================
-- 1. CORE ANALYTICS TABLES
-- ============================================================================

-- Sessions table: Tracks unique user sessions
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_pseudo_id TEXT,
  first_visit_timestamp TIMESTAMP WITH TIME ZONE,
  last_visit_timestamp TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER DEFAULT 0,
  page_views_count INTEGER DEFAULT 0,
  is_new_visitor BOOLEAN DEFAULT true,
  country TEXT,
  city TEXT,
  device_category TEXT,
  browser TEXT,
  operating_system TEXT,
  traffic_source TEXT,
  medium TEXT,
  campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pageviews table: Tracks individual page visits
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  page_title TEXT,
  page_location TEXT,
  page_referrer TEXT,
  language TEXT,
  user_pseudo_id TEXT,
  country TEXT,
  city TEXT,
  device_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video events table: Tracks video interactions
CREATE TABLE IF NOT EXISTS analytics_video_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_name TEXT NOT NULL, -- video_start, video_progress, video_complete, video_pause
  video_id TEXT NOT NULL,
  video_title TEXT,
  current_time_seconds DECIMAL(10,3),
  progress_percent INTEGER,
  watch_time_seconds DECIMAL(10,3),
  user_pseudo_id TEXT,
  page_location TEXT,
  language TEXT,
  country TEXT,
  device_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CTA clicks table: Tracks call-to-action interactions
CREATE TABLE IF NOT EXISTS analytics_cta_clicks (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  cta_id TEXT NOT NULL,
  cta_text TEXT,
  page_location TEXT,
  user_pseudo_id TEXT,
  language TEXT,
  country TEXT,
  device_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_pseudo_id ON analytics_sessions(user_pseudo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_first_visit ON analytics_sessions(first_visit_timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_country ON analytics_sessions(country);

-- Pageviews indexes
CREATE INDEX IF NOT EXISTS idx_pageviews_session_id ON analytics_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON analytics_pageviews(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_pageviews_location ON analytics_pageviews(page_location);

-- Video events indexes
CREATE INDEX IF NOT EXISTS idx_video_events_session_id ON analytics_video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_timestamp ON analytics_video_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_video_events_video_id ON analytics_video_events(video_id);
CREATE INDEX IF NOT EXISTS idx_video_events_name ON analytics_video_events(event_name);

-- CTA clicks indexes
CREATE INDEX IF NOT EXISTS idx_cta_clicks_session_id ON analytics_cta_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_timestamp ON analytics_cta_clicks(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_cta_id ON analytics_cta_clicks(cta_id);

-- ============================================================================
-- 3. DASHBOARD VIEWS FOR OPTIMIZED QUERIES
-- ============================================================================

-- Daily overview stats
CREATE OR REPLACE VIEW analytics_daily_overview AS
SELECT 
  DATE(event_timestamp) as date,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_pageviews,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors,
  AVG(
    CASE 
      WHEN s.session_duration_seconds > 0 
      THEN s.session_duration_seconds 
    END
  ) as avg_session_duration,
  COUNT(DISTINCT 
    CASE 
      WHEN s.is_new_visitor = true 
      THEN s.session_id 
    END
  ) as new_visitors,
  COUNT(DISTINCT 
    CASE 
      WHEN s.is_new_visitor = false 
      THEN s.session_id 
    END
  ) as returning_visitors
FROM analytics_pageviews p
LEFT JOIN analytics_sessions s ON p.session_id = s.session_id
GROUP BY DATE(event_timestamp)
ORDER BY date DESC;

-- Video performance analytics
CREATE OR REPLACE VIEW analytics_video_performance AS
SELECT 
  video_id,
  video_title,
  COUNT(DISTINCT session_id) as unique_viewers,
  COUNT(CASE WHEN event_name = 'video_start' THEN 1 END) as starts,
  COUNT(CASE WHEN event_name = 'video_complete' THEN 1 END) as completions,
  COUNT(CASE WHEN event_name = 'video_pause' THEN 1 END) as pauses,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN event_name = 'video_start' THEN 1 END) > 0
      THEN (COUNT(CASE WHEN event_name = 'video_complete' THEN 1 END)::DECIMAL / 
            COUNT(CASE WHEN event_name = 'video_start' THEN 1 END)) * 100
      ELSE 0
    END, 2
  ) as completion_rate_percent,
  AVG(
    CASE 
      WHEN event_name = 'video_progress' AND watch_time_seconds > 0 
      THEN watch_time_seconds 
    END
  ) as avg_watch_time_seconds,
  MAX(
    CASE 
      WHEN event_name = 'video_progress' 
      THEN progress_percent 
    END
  ) as max_progress_reached
FROM analytics_video_events
GROUP BY video_id, video_title
ORDER BY starts DESC;

-- CTA performance tracking
CREATE OR REPLACE VIEW analytics_cta_performance AS
SELECT 
  cta_id,
  cta_text,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT session_id) as unique_clickers,
  COUNT(DISTINCT user_pseudo_id) as unique_users,
  DATE(event_timestamp) as date
FROM analytics_cta_clicks
GROUP BY cta_id, cta_text, DATE(event_timestamp)
ORDER BY date DESC, total_clicks DESC;

-- Traffic sources overview
CREATE OR REPLACE VIEW analytics_traffic_sources AS
SELECT 
  traffic_source,
  medium,
  campaign,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(DISTINCT user_pseudo_id) as users,
  AVG(session_duration_seconds) as avg_session_duration,
  AVG(page_views_count) as avg_pages_per_session
FROM analytics_sessions
WHERE traffic_source IS NOT NULL
GROUP BY traffic_source, medium, campaign
ORDER BY sessions DESC;

-- Geographic distribution
CREATE OR REPLACE VIEW analytics_geographic_distribution AS
SELECT 
  country,
  city,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(DISTINCT user_pseudo_id) as users,
  AVG(session_duration_seconds) as avg_session_duration
FROM analytics_sessions
WHERE country IS NOT NULL
GROUP BY country, city
ORDER BY sessions DESC;

-- Device and browser analytics
CREATE OR REPLACE VIEW analytics_device_browser AS
SELECT 
  device_category,
  browser,
  operating_system,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(DISTINCT user_pseudo_id) as users,
  AVG(session_duration_seconds) as avg_session_duration
FROM analytics_sessions
WHERE device_category IS NOT NULL
GROUP BY device_category, browser, operating_system
ORDER BY sessions DESC;

-- Video drop-off analysis
CREATE OR REPLACE VIEW analytics_video_dropoff AS
SELECT 
  video_id,
  video_title,
  progress_percent,
  COUNT(DISTINCT session_id) as viewers_at_progress,
  ROUND(
    (COUNT(DISTINCT session_id)::DECIMAL / 
     FIRST_VALUE(COUNT(DISTINCT session_id)) OVER (
       PARTITION BY video_id ORDER BY progress_percent
     )) * 100, 2
  ) as retention_rate_percent
FROM analytics_video_events
WHERE event_name = 'video_progress' AND progress_percent IS NOT NULL
GROUP BY video_id, video_title, progress_percent
ORDER BY video_id, progress_percent;

-- ============================================================================
-- 4. POSTGRESQL FUNCTIONS
-- ============================================================================

-- Function to mark returning users based on previous visits
CREATE OR REPLACE FUNCTION mark_returning_users()
RETURNS void AS $$
BEGIN
  -- Update sessions to mark returning visitors
  UPDATE analytics_sessions 
  SET is_new_visitor = false
  WHERE user_pseudo_id IN (
    SELECT user_pseudo_id 
    FROM analytics_sessions 
    WHERE user_pseudo_id IS NOT NULL
    GROUP BY user_pseudo_id 
    HAVING COUNT(*) > 1
  )
  AND session_id NOT IN (
    -- Exclude the first session for each user
    SELECT DISTINCT ON (user_pseudo_id) session_id
    FROM analytics_sessions 
    WHERE user_pseudo_id IS NOT NULL
    ORDER BY user_pseudo_id, first_visit_timestamp ASC
  );
  
  RAISE NOTICE 'Updated returning visitor flags';
END;
$$ LANGUAGE plpgsql;

-- Function to update session durations and page counts
CREATE OR REPLACE FUNCTION update_session_metrics()
RETURNS void AS $$
BEGIN
  -- Update session duration and page view counts
  UPDATE analytics_sessions s
  SET 
    session_duration_seconds = COALESCE(
      EXTRACT(EPOCH FROM (s.last_visit_timestamp - s.first_visit_timestamp))::INTEGER,
      0
    ),
    page_views_count = COALESCE(
      (SELECT COUNT(*) FROM analytics_pageviews p WHERE p.session_id = s.session_id),
      0
    ),
    updated_at = NOW()
  WHERE s.session_id IN (
    SELECT DISTINCT session_id FROM analytics_pageviews
    WHERE event_timestamp >= NOW() - INTERVAL '2 days'
  );
  
  RAISE NOTICE 'Updated session metrics';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update session last_visit_timestamp
CREATE OR REPLACE FUNCTION update_session_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analytics_sessions 
  SET 
    last_visit_timestamp = NEW.event_timestamp,
    updated_at = NOW()
  WHERE session_id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic session updates
DROP TRIGGER IF EXISTS trigger_update_session_pageview ON analytics_pageviews;
CREATE TRIGGER trigger_update_session_pageview
  AFTER INSERT ON analytics_pageviews
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_visit();

DROP TRIGGER IF EXISTS trigger_update_session_video ON analytics_video_events;
CREATE TRIGGER trigger_update_session_video
  AFTER INSERT ON analytics_video_events
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_visit();

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Run initial maintenance
SELECT mark_returning_users();
SELECT update_session_metrics();

-- Display setup summary
SELECT 
  'analytics_sessions' as table_name,
  COUNT(*) as row_count
FROM analytics_sessions
UNION ALL
SELECT 
  'analytics_pageviews' as table_name,
  COUNT(*) as row_count
FROM analytics_pageviews
UNION ALL
SELECT 
  'analytics_video_events' as table_name,
  COUNT(*) as row_count
FROM analytics_video_events
UNION ALL
SELECT 
  'analytics_cta_clicks' as table_name,
  COUNT(*) as row_count
FROM analytics_cta_clicks
ORDER BY table_name;