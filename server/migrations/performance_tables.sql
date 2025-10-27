-- MEMOPYK Performance Metrics Database Schema
-- Run this in Supabase SQL Editor to create performance tracking tables
-- Date: October 27, 2025

-- Table 1: Performance Metrics
-- Stores Core Web Vitals and page load metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  page_name VARCHAR(255),
  page_path VARCHAR(500),
  
  -- Core Web Vitals
  lcp_value DECIMAL(10, 2),
  lcp_rating VARCHAR(20),
  cls_value DECIMAL(10, 3),
  cls_rating VARCHAR(20),
  inp_value DECIMAL(10, 2),
  inp_rating VARCHAR(20),
  fid_value DECIMAL(10, 2),
  fid_rating VARCHAR(20),
  
  -- Page Load Times (all in milliseconds)
  dns_time INTEGER,
  tcp_time INTEGER,
  ttfb INTEGER,
  dom_interactive INTEGER,
  dom_complete INTEGER,
  page_load_time INTEGER,
  resource_count INTEGER,
  transfer_size INTEGER,
  
  -- Lighthouse Scores (0-100, for future integration)
  performance_score DECIMAL(5, 2),
  accessibility_score DECIMAL(5, 2),
  best_practices_score DECIMAL(5, 2),
  seo_score DECIMAL(5, 2),
  pwa_score DECIMAL(5, 2),
  
  -- User Environment Metadata
  device_type VARCHAR(50),
  browser_name VARCHAR(100),
  connection_type VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_name ON performance_metrics(page_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_path ON performance_metrics(page_path);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_device_type ON performance_metrics(device_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_lcp ON performance_metrics(lcp_value) WHERE lcp_value IS NOT NULL;

-- Table 2: Performance Daily Summary
-- Pre-aggregated daily performance metrics
CREATE TABLE IF NOT EXISTS performance_daily_summary (
  id BIGSERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  
  -- Average Core Web Vitals
  avg_lcp DECIMAL(10, 2),
  avg_cls DECIMAL(10, 3),
  avg_inp DECIMAL(10, 2),
  avg_fid DECIMAL(10, 2),
  
  -- Average Page Load Metrics
  avg_ttfb INTEGER,
  avg_dom_complete INTEGER,
  avg_page_load_time INTEGER,
  avg_resource_count INTEGER,
  
  -- Lighthouse Scores (averages)
  avg_performance_score DECIMAL(5, 2),
  avg_accessibility_score DECIMAL(5, 2),
  avg_seo_score DECIMAL(5, 2),
  
  -- Counts
  pages_tested INTEGER DEFAULT 0,
  measurements_count INTEGER DEFAULT 0,
  
  -- Performance Ratings Breakdown
  lcp_good_count INTEGER DEFAULT 0,
  lcp_needs_improvement_count INTEGER DEFAULT 0,
  lcp_poor_count INTEGER DEFAULT 0,
  cls_good_count INTEGER DEFAULT 0,
  cls_needs_improvement_count INTEGER DEFAULT 0,
  cls_poor_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance_daily_summary
CREATE INDEX IF NOT EXISTS idx_performance_daily_summary_date ON performance_daily_summary(summary_date);

-- Add update trigger for updated_at timestamps
CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_daily_summary_updated_at BEFORE UPDATE ON performance_daily_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update performance daily summary
CREATE OR REPLACE FUNCTION update_daily_performance(p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO performance_daily_summary (
    summary_date,
    avg_lcp,
    avg_cls,
    avg_inp,
    avg_fid,
    avg_ttfb,
    avg_dom_complete,
    avg_page_load_time,
    avg_resource_count,
    avg_performance_score,
    pages_tested,
    measurements_count,
    lcp_good_count,
    lcp_needs_improvement_count,
    lcp_poor_count,
    cls_good_count,
    cls_needs_improvement_count,
    cls_poor_count
  )
  SELECT 
    p_date,
    ROUND(AVG(lcp_value), 2) as avg_lcp,
    ROUND(AVG(cls_value), 3) as avg_cls,
    ROUND(AVG(inp_value), 2) as avg_inp,
    ROUND(AVG(fid_value), 2) as avg_fid,
    ROUND(AVG(ttfb)) as avg_ttfb,
    ROUND(AVG(dom_complete)) as avg_dom_complete,
    ROUND(AVG(page_load_time)) as avg_page_load_time,
    ROUND(AVG(resource_count)) as avg_resource_count,
    ROUND(AVG(performance_score), 2) as avg_performance_score,
    COUNT(DISTINCT page_path) as pages_tested,
    COUNT(*) as measurements_count,
    COUNT(CASE WHEN lcp_rating = 'good' THEN 1 END) as lcp_good_count,
    COUNT(CASE WHEN lcp_rating = 'needs-improvement' THEN 1 END) as lcp_needs_improvement_count,
    COUNT(CASE WHEN lcp_rating = 'poor' THEN 1 END) as lcp_poor_count,
    COUNT(CASE WHEN cls_rating = 'good' THEN 1 END) as cls_good_count,
    COUNT(CASE WHEN cls_rating = 'needs-improvement' THEN 1 END) as cls_needs_improvement_count,
    COUNT(CASE WHEN cls_rating = 'poor' THEN 1 END) as cls_poor_count
  FROM performance_metrics
  WHERE DATE(created_at) = p_date
  ON CONFLICT (summary_date) 
  DO UPDATE SET
    avg_lcp = EXCLUDED.avg_lcp,
    avg_cls = EXCLUDED.avg_cls,
    avg_inp = EXCLUDED.avg_inp,
    avg_fid = EXCLUDED.avg_fid,
    avg_ttfb = EXCLUDED.avg_ttfb,
    avg_dom_complete = EXCLUDED.avg_dom_complete,
    avg_page_load_time = EXCLUDED.avg_page_load_time,
    avg_resource_count = EXCLUDED.avg_resource_count,
    avg_performance_score = EXCLUDED.avg_performance_score,
    pages_tested = EXCLUDED.pages_tested,
    measurements_count = EXCLUDED.measurements_count,
    lcp_good_count = EXCLUDED.lcp_good_count,
    lcp_needs_improvement_count = EXCLUDED.lcp_needs_improvement_count,
    lcp_poor_count = EXCLUDED.lcp_poor_count,
    cls_good_count = EXCLUDED.cls_good_count,
    cls_needs_improvement_count = EXCLUDED.cls_needs_improvement_count,
    cls_poor_count = EXCLUDED.cls_poor_count,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Performance metrics tables created successfully!';
  RAISE NOTICE 'Tables: performance_metrics, performance_daily_summary';
  RAISE NOTICE 'Run SELECT update_daily_performance(CURRENT_DATE) to populate daily summary';
END $$;
