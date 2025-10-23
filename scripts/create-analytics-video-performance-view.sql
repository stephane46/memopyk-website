-- Analytics Video Performance View
-- Comprehensive video engagement tracking with percent & time milestones

-- Drop existing view if it exists
DROP VIEW IF EXISTS analytics_video_performance;

-- Create comprehensive video performance view
CREATE OR REPLACE VIEW analytics_video_performance AS
WITH per_viewer AS (
  SELECT
    video_id,
    any_value(video_title) as video_title,
    user_pseudo_id,
    MAX(COALESCE(progress_percent, 0)) as max_pct,
    MAX(COALESCE(watch_time_seconds, 0)) as max_sec
  FROM analytics_video_events
  WHERE video_id IS NOT NULL
    AND video_id != ''
  GROUP BY video_id, user_pseudo_id
),

starts AS (
  SELECT
    video_id,
    COUNT(DISTINCT user_pseudo_id) as starts
  FROM analytics_video_events
  WHERE event_name IN ('video_start', 'video_progress', 'video_complete', 'video_pause')
    AND video_id IS NOT NULL
    AND video_id != ''
  GROUP BY video_id
),

agg AS (
  SELECT
    p.video_id,
    ANY_VALUE(p.video_title) as video_title,
    COUNT(*) as unique_viewers,
    AVG(p.max_sec) as avg_watch_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.max_sec) as median_watch_time,

    -- Percent milestones every 10%
    COUNT(*) FILTER (WHERE p.max_pct >= 0)   as pct_0,
    COUNT(*) FILTER (WHERE p.max_pct >= 10)  as pct_10,
    COUNT(*) FILTER (WHERE p.max_pct >= 20)  as pct_20,
    COUNT(*) FILTER (WHERE p.max_pct >= 30)  as pct_30,
    COUNT(*) FILTER (WHERE p.max_pct >= 40)  as pct_40,
    COUNT(*) FILTER (WHERE p.max_pct >= 50)  as pct_50,
    COUNT(*) FILTER (WHERE p.max_pct >= 60)  as pct_60,
    COUNT(*) FILTER (WHERE p.max_pct >= 70)  as pct_70,
    COUNT(*) FILTER (WHERE p.max_pct >= 80)  as pct_80,
    COUNT(*) FILTER (WHERE p.max_pct >= 90)  as pct_90,
    COUNT(*) FILTER (WHERE p.max_pct >= 100) as pct_100,

    -- Completion (≥90%)
    COUNT(*) FILTER (WHERE p.max_pct >= 90) as completed_90,

    -- Time milestones (adjust upper bound for longest video)
    COUNT(*) FILTER (WHERE p.max_sec >= 60)  as sec_60,
    COUNT(*) FILTER (WHERE p.max_sec >= 120) as sec_120,
    COUNT(*) FILTER (WHERE p.max_sec >= 180) as sec_180,
    COUNT(*) FILTER (WHERE p.max_sec >= 240) as sec_240,
    COUNT(*) FILTER (WHERE p.max_sec >= 300) as sec_300
  FROM per_viewer p
  GROUP BY p.video_id
)

SELECT
  a.video_id,
  a.video_title,
  s.starts,
  a.completed_90,
  a.avg_watch_time,
  a.median_watch_time,
  a.pct_0, a.pct_10, a.pct_20, a.pct_30, a.pct_40,
  a.pct_50, a.pct_60, a.pct_70, a.pct_80, a.pct_90, a.pct_100,
  a.sec_60, a.sec_120, a.sec_180, a.sec_240, a.sec_300
FROM agg a
LEFT JOIN starts s USING (video_id)
ORDER BY s.starts DESC, a.video_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_video_events_video_id 
ON analytics_video_events(video_id) 
WHERE video_id IS NOT NULL AND video_id != '';

CREATE INDEX IF NOT EXISTS idx_analytics_video_events_user_progress 
ON analytics_video_events(user_pseudo_id, video_id, progress_percent) 
WHERE video_id IS NOT NULL AND video_id != '';

CREATE INDEX IF NOT EXISTS idx_analytics_video_events_event_name 
ON analytics_video_events(event_name) 
WHERE event_name IN ('video_start', 'video_progress', 'video_complete', 'video_pause');

-- Grant permissions
GRANT SELECT ON analytics_video_performance TO PUBLIC;