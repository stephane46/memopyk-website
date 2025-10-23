-- GA4 BigQuery → Supabase Analytics Schema
-- Target: Standardized analytics from GA4 raw events via BigQuery Export

-- Sessions table (derived from GA4 user_pseudo_id + session data)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id text PRIMARY KEY,
  user_pseudo_id text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  country text,
  city text,
  language text,
  device_category text,
  os text,
  browser text,
  referrer text,
  is_returning boolean DEFAULT false,
  total_events int DEFAULT 0,
  total_pageviews int DEFAULT 0,
  session_duration_seconds int DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Page views from GA4 page_view events
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id bigserial PRIMARY KEY,
  event_timestamp timestamptz NOT NULL,
  session_id text NOT NULL,
  user_pseudo_id text NOT NULL,
  page_path text NOT NULL,
  page_title text,
  referrer text,
  locale text,
  ga4_event_timestamp bigint,
  created_at timestamptz DEFAULT NOW()
);

-- Video events from GA4 video_* events  
CREATE TABLE IF NOT EXISTS analytics_video_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,           -- start/pause/progress/complete
  event_timestamp timestamptz NOT NULL,
  session_id text NOT NULL,
  user_pseudo_id text NOT NULL,
  video_id text NOT NULL,
  video_title text,
  gallery text,
  player text,
  locale text,
  current_time_seconds numeric,       -- from param current_time
  progress_percent int,               -- 10,20,...,100
  watch_time_seconds numeric,         -- custom metric
  ga4_event_timestamp bigint,
  created_at timestamptz DEFAULT NOW()
);

-- CTA clicks from GA4 cta_click events
CREATE TABLE IF NOT EXISTS analytics_cta_clicks (
  id bigserial PRIMARY KEY,
  event_timestamp timestamptz NOT NULL,
  session_id text NOT NULL,
  user_pseudo_id text NOT NULL,
  page_path text,
  cta_id text NOT NULL,
  locale text,
  ga4_event_timestamp bigint,
  created_at timestamptz DEFAULT NOW()
);

-- Sync metadata for tracking ETL runs
CREATE TABLE IF NOT EXISTS analytics_sync_runs (
  id bigserial PRIMARY KEY,
  sync_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  status text NOT NULL, -- running/completed/failed
  records_processed jsonb,
  errors_count int DEFAULT 0,
  error_details text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_pseudo_id ON analytics_sessions(user_pseudo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON analytics_sessions(first_seen_at);

CREATE INDEX IF NOT EXISTS idx_pageviews_session ON analytics_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON analytics_pageviews(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_pageviews_page_path ON analytics_pageviews(page_path);

CREATE INDEX IF NOT EXISTS idx_video_events_video ON analytics_video_events(video_id, progress_percent);
CREATE INDEX IF NOT EXISTS idx_video_events_session ON analytics_video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_timestamp ON analytics_video_events(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_cta_clicks_cta ON analytics_cta_clicks(cta_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_session ON analytics_cta_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_timestamp ON analytics_cta_clicks(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_sync_runs_date ON analytics_sync_runs(sync_date);