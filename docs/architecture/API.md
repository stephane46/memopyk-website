# API Reference

**Base URL:** `/api`  
**Format:** JSON  
**Authentication:** Session-based (cookie) for admin routes

---

## Authentication

### Admin Login

```
POST /api/admin/login
```

**Request:**
```json
{
  "secret": "ADMIN_SECRET value"
}
```

**Response:** Sets session cookie, returns `{ success: true }`

### Admin Logout

```
POST /api/admin/logout
```

**Response:** Clears session cookie

### Check Auth Status

```
GET /api/admin/auth-check
```

**Response:** `{ authenticated: true/false }`

---

## Route Modules

### 1. Health (`health.routes.ts`)

Health check endpoints for monitoring.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Basic health check |

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "uptime": 3600
}
```

---

### 2. Hero (`hero.routes.ts`)

Hero section videos and text settings.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hero-videos` | No | Get all hero videos |
| GET | `/api/hero-videos/:id` | No | Get single video |
| POST | `/api/hero-videos` | Admin | Create video |
| PUT | `/api/hero-videos/:id` | Admin | Update video |
| DELETE | `/api/hero-videos/:id` | Admin | Delete video |
| GET | `/api/hero-text` | No | Get hero text settings |
| PUT | `/api/hero-text/:id` | Admin | Update hero text |

---

### 3. Gallery (`gallery.routes.ts`)

Video gallery management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/gallery` | No | Get all gallery items |
| GET | `/api/gallery/:id` | No | Get single item |
| POST | `/api/gallery` | Admin | Create item |
| PUT | `/api/gallery/:id` | Admin | Update item |
| DELETE | `/api/gallery/:id` | Admin | Delete item |
| POST | `/api/gallery/:id/thumbnail` | Admin | Upload thumbnail |
| PUT | `/api/gallery/reorder` | Admin | Reorder items |

**Query Parameters (GET /api/gallery):**
- `active=true` — Only active items
- `lang=en|fr` — Language filter

---

### 4. FAQ (`faq.routes.ts`)

FAQ sections and questions.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/faq` | No | Get all FAQs (grouped by section) |
| GET | `/api/faq-sections` | No | Get FAQ sections |
| POST | `/api/faq-sections` | Admin | Create section |
| PUT | `/api/faq-sections/:id` | Admin | Update section |
| DELETE | `/api/faq-sections/:id` | Admin | Delete section |
| GET | `/api/faq/:id` | No | Get single FAQ |
| POST | `/api/faq` | Admin | Create FAQ |
| PUT | `/api/faq/:id` | Admin | Update FAQ |
| DELETE | `/api/faq/:id` | Admin | Delete FAQ |

---

### 5. Blog (`blog.routes.ts`)

Blog posts and tags.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/blog/posts` | No | Get published posts |
| GET | `/api/blog/posts/:slug` | No | Get post by slug |
| GET | `/api/blog/tags` | No | Get all tags |
| GET | `/api/blog/tags/:slug` | No | Get posts by tag |
| POST | `/api/admin/blog/posts` | Admin | Create post |
| PUT | `/api/admin/blog/posts/:id` | Admin | Update post |
| PATCH | `/api/admin/blog/posts/:id` | Admin | Partial update |
| DELETE | `/api/admin/blog/posts/:id` | Admin | Delete post |
| POST | `/api/admin/blog/tags` | Admin | Create tag |
| PUT | `/api/admin/blog/tags/:id` | Admin | Update tag |
| DELETE | `/api/admin/blog/tags/:id` | Admin | Delete tag |
| GET | `/api/admin/blog/images` | Admin | List blog images |
| POST | `/api/admin/blog/images` | Admin | Upload image |
| DELETE | `/api/admin/blog/images/:filename` | Admin | Delete image |

**Query Parameters (GET /api/blog/posts):**
- `page=1` — Page number
- `limit=10` — Items per page
- `status=published|draft` — Filter by status
- `lang=en|fr` — Language filter

---

### 6. Contact (`contact.routes.ts`)

Contact form submissions.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/contact` | No | Submit contact form |
| GET | `/api/admin/contacts` | Admin | List submissions |
| PUT | `/api/admin/contacts/:id` | Admin | Update status |
| DELETE | `/api/admin/contacts/:id` | Admin | Delete submission |

**POST /api/contact Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Inquiry",
  "message": "Hello...",
  "package": "standard",
  "preferredContact": "email"
}
```

---

### 7. Partners (`partners.routes.ts`)

Partner directory.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/partners` | No | Get all partners |
| GET | `/api/partners/:id` | No | Get single partner |
| POST | `/api/partners` | Admin | Create partner |
| PUT | `/api/partners/:id` | Admin | Update partner |
| DELETE | `/api/partners/:id` | Admin | Delete partner |
| GET | `/api/partners/countries` | No | Get countries with partners |

**Query Parameters (GET /api/partners):**
- `country=CA` — Filter by country code
- `type=photographer` — Filter by partner type
- `featured=true` — Featured partners only

---

### 8. Legal (`legal.routes.ts`)

Legal documents (Privacy, Terms, etc.).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/legal` | No | Get all legal docs |
| GET | `/api/legal/:type` | No | Get by type (privacy, terms) |
| PUT | `/api/legal/:type` | Admin | Update document |

---

### 9. SEO (`seo.routes.ts`)

SEO settings and redirects.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/seo` | No | Get all SEO settings |
| GET | `/api/seo/:page` | No | Get page SEO |
| PUT | `/api/seo/:page` | Admin | Update page SEO |
| GET | `/api/seo-redirects` | No | Get redirects |
| POST | `/api/seo-redirects` | Admin | Create redirect |
| PUT | `/api/seo-redirects/:id` | Admin | Update redirect |
| DELETE | `/api/seo-redirects/:id` | Admin | Delete redirect |
| GET | `/api/seo-global` | No | Get global SEO |
| PUT | `/api/seo-global` | Admin | Update global SEO |

---

### 10. CTA (`cta.routes.ts`)

Call-to-action and Why MEMOPYK cards.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cta` | No | Get CTA settings |
| PUT | `/api/cta/:id` | Admin | Update CTA |
| GET | `/api/why-memopyk-cards` | No | Get benefit cards |
| POST | `/api/why-memopyk-cards` | Admin | Create card |
| PUT | `/api/why-memopyk-cards/:id` | Admin | Update card |
| DELETE | `/api/why-memopyk-cards/:id` | Admin | Delete card |
| PUT | `/api/why-memopyk-cards/reorder` | Admin | Reorder cards |

---

### 11. Analytics (`analytics.routes.ts`)

Google Analytics 4 tracking.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/event` | No | Track custom event |
| GET | `/api/ga4/realtime` | Admin | Real-time visitors |
| GET | `/api/ga4/report` | Admin | Run GA4 report |

**POST /api/event Request:**
```json
{
  "name": "video_play",
  "params": {
    "video_id": "abc123",
    "video_title": "Example Video"
  }
}
```

---

### 12. Analytics Legacy (`analytics-legacy.routes.ts`)

Custom analytics endpoints (rebuilt January 31, 2026).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/dashboard` | Admin | Dashboard summary |
| GET | `/api/analytics/sessions` | Admin | Session list |
| GET | `/api/analytics/videos` | Admin | Video analytics |
| GET | `/api/analytics/geo` | Admin | Geographic data |
| ... | ... | ... | 58 endpoints total |

**Status:** ✅ Functional. See `docs/guides/ANALYTICS.md` for details.

---

### 13. Newsletter (`newsletter.routes.ts`)

Newsletter subscriptions.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/newsletter/subscribe` | No | Subscribe email |
| DELETE | `/api/newsletter/unsubscribe` | No | Unsubscribe email |
| GET | `/api/admin/newsletter/subscribers` | Admin | List subscribers |

---

### 14. Admin (`admin.routes.ts`)

Admin authentication and utilities.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | No | Admin login |
| POST | `/api/admin/logout` | Yes | Admin logout |
| GET | `/api/admin/auth-check` | No | Check auth status |

---

### 15. Media (`media.routes.ts`)

File uploads and video serving.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/image` | Admin | Upload image |
| POST | `/api/upload/video` | Admin | Upload video |
| GET | `/api/video-proxy/:filename` | No | Proxy video from CDN |
| DELETE | `/api/upload/:filename` | Admin | Delete upload |

**POST /api/upload/image:**
- Content-Type: `multipart/form-data`
- Field: `file`
- Returns: `{ url: "https://..." }`

---

### 16. Travel Upload (`travel-upload.routes.ts`)

Travel agency upload portal.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/travel/validate-code` | No | Validate agency code |
| POST | `/api/travel/submit` | No | Submit upload form |
| GET | `/api/admin/travel/submissions` | Admin | List submissions |
| GET | `/api/admin/travel/agency-codes` | Admin | List agency codes |
| POST | `/api/admin/travel/agency-codes` | Admin | Create agency code |
| PUT | `/api/admin/travel/agency-codes/:id` | Admin | Update code |
| DELETE | `/api/admin/travel/agency-codes/:id` | Admin | Delete code |

**POST /api/travel/submit Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "agencyCode": "AGENCY123",
  "language": "en"
}
```

**Response:** Creates Nextcloud folder, returns share URL.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "statusCode": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for:
- `/api/contact` — Spam prevention
- `/api/newsletter/subscribe` — Abuse prevention
- `/api/event` — Analytics spam

---

## CORS

CORS is configured to allow:
- Same-origin requests (production)
- `localhost:5173` (development)

---

*See [OVERVIEW.md](OVERVIEW.md) for system architecture and [DATABASE.md](DATABASE.md) for schema details.*
