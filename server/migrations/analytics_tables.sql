-- MEMOPYK Analytics Database Schema
-- Run this in Supabase SQL Editor to create analytics tables
-- Date: October 27, 2025

-- Table 1: Analytics Events
-- Stores all user events with conversion tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_value DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  page_name VARCHAR(255),
  page_path VARCHAR(500),
  page_title VARCHAR(500),
  form_name VARCHAR(100),
  form_type VARCHAR(100),
  form_language VARCHAR(10),
  share_platform VARCHAR(50),
  scroll_percent INTEGER,
  video_title VARCHAR(255),
  video_index INTEGER,
  gallery_item_title VARCHAR(255),
  item_index INTEGER,
  partner_country VARCHAR(100),
  services_selected TEXT[],
  action VARCHAR(100),
  page_location VARCHAR(255),
  cta_id VARCHAR(100),
  package VARCHAR(100),
  language VARCHAR(10),
  user_language VARCHAR(10),
  user_timezone VARCHAR(50),
  user_market_segment VARCHAR(100),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_value ON analytics_events(event_value) WHERE event_value IS NOT NULL;

-- Table 2: Analytics Conversions
-- Aggregated conversion tracking for business metrics
CREATE TABLE IF NOT EXISTS analytics_conversions (
  id BIGSERIAL PRIMARY KEY,
  conversion_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  event_id UUID REFERENCES analytics_events(event_id) ON DELETE CASCADE,
  conversion_type VARCHAR(100) NOT NULL,
  conversion_value DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  page_name VARCHAR(255),
  page_path VARCHAR(500),
  conversion_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics_conversions
CREATE INDEX IF NOT EXISTS idx_analytics_conversions_conversion_type ON analytics_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_analytics_conversions_conversion_date ON analytics_conversions(conversion_date);
CREATE INDEX IF NOT EXISTS idx_analytics_conversions_user_id ON analytics_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_conversions_session_id ON analytics_conversions(session_id);

-- Table 3: Analytics Daily Summary
-- Pre-aggregated daily metrics for dashboard performance
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id BIGSERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_events BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_conversion_value DECIMAL(15, 2) DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  unique_sessions BIGINT DEFAULT 0,
  page_views BIGINT DEFAULT 0,
  form_submissions BIGINT DEFAULT 0,
  video_interactions BIGINT DEFAULT 0,
  avg_scroll_depth DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics_daily_summary
CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_date ON analytics_daily_summary(summary_date);

-- Add update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analytics_events_updated_at BEFORE UPDATE ON analytics_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_conversions_updated_at BEFORE UPDATE ON analytics_conversions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_daily_summary_updated_at BEFORE UPDATE ON analytics_daily_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update daily summary (can be run as cron job)
CREATE OR REPLACE FUNCTION update_daily_analytics(p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_daily_summary (
    summary_date,
    total_events,
    total_conversions,
    total_conversion_value,
    unique_users,
    unique_sessions,
    page_views,
    form_submissions,
    video_interactions,
    avg_scroll_depth
  )
  SELECT 
    p_date,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_value > 0 THEN 1 END) as total_conversions,
    COALESCE(SUM(event_value), 0) as total_conversion_value,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN event_name = 'form_submit' THEN 1 END) as form_submissions,
    COUNT(CASE WHEN event_name = 'video_interaction' THEN 1 END) as video_interactions,
    AVG(CASE WHEN event_name = 'scroll_engagement' THEN scroll_percent END) as avg_scroll_depth
  FROM analytics_events
  WHERE DATE(created_at) = p_date
  ON CONFLICT (summary_date) 
  DO UPDATE SET
    total_events = EXCLUDED.total_events,
    total_conversions = EXCLUDED.total_conversions,
    total_conversion_value = EXCLUDED.total_conversion_value,
    unique_users = EXCLUDED.unique_users,
    unique_sessions = EXCLUDED.unique_sessions,
    page_views = EXCLUDED.page_views,
    form_submissions = EXCLUDED.form_submissions,
    video_interactions = EXCLUDED.video_interactions,
    avg_scroll_depth = EXCLUDED.avg_scroll_depth,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your Supabase setup)
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analytics_conversions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics tables created successfully!';
  RAISE NOTICE 'Tables: analytics_events, analytics_conversions, analytics_daily_summary';
  RAISE NOTICE 'Run SELECT update_daily_analytics(CURRENT_DATE) to populate daily summary';
END $$;
