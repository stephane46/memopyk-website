# Coolify Deployment Guide

**Platform:** [Coolify](https://coolify.io) (self-hosted PaaS)  
**Server:** VPS with Docker  
**Domain:** memopyk.com

---

## Overview

Coolify provides:
- Git-based deployments (push to deploy)
- Automatic SSL certificates (Let's Encrypt)
- Environment variable management
- Container health monitoring
- Zero-downtime deployments

---

## Initial Setup

### 1. Create Application

1. Login to Coolify dashboard
2. Click **New Resource** → **Application**
3. Select **GitHub** as source
4. Connect your GitHub account (if not already)
5. Select the `memopyk-clean` repository
6. Branch: `main`

### 2. Configure Build Settings

| Setting | Value |
|---------|-------|
| Build Pack | **Dockerfile** |
| Dockerfile Location | `Dockerfile` (root) |
| Port | `5000` |
| Health Check Path | `/api/health` |

### 3. Set Environment Variables

Add all variables from `.env.example`:

**Required:**
- `NODE_ENV` = `production`
- `PORT` = `5000`
- `DATABASE_URL` = (your Supabase connection string)
- `SUPABASE_URL` = (your Supabase URL)
- `SUPABASE_ANON_KEY` = (anon key)
- `SUPABASE_SERVICE_KEY` = (service key) — Mark as **Secret**
- `SESSION_SECRET` = (64+ char random string) — Mark as **Secret**
- `ADMIN_SECRET` = (32+ char random string) — Mark as **Secret**
- `RESEND_API_KEY` = (Resend API key) — Mark as **Secret**

**See [ENVIRONMENT.md](ENVIRONMENT.md) for complete list.**

### 4. Configure Domain

1. Go to **Domains** tab
2. Add your domain: `memopyk.com`
3. Add www redirect: `www.memopyk.com`
4. Enable **HTTPS** (automatic Let's Encrypt)

### 5. DNS Configuration

Add these records at your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_VPS_IP` | 300 |
| A | www | `YOUR_VPS_IP` | 300 |

**Or use CNAME for www:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_VPS_IP` | 300 |
| CNAME | www | `memopyk.com` | 300 |

### 6. Deploy

Click **Deploy** and watch the build logs.

---

## Deployment Workflow

### Automatic Deploys

1. Push code to `main` branch
2. Coolify detects the push (webhook)
3. Pulls latest code
4. Runs `docker build`
5. Health check on new container
6. Switches traffic (zero-downtime)
7. Removes old container

### Manual Deploys

1. Go to application in Coolify
2. Click **Deploy** button
3. Or click **Rebuild** to force fresh build

### Rollback

1. Go to **Deployments** tab
2. Find previous successful deployment
3. Click **Rollback**

---

## Monitoring

### Health Check

Coolify monitors `/api/health` every 30 seconds.

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T12:00:00.000Z",
  "uptime": 3600
}
```

### Logs

View logs in Coolify:
1. Go to application
2. Click **Logs** tab
3. Select container or build logs

### Metrics

Coolify provides:
- CPU usage
- Memory usage
- Network I/O
- Container status

---

## Configuration Reference

### Application Settings

| Setting | Recommended Value |
|---------|-------------------|
| Build Pack | Dockerfile |
| Port | 5000 |
| Health Check Path | /api/health |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Restart Policy | unless-stopped |

### Resource Limits

| Resource | Recommendation |
|----------|----------------|
| Memory | 512MB - 1GB |
| CPU | 0.5 - 1 core |
| Storage | 1GB (for logs) |

### Network Settings

| Setting | Value |
|---------|-------|
| Expose Port | 5000 |
| HTTPS | Enabled (Let's Encrypt) |
| Force HTTPS | Yes |
| HTTP/2 | Enabled |

---

## Staging Environment

For staging, create a separate application:

1. **Domain:** `staging.memopyk.com` or `memopyk.memopyk.com`
2. **Branch:** `main` (or `staging` if you use branches)
3. **Environment:** Same as production, but can use test API keys

**Current staging:** `https://memopyk.memopyk.com`

---

## Troubleshooting

### Build Fails

1. Check **Build Logs** in Coolify
2. Common causes:
   - Missing dependencies in `package.json`
   - TypeScript errors
   - Dockerfile syntax errors

**Debug locally:**
```bash
docker build -t memopyk-test .
```

### Container Won't Start

1. Check **Container Logs** in Coolify
2. Common causes:
   - Missing environment variables
   - Database connection failed
   - Port already in use

### Health Check Fails

1. Container starts but Coolify shows unhealthy
2. Check `/api/health` endpoint is responding
3. Verify port 5000 is correct

**Debug:**
```bash
# SSH to VPS
docker ps
docker logs <container_id>
curl http://localhost:5000/api/health
```

### SSL Certificate Issues

1. Ensure DNS is pointing to VPS
2. Wait for DNS propagation (up to 48h)
3. Check Let's Encrypt rate limits

**Force certificate renewal:**
1. Go to **Domains** tab
2. Click **Renew Certificate**

### Domain Not Working

1. Verify DNS records with: `dig memopyk.com`
2. Check Coolify domain configuration
3. Ensure firewall allows ports 80/443

---

## Backup & Recovery

### Database

Database is on Supabase (separate from Coolify):
- Automatic daily backups by Supabase
- Manual backups via Supabase dashboard

### Application

- Code is in GitHub (version controlled)
- Environment variables: Export from Coolify settings
- No persistent data in container (stateless)

### Disaster Recovery

1. Deploy new Coolify instance (or use another host)
2. Create application from GitHub
3. Import environment variables
4. Update DNS

---

## Security Checklist

- [ ] All secrets marked as **Secret** in Coolify
- [ ] HTTPS enforced
- [ ] SSH key authentication for VPS
- [ ] Firewall rules (only 80, 443, 22)
- [ ] Regular security updates on VPS
- [ ] GitHub branch protection on `main`

---

## Performance Tips

1. **Enable HTTP/2** in Coolify domain settings
2. **Use Cloudflare** for CDN (optional)
3. **Monitor memory** — Increase if OOM errors
4. **Review logs** for slow requests

---

## Useful Commands (SSH to VPS)

```bash
# List running containers
docker ps

# View container logs
docker logs <container_id> -f

# Enter container shell
docker exec -it <container_id> sh

# Check disk space
df -h

# Check memory
free -h

# Restart Coolify
cd /data/coolify
docker compose restart
```

---

*See [DOCKER.md](DOCKER.md) for Dockerfile details and [ENVIRONMENT.md](ENVIRONMENT.md) for environment variables.*
