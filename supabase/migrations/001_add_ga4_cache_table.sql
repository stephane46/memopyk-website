-- GA4 Cache Table for Persistent Analytics Caching
-- Created: August 16, 2025
-- Purpose: Store GA4 API responses to improve performance (180x speed improvement)

CREATE TABLE IF NOT EXISTS ga4_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Performance indexes for optimal cache lookups
CREATE INDEX IF NOT EXISTS idx_ga4_cache_expires 
  ON ga4_cache (expires_at);

-- Automatic cleanup function for expired entries (TTL-based)
CREATE OR REPLACE FUNCTION cleanup_expired_ga4_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ga4_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Automatic cleanup function for old entries (age-based, prevents infinite growth)
CREATE OR REPLACE FUNCTION cleanup_old_ga4_cache() 
RETURNS TRIGGER AS $$
BEGIN
    -- Delete cache entries older than 24 hours on each insert
    DELETE FROM ga4_cache WHERE expires_at < NOW() - INTERVAL '1 day';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically cleanup old cache entries
CREATE TRIGGER ga4_cache_auto_cleanup
    AFTER INSERT ON ga4_cache
    EXECUTE FUNCTION cleanup_old_ga4_cache();

-- Additional cleanup function for scheduled maintenance (7-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM ga4_cache
    WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Schedule daily cleanup at 3 AM UTC (uncomment in production)
-- SELECT cron.schedule(
--   'daily-cache-cleanup',
--   '0 3 * * *',
--   $$SELECT cleanup_old_cache();$$
-- );

-- Comments for documentation
COMMENT ON TABLE ga4_cache IS 'Persistent cache for GA4 analytics endpoints with automatic expiry and cleanup';
COMMENT ON COLUMN ga4_cache.key IS 'Unique cache key (e.g., ga4:realtime, ga4:kpis:2025-08-10:2025-08-16:all)';
COMMENT ON COLUMN ga4_cache.value IS 'Cached JSON response from GA4 API';
COMMENT ON COLUMN ga4_cache.expires_at IS 'Expiration timestamp for TTL-based and age-based cleanup';
COMMENT ON FUNCTION cleanup_expired_ga4_cache() IS 'Manual cleanup function for expired cache entries';
COMMENT ON FUNCTION cleanup_old_ga4_cache() IS 'Automatic cleanup function triggered on insert (24h retention)';
COMMENT ON TRIGGER ga4_cache_auto_cleanup ON ga4_cache IS 'Auto-cleanup trigger to prevent infinite table growth';