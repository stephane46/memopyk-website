# Docker Configuration

**File:** `Dockerfile`  
**Target:** Production deployment on Coolify  
**Base Image:** `node:20-alpine`

---

## Overview

The MEMOPYK website uses a multi-stage Docker build:

1. **Stage 1 (builder)** — Install dependencies, build client and server
2. **Stage 2 (runner)** — Production image with only runtime files

This produces a ~150MB production image (vs ~1GB if using single stage).

---

## Dockerfile Breakdown

### Stage 1: Build

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies in development mode (includes devDependencies like vite)
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci

# Switch to production for build optimization
ENV NODE_ENV=production
COPY . .

# Build both client and server
RUN npm run build && \
    echo "=== Build complete, checking output ===" && \
    ls -la dist/ && \
    ls -la dist/public/ && \
    ls -la dist/server/

# Ensure data directory exists
RUN mkdir -p /app/server/data && touch /app/server/data/.gitkeep
```

**Key points:**
- `NODE_ENV=development` during install — ensures Vite and TypeScript are available
- `NODE_ENV=production` during build — enables production optimizations
- Build verification commands help debug CI/CD failures
- `server/data/` directory for JSON backup files

### Stage 2: Production

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/data ./server/data

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs && \
    chown -R expressjs:nodejs /app
USER expressjs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "dist/server/index.js"]
```

**Key points:**
- `npm ci --omit=dev` — Production dependencies only (~80% smaller)
- Non-root user `expressjs` — Security best practice
- Health check on `/api/health` — Enables container orchestration
- `127.0.0.1` instead of `localhost` — IPv4 compatibility

---

## Build Output Structure

After `npm run build`:

```
dist/
├── public/           # Vite client build (static files)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── ...
└── server/           # TypeScript server build
    ├── index.js      # Entry point
    ├── app.js
    ├── routes/
    ├── services/
    └── ...
```

**Important:** The server serves static files from `dist/public/`.

---

## Build Commands

### Local Build

```bash
# Build only
npm run build

# Build and test locally
docker build -t memopyk-website .
docker run -p 5000:5000 --env-file .env memopyk-website
```

### Coolify Build

Coolify handles builds automatically:
1. Pulls from GitHub on push
2. Runs `docker build`
3. Deploys new container
4. Health check before traffic switch

---

## Environment Variables in Docker

Environment variables are NOT baked into the image. They're provided at runtime:

| Method | Usage |
|--------|-------|
| `docker run --env-file .env` | Local testing |
| Coolify Environment Variables | Production |
| `docker-compose.yml` | Local development |

**Never hardcode secrets in Dockerfile!**

---

## Common Issues

### Build Fails: "vite not found"

**Cause:** `NODE_ENV=production` during `npm ci`  
**Solution:** Ensure `NODE_ENV=development` before install step

### Build Fails: "Cannot find module"

**Cause:** TypeScript compilation error  
**Solution:** Run `npm run build` locally to see full error

### Container Exits Immediately

**Cause:** Missing environment variables  
**Solution:** Check required variables in [ENVIRONMENT.md](ENVIRONMENT.md)

### Health Check Fails

**Cause:** Server not responding on port 5000  
**Solution:** Check logs with `docker logs <container>`

### "dist/public not found"

**Cause:** Vite build path mismatch  
**Solution:** Verify `vite.config.ts` has `build.outDir: 'dist/public'`

---

## Docker Compose (Local Development)

For local development with hot reload:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env
    volumes:
      - ./server/data:/app/server/data
    restart: unless-stopped
```

**Note:** For development, `npm run dev` is faster than Docker.

---

## Image Size Optimization

| Optimization | Impact |
|--------------|--------|
| Multi-stage build | -800MB |
| Alpine base image | -200MB |
| `npm ci --omit=dev` | -100MB |
| `npm cache clean` | -50MB |

**Final image:** ~150MB

---

## Debugging Build Issues

### View build output

```bash
docker build -t memopyk-website . 2>&1 | tee build.log
```

### Inspect builder stage

```bash
docker build --target builder -t memopyk-builder .
docker run -it memopyk-builder sh
# Now you can explore /app/dist/
```

### Check final image

```bash
docker run -it memopyk-website sh
ls -la /app/dist/
```

---

## CI/CD Integration

The Dockerfile is designed for CI/CD:

1. **Deterministic builds** — `npm ci` uses lockfile
2. **Build verification** — `ls -la dist/` commands
3. **Health checks** — Container readiness
4. **Small image** — Fast deploys

Coolify uses this Dockerfile directly. No separate CI config needed.

---

*See [COOLIFY.md](COOLIFY.md) for deployment configuration.*
