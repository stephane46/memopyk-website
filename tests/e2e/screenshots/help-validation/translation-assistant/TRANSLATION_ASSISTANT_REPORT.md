# Translation Assistant Investigation Report

**Date:** February 4, 2026
**Target:** https://memopyk.memopyk.com (staging)

---

## Overview

The Translation Assistant is a 3-step AI-assisted workflow for translating blog posts between English and French while preserving all images in their original positions.

### What It Does
1. **Extracts text** from the post, replacing images with `[IMAGE 1]`, `[IMAGE 2]` placeholders
2. **Generates a prompt** for ChatGPT/Claude with specific translation rules
3. **Parses the AI response** (TITLE/SLUG/DESCRIPTION/CONTENT format) and re-inserts images

### API Called
- **No external translation API** — uses manual copy/paste to ChatGPT or Claude
- Server endpoint: `POST /api/admin/blog/posts/:id/translate` (creates duplicate)

### UI Type
- **Modal dialog** (max-width 4xl, scrollable)
- 3-step progress indicator at top
- Opens from Blog Editor only

### When It Appears
- **Only for translation drafts** — posts with titles starting with `[TRANSLATE TO ENGLISH]` or `[TRANSLATE TO FRENCH]`
- Detection: `title.startsWith('[TRANSLATE TO')`

---

## Screenshots Captured

| # | File | Description |
|---|------|-------------|
| 1 | 01-posts-list-with-translate-icon.png | Posts (Manual) tab showing translate icon |
| 2 | 02-translate-button-highlighted.png | Translate button on hover |
| 3 | 03-blog-editor-translation-draft.png | Blog Editor for a translation draft |
| 4 | 04-translation-assistant-button.png | Translation Assistant button highlighted |
| 5 | 05-step1-extract.png | Step 1: Extract dialog |
| 6 | 06-step2-copy-prompt.png | Step 2: Copy Prompt dialog |
| 7 | 07-step3-apply-translation.png | Step 3: Apply Translation dialog |

---

## Full Translation Workflow (End-to-End)

### Phase 1: Create Translation Draft

1. Go to **Posts (Manual)** tab
2. Find the post you want to translate
3. Click the **🔄 translate icon** ("Duplicate for translation")
4. System creates a duplicate with:
   - Title: `[TRANSLATE TO ENGLISH/FRENCH] Original Title`
   - Slug: `original-slug-en` or `original-slug-fr`
   - Status: Draft
   - Language: Opposite of source
   - All content and images preserved

### Phase 2: Open Translation Assistant

1. Open the translation draft in **Blog Editor**
2. The title starts with `[TRANSLATE TO...]` → **Translation Assistant** button appears
3. Click **Translation Assistant** button

### Phase 3: Use Translation Assistant (3 Steps)

#### Step 1: Extract Text
- **Card title:** "Step 1: Extract Text for Translation"
- **Description:** "We'll replace all images with placeholders like [IMAGE 1], [IMAGE 2], so ChatGPT can focus on the text"
- **Button:** `Extract Text & Remove Images`
- **Action:** Replaces `<img>`, `<figure>`, `<span>` containing images with `[IMAGE X]` placeholders

#### Step 2: Copy & Translate
- **Card title:** "Step 2: Copy & Translate with ChatGPT"
- **Description:** "Copy the prompt below, paste it into ChatGPT or Claude, then copy the response"
- **Shows:** Full translation prompt with rules
- **Buttons:**
  - `Copy Prompt to Clipboard`
  - `Next Step →`

**Prompt includes:**
- Translation rules (keep HTML tags, keep image placeholders)
- Current title, slug, description
- Content with `[IMAGE X]` placeholders
- Required output format: `TITLE:`, `SLUG:`, `DESCRIPTION:`, `CONTENT:`

#### Step 3: Apply Translation
- **Card title:** "Step 3: Paste Translated Content"
- **Description:** "Paste the translated HTML from ChatGPT/Claude below. We'll automatically re-insert all images!"
- **Textarea placeholder:** "Paste the English/French translation from ChatGPT here..."
- **Buttons:**
  - `Back`
  - `Apply Translation & Re-insert Images`

**Action:**
- Parses AI response for TITLE/SLUG/DESCRIPTION/CONTENT
- Replaces `[IMAGE X]` placeholders with original image HTML
- Updates all fields in the Blog Editor

### Phase 4: Review and Save

1. Review the translated content in Blog Editor
2. Remove the `[TRANSLATE TO...]` prefix from title
3. Click **Save Changes**
4. Change status to Published when ready

---

## UI Elements (Exact Text)

### Buttons
| Location | Button Text |
|----------|-------------|
| Posts list | Icon with title "Duplicate for translation" |
| Blog Editor | `Translation Assistant` |
| Step 1 | `Extract Text & Remove Images` |
| Step 2 | `Copy Prompt to Clipboard` |
| Step 2 | `Next Step →` |
| Step 3 | `Back` |
| Step 3 | `Apply Translation & Re-insert Images` |

### Progress Steps
| Step | Label |
|------|-------|
| 1 | Extract |
| 2 | Translate |
| 3 | Apply |

### Dialog Header
- **Title:** "Translation Assistant" (with Languages icon)
- **Subtitle:** "Translate your blog post to English/French using ChatGPT/Claude while preserving all images"

### Quick Guide (Help Text)
1. Extract text (images become [IMAGE 1], [IMAGE 2], etc.)
2. Copy the prompt and paste it into ChatGPT or Claude
3. Copy ChatGPT's translated response (with TITLE, SLUG, DESCRIPTION, and CONTENT)
4. Click "Apply" - title, slug, description are filled in, and images are re-inserted!

---

## Code Location

| Component | Path |
|-----------|------|
| Translation Assistant | `client/src/admin/TranslationAssistant.tsx` |
| Blog Editor (hosts button) | `client/src/admin/BlogEditor.tsx` |
| Posts list (translate icon) | `client/src/admin/BlogManagePosts.tsx` |
| Server endpoint | `server/routes/blog-admin.routes.ts` (line 277) |

---

## Key Technical Details

1. **Image extraction regex:**
   ```regex
   /(<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>)|(<span[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/span>)|(<img[^>]*>)/gi
   ```

2. **AI response parsing:**
   - Supports both plain format (`TITLE:`) and markdown format (`**TITLE:**`)
   - Extracts 4 fields: title, slug, description, content

3. **Translation draft detection:**
   ```javascript
   const isTranslationDraft = title.startsWith('[TRANSLATE TO');
   ```

4. **Target language determination:**
   ```javascript
   const targetLanguage = sourcePost.language === 'en-US' ? 'fr-FR' : 'en-US';
   ```

---

## Summary

The Translation Assistant is a well-designed 3-step workflow that:
- Preserves image positions during translation
- Uses external AI (ChatGPT/Claude) via manual copy/paste
- Automatically parses and applies AI responses
- Only appears for posts created via the "Duplicate for translation" feature

No help content currently exists for this feature. Consider adding a help flow similar to "Create a Post with AI".
