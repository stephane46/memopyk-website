-- Help System Tables Migration
-- Run this SQL against Supabase PostgreSQL
-- Date: 2026-02-02

-- Help Screens table - contextual help for each admin screen
CREATE TABLE IF NOT EXISTS help_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255),
  tags TEXT[],
  related_flow_ids UUID[]
);

-- Help Flows table - step-by-step guides across screens
CREATE TABLE IF NOT EXISTS help_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  steps_json JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- Index for faster route lookups
CREATE INDEX IF NOT EXISTS idx_help_screens_route ON help_screens(route);

-- Grant permissions (adjust if needed for your Supabase setup)
-- GRANT ALL ON help_screens TO authenticated;
-- GRANT ALL ON help_flows TO authenticated;
