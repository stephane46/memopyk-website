# Full Blog Creation Workflow (v2025 – Integrated WYSIWYG)

## STEP 1 — Create the draft with the AI Blog Creator

1. Go to **Admin → Blog → AI Creator**.

2. Enter:
   - **Topic** (ex: "Family Reunion Tips")
   - **Language** → choose English (en-US) or French (fr-FR)
   - Optional **keywords for SEO**

3. Click **Generate Prompt**.

4. **Copy** the generated prompt and paste it into ChatGPT / Claude.

5. **Copy** the AI's JSON reply (it contains title, slug, HTML content, etc.).

6. **Paste** that JSON back into the AI Creator.

7. Click **Auto-Fix** (if needed) → **Validate & Edit Content**.

✅ JSON is validated and you enter the **editing mode**.

---

## STEP 2 — Refine content with built-in WYSIWYG editor

After validation passes:

1. A **TinyMCE rich text editor** appears with your AI-generated content.

2. Use the toolbar to:
   - Add or modify **tables**
   - Insert **images** (external URLs)
   - Format text (**bold**, *italic*, headings)
   - Create **lists** and **links**
   - Switch to **code view** to see/edit raw HTML

3. Edit the **Post Title** if needed.

4. Content is automatically **sanitized** (DOMPurify) and **normalized**:
   - All external links get `rel="noopener nofollow"`
   - All images get `loading="lazy"`

---

## STEP 3 — Submit to Directus

1. Review your refined content in the editor.

2. Click **Submit to Directus**.

3. Post is created as a **draft** in Directus CMS.

✅ **Result**: Post is ready for final approval in Directus.

---

## STEP 4 — Final approval & publication (in Directus)

1. Go to **Directus → Collections → posts**.

2. Open the new draft.

3. Review:
   - Title, description, SEO fields
   - Content (HTML body)
   - Tags, author, featured status

4. Set:
   - `status = published`
   - `language` confirmed (en-US or fr-FR)
   - `published_at` date/time

5. **Save**.

✅ **Post is now live on the website.**

---

## STEP 5 — Optional follow-ups

- Add **tags** (if missing)
- Verify **SEO fields** (title ≤ 60 chars, description 120–160 chars)
- Check **layout on site** for responsive display
- Monitor **blog analytics** in Admin dashboard

---

## Key Benefits of Integrated Workflow

✅ **No external tools needed** – Everything happens in your admin interface  
✅ **Automatic security** – Links and images normalized, HTML sanitized  
✅ **Fast iteration** – Edit and refine without copy-paste friction  
✅ **Safe publishing** – Draft → Review → Publish with full control

---

**Previous workflow (external CKEditor):** 7 steps with copy-paste between systems  
**New workflow (integrated WYSIWYG):** 5 steps, everything in-house ✨
