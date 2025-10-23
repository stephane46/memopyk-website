# MEMOPYK - Supabase Setup Reference

## Overview

MEMOPYK uses a hybrid architecture combining Supabase PostgreSQL as the primary database with local JSON file fallback for resilience. The system leverages Supabase for both database operations and media storage (videos and images).

## Environment Configuration

### Required Environment Variables

```bash
# Primary Database Connection
DATABASE_URL=postgresql://[username]:[password]@[host]:[port]/[database]

# Supabase Configuration
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]

# Optional - Only if using SSH tunneling (not recommended for production)
SSH_PASSWORD=[password]
SSH_PRIVATE_KEY=[private-key-content]
```

### Supabase Client Initialization

The Supabase client is initialized in multiple locations:
- `server/routes.ts` (line 50): Main API operations
- `server/hybrid-storage.ts` (line 156): Hybrid storage system
- Various sync scripts: For data migration and synchronization

```typescript
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

## Database Schema

### Core Tables

#### 1. **users** - Admin Authentication
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL
);
```

#### 2. **hero_videos** - Bilingual Hero Video Management
```sql
CREATE TABLE hero_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  url_en TEXT NOT NULL,
  url_fr TEXT NOT NULL,
  use_same_video BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **hero_text_settings** - Responsive Text Overlay Management
```sql
CREATE TABLE hero_text_settings (
  id VARCHAR PRIMARY KEY,
  title_fr VARCHAR NOT NULL,
  title_en VARCHAR NOT NULL,
  title_mobile_fr VARCHAR,
  title_mobile_en VARCHAR,
  title_desktop_fr VARCHAR,
  title_desktop_en VARCHAR,
  subtitle_fr VARCHAR,
  subtitle_en VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT false,
  font_size INTEGER DEFAULT 60, -- Legacy field
  font_size_desktop INTEGER DEFAULT 60,
  font_size_tablet INTEGER DEFAULT 45,
  font_size_mobile INTEGER DEFAULT 32,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. **gallery_items** - Comprehensive Gallery Management
```sql
CREATE TABLE gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Core Display Fields
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  price_en TEXT, -- "USD 145"
  price_fr TEXT, -- "145 USD"
  
  -- Gallery Card Content
  source_en TEXT, -- "80 photos & 10 videos"
  source_fr TEXT, -- "80 photos et 10 vidéos"
  duration_en TEXT, -- "2 minutes"
  duration_fr TEXT, -- "2 minutes"
  situation_en TEXT, -- Client description (up to 5 lines)
  situation_fr TEXT, -- Client description (up to 5 lines)
  story_en TEXT, -- Story description (up to 5 lines)
  story_fr TEXT, -- Story description (up to 5 lines)
  
  -- Sorry Messages
  sorry_message_en TEXT,
  sorry_message_fr TEXT,
  
  -- Format Badge Marketing
  format_platform_en TEXT, -- "Social Media", "Professional"
  format_platform_fr TEXT, -- "Réseaux Sociaux", "Professionnel"
  format_type_en TEXT, -- "Mobile Stories", "TV & Desktop"
  format_type_fr TEXT, -- "Stories Mobiles", "TV & Bureau"
  
  -- Media Fields
  video_url_en TEXT,
  video_url_fr TEXT,
  video_filename TEXT, -- Unified filename for memopyk-videos bucket
  use_same_video BOOLEAN DEFAULT true,
  video_width INTEGER,
  video_height INTEGER,
  video_orientation TEXT, -- "portrait" or "landscape"
  
  -- Image Fields
  image_url_en TEXT,
  image_url_fr TEXT,
  static_image_url_en TEXT, -- 300x200 cropped JPEG for English
  static_image_url_fr TEXT, -- 300x200 cropped JPEG for French
  static_image_url TEXT, -- DEPRECATED: Legacy field
  crop_settings JSONB, -- Crop position settings for re-editing
  
  -- System Fields
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. **faq_sections** - FAQ Organization
```sql
CREATE TABLE faq_sections (
  id VARCHAR PRIMARY KEY,
  key VARCHAR NOT NULL,
  name_en VARCHAR NOT NULL,
  name_fr VARCHAR NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. **faqs** - Bilingual FAQ Content
```sql
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name_en TEXT NOT NULL,
  section_name_fr TEXT NOT NULL,
  section_order INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  question_en TEXT NOT NULL,
  question_fr TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  answer_fr TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  section_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. **contacts** - Lead Management
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  package TEXT,
  preferred_contact TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. **legal_documents** - Terms, Privacy, etc.
```sql
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_fr TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 9. **cta_settings** - Call-to-Action Configuration
```sql
CREATE TABLE cta_settings (
  id VARCHAR PRIMARY KEY,
  button_text_fr VARCHAR NOT NULL,
  button_text_en VARCHAR NOT NULL,
  button_url_en VARCHAR NOT NULL,
  button_url_fr VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 10. **why_memopyk_cards** - Benefit Cards
```sql
CREATE TABLE why_memopyk_cards (
  id VARCHAR PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  icon_name VARCHAR NOT NULL, -- lucide icon name
  gradient VARCHAR NOT NULL, -- tailwind gradient classes
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### SEO Management Tables

#### 11. **seo_settings** - Comprehensive SEO Management
```sql
CREATE TABLE seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  url_slug_en TEXT,
  url_slug_fr TEXT,
  meta_title_en TEXT,
  meta_title_fr TEXT,
  meta_description_en TEXT,
  meta_description_fr TEXT,
  meta_keywords_en TEXT, -- Comma-separated
  meta_keywords_fr TEXT, -- Comma-separated
  og_title_en TEXT,
  og_title_fr TEXT,
  og_description_en TEXT,
  og_description_fr TEXT,
  og_image_url TEXT,
  og_type TEXT DEFAULT 'website',
  twitter_card TEXT DEFAULT 'summary_large_image',
  twitter_title_en TEXT,
  twitter_title_fr TEXT,
  twitter_description_en TEXT,
  twitter_description_fr TEXT,
  twitter_image_url TEXT,
  canonical_url TEXT,
  robots_index BOOLEAN DEFAULT true,
  robots_follow BOOLEAN DEFAULT true,
  robots_noarchive BOOLEAN DEFAULT false,
  robots_nosnippet BOOLEAN DEFAULT false,
  custom_meta_tags JSONB,
  structured_data JSONB,
  seo_score INTEGER DEFAULT 0, -- 0-100
  priority DECIMAL DEFAULT 0.5, -- Sitemap priority 0.0-1.0
  change_freq TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  json_ld JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 12. **seo_redirects** - 301/302 Redirect Management
```sql
CREATE TABLE seo_redirects (
  id SERIAL PRIMARY KEY,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  redirect_type INTEGER DEFAULT 301, -- 301 permanent, 302 temporary
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  hit_count INTEGER DEFAULT 0,
  last_hit TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 13. **seo_audit_logs** - SEO Change Tracking
```sql
CREATE TABLE seo_audit_logs (
  id SERIAL PRIMARY KEY,
  page_id TEXT, -- References seo_settings.id
  action TEXT NOT NULL, -- "created", "updated", "deleted"
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  admin_user TEXT,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 14. **seo_image_meta** - Image SEO Management
```sql
CREATE TABLE seo_image_meta (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  alt_text_en TEXT,
  alt_text_fr TEXT,
  title_en TEXT,
  title_fr TEXT,
  caption TEXT,
  is_lazy_loaded BOOLEAN DEFAULT true,
  compression_level INTEGER DEFAULT 80, -- 1-100
  width INTEGER,
  height INTEGER,
  file_size INTEGER, -- In bytes
  format TEXT, -- jpg, png, webp, etc.
  seo_friendly_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 15. **seo_global_settings** - Global SEO Configuration
```sql
CREATE TABLE seo_global_settings (
  id SERIAL PRIMARY KEY,
  robots_txt TEXT,
  sitemap_enabled BOOLEAN DEFAULT true,
  sitemap_frequency TEXT DEFAULT 'daily',
  default_meta_title TEXT,
  default_meta_description TEXT,
  default_og_image TEXT,
  google_analytics_id TEXT,
  google_search_console_code TEXT,
  bing_webmaster_code TEXT,
  facebook_pixel_id TEXT,
  is_maintenance_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Analytics Tables

#### 16. **analytics_sessions** - Session Tracking
```sql
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  language TEXT,
  country TEXT,
  country_iso2 TEXT, -- ISO2 country code (FR, US, CA)
  country_iso3 TEXT, -- ISO3 country code (FRA, USA, CAN)
  city TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER, -- in seconds
  page_views INTEGER DEFAULT 0,
  is_bot BOOLEAN DEFAULT false,
  is_test_data BOOLEAN DEFAULT false
);
```

#### 17. **analytics_views** - Video View Tracking
```sql
CREATE TABLE analytics_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT,
  view_duration INTEGER, -- in seconds
  completion_percentage NUMERIC,
  watched_to_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  is_test_data BOOLEAN DEFAULT false
);
```

#### 18. **realtime_visitors** - Real-time Activity
```sql
CREATE TABLE realtime_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  ip_address TEXT,
  current_page TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  is_test_data BOOLEAN DEFAULT false
);
```

#### 19. **performance_metrics** - Performance Monitoring
```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'page_load', 'video_load', 'api_response', 'server_health'
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT, -- 'ms', 'mb', 'percent', 'count'
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  is_test_data BOOLEAN DEFAULT false
);
```

#### 20. **engagement_heatmap** - User Interaction Tracking
```sql
CREATE TABLE engagement_heatmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  element_id TEXT, -- CSS selector or element ID
  event_type TEXT NOT NULL, -- 'click', 'hover', 'scroll', 'focus'
  x_position INTEGER,
  y_position INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  duration INTEGER, -- for hover/focus events
  is_test_data BOOLEAN DEFAULT false
);
```

#### 21. **conversion_funnel** - Conversion Tracking
```sql
CREATE TABLE conversion_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  funnel_step TEXT NOT NULL, -- 'visit_home', 'view_gallery', 'view_video', 'contact_form', 'form_submit'
  step_order INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

### System Tables

#### 22. **deployment_history** - Deployment Tracking
```sql
CREATE TABLE deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration INTEGER,
  logs TEXT,
  host TEXT,
  domain TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 23. **country_names** - Localization Support
```sql
CREATE TABLE country_names (
  iso3 VARCHAR(3) PRIMARY KEY,
  display_name TEXT, -- Legacy field
  display_name_en TEXT,
  display_name_fr TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Storage Architecture

### Hybrid Storage System

MEMOPYK implements a sophisticated hybrid storage system combining:

1. **Primary Database**: Supabase PostgreSQL for reliable, scalable data storage
2. **JSON Fallback**: Local JSON files in `server/data/` for system resilience
3. **Media Storage**: Supabase Storage for videos and images

### Storage Operations Flow

```typescript
// Write Operation Flow
1. Attempt to write to Supabase database
2. If successful: Sync to local JSON file
3. If failed: Write only to JSON file (fallback mode)

// Read Operation Flow
1. Attempt to read from Supabase database
2. If successful: Return database data
3. If failed: Return data from JSON fallback files
```

### Media Storage

**Supabase Storage Buckets:**
- `memopyk-videos`: Unified bucket for all media (videos, images, thumbnails)

**Upload Methods:**
1. **Direct Upload**: Client generates signed URL and uploads directly to Supabase
2. **Server-side Fallback**: If direct upload fails, server handles the upload

**Storage URLs:**
- Public URL format: `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/{filename}`
- CDN optimized for global content delivery

## Key Configuration Files

### Database Configuration
- `drizzle.config.ts`: Drizzle ORM configuration
- `shared/schema.ts`: Complete database schema definitions
- `server/db.ts`: Database connection management

### Storage Configuration
- `server/storage.ts`: Storage interface definitions
- `server/hybrid-storage.ts`: Hybrid storage implementation
- `server/data/`: JSON fallback files directory

### Environment Setup
- `DATABASE_URL`: Direct PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Server-side service role key

## Migration Management

**Important**: Never manually write SQL migrations for this project.

### Safe Migration Process
1. Update schema in `shared/schema.ts`
2. Run `npm run db:push` to sync changes
3. If data loss warning appears, use `npm run db:push --force`
4. Drizzle handles schema synchronization automatically

### ID Column Safety Rules
- **NEVER** change existing primary key types (serial ↔ varchar/uuid)
- Preserve existing ID patterns to avoid destructive migrations
- Check current database schema before making changes

## Bilingual Architecture

### Language Support Pattern
All content tables follow a consistent bilingual pattern:
- `*_en` fields for English content
- `*_fr` fields for French content
- `use_same_*` flags for unified content when appropriate

### Examples
```sql
-- Hero Videos
title_en TEXT NOT NULL,    -- English title
title_fr TEXT NOT NULL,    -- French title
use_same_video BOOLEAN DEFAULT true  -- Use same video for both languages

-- SEO Settings
meta_title_en TEXT,        -- English meta title
meta_title_fr TEXT,        -- French meta title
```

## Security Considerations

### Database Access
- Service role key for server-side operations only
- Row Level Security (RLS) policies can be implemented
- IP filtering for analytics data

### Media Storage
- Signed URLs for secure uploads
- Public bucket for optimized CDN delivery
- File type validation and size limits

### Environment Variables
- Store sensitive keys in Replit Secrets
- Never commit credentials to version control
- Use service role keys, not anon keys for server operations

## Performance Optimizations

### Caching Strategy
- Hero videos: Immediate server-side caching for fast loading
- Gallery videos: Direct CDN streaming for reliability
- Analytics data: Persistent caching with 24-hour retention

### Database Indexing
Recommended indexes for optimal performance:
```sql
-- Gallery Items
CREATE INDEX idx_gallery_items_active ON gallery_items(is_active);
CREATE INDEX idx_gallery_items_order ON gallery_items(order_index);

-- Analytics Sessions
CREATE INDEX idx_analytics_sessions_created ON analytics_sessions(created_at);
CREATE INDEX idx_analytics_sessions_country ON analytics_sessions(country);

-- SEO Settings
CREATE INDEX idx_seo_settings_page ON seo_settings(page);
CREATE INDEX idx_seo_settings_active ON seo_settings(is_active);
```

## Monitoring and Maintenance

### Health Checks
- Database connectivity tests on startup
- Hybrid storage integrity validation
- Media storage accessibility verification

### Backup Strategy
- Supabase automatic backups (configurable retention)
- Local JSON files as immediate fallback
- Regular data export for critical content

### Analytics Data Management
- Automatic IP filtering for excluded addresses
- Test data flagging for development
- Performance metrics collection for optimization

## Hybrid Storage Architecture

### Overview

MEMOPYK employs a sophisticated hybrid storage pattern that ensures reliability and performance by combining Supabase PostgreSQL as the primary database with local JSON files as an automatic fallback system.

### Core Pattern

**Primary Source**: `this.supabase.from()` queries using Supabase JS client
**Fallback Source**: Local JSON files (`*.json`) for 7-day data resilience
**Real-time Sync**: JSON cache updated automatically on every write operation

### Implementation Details

#### 1. Data Flow Pattern
```typescript
// CORRECT PATTERN (used throughout codebase)
try {
  // 1. Always try Supabase first
  const { data, error } = await this.supabase
    .from('analytics_sessions')
    .select('*')
    .gte('created_at', dateFrom);
    
  if (data && !error) {
    return data; // Use fresh data from Supabase
  }
} catch (error) {
  console.warn('Supabase query failed, using JSON fallback:', error);
}

// 2. Automatic fallback to JSON cache
const sessions = this.loadJsonFile('analytics-sessions.json');
return sessions.filter(/* apply same filters */);
```

#### 2. Write Operations - Dual Update
```typescript
// Every write operation updates BOTH systems
try {
  // 1. Write to Supabase first
  const insertedSession = await this.supabase
    .from('analytics_sessions')
    .insert(sessionData);
    
  // 2. ALWAYS update JSON backup (regardless of Supabase success)
  const sessions = this.loadJsonFile('analytics-sessions.json');
  sessions.push(sessionForJson);
  this.saveJsonFile('analytics-sessions.json', sessions);
  
} catch (error) {
  // 3. Fallback: JSON-only operation
  const sessions = this.loadJsonFile('analytics-sessions.json');
  sessions.push(sessionData);
  this.saveJsonFile('analytics-sessions.json', sessions);
}
```

#### 3. JSON Fallback Files
- `analytics-sessions.json` - Session tracking data
- `hero-text.json` - Homepage text overlays  
- `why-memopyk-cards.json` - Feature cards
- `faq-sections.json` - FAQ content
- `seo-global-settings.json` - SEO configuration
- `conversion-funnel.json` - User journey tracking
- `performance-metrics.json` - Site performance data
- `realtime-visitors.json` - Live visitor data

### Anti-Patterns (AVOID)

#### ❌ Direct PostgreSQL Queries
```typescript
// BROKEN PATTERN - causes CONNECT_TIMEOUT errors
const result = await pool.unsafe(queryText, [...queryParams]);
```

**Why it fails**: Direct PostgreSQL connections bypass the hybrid system and timeout when connecting to remote Supabase VPS.

**Solution**: Always use `this.supabase.from()` queries instead.

### Analytics Endpoints Fix (v1.0.188)

#### Problem Identified
Several analytics endpoints were making direct PostgreSQL queries using `pool.unsafe()`, causing `CONNECT_TIMEOUT` errors when accessing the Supabase VPS database.

#### Endpoints Fixed
1. **`/api/analytics/geo`** - Geographic distribution data
2. **`/api/analytics/overview`** - Daily overview charts 
3. **Removed duplicate endpoints** - Eliminated conflicting implementations

#### Solution Applied
Replaced all direct PostgreSQL queries with the proven hybrid storage pattern:

```typescript
// BEFORE (broken)
const result = await pool.unsafe(`
  SELECT country, COUNT(*) as sessions 
  FROM analytics_sessions 
  WHERE created_at >= $1
`, [dateFrom]);

// AFTER (fixed)
const sessions = await hybridStorage.getAnalyticsSessions(dateFrom, dateTo);
const countryData = sessions.reduce((acc, session) => {
  // Process data in JavaScript instead of SQL
}, {});
```

### Benefits of Hybrid Storage

1. **Reliability**: Automatic fallback prevents service disruption
2. **Performance**: Local JSON reads are faster than database queries for small datasets
3. **Development**: Works offline and with unstable connections
4. **Consistency**: Same data format regardless of source
5. **Real-time Sync**: JSON cache stays current with database writes

### Best Practices

1. **Always use hybrid storage methods** from `server/hybrid-storage.ts`
2. **Never import direct database clients** in routes or components
3. **Test both data sources** to ensure consistency
4. **Monitor fallback usage** in production logs
5. **Keep JSON files under version control** for essential configuration data

---

*This reference document covers the complete Supabase setup for MEMOPYK. Keep this updated as the schema evolves.*