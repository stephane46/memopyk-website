# Naive User Test Report V3 — Playwright Browser Walkthrough

**Date:** 2026-02-04
**Environment:** Staging (https://memopyk.memopyk.com)
**Tester:** Playwright automated walkthrough (no source code knowledge)

---

## Executive Summary

| Category | CLEAR | AMBIGUOUS | BLOCKED | Total |
|----------|-------|-----------|---------|-------|
| Flow Steps | 0 | 1 | 14 | 15 |
| Screen Help | 4 | 5 | 0 | 9 |
| **TOTAL** | **4** | **6** | **14** | **24** |

---

## Flow: "Create a blog post"

**Description:** Step-by-step guide to create a blog post, manually or with AI assistance
**Total Steps:** 7
**Summary:** 0 CLEAR, 1 AMBIGUOUS, 6 BLOCKED

| Step | Title | Rating | Notes |
|------|-------|--------|-------|
| 1 | Go to Posts tab | ⚠️ AMBIGUOUS | Found: "Posts"; NOT FOUND: "the" |
| 2 | Click New Post | ❌ BLOCKED | NOT FOUND: "+ New Post"; NOT FOUND: "the" |
| 3 | Choose your method | ❌ BLOCKED | - |
| 4 | Manual: Write your content | ❌ BLOCKED | - |
| 5 | AI: Configure and generate | ❌ BLOCKED | NOT FOUND: "Generate"; NOT FOUND: "Save" |
| 6 | Set metadata | ❌ BLOCKED | - |
| 7 | Save and publish | ❌ BLOCKED | NOT FOUND: "Save" |

### Step Details

#### Step 1: Go to Posts tab

**Instruction:** In the Blog Hub, click the Posts tab to see all your blog posts.

**Rating:** AMBIGUOUS

**Notes:** Found: "Posts"; NOT FOUND: "the"

**Screenshots:**
- Help: `flow1-step1-help.png`
- Action: `flow1-step1-action.png`

---

#### Step 2: Click New Post

**Instruction:** Click the + New Post button in the top-right corner. This opens the creation page.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "+ New Post"; NOT FOUND: "the"

**Screenshots:**
- Help: `flow1-step2-help.png`
- Action: `flow1-step2-action.png`

---

#### Step 3: Choose your method

**Instruction:** You have two options: Write from scratch opens the Blog Editor directly. Generate with AI uses AI to create a draft.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow1-step3-help.png`
- Action: `flow1-step3-action.png`

---

#### Step 4: Manual: Write your content

**Instruction:** If you chose "Write from scratch": The Blog Editor opens with a blank post. Enter your Title, write your content in the editor, and add images as needed.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow1-step4-help.png`
- Action: `flow1-step4-action.png`

---

#### Step 5: AI: Configure and generate

**Instruction:** If you chose "Generate with AI": Enter your topic, select tone and keywords, then click Generate AI Prompt. Copy the prompt to your AI assistant, paste the JSON response, then click Save Blog Post to save and open in Blog Editor.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "Generate"; NOT FOUND: "Save"

**Screenshots:**
- Help: `flow1-step5-help.png`
- Action: `flow1-step5-action.png`

---

#### Step 6: Set metadata

**Instruction:** In the Blog Editor, configure: Tags, Hero Image, and Description (SEO).

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow1-step6-help.png`
- Action: `flow1-step6-action.png`

---

#### Step 7: Save and publish

**Instruction:** Set Status to Draft, In Review, or Published. Click Save Changes.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "Save"

**Screenshots:**
- Help: `flow1-step7-help.png`
- Action: `flow1-step7-action.png`

---

## Flow: "Translate a post"

**Description:** Translate a post to another language using AI or manual tools
**Total Steps:** 8
**Summary:** 0 CLEAR, 0 AMBIGUOUS, 8 BLOCKED

| Step | Title | Rating | Notes |
|------|-------|--------|-------|
| 1 | Find your post | ❌ BLOCKED | - |
| 2 | Click translate icon | ❌ BLOCKED | NOT FOUND: "🌐 translate"; NOT FOUND: "the" |
| 3 | Choose translation method | ❌ BLOCKED | - |
| 4 | Review AI translation | ❌ BLOCKED | - |
| 5 | Manual translation (if chosen) | ❌ BLOCKED | NOT FOUND: "Translation" |
| 6 | Edit and refine | ❌ BLOCKED | - |
| 7 | Update metadata | ❌ BLOCKED | - |
| 8 | Set status and save | ❌ BLOCKED | NOT FOUND: "Save" |

### Step Details

#### Step 1: Find your post

**Instruction:** Go to Posts and locate the post you want to translate.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow2-step1-help.png`
- Action: `flow2-step1-action.png`

---

#### Step 2: Click translate icon

**Instruction:** Click the 🌐 translate icon next to the post. A dialog will appear.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "🌐 translate"; NOT FOUND: "the"

**Screenshots:**
- Help: `flow2-step2-help.png`
- Action: `flow2-step2-action.png`

---

#### Step 3: Choose translation method

**Instruction:** Choose ✨ Translate with AI for automatic translation, or Translate manually to use your own tools.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow2-step3-help.png`
- Action: `flow2-step3-action.png`

---

#### Step 4: Review AI translation

**Instruction:** If you chose AI: the editor opens with the translated content. Review the title, description, and content for accuracy.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow2-step4-help.png`
- Action: `flow2-step4-action.png`

---

#### Step 5: Manual translation (if chosen)

**Instruction:** If you chose manual: the editor opens with the original content. Click Translation Assistant to use the translation helper, or translate directly.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "Translation"

**Screenshots:**
- Help: `flow2-step5-help.png`
- Action: `flow2-step5-action.png`

---

#### Step 6: Edit and refine

**Instruction:** Make any necessary edits to the translation. Images are automatically preserved in their original positions.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow2-step6-help.png`
- Action: `flow2-step6-action.png`

---

#### Step 7: Update metadata

**Instruction:** Verify the Slug is language-appropriate (e.g., ends in -en or -fr). Update the Description (SEO) if needed.

**Rating:** BLOCKED

**Notes:** None

**Screenshots:**
- Help: `flow2-step7-help.png`
- Action: `flow2-step7-action.png`

---

#### Step 8: Set status and save

**Instruction:** Change Status to Published when ready. Click Save Changes.

**Rating:** BLOCKED

**Notes:** NOT FOUND: "Save"

**Screenshots:**
- Help: `flow2-step8-help.png`
- Action: `flow2-step8-action.png`

---

## Screen Help Accuracy

| Route | Help Title | Actual Title | Match | Rating | Notes |
|-------|------------|--------------|-------|--------|-------|
| `/admin?tab=blog` | Blog Hub | MEMOPYK | ✅ | ✅ CLEAR | - |
| `/admin?tab=posts` | (not found) | MEMOPYK | ✅ | ⚠️ AMBIGUOUS | Could not extract help title from screen content |
| `/admin?tab=ai-creator` | AI Creator | MEMOPYK | ✅ | ✅ CLEAR | - |
| `/admin?tab=blog-edit&id=test` | Blog Editor | MEMOPYK | ✅ | ✅ CLEAR | - |
| `/admin?tab=planner` | (not found) | MEMOPYK | ✅ | ⚠️ AMBIGUOUS | Could not extract help title from screen content |
| `/admin?tab=keywords` | Keywords | MEMOPYK | ✅ | ✅ CLEAR | - |
| `/admin?tab=topics` | (not found) | MEMOPYK | ✅ | ⚠️ AMBIGUOUS | Could not extract help title from screen content |
| `/admin?tab=images` | Image Bank | MEMOPYK | ❌ | ⚠️ AMBIGUOUS | Help title "Image Bank" may not match screen "MEMOPYK" |
| `/admin?tab=new-post` | Create a New Blog Post | MEMOPYK | ❌ | ⚠️ AMBIGUOUS | Help title "Create a New Blog Post" may not match screen "MEMOPYK" |

### Screen Screenshots

| Screen | Help | UI |
|--------|------|-----|
| MEMOPYK | `screen-blog-hub-help.png` | `screen-blog-hub-ui.png` |
| MEMOPYK | `screen-posts-help.png` | `screen-posts-ui.png` |
| MEMOPYK | `screen-ai-creator-help.png` | `screen-ai-creator-ui.png` |
| MEMOPYK | `screen-blog-editor-help.png` | `screen-blog-editor-ui.png` |
| MEMOPYK | `screen-planner-help.png` | `screen-planner-ui.png` |
| MEMOPYK | `screen-keywords-help.png` | `screen-keywords-ui.png` |
| MEMOPYK | `screen-topics-help.png` | `screen-topics-ui.png` |
| MEMOPYK | `screen-images-help.png` | `screen-images-ui.png` |
| MEMOPYK | `screen-new-post-help.png` | `screen-new-post-ui.png` |

---

## Recommendations

Based on the test results, the following improvements are recommended:

### Critical (BLOCKED)

- **Flow step 2** (Click New Post): NOT FOUND: "+ New Post"; NOT FOUND: "the"
- **Flow step 3** (Choose your method): 
- **Flow step 4** (Manual: Write your content): 
- **Flow step 5** (AI: Configure and generate): NOT FOUND: "Generate"; NOT FOUND: "Save"
- **Flow step 6** (Set metadata): 
- **Flow step 7** (Save and publish): NOT FOUND: "Save"
- **Flow step 1** (Find your post): 
- **Flow step 2** (Click translate icon): NOT FOUND: "🌐 translate"; NOT FOUND: "the"
- **Flow step 3** (Choose translation method): 
- **Flow step 4** (Review AI translation): 
- **Flow step 5** (Manual translation (if chosen)): NOT FOUND: "Translation"
- **Flow step 6** (Edit and refine): 
- **Flow step 7** (Update metadata): 
- **Flow step 8** (Set status and save): NOT FOUND: "Save"

### Warnings (AMBIGUOUS)

- **Flow step 1** (Go to Posts tab): Found: "Posts"; NOT FOUND: "the"


---

## Test Artifacts

- **Screenshots:** `tests/e2e/screenshots/help-validation/v3/`
- **Test Script:** `tests/e2e/naive-user-help-test-v3.ts`

---

*Generated by Playwright automated walkthrough*
