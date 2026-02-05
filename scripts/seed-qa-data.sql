-- QA Seed Data for E2E Tests
-- Run this on the staging database to ensure tests have data to work with

-- ============================================================================
-- Part 1: Clean up old E2E test posts (safe to run anytime)
-- ============================================================================
DELETE FROM blog_posts WHERE title LIKE '[E2E]%';

-- ============================================================================
-- Part 2: Seed Image Bank with 5 test images
-- These use picsum.photos placeholder images (publicly accessible)
-- ============================================================================

-- First, clean up any existing seed images
DELETE FROM image_bank WHERE alt_text LIKE '[SEED]%';

-- Insert 5 seed images for QA testing
INSERT INTO image_bank (
  filename, original_filename, storage_path, public_url,
  file_size_bytes, width, height, mime_type,
  alt_text, caption, category, tags,
  source, license_type, credit_required,
  is_hero_suitable, is_body_suitable, uploaded_by, notes
) VALUES
-- Image 1: Family photo (hero suitable)
(
  'seed-family-1.jpg',
  'seed-family-1.jpg',
  'qa-seed/seed-family-1.jpg',
  'https://picsum.photos/seed/memopyk-family1/1200/800',
  150000, 1200, 800, 'image/jpeg',
  '[SEED] Family gathering placeholder',
  'A warm family gathering moment',
  'Family Storytelling & Traditions',
  ARRAY['qa-seed', 'family', 'gathering', 'memories'],
  'picsum.photos',
  'Free',
  false,
  true,
  true,
  'claude-qa',
  'QA seed image for E2E testing - do not delete'
),
-- Image 2: Memories/nostalgia photo (hero suitable)
(
  'seed-memories-1.jpg',
  'seed-memories-1.jpg',
  'qa-seed/seed-memories-1.jpg',
  'https://picsum.photos/seed/memopyk-memories1/1200/800',
  145000, 1200, 800, 'image/jpeg',
  '[SEED] Vintage memories placeholder',
  'Nostalgic photo album moment',
  'Video Memory & Legacy',
  ARRAY['qa-seed', 'memories', 'vintage', 'nostalgia'],
  'picsum.photos',
  'Free',
  false,
  true,
  true,
  'claude-qa',
  'QA seed image for E2E testing - do not delete'
),
-- Image 3: Equipment/camera photo (body suitable only)
(
  'seed-equipment-1.jpg',
  'seed-equipment-1.jpg',
  'qa-seed/seed-equipment-1.jpg',
  'https://picsum.photos/seed/memopyk-equipment1/800/600',
  95000, 800, 600, 'image/jpeg',
  '[SEED] Camera equipment placeholder',
  'Professional camera setup',
  'Digital Organization & Technology',
  ARRAY['qa-seed', 'equipment', 'camera', 'photography'],
  'picsum.photos',
  'Free',
  false,
  false,
  true,
  'claude-qa',
  'QA seed image for E2E testing - do not delete'
),
-- Image 4: Event photo (hero suitable)
(
  'seed-event-1.jpg',
  'seed-event-1.jpg',
  'qa-seed/seed-event-1.jpg',
  'https://picsum.photos/seed/memopyk-event1/1200/800',
  160000, 1200, 800, 'image/jpeg',
  '[SEED] Celebration event placeholder',
  'Birthday celebration with family',
  'Seasonal & Holiday Content',
  ARRAY['qa-seed', 'events', 'celebration', 'birthday'],
  'picsum.photos',
  'Free',
  false,
  true,
  true,
  'claude-qa',
  'QA seed image for E2E testing - do not delete'
),
-- Image 5: Family portrait (hero suitable)
(
  'seed-family-2.jpg',
  'seed-family-2.jpg',
  'qa-seed/seed-family-2.jpg',
  'https://picsum.photos/seed/memopyk-family2/1200/800',
  155000, 1200, 800, 'image/jpeg',
  '[SEED] Family portrait placeholder',
  'Beautiful family portrait',
  'Photo Organization & Preservation',
  ARRAY['qa-seed', 'family', 'portrait', 'love'],
  'picsum.photos',
  'Free',
  false,
  true,
  true,
  'claude-qa',
  'QA seed image for E2E testing - do not delete'
);

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Verify seed images were inserted
SELECT id, filename, alt_text, category, is_hero_suitable
FROM image_bank
WHERE alt_text LIKE '[SEED]%'
ORDER BY created_at DESC;

-- Count total images in bank
SELECT COUNT(*) as total_images FROM image_bank;

-- Verify no E2E posts remain
SELECT COUNT(*) as e2e_posts FROM blog_posts WHERE title LIKE '[E2E]%';
