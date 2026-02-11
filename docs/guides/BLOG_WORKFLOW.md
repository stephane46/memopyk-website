# Blog Hub Workflow Guide

**Location:** Admin Panel → Blog Hub
**URL:** `/admin?tab=planner` (default tab)

---

## Overview

The Blog Hub is a 5-tab content production workflow for the MEMOPYK bilingual blog (EN/FR). Each tab represents a stage in the content pipeline:

| Step | Tab | URL param | Purpose |
|------|-----|-----------|---------|
| 1 | **Keywords** | `?tab=keywords` | SEO keyword research and tracking |
| 2 | **Planned Posts** | `?tab=topics` | Topic briefs with SEO data |
| 3 | **Planner** | `?tab=planner` | Calendar scheduling |
| 4 | **Posts** | `?tab=posts` | Writing, editing, publishing |
| 5 | **Image Bank** | `?tab=images` | Media asset library |

The Planner tab opens by default.

---

## Tab 1: Keywords

Research and manage SEO keywords (12,500+ FR+EN in database).

**Key features:**
- Filterable table: market (FR/US), tier (1-3), intent, competition, cluster, search volume
- Excel-style multi-select checkbox filters on all columns
- Quick Filter presets: Quick Wins, Traffic Drivers, Money Keywords, France Priority, Blog Ideas
- Sortable columns, paginated (100/page with background loading)
- CRUD: add, edit, delete keywords
- Clickable Topics/Posts counts navigate to filtered views

**Data fields:** keyword, monthly searches, competition (low/medium/high), intent (high/medium/low), tier (1-3), market (fr/en), cluster (25 topic clusters).

## Tab 2: Planned Posts (Topics)

Topic briefs — the planning layer between keywords and actual posts.

**Key features:**
- Grouped by category (Photo, Video, Family, Digital, Crafts, Seasonal)
- Each topic has: title, primary keyword, search volume, competition, intent, content angle, target word count
- Role system: pillar (main guide) vs. spoke (supporting article)
- CRUD: create, edit, delete topics
- "Create Post" action on each topic → generates a draft linked to the topic
- Filter by category, status, market

## Tab 3: Planner

Calendar-based content scheduling with two view modes.

**Key features:**
- 12-week scrollable calendar grid
- **Topics view:** drag/assign topics to dates
- **Posts view:** see published/scheduled posts on the calendar
- Click a date to assign a topic or create a post
- Navigate to post editor directly from calendar entries

## Tab 4: Posts

Post management — list, filter, and act on all blog posts.

**Key features:**
- Filter by status (draft/in review/published/archived) and language (EN/FR)
- Filter by linked topic or keyword
- One-click status changes from the list
- One-click AI translation (EN↔FR via Claude API)
- Tag management modal
- "New Post" button → CreatePostLanding choice screen

### Creating a Post

Two paths from the "New Post" button:

1. **Write from scratch** — creates a blank draft and opens the editor
2. **Generate with AI** — opens AI Creator with prompt template, generates 800-1000 word post from topic/keywords, then opens in editor for review

Posts can also be created from the Planned Posts tab ("Create Post" on a topic) or from the Planner calendar.

### Blog Editor

Full-featured post editor with:
- TinyMCE rich text editor (self-hosted)
- Title, slug (auto-generated), description
- Hero image upload (drag & drop or URL)
- Tag selector
- Status selector (draft → in review → published)
- Publication date picker
- Featured post toggle with ordering
- Translation assistant (AI-powered EN↔FR)
- Live preview

### Post Statuses

| Status | Visibility | Description |
|--------|------------|-------------|
| **Draft** | Admin only | Work in progress |
| **In Review** | Admin only | Ready for review before publishing |
| **Published** | Public | Live on site, `published_at` date set |
| **Archived** | Hidden | Removed from public view |

Status transitions: Draft → In Review → Published. Any status can be set to Archived. Publishing automatically sets the publication date.

## Tab 5: Image Bank

Centralized media library for blog images.

**Key features:**
- Upload images with metadata (alt text, category, labels)
- 7 categories matching blog topics (Photo, Video, Family, Digital, Crafts, Seasonal, General)
- Label system for cross-cutting tags
- Search and filter by category/label
- Images available in TinyMCE editor via built-in image picker

---

## Bilingual Content

- Each post has a single language (en-US or fr-FR)
- Translation creates a new linked post in the other language
- AI translation via Claude API available from the Posts list (one-click) or from within the editor (Translation Assistant)
- Translation drafts are prefixed with `[TRANSLATE TO ...]` until reviewed

---

## Related Components

| Component | File |
|-----------|------|
| Blog Hub shell | `client/src/components/admin/ContentProductionHub.tsx` |
| Keywords tab | `client/src/components/admin/ContentProductionKeywords.tsx` |
| Planned Posts tab | `client/src/components/admin/ContentProductionTopics.tsx` |
| Planner tab | `client/src/components/admin/ContentProductionPlanner.tsx` |
| Posts tab | `client/src/admin/BlogManagePosts.tsx` |
| Image Bank tab | `client/src/components/admin/ImageBankManager.tsx` |
| Post editor | `client/src/admin/BlogEditor.tsx` |
| AI post generator | `client/src/admin/BlogAICreator.tsx` |
| New post choice screen | `client/src/admin/CreatePostLanding.tsx` |
