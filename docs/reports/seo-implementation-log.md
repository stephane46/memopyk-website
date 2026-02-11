# SEO Service Implementation Log

**Date:** 2026-02-11
**Files modified:** `server/services/seo.service.ts`
**Files NOT modified:** `server/routes/seo.routes.ts` (routes already correct)

## DB Schema

### seo_settings (36 columns)
Key columns: `id` (uuid PK), `page` (text, e.g. "homepage"), bilingual pairs (`meta_title_en`/`meta_title_fr`, `og_title_en`/`og_title_fr`, etc.), shared columns (`canonical_url`, `robots_index`, `og_image_url`, `twitter_card`), JSONB columns (`json_ld`, `custom_meta_tags`, `structured_data`).

No `lang` column -- both languages stored in one row via `_en`/`_fr` suffixed columns.

### seo_audit_logs (9 columns)
`id` (serial PK), `page_id` (text, references seo_settings.id), `action`, `field`, `old_value`, `new_value`, `admin_user`, `change_reason`, `created_at`.

No `lang` column -- we filter by `page_id` matching the canonical homepage row.

### seo_global_settings (14 columns)
Global config (robots.txt, sitemap, GA ID, etc). Not used by the admin SEO panel -- it manages per-page settings.

## Schema Mismatch and Resolution

**Problem:** The admin UI works with one language at a time (`?lang=fr-FR`), sending/expecting flat fields (`title`, `description`). The DB stores both languages in one row with `_en`/`_fr` column suffixes.

**Solution:** The service layer maps between the two:
- `getSeoSettings(lang)` reads the row and extracts the correct `_en`/`_fr` fields based on lang
- `saveSeoSettings(data)` writes only the columns matching the current lang suffix, leaving the other language untouched
- `hreflang` and `extras` arrays stored in the `custom_meta_tags` JSONB column

## What Each Function Does (After Rewrite)

### getSeoSettings(lang)
- Queries `seo_settings` for `page='homepage'`, ordered by `updated_at DESC`, LIMIT 1
- Maps the DB row to the UI shape using `rowToUiShape()`: extracts lang-specific fields (`metaTitleEn`/`metaTitleFr` -> `title`), builds nested `openGraph` and `twitter` objects
- Returns null if no row exists

### saveSeoSettings(data, adminUser, changeReason)
- Extracts lang from data, determines column suffix (`En`/`Fr`)
- Builds update payload mapping UI fields to DB columns (e.g., `data.title` -> `metaTitleFr`)
- Only updates columns for the current language -- other language data preserved
- Stores `hreflang` and `extras` in `custom_meta_tags` JSONB
- Parses `jsonLd` string into JSONB
- Upserts: updates existing row or inserts new one
- Inserts audit log entry with action='save'

### generateHeadPreview(lang)
- Fetches settings via `getSeoSettings(lang)`
- Builds real HTML string with: `<title>`, meta description, keywords, robots, canonical, OG tags, Twitter cards, hreflang links, JSON-LD script, extra meta tags
- Skips tags with empty values
- HTML-escapes all attribute values
- Returns the HTML string (not wrapped in `<head>`)

### getSeoHistory(lang)
- Gets the canonical homepage row ID
- Queries `seo_audit_logs` filtered by that `page_id`, ordered by `created_at DESC`, LIMIT 50
- Returns entries with computed `version` numbers (newest = highest)

### createBackup(data, adminUser)
- Records a publish event in `seo_audit_logs` with action='publish'
- Used by the publish route to log when settings are published

## Data Note

The DB has ~34K duplicate "homepage" rows (all `is_active=false`). The service handles this by always using `ORDER BY updated_at DESC LIMIT 1` to get the most recently updated canonical row (id: `42e1a653-...`). The duplicates are harmless but could be cleaned up in a future maintenance task.
