# Naive User Test Report V4 — Real Browser Walkthrough

**Date:** 2026-02-04
**Environment:** Staging (https://memopyk.memopyk.com)
**Tester:** Playwright automated walkthrough with REAL navigation
**Test Version:** V4 (fixes navigation, element detection, and screen title extraction)

---

## Executive Summary

| Category | CLEAR | AMBIGUOUS | BLOCKED | Total |
|----------|-------|-----------|---------|-------|
| Flow Steps | 9 | 0 | 6 | 15 |
| Screen Help | 8 | 1 | 0 | 9 |
| **TOTAL** | **17** | **1** | **6** | **24** |

---

## Flow: "Create a blog post"

**Description:** Step-by-step guide to create a blog post, manually or with AI assistance
**Total Steps:** 7
**Summary:** 5 CLEAR, 0 AMBIGUOUS, 2 BLOCKED

| Step | Title | Action Performed | Rating | Notes |
|------|-------|------------------|--------|-------|
| 1 | Go to Posts tab | Navigate to Posts tab | ✅ CLEAR | Posts heading visible |
| 2 | Step 2 | Click "+ New Post" button | ✅ CLEAR | Navigated to new-post page |
| 3 | Step 3 | Verify creation method cards | ✅ CLEAR | Both method cards visible |
| 4 | Step 4 | Click "Write from scratch", verify Blog Editor | ✅ CLEAR | Blog Editor opened |
| 5 | Step 5 | Go back, click "Generate with AI", verify AI Creator | ✅ CLEAR | AI Creator opened |
| 6 | Step 6 | Open existing post, verify metadata fields (Tags, Hero Image, Description) | ❌ BLOCKED | No posts found to edit |
| 7 | Step 7 | Verify Status dropdown and "Save Changes" button | ❌ BLOCKED | Could not find status dropdown or save button |

### Step Details

#### Step 1: Go to Posts tab

**Help Instruction:** In the Blog Hub, click the Posts tab to see all your blog posts.

**Action Performed:** Navigate to Posts tab

**Rating:** CLEAR

**Notes:** Posts heading visible

**Screenshots:**
- Help: `flow1-step1-help.png`
- Action Result: `flow1-step1-action.png`

---

#### Step 2: Step 2

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Click "+ New Post" button

**Rating:** CLEAR

**Notes:** Navigated to new-post page

**Screenshots:**
- Help: `flow1-step2-help.png`
- Action Result: `flow1-step2-action.png`

---

#### Step 3: Step 3

**Help Instruction:** Create a New Blog Post
This is your starting point for creating new content. Choose the method that works best for you:

Write from scratch
Opens the Blog Editor with a blank post. Best when you have a clear idea of what you want to write.

Generate with AI
Uses AI to generate a draft based on your topic and preferences. Great for overcoming writer's block or getting a head start.


  💡 Tip: You can always switch methods — start with AI to get a draft, then refine manually in the Blog Editor.

**Action Performed:** Verify creation method cards

**Rating:** CLEAR

**Notes:** Both method cards visible

**Screenshots:**
- Help: `flow1-step3-help.png`
- Action Result: `flow1-step3-action.png`

---

#### Step 4: Step 4

**Help Instruction:** Create a New Blog Post
This is your starting point for creating new content. Choose the method that works best for you:

Write from scratch
Opens the Blog Editor with a blank post. Best when you have a clear idea of what you want to write.

Generate with AI
Uses AI to generate a draft based on your topic and preferences. Great for overcoming writer's block or getting a head start.


  💡 Tip: You can always switch methods — start with AI to get a draft, then refine manually in the Blog Editor.

**Action Performed:** Click "Write from scratch", verify Blog Editor

**Rating:** CLEAR

**Notes:** Blog Editor opened

**Screenshots:**
- Help: `flow1-step4-help.png`
- Action Result: `flow1-step4-action.png`

---

#### Step 5: Step 5

**Help Instruction:** Blog Editor
This screen lets you edit a blog post. All changes are saved only when you click Save Changes - nothing is saved automatically.

Top Bar
The top-right corner has action buttons:

  Save Changes (orange) - Saves all fields at once: title, content, status, tags, hero image, and publication date
  Preview - Opens the published post in a new browser tab. Only available when the post status is Published
  Translation Assistant - Appears only for translation drafts (posts with "[TRANSLATE TO...]" in the title). Guides you through a 3-step translation process using your AI assistant, automatically preserving images.


Fields (top to bottom)

Title - The post headline. This is what readers see first.

Slug (URL) - The URL path for this post. Example: my-blog-post becomes /blog/my-blog-post. Use lowercase letters, numbers, and hyphens only.

Description (SEO) - A short summary shown in search engine results and social media previews. Keep it under 160 characters.

Hero Image
The main image displayed at the top of the post.

  Click Select Hero Image (or Change Hero Image if one is already set)
  A dialog opens with two options:
    
      Upload new image - Click Choose File to upload from your computer (PNG, JPG, GIF, WEBP, max 5 MB)
      Select from existing images - Click any image thumbnail to use it
    
  


Status & Publication Date
These two fields appear side by side.
Status - Choose the workflow stage:

  Draft - Work in progress, not visible to readers
  In Review - Ready for review before publishing
  Published - Live and visible on the blog
  Archived - Hidden from the public blog but preserved in the system


Published At - Controls when the post appears on the blog.

  Click Choisir une date to open the date picker
  Pick a day on the calendar, then set the time (hours : minutes)
  Click Définir maintenant to set the current date and time (French timezone)
  Click Effacer to clear the date


Tags
Colored labels that categorize your post. Click a tag to select it (it gets a ring highlight). Click again to deselect. The count of selected tags is shown below.
If no tags exist, create them first in the Posts tab using Manage Tags.

Featured Post
An orange section that lets you highlight this post in the featured carousel on the blog page.

  Toggle the switch on to mark as featured
  Set Featured Order (1 = appears first in the carousel)
  Toggle off to remove from the carousel


Content
The main body of your post - a rich text editor with a full toolbar. You can format text, insert images, add links, tables, and switch to code view for direct HTML editing.

Language
Shown at the bottom - displays whether this post is in English or French. The language is set when the post is created and cannot be changed here.

Translation Assistant
The Translation Assistant button only appears for posts with "[TRANSLATE TO...]" in the title. It provides a 3-step process:

  Extract - Replaces images with [IMAGE 1], [IMAGE 2] placeholders
  Translate - Copy the prompt to your AI assistant and get the translated content
  Apply - Paste the translation and images are automatically restored


Tips

  Always click Save Changes after making edits - there is no auto-save
  Write your Description (SEO) before publishing - it improves search visibility
  Set a hero image - posts without one look incomplete on the blog page
  Use Draft while writing, switch to Published only when ready

**Action Performed:** Go back, click "Generate with AI", verify AI Creator

**Rating:** CLEAR

**Notes:** AI Creator opened

**Screenshots:**
- Help: `flow1-step5-help.png`
- Action Result: `flow1-step5-action.png`

---

#### Step 6: Step 6

**Help Instruction:** AI Creator
Generate blog posts using AI. This tool creates a structured prompt, which you copy to your AI assistant (e.g., your AI assistant, Claude). Then paste the AI response back to create a fully formatted blog post.

Step 1: Configure Post
Fill in the following fields:

  Topic - Describe what the blog post should be about (required)
  Language - English (EN) or French (FR)
  Status - Choose Draft, In Review, Published, or Archived
  Published At - Schedule a future date (optional)
  SEO Keywords - Comma-separated keywords to target (optional)

Click Generate AI Prompt when ready.

Step 2: Copy Prompt to AI
The generated prompt appears in this panel. Click Copy to Clipboard to copy it. Then paste into your AI assistant, Claude, or your preferred AI assistant. The AI will generate a complete blog post in JSON format.

Step 3: Paste AI's JSON Response
Paste the AI's JSON response into the textarea. If there are formatting issues, click Auto-Fix to repair common JSON problems. Then click Validate & Edit Content to preview and edit the content.

Step 4: Refine Your Content
In this step you can:

  Edit the Post Title
  Upload a Hero Image from your Image Bank
  Add Tags to categorize the post
  Use the rich text editor to refine the content, add tables, or format text

Click Save Blog Post to save. You'll be automatically taken to the Blog Editor for final review.

Tips

  Be specific with your topic for better results
  Always review and edit AI content before publishing
  Use the SEO keywords field - it improves content targeting
  The generated prompt includes MEMOPYK brand guidelines automatically
  Start with Draft status and review before publishing

**Action Performed:** Open existing post, verify metadata fields (Tags, Hero Image, Description)

**Rating:** BLOCKED

**Notes:** No posts found to edit

**Screenshots:**
- Help: `flow1-step6-help.png`
- Action Result: `flow1-step6-action.png`

---

#### Step 7: Step 7

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Verify Status dropdown and "Save Changes" button

**Rating:** BLOCKED

**Notes:** Could not find status dropdown or save button

**Screenshots:**
- Help: `flow1-step7-help.png`
- Action Result: `flow1-step7-action.png`

---

## Flow: "Translate a post"

**Description:** Translate a post to another language using AI or manual tools
**Total Steps:** 8
**Summary:** 4 CLEAR, 0 AMBIGUOUS, 4 BLOCKED

| Step | Title | Action Performed | Rating | Notes |
|------|-------|------------------|--------|-------|
| 1 | Find your post | Navigate to Posts tab | ❌ BLOCKED | No posts found |
| 2 | Step 2 | Click translate icon (🌐) on a post | ✅ CLEAR | Translate dialog opened |
| 3 | Step 3 | Verify AI and Manual translation options | ✅ CLEAR | Both AI and Manual options visible |
| 4 | Step 4 | Click AI translate option, verify editor with translated content | ❌ BLOCKED | Could not verify editor |
| 5 | Step 5 | Navigate back, choose manual, verify Translation Assistant | ❌ BLOCKED | Could not find translate button |
| 6 | Step 6 | Verify editor has editable content | ❌ BLOCKED | Could not find content editor |
| 7 | Step 7 | Verify Slug and Description (SEO) fields | ✅ CLEAR | Found: Slug Description |
| 8 | Step 8 | Verify Status dropdown and Save Changes button | ✅ CLEAR | Save Changes button visible |

### Step Details

#### Step 1: Find your post

**Help Instruction:** Go to Posts and locate the post you want to translate.

**Action Performed:** Navigate to Posts tab

**Rating:** BLOCKED

**Notes:** No posts found

**Screenshots:**
- Help: `flow2-step1-help.png`
- Action Result: `flow2-step1-action.png`

---

#### Step 2: Step 2

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Click translate icon (🌐) on a post

**Rating:** CLEAR

**Notes:** Translate dialog opened

**Screenshots:**
- Help: `flow2-step2-help.png`
- Action Result: `flow2-step2-action.png`

---

#### Step 3: Step 3

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Verify AI and Manual translation options

**Rating:** CLEAR

**Notes:** Both AI and Manual options visible

**Screenshots:**
- Help: `flow2-step3-help.png`
- Action Result: `flow2-step3-action.png`

---

#### Step 4: Step 4

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Click AI translate option, verify editor with translated content

**Rating:** BLOCKED

**Notes:** Could not verify editor

**Screenshots:**
- Help: `flow2-step4-help.png`
- Action Result: `flow2-step4-action.png`

---

#### Step 5: Step 5

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Navigate back, choose manual, verify Translation Assistant

**Rating:** BLOCKED

**Notes:** Could not find translate button

**Screenshots:**
- Help: `flow2-step5-help.png`
- Action Result: `flow2-step5-action.png`

---

#### Step 6: Step 6

**Help Instruction:** Posts
This is where you manage all your blog posts - create, edit, preview, translate, and delete.

Top Buttons

  New Post (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.
  Manage Tags - Opens a dialog where you can add new tags, rename existing ones, or delete them.


Filters
Use the filter card at the top to narrow your list:

  Status - Show All Posts, Draft Only, In Review Only, Published Only, or Archived Only.
  Language - Show All Languages, English, or French.
  Title Keyword - Type a word to search by post title.
  The post count on the right shows how many posts match your current filters.

If you arrived from the Topics tab with a topic filter active, a blue banner appears. Click the X on the badge to clear it.

Post Cards
Each post appears as a card showing:

  Title - The post name. If created from a topic, a View source topic link appears next to it.
  Description - A short summary (2 lines max).
  Badges below the description: language (EN/FR), status (Draft / In Review / Published date / Archived), tag badges, and Featured (purple) if marked.


Action Icons (right side of each card)
Each card has 5 controls on the right:

  Status dropdown - Change status directly (Draft, In Review, Published, or Archived). No need to open the editor.
  Eye icon ("View post") - Open the post on the public blog in a new tab.
  Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.
  Pencil icon ("Edit post") - Open the post in the Blog Editor.
  Trash icon ("Delete post", red) - Delete the post with confirmation.


Tips

  To quickly change a post status, use the Status dropdown on the card - no need to open the editor.
  The Translation button copies everything (title, content, images). Just replace the text.
  To create a post from scratch, click New Post. To create one from a content plan, go to the Topics tab instead.
  Click New Post to choose between writing from scratch or generating with AI.


Translating Posts
Click the 🌐 translate icon on any post to create a translation. Choose ✨ Translate with AI for one-click automatic translation, or Translate manually to use your own tools.

**Action Performed:** Verify editor has editable content

**Rating:** BLOCKED

**Notes:** Could not find content editor

**Screenshots:**
- Help: `flow2-step6-help.png`
- Action Result: `flow2-step6-action.png`

---

#### Step 7: Step 7

**Help Instruction:** Blog Editor
This screen lets you edit a blog post. All changes are saved only when you click Save Changes - nothing is saved automatically.

Top Bar
The top-right corner has action buttons:

  Save Changes (orange) - Saves all fields at once: title, content, status, tags, hero image, and publication date
  Preview - Opens the published post in a new browser tab. Only available when the post status is Published
  Translation Assistant - Appears only for translation drafts (posts with "[TRANSLATE TO...]" in the title). Guides you through a 3-step translation process using your AI assistant, automatically preserving images.


Fields (top to bottom)

Title - The post headline. This is what readers see first.

Slug (URL) - The URL path for this post. Example: my-blog-post becomes /blog/my-blog-post. Use lowercase letters, numbers, and hyphens only.

Description (SEO) - A short summary shown in search engine results and social media previews. Keep it under 160 characters.

Hero Image
The main image displayed at the top of the post.

  Click Select Hero Image (or Change Hero Image if one is already set)
  A dialog opens with two options:
    
      Upload new image - Click Choose File to upload from your computer (PNG, JPG, GIF, WEBP, max 5 MB)
      Select from existing images - Click any image thumbnail to use it
    
  


Status & Publication Date
These two fields appear side by side.
Status - Choose the workflow stage:

  Draft - Work in progress, not visible to readers
  In Review - Ready for review before publishing
  Published - Live and visible on the blog
  Archived - Hidden from the public blog but preserved in the system


Published At - Controls when the post appears on the blog.

  Click Choisir une date to open the date picker
  Pick a day on the calendar, then set the time (hours : minutes)
  Click Définir maintenant to set the current date and time (French timezone)
  Click Effacer to clear the date


Tags
Colored labels that categorize your post. Click a tag to select it (it gets a ring highlight). Click again to deselect. The count of selected tags is shown below.
If no tags exist, create them first in the Posts tab using Manage Tags.

Featured Post
An orange section that lets you highlight this post in the featured carousel on the blog page.

  Toggle the switch on to mark as featured
  Set Featured Order (1 = appears first in the carousel)
  Toggle off to remove from the carousel


Content
The main body of your post - a rich text editor with a full toolbar. You can format text, insert images, add links, tables, and switch to code view for direct HTML editing.

Language
Shown at the bottom - displays whether this post is in English or French. The language is set when the post is created and cannot be changed here.

Translation Assistant
The Translation Assistant button only appears for posts with "[TRANSLATE TO...]" in the title. It provides a 3-step process:

  Extract - Replaces images with [IMAGE 1], [IMAGE 2] placeholders
  Translate - Copy the prompt to your AI assistant and get the translated content
  Apply - Paste the translation and images are automatically restored


Tips

  Always click Save Changes after making edits - there is no auto-save
  Write your Description (SEO) before publishing - it improves search visibility
  Set a hero image - posts without one look incomplete on the blog page
  Use Draft while writing, switch to Published only when ready

**Action Performed:** Verify Slug and Description (SEO) fields

**Rating:** CLEAR

**Notes:** Found: Slug Description

**Screenshots:**
- Help: `flow2-step7-help.png`
- Action Result: `flow2-step7-action.png`

---

#### Step 8: Step 8

**Help Instruction:** Blog Editor
This screen lets you edit a blog post. All changes are saved only when you click Save Changes - nothing is saved automatically.

Top Bar
The top-right corner has action buttons:

  Save Changes (orange) - Saves all fields at once: title, content, status, tags, hero image, and publication date
  Preview - Opens the published post in a new browser tab. Only available when the post status is Published
  Translation Assistant - Appears only for translation drafts (posts with "[TRANSLATE TO...]" in the title). Guides you through a 3-step translation process using your AI assistant, automatically preserving images.


Fields (top to bottom)

Title - The post headline. This is what readers see first.

Slug (URL) - The URL path for this post. Example: my-blog-post becomes /blog/my-blog-post. Use lowercase letters, numbers, and hyphens only.

Description (SEO) - A short summary shown in search engine results and social media previews. Keep it under 160 characters.

Hero Image
The main image displayed at the top of the post.

  Click Select Hero Image (or Change Hero Image if one is already set)
  A dialog opens with two options:
    
      Upload new image - Click Choose File to upload from your computer (PNG, JPG, GIF, WEBP, max 5 MB)
      Select from existing images - Click any image thumbnail to use it
    
  


Status & Publication Date
These two fields appear side by side.
Status - Choose the workflow stage:

  Draft - Work in progress, not visible to readers
  In Review - Ready for review before publishing
  Published - Live and visible on the blog
  Archived - Hidden from the public blog but preserved in the system


Published At - Controls when the post appears on the blog.

  Click Choisir une date to open the date picker
  Pick a day on the calendar, then set the time (hours : minutes)
  Click Définir maintenant to set the current date and time (French timezone)
  Click Effacer to clear the date


Tags
Colored labels that categorize your post. Click a tag to select it (it gets a ring highlight). Click again to deselect. The count of selected tags is shown below.
If no tags exist, create them first in the Posts tab using Manage Tags.

Featured Post
An orange section that lets you highlight this post in the featured carousel on the blog page.

  Toggle the switch on to mark as featured
  Set Featured Order (1 = appears first in the carousel)
  Toggle off to remove from the carousel


Content
The main body of your post - a rich text editor with a full toolbar. You can format text, insert images, add links, tables, and switch to code view for direct HTML editing.

Language
Shown at the bottom - displays whether this post is in English or French. The language is set when the post is created and cannot be changed here.

Translation Assistant
The Translation Assistant button only appears for posts with "[TRANSLATE TO...]" in the title. It provides a 3-step process:

  Extract - Replaces images with [IMAGE 1], [IMAGE 2] placeholders
  Translate - Copy the prompt to your AI assistant and get the translated content
  Apply - Paste the translation and images are automatically restored


Tips

  Always click Save Changes after making edits - there is no auto-save
  Write your Description (SEO) before publishing - it improves search visibility
  Set a hero image - posts without one look incomplete on the blog page
  Use Draft while writing, switch to Published only when ready

**Action Performed:** Verify Status dropdown and Save Changes button

**Rating:** CLEAR

**Notes:** Save Changes button visible

**Screenshots:**
- Help: `flow2-step8-help.png`
- Action Result: `flow2-step8-action.png`

---

## Screen Help Accuracy

| Route | Help Title | Screen Name | Match | Rating | Notes |
|-------|------------|-------------|-------|--------|-------|
| `/admin?tab=blog` | Blog Hub | Blog Hub | ✅ | ✅ CLEAR | - |
| `/admin?tab=posts` | Posts | Posts | ✅ | ✅ CLEAR | - |
| `/admin?tab=ai-creator` | AI Creator | AI Creator | ✅ | ✅ CLEAR | - |
| `/admin?tab=blog-edit&id=test` | Blog Editor | Blog Editor | ✅ | ✅ CLEAR | - |
| `/admin?tab=planner` | Weekly Planner | Planner | ✅ | ✅ CLEAR | - |
| `/admin?tab=keywords` | Keywords | Keywords | ✅ | ✅ CLEAR | - |
| `/admin?tab=topics` | Topics | Topics | ✅ | ✅ CLEAR | - |
| `/admin?tab=images` | (not found) | Images | ✅ | ⚠️ AMBIGUOUS | No help title found in .prose h3 |
| `/admin?tab=new-post` | Create a New Blog Post | New Post | ✅ | ✅ CLEAR | - |

### Screen Screenshots

| Screen | Help | UI |
|--------|------|-----|
| Blog Hub | `screen-blog-hub-help.png` | `screen-blog-hub-ui.png` |
| Posts | `screen-posts-help.png` | `screen-posts-ui.png` |
| AI Creator | `screen-ai-creator-help.png` | `screen-ai-creator-ui.png` |
| Blog Editor | `screen-blog-editor-help.png` | `screen-blog-editor-ui.png` |
| Planner | `screen-planner-help.png` | `screen-planner-ui.png` |
| Keywords | `screen-keywords-help.png` | `screen-keywords-ui.png` |
| Topics | `screen-topics-help.png` | `screen-topics-ui.png` |
| Images | `screen-images-help.png` | `screen-images-ui.png` |
| New Post | `screen-new-post-help.png` | `screen-new-post-ui.png` |

---

## Recommendations

### Critical (BLOCKED Flow Steps)

- **Step 6** (Step 6): No posts found to edit
- **Step 7** (Step 7): Could not find status dropdown or save button
- **Step 1** (Find your post): No posts found
- **Step 4** (Step 4): Could not verify editor
- **Step 5** (Step 5): Could not find translate button
- **Step 6** (Step 6): Could not find content editor

### Screen Issues

- **Images**: No help title found in .prose h3

---

## Test Artifacts

- **Screenshots:** `tests/e2e/screenshots/help-validation/v4/`
- **Test Script:** `tests/e2e/naive-user-help-test-v4.ts`
- **JSON Results:** `tests/e2e/screenshots/help-validation/v4/test-results.json`

---

*Generated by Playwright V4 automated walkthrough with real navigation*
