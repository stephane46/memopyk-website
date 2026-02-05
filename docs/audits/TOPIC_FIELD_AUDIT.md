# Content Topics — Field Usage Audit

**Generated:** 2026-02-05
**Table:** `content_topics` (24 columns)

## Summary

| Category | Count | Fields |
|----------|-------|--------|
| **Active (displayed + logic)** | 17 | title, category, type, target_word_count, primary_keyword, secondary_keywords, priority, status, times_generated, last_generated_at, search_volume, competition, search_intent, content_angle, description, hero_image_concept, body_image_concepts |
| **Display-only** | 1 | memopyk_link_opportunities |
| **Form + Display (no logic)** | 1 | slug |
| **Schema-only (never used)** | 2 | selected_for_week, memopyk_links_placed |
| **Type definitions only** | 2 | created_at, updated_at |
| **Computed (not in table)** | 1 | post_count |

---

## Field-by-Field Analysis

### ✅ ACTIVE FIELDS (displayed + used in logic)

| Field | Display | Logic | Key Files |
|-------|---------|-------|-----------|
| `id` | Navigation links | FK relationships, CRUD operations | All topic components, blog-admin.routes.ts, content.routes.ts |
| `title` | Topics list, expanded view, Planner cards, BlogPostCreator | AI prompt template (`{{TOPIC}}`), search filtering | ContentProductionTopics.tsx, ContentProductionPlanner.tsx, BlogPostCreatorModal.tsx |
| `category` | Topics list badge, expanded detail, Planner cards, BlogPostCreator | Filter dropdown, category color coding | ContentProductionTopics.tsx:152, :469-470, ContentProductionPlanner.tsx:1041-1042 |
| `type` | Topics expanded detail, Planner cards | Filter dropdown | ContentProductionTopics.tsx:155, :521, ContentProductionPlanner.tsx:1051 |
| `target_word_count` | Topics list badge (`Xw`), expanded detail, Planner, BlogPostCreator | AI prompt (word count targets: min/max calculation) | BlogPostCreatorModal.tsx:128-136, ContentProductionTopics.tsx:479, :529 |
| `primary_keyword` | Topics list (keyword badge), expanded detail, Planner, BlogPostCreator, BlogManagePosts | AI prompt, search filtering, saved to blog_posts table | BlogPostCreatorModal.tsx:127, :256, ContentProductionTopics.tsx:150, :436, blog-admin.routes.ts:147 |
| `secondary_keywords` | Topics list (up to 3 badges), expanded detail, BlogPostCreator | AI prompt, search filtering, saved to blog_posts table | BlogPostCreatorModal.tsx:127, :257, ContentProductionTopics.tsx:151, :438-447, :536-544 |
| `priority` | Topics list badge (`P1-P5`), Planner cards | Filter dropdown, high priority count calculation | ContentProductionTopics.tsx:153, :161, :472-473, ContentProductionPlanner.tsx:1047-1048 |
| `status` | Topics list badge | Filter dropdown, synced with blog post status on create/update | ContentProductionTopics.tsx:154, :475-476, blog-admin.routes.ts:186, :623 |
| `times_generated` | Topics list badge (`Generated Xx`), expanded detail, DeleteDialog warning | Incremented on post creation, conditional display | blog-admin.routes.ts:186, ContentProductionTopics.tsx:451-458, :591, TopicDeleteDialog.tsx:84-89 |
| `last_generated_at` | Topics expanded detail | Updated on post creation | blog-admin.routes.ts:187, ContentProductionTopics.tsx:593-598 |
| `search_volume` | Topics expanded detail (SEO Data section) | — | ContentProductionTopics.tsx:497-501 |
| `competition` | Topics expanded detail (SEO Data section) | — | ContentProductionTopics.tsx:503-507 |
| `search_intent` | Topics expanded detail (SEO Data section) | — | ContentProductionTopics.tsx:509-512 |
| `content_angle` | Topics expanded detail | — | ContentProductionTopics.tsx:551-552 |
| `description` | Topics expanded detail | — | ContentProductionTopics.tsx:556-557 |
| `hero_image_concept` | Topics expanded detail | — | ContentProductionTopics.tsx:561-565 |
| `body_image_concepts` | Topics expanded detail (bulleted list) | — | ContentProductionTopics.tsx:568-576 |

### 📋 DISPLAY-ONLY FIELDS (displayed, no logic impact)

| Field | Display Location | Notes |
|-------|-----------------|-------|
| `memopyk_link_opportunities` | Topics expanded detail | Shows text for manual reference; not consumed by AI or post creation |

### 📝 FORM + DISPLAY (written via form, displayed, but no logic)

| Field | Form | Display | Notes |
|-------|------|---------|-------|
| `slug` | TopicFormModal (auto-generated from title) | Not displayed anywhere | Could be used for topic permalinks in future |

### ⚠️ SCHEMA-ONLY FIELDS (defined in DB, never used at runtime)

| Field | Schema Location | Why It's Dead |
|-------|----------------|---------------|
| `selected_for_week` | shared/schema.ts:771 | No references in client or server code. Was likely planned for weekly planner but planner uses `content_planner_assignments` table instead |
| `memopyk_links_placed` | shared/schema.ts:776 | No references. Boolean flag that was likely planned to track if internal links were added to generated content |

### 🕐 TIMESTAMP FIELDS (type definitions, limited use)

| Field | Usage |
|-------|-------|
| `created_at` | Type definitions only. Not displayed in UI |
| `updated_at` | Type definitions. Used for sorting posts in Planner (ContentProductionPlanner.tsx:173-175) |

### 📊 COMPUTED FIELDS (not in table, calculated at runtime)

| Field | Calculation | Display |
|-------|-------------|---------|
| `post_count` | Counted from `blog_posts.source_topic_id` in content.routes.ts:135-152 | Topics list badge, expanded detail, DeleteDialog |

---

## AI Prompt Integration

The `BlogPostCreatorModal` generates AI prompts using these topic fields:

```typescript
// BlogPostCreatorModal.tsx:126-140
const allKeywords = [topic.primary_keyword, ...(topic.secondary_keywords || [])].join(', ');
const estimatedReadTime = Math.ceil(topic.target_word_count / 200);

const prompt = MASTER_PROMPT_TEMPLATE
  .replace(/\{\{TOPIC\}\}/g, topic.title)                    // ✅ Used
  .replace(/\{\{TARGET_WORDS\}\}/g, topic.target_word_count) // ✅ Used
  .replace(/\{\{SEO_KEYWORDS\}\}/g, allKeywords)             // ✅ Used
  .replace(/\{\{READ_TIME\}\}/g, estimatedReadTime)          // ✅ Derived
```

**Fields NOT used in AI prompts:**
- category, type, search_volume, competition, search_intent
- content_angle, description (could inform AI)
- hero_image_concept, body_image_concepts (could guide image generation)
- memopyk_link_opportunities (could guide internal linking)

---

## FK Relationships

| Relationship | Table | Field | Usage |
|--------------|-------|-------|-------|
| Topic → Posts | `blog_posts` | `source_topic_id` | Links generated posts back to source topic |
| Topic → Assignments | `content_planner_assignments` | `topic_id` | Planner calendar scheduling |

---

## Recommendations

### 1. Fields to Consider Removing from Schema
- `selected_for_week` — Dead code, planner uses assignments table
- `memopyk_links_placed` — Never implemented

### 2. Fields to Add to AI Prompt (High Impact)
- `content_angle` — Would help AI understand the unique perspective
- `description` — Provides context for what the article should cover
- `search_intent` — Could guide AI on informational vs transactional tone

### 3. Fields to Consider Displaying
- `created_at` — Could show topic age in UI
- `slug` — Currently form-only; could enable topic permalinks

### 4. Form Fields That Need Helper Text
| Field | Current State | Suggestion |
|-------|--------------|------------|
| `content_angle` | No guidance | "What unique perspective or approach should this article take?" |
| `hero_image_concept` | No guidance | "Describe the ideal hero image for this article" |
| `body_image_concepts` | No guidance | "List image ideas for in-article visuals (comma-separated)" |
| `memopyk_link_opportunities` | No guidance | "Which MEMOPYK pages should this article link to?" |

### 5. Missing Form Validation
- `primary_keyword` is required but no max length warning
- `secondary_keywords` has no limit guidance (how many is too many?)
- `target_word_count` accepts any number (should have reasonable min/max)

---

## Files Audited

- `client/src/components/admin/ContentProductionTopics.tsx`
- `client/src/components/admin/ContentProductionPlanner.tsx`
- `client/src/components/admin/BlogPostCreatorModal.tsx`
- `client/src/components/admin/TopicFormModal.tsx`
- `client/src/components/admin/TopicDeleteDialog.tsx`
- `client/src/admin/BlogManagePosts.tsx`
- `server/routes/content.routes.ts`
- `server/routes/blog-admin.routes.ts`
- `shared/schema.ts`
- `shared/blogTypes.ts`
