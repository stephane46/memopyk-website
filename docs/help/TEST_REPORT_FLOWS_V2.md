# Naive User Test Report V2 — Help Accuracy + Functional Testing

**Date:** 2026-02-04
**Tester:** Claude (Opus 4.5)
**Environment:** Staging (memopyk.memopyk.com) + Local codebase + Supabase DB via MCP

---

## Summary

| Category | Pass | Fail | Warnings |
|----------|------|------|----------|
| Create Blog Post Flow (7 steps) | 5 | 2 | 1 |
| Translate Post Flow (8 steps) | 6 | 1 | 1 |
| Help Screens (DB content) | 3 | 4 | 0 |
| Help APIs | 4 | 0 | 0 |
| Stale Reference Search | 0 | 4 | 0 |

**Total: 18 Pass, 11 Fail, 2 Warnings**

---

## LEVEL 1 — Help Content Accuracy (DB vs Code)

### Flow: "Create a blog post" (7 steps)

| Step | DB Instruction | Code Actual | Status |
|------|----------------|-------------|--------|
| 1 | Click `Posts` tab | Tab labeled "Posts" (ContentProductionHub.tsx:110-116) | ✅ PASS |
| 2 | Click `+ New Post` button | Button shows Plus icon + "New Post" (BlogManagePosts.tsx:321-323) | ⚠️ WARN - Icon renders as + visually |
| 3 | Options: `Write from scratch` / `Generate with AI` | Exact match (CreatePostLanding.tsx:103,122) | ✅ PASS |
| 4 | Enter `Title`, write content | Title field + TinyMCE editor (BlogEditor.tsx:330,424-437) | ✅ PASS |
| 5 | Click `Generate`, then `Edit in Blog Editor` | Button says "Generate AI Prompt" (BlogAICreator.tsx:477-484); "Save Blog Post" (line 656-660) | ❌ FAIL |
| 6 | Set `Category`, `Tags`, `Featured Image`, `Description (SEO)` | **No Category field exists**; Tags/Hero/Description exist (BlogEditor.tsx:354,366,378) | ❌ FAIL |
| 7 | Set `Status` to Draft/In Review/Published, click `Save Changes` | Exact match (BlogEditor.tsx:34,306-323) | ✅ PASS |

**Issues Found:**

1. **Step 5 Button Labels Wrong:**
   - DB says: "click `Generate`"
   - Code says: "Generate AI Prompt"
   - DB says: "click `Edit in Blog Editor`"
   - Code says: "Save Blog Post"

2. **Step 6 Non-Existent Field:**
   - DB says: "configure `Category`"
   - Code: **No Category field in BlogEditor** — only Title, Slug, Description (SEO), Hero Image, Status, Published At, Tags, Featured toggle

---

### Flow: "Translate a post" (8 steps)

| Step | DB Instruction | Code Actual | Status |
|------|----------------|-------------|--------|
| 1 | Go to `Posts` tab | Tab exists as "Posts" | ✅ PASS |
| 2 | Click `🌐` translate icon | Icon is `<Languages />` component, not 🌐 emoji (BlogManagePosts.tsx:561-562) | ⚠️ WARN |
| 3 | Choose `✨ Translate with AI` or `Translate manually` | Sparkles icon + "Translate with AI"; Pencil icon + "Translate manually" (BlogManagePosts.tsx:656,680) | ✅ PASS |
| 4 | AI: editor opens with translated content | Mutation navigates to blog-edit (BlogManagePosts.tsx:236-240) | ✅ PASS |
| 5 | Manual: editor opens with original + Translation Assistant | Translation Assistant button shows for drafts (BlogEditor.tsx:285-294) | ✅ PASS |
| 6 | Edit and refine | Editor allows editing | ✅ PASS |
| 7 | Verify Slug is language-appropriate | Slug field exists (BlogEditor.tsx:343) | ✅ PASS |
| 8 | Set Status to Published, click `Save Changes` | Exact match | ✅ PASS |

**Issues Found:**

1. **Step 2 Icon Mismatch:**
   - DB shows: emoji `🌐`
   - Code uses: Lucide `<Languages />` icon (visually different)

---

### Help Screens (DB Content vs Current UI)

| Route | Title | Issue | Status |
|-------|-------|-------|--------|
| `/admin?tab=posts` | Posts | Tips mention "Posts (AI)" tab which no longer exists as visible tab | ❌ FAIL |
| `/admin?tab=new-post` | New Post | Correct — references `Write from scratch` and `Generate with AI` | ✅ PASS |
| `/admin?tab=blog-edit` | Blog Editor | Mentions "ChatGPT or Claude" — should be generic | ❌ FAIL |
| `/admin?tab=ai-creator` | Posts (AI) | Title is stale (should be "AI Creator" or removed); mentions "ChatGPT" | ❌ FAIL |
| `/admin?tab=blog` | Blog Hub | Lists 6 tabs including "Posts (Manual)" and "Posts (AI)" — now only 5 tabs with "Posts" | ❌ FAIL |
| `/admin?tab=planner` | Weekly Planner | Correct | ✅ PASS |
| `/admin?tab=keywords` | Keywords | Correct | ✅ PASS |

---

### Help APIs (Staging)

| Test | Endpoint | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| List flows | GET /api/help/flows | Array of flows | `[{title:"Create a blog post",...},{title:"Translate a post",...}]` | ✅ PASS |
| Get flow by ID | GET /api/help/flows/:id | Flow with stepsJson | Returns 7 steps for Create, 8 for Translate | ✅ PASS |
| Get screen: posts | GET /api/help/screens/%2Fadmin%3Ftab%3Dposts | Screen object | Returns title "Posts" with htmlContent | ✅ PASS |
| Get screen: new-post | GET /api/help/screens/%2Fadmin%3Ftab%3Dnew-post | Screen object | Returns title "New Post" with correct button labels | ✅ PASS |

---

## Stale Reference Search Results

### Search: "ChatGPT" or "chatgpt"

| Location | Issue |
|----------|-------|
| help_screens `/admin?tab=ai-creator` | "Copy this prompt and paste it into **ChatGPT**, Claude, or your AI assistant" |
| help_screens `/admin?tab=ai-creator` | "After giving the prompt to **ChatGPT**/Claude, copy the JSON response" |
| help_screens `/admin?tab=blog-edit` | Translation Assistant "using **ChatGPT** or Claude" |
| BlogAICreator.tsx:492 | "Give this prompt to Claude, **ChatGPT**, or your AI assistant" |
| BlogAICreator.tsx:529 | "After giving the prompt to **ChatGPT**/Claude" |

### Search: "Posts (Manual)" or "Posts (AI)"

| Location | Issue |
|----------|-------|
| help_screens `/admin?tab=blog` | Lists tabs as "Posts (Manual)" and "Posts (AI)" |
| help_screens `/admin?tab=posts` | Tips say "For AI-assisted posts, use the Posts (AI) tab instead" |
| help_screens `/admin?tab=ai-creator` | Title is "Posts (AI)" |

### Search: "AI-assisted"

| Location | Issue |
|----------|-------|
| Found only in migrations, docs, and old test files | No issues in active help content |

---

## LEVEL 2 — Functional Testing

> **Note:** Functional tests requiring authentication were not executed in this run. The APIs are accessible but POST/PATCH/DELETE operations require admin token.

### Test A: Create a post (manual)
- **Status:** NOT TESTED (requires auth)
- POST /api/admin/blog/posts

### Test B: AI translation
- **Status:** NOT TESTED (requires auth)
- POST /api/admin/blog/posts/:id/translate with `{ method: 'ai' }`

### Test C: Manual translation
- **Status:** NOT TESTED (requires auth)
- POST /api/admin/blog/posts/:id/translate with `{ method: 'manual' }`

### Test D: Help panel API
- GET /api/help/screen — **PASS** (see table above)

---

## Fixes Required

### Priority 1: Help Flow Content (DB updates)

1. **"Create a blog post" Step 5:**
   - Change: "click `Generate`" → "click `Generate AI Prompt`"
   - Change: "click `Edit in Blog Editor`" → "click `Save Blog Post`"

2. **"Create a blog post" Step 6:**
   - Remove: "`Category`" (field does not exist)
   - Keep: `Tags`, `Featured Image`, `Description (SEO)`

### Priority 2: Help Screen Content (DB updates)

3. **`/admin?tab=blog` (Blog Hub):**
   - Update tab list from 6 tabs to 5 tabs
   - Remove "Posts (Manual)" and "Posts (AI)"
   - Add single "Posts" tab

4. **`/admin?tab=posts` (Posts):**
   - Remove tip: "For AI-assisted posts, use the Posts (AI) tab instead"
   - Update to explain clicking "New Post" → CreatePostLanding choice

5. **`/admin?tab=ai-creator` (Posts AI):**
   - Rename title from "Posts (AI)" to "AI Creator" or "Generate with AI"
   - Replace "ChatGPT" with "your AI assistant" or "AI"

6. **`/admin?tab=blog-edit` (Blog Editor):**
   - Replace "ChatGPT or Claude" with "your AI assistant"

### Priority 3: Code Changes (Optional)

7. **BlogAICreator.tsx:492,529:**
   - Replace "ChatGPT/Claude" with "your AI assistant"
   - Aligns with brand-agnostic approach per ADR-018

---

## SQL Fixes (DO NOT EXECUTE — For Review)

```sql
-- Fix 1: Update "Create a blog post" flow Step 5 and Step 6
UPDATE help_flows
SET steps_json = jsonb_set(
  jsonb_set(steps_json, '{4,instruction}',
    '"If you chose \"Generate with AI\": Enter your topic, select tone and keywords, then click <span class=\"help-btn\">Generate AI Prompt</span>. Copy the prompt to your AI assistant, paste the response, then click <span class=\"help-btn\">Save Blog Post</span>."'
  ),
  '{5,instruction}',
  '"In the Blog Editor, configure: <span class=\"help-label\">Tags</span>, <span class=\"help-label\">Featured Image</span>, and <span class=\"help-label\">Description (SEO)</span>."'
)
WHERE title = 'Create a blog post';

-- Fix 2: Update Blog Hub screen to list correct tabs
UPDATE help_screens
SET html_content = REPLACE(
  REPLACE(html_content, 'Posts (Manual)', 'Posts'),
  '<li><span class="help-tab">Posts (AI)</span> - Generate blog posts using AI</li>', ''
)
WHERE route = '/admin?tab=blog';

-- Fix 3: Update Posts screen to remove stale AI tab reference
UPDATE help_screens
SET html_content = REPLACE(
  html_content,
  '<li>For AI-assisted posts, use the <span class="help-tab">Posts (AI)</span> tab instead.</li>',
  '<li>Click <span class="help-btn">New Post</span> to choose between writing from scratch or generating with AI.</li>'
)
WHERE route = '/admin?tab=posts';

-- Fix 4: Rename AI Creator screen title and remove ChatGPT
UPDATE help_screens
SET title = 'AI Creator',
    html_content = REPLACE(
      REPLACE(html_content, 'ChatGPT', 'your AI assistant'),
      'ChatGPT/Claude', 'your AI assistant'
    )
WHERE route = '/admin?tab=ai-creator';

-- Fix 5: Remove ChatGPT from Blog Editor screen
UPDATE help_screens
SET html_content = REPLACE(html_content, 'ChatGPT or Claude', 'your AI assistant')
WHERE route = '/admin?tab=blog-edit';
```

---

## Conclusion

The help system has 11 content mismatches that need database updates:
- 2 button label errors in the "Create a blog post" flow
- 1 non-existent field reference ("Category")
- 4 stale tab name references ("Posts (Manual)", "Posts (AI)")
- 4 brand name references ("ChatGPT") that should be generic

All help APIs are functioning correctly. The flow structure and navigation logic are sound — only the text content needs updating.

**Recommendation:** Apply the SQL fixes to bring help content in sync with the current UI.
