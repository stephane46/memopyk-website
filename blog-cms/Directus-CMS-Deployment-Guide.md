# 🚀 Directus CMS Deployment Guide via Coolify for MEMOPYK

*Complete step-by-step guide for deploying Directus CMS on VPS using Coolify*

**Last Updated:** October 5, 2025  
**Status:** Production Ready  
**Target Environment:** MEMOPYK VPS with Coolify

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pre-Deployment Preparation](#pre-deployment-preparation)
3. [Coolify Deployment Configuration](#coolify-deployment-configuration)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [Deployment & SSL Setup](#deployment--ssl-setup)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Database Schema Setup](#database-schema-setup)
8. [Security & Permissions](#security--permissions)
9. [MCP Integration Setup](#mcp-integration-setup)
10. [Next.js Integration](#nextjs-integration)
11. [Data Migration Strategy](#data-migration-strategy)
12. [Production Checklist](#production-checklist)
13. [Advanced Enhancements](#advanced-enhancements)
14. [Troubleshooting](#troubleshooting)

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MEMOPYK VPS (Coolify)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐         ┌──────────────────┐    │
│  │   Next.js App   │◄────────┤  Directus CMS    │    │
│  │  (Frontend)     │  API    │  (Admin Panel)   │    │
│  └─────────────────┘         └──────────────────┘    │
│           │                           │                │
│           │                           │                │
│           ▼                           ▼                │
│  ┌─────────────────────────────────────────────┐      │
│  │        Supabase PostgreSQL Database         │      │
│  │  (Existing - shared by Next.js & Directus)  │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ HTTPS API Calls
                          │
                 ┌────────┴────────┐
                 │   Claude Desktop │
                 │   (MCP Client)   │
                 └──────────────────┘
```

**Key Components:**
- **Directus CMS:** Headless CMS for blog content management
- **Supabase PostgreSQL:** Existing database (shared with Next.js)
- **Coolify:** Self-hosted deployment platform
- **Domain:** `https://cms.memopyk.org`
- **MCP Integration:** Claude Desktop for AI-powered content creation

**Why This Architecture:**
- ✅ Single database (Supabase) for both Next.js and Directus
- ✅ No data migration needed
- ✅ Better CMS interface than raw database access
- ✅ AI-powered content creation via MCP
- ✅ RESTful/GraphQL APIs for Next.js frontend

---

## 🎯 Pre-Deployment Preparation

### Step 1: Gather Supabase Connection Details

You'll need these from your Supabase project:

```bash
# Supabase PostgreSQL Connection String Format:
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Or individual components:
DB_HOST=db.[YOUR-PROJECT-REF].supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-SUPABASE-PASSWORD]
```

**To find these:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Look for "Connection string" under "Connection pooling"
3. Copy the URI or individual connection parameters

**⚠️ Important Notes:**
- Use the **connection pooling** string (not direct connection)
- Enable **SSL** for secure connection
- Store credentials securely in password manager

### Step 2: DNS Configuration

Add an A record or CNAME for Directus subdomain:

```
Type: A Record (or CNAME)
Name: directus
Value: [Your VPS IP Address]
TTL: 3600
```

**Result:** `https://cms.memopyk.org` will point to your VPS

**Verification:**
```bash
# Test DNS propagation
nslookup cms.memopyk.org

# Or use dig
dig cms.memopyk.org +short
```

### Step 3: Generate Secure Keys

Run these commands on your local machine or VPS to generate secure random keys:

```bash
# Generate DIRECTUS_KEY (32 characters minimum)
openssl rand -base64 32

# Generate DIRECTUS_SECRET (64 characters minimum)
openssl rand -base64 64
```

**Save these values** - you'll need them for environment variables!

---

## 🐳 Coolify Deployment Configuration

### Step 1: Create Directus Service in Coolify

1. **Log into Coolify Dashboard**
2. **Navigate to:** Your Project → "New Resource" → "Docker Compose"
3. **Service Name:** `directus-cms`

### Step 2: Docker Compose Configuration

Create this `docker-compose.yml` for Coolify:

```yaml
version: '3.8'

services:
  directus:
    image: directus/directus:11.1.0
    container_name: directus-memopyk
    restart: unless-stopped
    ports:
      - "8055:8055"
    
    environment:
      # === REQUIRED: Secret Keys ===
      KEY: "${DIRECTUS_KEY}"
      SECRET: "${DIRECTUS_SECRET}"
      
      # === Database Connection (Supabase) ===
      DB_CLIENT: "pg"
      DB_HOST: "${DB_HOST}"
      DB_PORT: "${DB_PORT}"
      DB_DATABASE: "${DB_DATABASE}"
      DB_USER: "${DB_USER}"
      DB_PASSWORD: "${DB_PASSWORD}"
      DB_SSL: "true"
      DB_SSL_REJECT_UNAUTHORIZED: "false"  # Supabase uses SSL
      
      # === Admin Account ===
      ADMIN_EMAIL: "${ADMIN_EMAIL}"
      ADMIN_PASSWORD: "${ADMIN_PASSWORD}"
      
      # === Public URL ===
      PUBLIC_URL: "https://cms.memopyk.org"
      
      # === File Storage (Local for now) ===
      STORAGE_LOCATIONS: "local"
      STORAGE_LOCAL_ROOT: "./uploads"
      
      # === Extensions & Cache ===
      EXTENSIONS_PATH: "./extensions"
      CACHE_ENABLED: "true"
      CACHE_STORE: "memory"
      
      # === Security ===
      ACCESS_TOKEN_TTL: "15m"
      REFRESH_TOKEN_TTL: "7d"
      REFRESH_TOKEN_COOKIE_SECURE: "true"
      REFRESH_TOKEN_COOKIE_SAME_SITE: "lax"
      
      # === CORS (for Next.js integration) ===
      CORS_ENABLED: "true"
      CORS_ORIGIN: "https://memopyk.org,https://www.memopyk.org"
      CORS_CREDENTIALS: "true"
      
      # === Rate Limiting ===
      RATE_LIMITER_ENABLED: "true"
      RATE_LIMITER_POINTS: "50"
      RATE_LIMITER_DURATION: "1"
      
      # === Logging ===
      LOG_LEVEL: "info"
      LOG_STYLE: "pretty"
      
      # === Email (Optional - configure later) ===
      EMAIL_FROM: "noreply@memopyk.org"
      EMAIL_TRANSPORT: "smtp"
      # EMAIL_SMTP_HOST: "smtp.gmail.com"
      # EMAIL_SMTP_PORT: "587"
      # EMAIL_SMTP_USER: ""
      # EMAIL_SMTP_PASSWORD: ""
    
    volumes:
      - directus_uploads:/directus/uploads
      - directus_extensions:/directus/extensions
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8055/server/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  directus_uploads:
    driver: local
  directus_extensions:
    driver: local
```

**Configuration Notes:**
- ✅ Uses Directus 11.1.0 (latest stable)
- ✅ SSL enabled for Supabase connection
- ✅ CORS configured for Next.js integration
- ✅ Rate limiting enabled for security
- ✅ Health check for monitoring
- ✅ Persistent volumes for uploads and extensions

---

## 🔐 Environment Variables Configuration

### Environment Variables Template

In **Coolify Dashboard**, add these environment variables to your Directus service:

```bash
# === CRITICAL: Secret Keys (Generate new ones!) ===
DIRECTUS_KEY=YOUR_GENERATED_KEY_FROM_STEP_3
DIRECTUS_SECRET=YOUR_GENERATED_SECRET_FROM_STEP_3

# === Supabase Database Connection ===
DB_HOST=db.[YOUR-PROJECT-REF].supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_SUPABASE_PASSWORD_HERE

# === Admin Account (Change after first login!) ===
ADMIN_EMAIL=admin@memopyk.org
ADMIN_PASSWORD=ChangeThisSecurePassword123!
```

**⚠️ SECURITY BEST PRACTICES:**
- ✅ Use **strong, unique passwords** (20+ characters)
- ✅ Store these in a **password manager** (1Password, Bitwarden)
- ✅ Change the admin password **immediately after first login**
- ✅ Never commit these to Git or share in plain text
- ✅ Enable 2FA on admin account after setup

### How to Add Environment Variables in Coolify

1. **Navigate to:** Directus service in Coolify
2. **Click:** "Environment Variables" tab
3. **Add each variable** one by one:
   - Name: `DIRECTUS_KEY`
   - Value: `[your generated key]`
   - Click "Add"
4. **Repeat** for all variables above
5. **Save changes**

---

## 🌐 Deployment & SSL Setup

### Step 1: Deploy Service

1. **Paste the Docker Compose** configuration in Coolify
2. **Add environment variables** from previous section
3. **Click "Deploy"**
4. **Monitor logs** for successful startup

**Expected log output:**
```
✨ Server started at http://0.0.0.0:8055
✨ WebSocket server started at ws://0.0.0.0:8055
✅ Database connection successful
✅ Admin user created
```

**Deployment Time:** 2-5 minutes (first time)

### Step 2: Configure Domain & SSL in Coolify

1. **Navigate to:** Directus service → "Domains"
2. **Add domain:** `cms.memopyk.org`
3. **Enable SSL:** Toggle "Enable SSL" (Coolify auto-provisions Let's Encrypt)
4. **Port mapping:** Map internal port `8055` to HTTP/HTTPS

**Coolify will automatically:**
- ✅ Set up reverse proxy (Traefik/Nginx)
- ✅ Generate SSL certificate via Let's Encrypt
- ✅ Handle HTTP → HTTPS redirection
- ✅ Auto-renew certificates every 90 days

**SSL Verification:**
```bash
# Check SSL certificate
curl -I https://cms.memopyk.org

# Should return: HTTP/2 200
```

### Step 3: Verify Deployment

1. **Access:** `https://cms.memopyk.org`
2. **You should see:** Directus login page
3. **Health check:** `https://cms.memopyk.org/server/health`
   - Should return: `{"status":"ok"}`

---

## ✅ Post-Deployment Configuration

### Step 1: Initial Login

1. **Navigate to:** `https://cms.memopyk.org`
2. **Login with:**
   - Email: `admin@memopyk.org` (from env vars)
   - Password: (from env vars)

### Step 2: Change Admin Password (CRITICAL!)

**Do this immediately after first login:**

1. Click **user icon** (top right) → "User Directory"
2. Click **your admin user**
3. **Click "Edit"**
4. **Change password** to a new secure password:
   - Minimum 20 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use password manager to generate
5. **Save changes**
6. **Re-login** with new password

### Step 3: Enable Two-Factor Authentication (2FA)

1. **Navigate to:** User icon → "Account Settings"
2. **Click:** "Two-Factor Authentication"
3. **Click:** "Enable 2FA"
4. **Scan QR code** with authenticator app (Google Authenticator, Authy)
5. **Enter verification code**
6. **Save recovery codes** in secure location
7. **Confirm** 2FA is enabled

### Step 4: Create API Token for MCP

1. **Navigate to:** Settings → Access Tokens
2. **Click:** "Create Item"
3. **Configure token:**
   - **Name:** `MCP Claude Desktop`
   - **Type:** `Admin` (or custom role with full read/write)
   - **Expiration:** No expiration (or set as needed)
   - **Permissions:** All collections
4. **Click:** "Save"
5. **Copy token immediately** (only shown once!)
6. **Store securely** in password manager

**Token format:** `directus_token_abc123xyz789...`

---

## 🗄️ Database Schema Setup in Directus

### Step 1: Verify Existing Collections

Directus will **automatically detect** your existing Supabase tables:

1. **Navigate to:** Settings → Data Model
2. **You should see** 9 existing collections:
   - `languages`
   - `authors`
   - `categories`
   - `tags`
   - `posts`
   - `post_tags`
   - `post_translations`
   - `images`
   - `post_analytics`

**✅ If you see these collections:** Great! Directus is connected to Supabase.  
**❌ If you don't see them:** Check database connection in Settings → Project Settings.

### Step 2: Configure Posts Collection Display

1. **Navigate to:** Settings → Data Model → `posts`
2. **Configure Collection Settings:**

```yaml
Display Template: {{title}} ({{status}})
Sort Field: created_at
Sort Direction: Descending
Archive Field: archived (create if doesn't exist)
Note: Main blog posts collection
Icon: article
Color: #3498db
```

3. **Save changes**

### Step 3: Configure Field Interfaces for Better UX

For each field in the `posts` collection, configure the interface for easier content management.

**Navigate to:** Settings → Data Model → `posts` → Fields

See the full field configuration guide below.

---

## 🔒 Security & Permissions

### Create User Roles

**Recommended roles for team management:**

#### 1. Administrator (Already exists)
- Full access to all collections and settings
- You already have this

#### 2. Editor (Content Manager)

```yaml
Role Name: Editor
Description: Content managers who can create/edit blog posts
Permissions:
  posts: CRUD (all)
  post_translations: CRUD (all)
  categories: CRUD (limited delete)
  tags: CRUD (limited delete)
  images: CRUD (all)
  authors: Read only
  post_analytics: Read only
```

#### 3. Public API (Next.js Frontend)

```yaml
Role Name: Public API
Description: Read-only access for website frontend
Permissions:
  posts: Read (status = published only)
  post_translations: Read
  categories: Read
  tags: Read
  images: Read
  authors: Read (limited fields)
```

---

## 🔌 MCP Integration Setup

### Install Directus MCP Server

On your **Windows PC with Claude Desktop**:

```powershell
npm install -g @modelcontextprotocol/server-directus
```

### Configure Claude Desktop

**Edit:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "directus-memopyk": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-directus"
      ],
      "env": {
        "DIRECTUS_URL": "https://cms.memopyk.org",
        "DIRECTUS_TOKEN": "YOUR_API_TOKEN_FROM_STEP_4"
      }
    }
  }
}
```

### Restart Claude Desktop and Test

```
"List all blog posts from Directus"
"Create a new draft post titled 'Test Post'"
```

---

## 🔗 Next.js Integration

### Install Directus SDK

```bash
npm install @directus/sdk
```

### Create Directus Client

**File:** `lib/directus.ts`

```typescript
import { createDirectus, rest, authentication } from '@directus/sdk';

interface Schema {
  posts: Post[];
  post_translations: PostTranslation[];
  authors: Author[];
  categories: Category[];
  tags: Tag[];
  images: Image[];
}

const directus = createDirectus<Schema>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://cms.memopyk.org'
)
  .with(rest())
  .with(authentication('json'));

export default directus;
```

### Environment Variables

**File:** `.env.local`

```bash
NEXT_PUBLIC_DIRECTUS_URL=https://cms.memopyk.org
DIRECTUS_ADMIN_TOKEN=YOUR_ADMIN_TOKEN  # Server-side only
```

---

## 📦 Data Migration Strategy

### Recommended: Keep Existing Data in Supabase

**No migration needed!**

- ✅ Directus reads/writes to same Supabase database
- ✅ Existing Next.js queries still work
- ✅ Zero downtime
- ✅ Start using Directus admin panel immediately

---

## 🛡️ Production Checklist

### Security

- [ ] Admin password changed (20+ characters)
- [ ] 2FA enabled on admin account
- [ ] Editor role created with limited permissions
- [ ] Public API role created (read-only)
- [ ] Rate limiting enabled
- [ ] CORS restricted to production domains
- [ ] SSL verified and auto-renewal configured

### Backups

- [ ] Supabase automatic daily backups verified
- [ ] Directus uploads volume backup configured
- [ ] Backup restoration process tested

### Monitoring

- [ ] Directus health check endpoint monitored
- [ ] Database connection monitoring
- [ ] Disk space monitoring (uploads volume)
- [ ] SSL certificate expiration alerts

---

## 🚀 Advanced Enhancements (Optional)

### Cloudflare R2 for Media Storage

Replace local uploads with scalable R2 storage:

```yaml
STORAGE_LOCATIONS: "cloudflare"
STORAGE_CLOUDFLARE_DRIVER: "s3"
STORAGE_CLOUDFLARE_KEY: "YOUR_R2_ACCESS_KEY"
STORAGE_CLOUDFLARE_SECRET: "YOUR_R2_SECRET_KEY"
STORAGE_CLOUDFLARE_BUCKET: "memopyk-blog-media"
```

### Redis Caching

Add Redis service for better performance:

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  directus:
    environment:
      CACHE_ENABLED: "true"
      CACHE_STORE: "redis"
      REDIS: "redis://redis:6379"
```

---

## 🐛 Troubleshooting

### Directus won't start

**Check:**
1. Logs: `docker logs directus-memopyk`
2. Database connection string
3. All required environment variables set
4. Port 8055 not conflicting

### SSL certificate error

**Fix:**
1. Verify DNS points to VPS
2. Wait 5-10 minutes for Let's Encrypt
3. Check Coolify logs for SSL provisioning

### MCP not connecting

**Check:**
1. API token is valid
2. `DIRECTUS_URL` uses `https://`
3. Restart Claude Desktop completely

### CORS errors in Next.js

**Fix:**
```yaml
CORS_ORIGIN: "https://memopyk.org,https://www.memopyk.org,http://localhost:3000"
```

---

## 🎉 Deployment Complete!

After completing this guide, you'll have:

✅ **Directus CMS** running on VPS via Coolify  
✅ **Connected to Supabase** PostgreSQL  
✅ **SSL-secured** admin panel  
✅ **MCP integration** with Claude Desktop  
✅ **Next.js API** ready  
✅ **Production-ready** security and monitoring

**Next step:** Start creating blog content using Claude Desktop! 🚀📝

---

**Questions or issues?** Refer to troubleshooting section or check Directus documentation at https://docs.directus.io
