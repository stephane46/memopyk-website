# Self-Hosted TinyMCE Implementation

## Overview

The blog AI Creator uses a **self-hosted TinyMCE editor** (no CDN, no API key) with a feature flag fallback to React-Quill.

## Feature Flag

Control which editor loads via environment variable:

```bash
VITE_EDITOR_ENGINE=tinymce  # Default - Self-hosted TinyMCE
VITE_EDITOR_ENGINE=quill    # Fallback - React-Quill with HTML source view
```

## Architecture

### TinyMCE (Default)
- **Self-hosted**: Loads from `node_modules/tinymce` bundle (no external CDN)
- **GPL License**: Uses `license_key: 'gpl'` for free self-hosted version
- **Plugins**: link, lists, table, code
- **Toolbar**: undo/redo, bold/italic/underline, lists, link, table, HTML code view
- **Table support**: Native table insertion and editing
- **Code view**: Built-in HTML source editor

### React-Quill (Fallback)
- **Self-contained**: No external dependencies
- **HTML source toggle**: Custom "View Source" button for manual HTML editing
- **Table workaround**: Use source view to insert `<table>` HTML manually

## Sanitization Rules

All HTML content is sanitized before submission to Directus:

```typescript
const cleaned = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p','h2','h3','h4','ul','ol','li','blockquote','pre','code','strong','em','a','img','br','hr','table','thead','tbody','tr','th','td'],
  ALLOWED_ATTR: ['href','target','rel','src','alt','title','loading']
})
```

### Automatic Normalization

1. **External links**: All `<a href="https://...">` tags get `rel="noopener nofollow"`
2. **Images**: All `<img>` tags get `loading="lazy"` for performance
3. **XSS protection**: DOMPurify blocks all dangerous HTML/JS

## Implementation Files

- **`client/src/admin/HtmlEditor.tsx`**: Dual-engine editor component
- **`client/src/admin/BlogAICreator.tsx`**: AI workflow + sanitization logic
- **`server/routes.ts`**: API endpoint `/api/admin/blog/create-from-ai`

## CSP Configuration

TinyMCE loads entirely from the application bundle - no external script sources needed. The existing CSP allows bundled scripts.

## Testing Checklist

- [ ] TinyMCE loads without API key warnings
- [ ] Table insertion works (Insert → Table)
- [ ] Code view shows HTML source
- [ ] Links get `rel="noopener nofollow"` after sanitization
- [ ] Images get `loading="lazy"` after sanitization
- [ ] Feature flag switches to React-Quill
- [ ] React-Quill source view works for manual HTML editing
- [ ] Post creation succeeds in Directus

## Rollback Procedure

If TinyMCE has issues:

1. Set environment variable: `VITE_EDITOR_ENGINE=quill`
2. Restart application
3. React-Quill loads as fallback with HTML source view

No code changes or redeployment needed.
