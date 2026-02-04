# Naive User Help Flow Test Report

**Generated:** 2026-02-04
**Test Environment:** https://memopyk.memopyk.com (staging)
**Test Approach:** Automated Playwright test acting as naive user with ONLY help content + screenshots

---

## TEST EXECUTION NOTES

**CRITICAL ISSUE:** The automated test failed at authentication. The admin login was rejected ("Invalid password"), causing the test to navigate to the public blog page instead of the admin panel. As a result, most help flow steps could not be properly validated.

**Screenshots confirm:** The test ended up on the public Blog page (showing "Featured article: How to Take Amazing Puppy Photos") instead of the Admin Blog Hub.

Despite this authentication failure, we can still analyze the help content against what a naive user would see in the correct UI based on the help flow definitions.

---

## FLOW: Create a blog post (Manual)
**Description:** Step-by-step guide to create and publish a blog post from scratch
**TOTAL STEPS:** 8

### Step 1: Open the Posts (Manual) tab
**Instruction:** Click Blog in the sidebar menu, then click the Posts (Manual) tab. Click New Post at the top right.
**Screenshot Before:** flow1-step1-before.png (shows login page with error)
**Screenshot After:** flow1-step1-after.png (shows public blog page)
**Rating:** AMBIGUOUS
**Notes:**
- Instruction says "Posts (Manual)" but the actual tab is labeled just "Posts"
- Help content uses outdated terminology that doesn't match current UI
- "New Post" button now navigates to CreatePostLanding screen, not directly to editor

### Step 2: Enter the title
**Instruction:** Type your post title in the Title field at the top.
**Rating:** CLEAR (based on help content analysis)
**Notes:** Instruction is clear - "Title field at the top" is unambiguous

### Step 3: Write your content
**Instruction:** Use the rich text editor to write or paste your article.
**Rating:** CLEAR
**Notes:** Rich text editor is a standard concept

### Step 4: Add a hero image
**Instruction:** Click Select Hero Image. Upload a new image or choose from existing ones.
**Rating:** CLEAR
**Notes:** Button label "Select Hero Image" is specific and findable

### Step 5: Add tags and description
**Instruction:** Click on tag badges to assign tags. Write a short Description (SEO).
**Rating:** AMBIGUOUS
**Notes:**
- "tag badges" is unclear - what exactly is a "badge"?
- Where is the Description (SEO) field located? Instruction doesn't specify

### Step 6: Set status to Published
**Instruction:** Change the Status dropdown from Draft to Published.
**Rating:** CLEAR
**Notes:** Status dropdown with Draft/Published options is standard

### Step 7: Set the publication date
**Instruction:** Click "Choisir une date" to open the date picker. Click "Definir maintenant" to use current time.
**Rating:** BLOCKED
**Notes:**
- **CRITICAL:** Instructions are in French ("Choisir une date", "Definir maintenant") but we're testing English UI
- A naive English user would not understand these French instructions
- Should say "Choose a date" and "Set to now"

### Step 8: Save and verify
**Instruction:** Click Save Changes at the top. Go back to Posts (Manual) tab and use the eye icon to preview.
**Rating:** AMBIGUOUS
**Notes:**
- "Save Changes" button is clear
- "Posts (Manual)" - again uses outdated tab name
- "eye icon" is somewhat ambiguous (multiple icons may look similar)

### COVERAGE SCORE:
- CLEAR: 4/8 (50%)
- AMBIGUOUS: 3/8 (37.5%)
- BLOCKED: 1/8 (12.5%)

---

## FLOW: Create a blog post (AI-assisted)
**Description:** Learn how to use the Posts (AI) tab to generate blog posts using ChatGPT or Claude
**TOTAL STEPS:** 8

### Step 1: Configure Post Settings
**Instruction:** Start in the Posts (AI) tab. Fill in: Topic, Language, Status, Published At, SEO Keywords
**Rating:** AMBIGUOUS
**Notes:**
- Help says "Posts (AI)" but actual tab is "Create a Post"
- Tab naming mismatch will confuse users

### Step 2: Generate the AI Prompt
**Instruction:** Click "Generate AI Prompt"
**Rating:** CLEAR
**Notes:** Button label is specific

### Step 3: Copy Prompt to Clipboard
**Instruction:** Click "Copy to Clipboard" in Step 2: Copy Prompt to AI panel
**Rating:** CLEAR
**Notes:** Clear action with specific button name

### Step 4: Submit to Your AI Assistant
**Instruction:** Open ChatGPT, Claude, or another AI assistant. Paste the prompt and submit.
**Rating:** BLOCKED (External action)
**Notes:** Requires external action - cannot complete in automated test

### Step 5: Paste the JSON Response
**Instruction:** Paste JSON response into "AI-Generated JSON Response" textarea
**Rating:** CLEAR
**Notes:** Specific field name provided

### Step 6: Validate & Enter Edit Mode
**Instruction:** Click "Validate & Edit Content"
**Rating:** CLEAR
**Notes:** Specific button name

### Step 7: Refine Your Content
**Instruction:** Edit Post Title, upload Hero Image, add Tags, use rich text editor
**Rating:** CLEAR
**Notes:** Standard editor operations

### Step 8: Save and Continue Editing
**Instruction:** Click "Save Blog Post"
**Rating:** CLEAR
**Notes:** Specific button name

### COVERAGE SCORE:
- CLEAR: 6/8 (75%)
- AMBIGUOUS: 1/8 (12.5%)
- BLOCKED: 1/8 (12.5%)

---

## FLOW: Translate a post
**Description:** Translate an existing post to another language using the Translation Assistant
**TOTAL STEPS:** 9

### Step 1: Go to Posts (Manual) tab
**Instruction:** Click Blog in the sidebar, then click the Posts (Manual) tab
**Rating:** AMBIGUOUS
**Notes:** Tab is named "Posts", not "Posts (Manual)"

### Step 2: Create a translation draft
**Instruction:** Click the "Duplicate for translation" icon (the swap/arrows icon)
**Rating:** AMBIGUOUS
**Notes:**
- "swap/arrows icon" is vague - the actual icon is a Languages icon (two speech bubbles)
- Icon description doesn't match actual icon appearance

### Step 3: Find the translation draft
**Instruction:** The new draft appears with "[TRANSLATE TO...]" prefix. Click Edit icon (pencil)
**Rating:** CLEAR
**Notes:** "[TRANSLATE TO...]" prefix is distinctive and findable

### Step 4: Open Translation Assistant
**Instruction:** Click "Translation Assistant" button in top bar
**Rating:** CLEAR
**Notes:** Specific button name provided

### Step 5: Step 1: Extract Text
**Instruction:** Click "Extract Text & Remove Images"
**Rating:** CLEAR
**Notes:** Specific button name provided

### Step 6: Step 2: Copy and Translate
**Instruction:** Click "Copy Prompt to Clipboard". Click "Next Step" when ready.
**Rating:** AMBIGUOUS
**Notes:**
- Help says "Copy Prompt to Clipboard" but actual button is now "Translate with AI"
- **OUTDATED:** Help content doesn't reflect new AI translation feature
- Manual fallback exists but is not the primary UI anymore

### Step 7: Step 3: Apply Translation
**Instruction:** Paste AI response, click "Apply Translation & Re-insert Images"
**Rating:** CLEAR (for manual flow)
**Notes:** But this may be auto-populated now with AI translation

### Step 8: Review and Clean Up
**Instruction:** Remove "[TRANSLATE TO...]" prefix, set status
**Rating:** CLEAR
**Notes:** Clear instructions

### Step 9: Save Changes
**Instruction:** Click "Save Changes"
**Rating:** CLEAR
**Notes:** Specific button name

### COVERAGE SCORE:
- CLEAR: 6/9 (67%)
- AMBIGUOUS: 3/9 (33%)
- BLOCKED: 0/9 (0%)

---

## SUMMARY

**Total steps across all flows:** 25

### Overall Coverage Scores:
- CLEAR: 16/25 (64%)
- AMBIGUOUS: 7/25 (28%)
- BLOCKED: 2/25 (8%)

### Top Issues Found (ranked by severity):

1. **Tab naming mismatch (HIGH):** Help instructions reference "Posts (Manual)" and "Posts (AI)" but actual tabs are "Posts" and "Create a Post". This will confuse users looking for the tabs mentioned in help.

2. **French instructions in English UI (HIGH):** Step 7 of Manual flow uses French "Choisir une date" and "Definir maintenant" in instructions. English users won't understand.

3. **Translation Assistant outdated (MEDIUM):** Help Step 6 says "Copy Prompt to Clipboard" but the primary action is now "Translate with AI". Help doesn't mention the new AI-powered translation feature.

4. **Icon descriptions vague (MEDIUM):** "swap/arrows icon" for translation doesn't match the actual Languages icon appearance. Users may not recognize which icon to click.

5. **"Tag badges" unclear (LOW):** Instruction says "click on tag badges" without explaining what a badge looks like or where to find them.

6. **New Post flow changed (LOW):** "New Post" button now goes to CreatePostLanding (choice screen) before Blog Editor, but help assumes direct navigation to editor.

### Recommended Help Content Fixes:

1. **Update tab names:** Replace "Posts (Manual)" with "Posts" and "Posts (AI)" with "Create a Post" throughout all help content.

2. **Translate French to English:** Change "Choisir une date" to "Choose a date" and "Definir maintenant" to "Set to now".

3. **Update Translation flow for AI:** Revise Step 6 to say "Click 'Translate with AI' to automatically translate, or click 'Prefer to translate manually?' for the copy-paste workflow."

4. **Improve icon descriptions:** Change "swap/arrows icon" to "the Languages icon (looks like two overlapping speech bubbles)" or add a screenshot.

5. **Clarify tag selection:** Add "in the Tags section on the right sidebar" or similar location hint.

6. **Update New Post flow:** Add step mentioning CreatePostLanding choice screen: "Choose 'Write from scratch' to open the editor."

---

## FIXES APPLIED (2026-02-04)

All 6 issues have been fixed in Supabase using `scripts/fix-help-content.ts`.

### Changes Made:

**Help Flows (3 flows updated):**

| Flow | Changes |
|------|---------|
| Create a blog post (Manual) | Step 1: "Posts (Manual)" → "Posts", added CreatePostLanding mention; Step 5: added tag location hint; Step 7: "Choisir une date" → "Choose a date", "Definir maintenant" → "Set to now"; Step 8: "Posts (Manual)" → "Posts" |
| Translate a post | Step 1: "Posts (Manual)" → "Posts"; Step 2: icon description improved; Step 6: Updated for new "Translate with AI" feature |
| Create a blog post (AI-assisted) | Description: "Posts (AI)" → "Create a Post"; Step 1: "Posts (AI)" → "Create a Post" |

**Help Screens (4 screens updated):**

| Screen | Changes |
|--------|---------|
| Posts (AI) | "Posts (AI)" → "Create a Post" in heading and content |
| Blog Editor | "Posts (Manual)" → "Posts"; French date picker text translated |
| Blog Hub | "Posts (Manual)" → "Posts"; "Posts (AI)" → "Create a Post" |
| Posts (Manual) | "Posts (Manual)" → "Posts"; "Posts (AI)" → "Create a Post"; tag location hint added |

**Total: 25 field updates across 7 records**

---

## TEST ARTIFACTS

Screenshots captured:
- flow1-step1-before.png through flow1-step8-after.png
- flow2-step1-before.png through flow2-step2-after.png
- flow3-step1-before.png through flow3-step3-after.png

**Note:** Due to authentication failure, screenshots show public blog page instead of admin panel for most steps.
