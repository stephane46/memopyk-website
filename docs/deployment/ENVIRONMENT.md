# Environment Variables Reference

**File:** `.env` (copy from `.env.example`)  
**Location:** Project root  
**Never commit `.env` to git!**

---

## Quick Setup

```bash
# Copy template
cp .env.example .env

# Generate secrets
openssl rand -base64 64  # For SESSION_SECRET
openssl rand -base64 32  # For ADMIN_SECRET
```

---

## Variable Reference

### Database (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:PASSWORD@supabase.memopyk.org:5432/postgres` |

**Notes:**
- Uses Supabase PostgreSQL (self-hosted on VPS)
- Connection pooling handled by Supabase
- Drizzle ORM uses this for all database operations

---

### Supabase API & Storage (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase API endpoint | `https://supabase.memopyk.org` |
| `SUPABASE_ANON_KEY` | Public (anon) API key | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side only) | `eyJ...` |

**Notes:**
- `SUPABASE_ANON_KEY` — Used for client-side operations (RLS applies)
- `SUPABASE_SERVICE_KEY` — Bypasses RLS, server-side only, never expose to client
- Storage CDN serves gallery videos and images

---

### Session & Security (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Express session signing key | 64+ character random string |
| `ADMIN_SECRET` | Admin panel authentication | 32+ character random string |

**Generate with:**
```bash
openssl rand -base64 64  # SESSION_SECRET
openssl rand -base64 32  # ADMIN_SECRET
```

**Notes:**
- `SESSION_SECRET` — Signs session cookies, must be consistent across deploys
- `ADMIN_SECRET` — Required for `/api/admin/*` and `/api/seo/*` routes

---

### Email - Resend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key | `re_xxxxxxxxxxxx` |

**Notes:**
- Used for contact form submissions
- Travel portal confirmation emails
- Get key from [resend.com/api-keys](https://resend.com/api-keys)

---

### Nextcloud Integration (Required for Travel Portal)

| Variable | Description | Example |
|----------|-------------|---------|
| `NC_ADMIN_USER` | Nextcloud admin username | `admin` |
| `NC_ADMIN_PASS` | Nextcloud admin password | `your-password` |

**Notes:**
- Travel Upload Portal creates shared folders in Nextcloud
- Uses WebDAV API for folder creation
- Uses OCS Share API for generating share links

---

### Google Analytics 4 (Required for Analytics)

| Variable | Description | Example |
|----------|-------------|---------|
| `GA4_MEASUREMENT_ID` | GA4 Measurement ID | `G-XXXXXXXXXX` |
| `GA4_API_SECRET` | Measurement Protocol secret | `your-api-secret` |
| `GA4_PROPERTY_ID` | GA4 Property ID | `501023254` |
| `GA4_PROJECT_ID` | GCP Project ID | `memopyk-ga4` |
| `GA4_DATASET` | BigQuery dataset name | `analytics_XXXXXXXXXX` |
| `GA4_CLIENT_EMAIL` | Service account email | `sa@project.iam.gserviceaccount.com` |
| `GA4_PRIVATE_KEY` | Service account private key (JSON) | `{"type":"service_account",...}` |

**Frontend variables (exposed to client):**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GA_MEASUREMENT_ID` | GA4 ID for client tracking | `G-XXXXXXXXXX` |
| `VITE_VIDEO_ANALYTICS_ENABLED` | Enable video play tracking | `true` |

**Notes:**
- Server-side GA4 variables used for Data API queries
- BigQuery integration for advanced analytics (optional)
- `VITE_*` variables are bundled into client code by Vite

---

### Microsoft Clarity (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `CLARITY_API_TOKEN` | Clarity API token | `eyJ...` |

**Notes:**
- Heatmaps and session recordings
- Optional — site works without it

---

### OpenReplay (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENREPLAY_ORG_API_KEY` | Organization API key | `your-org-key` |
| `VITE_OPENREPLAY_PROJECT_KEY` | Project key (client-side) | `your-project-key` |

**Notes:**
- Session replay tool
- Optional — site works without it

---

### Directus CMS (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `DIRECTUS_EMAIL` | Directus admin email | `admin@example.com` |
| `DIRECTUS_PASSWORD` | Directus admin password | `your-password` |

**Notes:**
- Optional CMS integration
- Not currently used in production

---

### Zoho CRM (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `ZOHO_BASE_URL` | Zoho API base URL | `https://www.zohoapis.eu` |
| `ZOHO_CLIENT_ID` | OAuth client ID | `your-client-id` |
| `ZOHO_CLIENT_SECRET` | OAuth client secret | `your-client-secret` |
| `ZOHO_REFRESH_TOKEN` | OAuth refresh token | `your-refresh-token` |
| `ZOHO_AUTH_URL` | OAuth token endpoint | `https://accounts.zoho.eu/oauth/v2/token` |

**Notes:**
- Contact form submissions can sync to Zoho CRM
- Uses OAuth 2.0 refresh token flow
- EU region URLs shown — adjust for your Zoho region

---

### Runtime (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` or `development` |
| `PORT` | Server port | `5000` |

**Notes:**
- `NODE_ENV=production` enables optimizations
- Server binds to `PORT` (default 5000)
- Coolify maps this to 443 via reverse proxy

---

## Environment by Context

### Development (Local)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...  # Can use same DB or local
```

### Staging (Coolify)

```env
NODE_ENV=production
PORT=5000
# All production values, staging domain
```

### Production (Coolify)

```env
NODE_ENV=production
PORT=5000
# All production values
```

---

## Coolify Configuration

In Coolify, set environment variables in the application settings:

1. Go to **Application → Environment Variables**
2. Add each variable from `.env.example`
3. Mark sensitive values as **Secret** (DATABASE_URL, API keys, etc.)
4. Click **Save** and **Redeploy**

**Tip:** Coolify can import from `.env` file directly.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Database connection failed | Wrong DATABASE_URL | Check host, port, credentials |
| Admin routes return 401 | Missing ADMIN_SECRET | Set ADMIN_SECRET in env |
| Emails not sending | Invalid RESEND_API_KEY | Verify key at resend.com |
| GA4 not tracking | Missing VITE_GA_MEASUREMENT_ID | Add to env, rebuild client |
| Travel Portal fails | NC_* variables missing | Configure Nextcloud credentials |

---

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] SESSION_SECRET is 64+ characters
- [ ] ADMIN_SECRET is 32+ characters
- [ ] SUPABASE_SERVICE_KEY never exposed to client
- [ ] All secrets marked as Secret in Coolify
- [ ] No secrets in commit history

---

*See [DOCKER.md](DOCKER.md) for how environment variables are used in the build process.*
