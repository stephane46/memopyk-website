# =============================================================================
# MEMOPYK Website - Production Dockerfile
# =============================================================================
# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
# Install all dependencies first (including vite) in development mode
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
# Switch to production mode for build (use production versions of libraries)
ENV NODE_ENV=production
# Copy source and build
COPY . .
# Run build and verify output exists
RUN npm run build && \
    echo "=== Build complete, checking output ===" && \
    ls -la dist/ && \
    ls -la dist/public/ && \
    ls -la dist/server/ && \
    echo "=== Server entry point:" && \
    head -5 dist/server/index.js
# Ensure server/data exists (even if empty)
RUN mkdir -p /app/server/data && touch /app/server/data/.gitkeep
# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
# Set production environment
ENV NODE_ENV=production
# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Copy built assets
COPY --from=builder /app/dist ./dist
# Copy runtime data files (JSON backups)
COPY --from=builder /app/server/data ./server/data
# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs && \
    chown -R expressjs:nodejs /app
# Create cache directories with correct ownership for persistent volume
RUN mkdir -p /app/server/cache/videos /app/server/cache/images && \
    chown -R expressjs:nodejs /app/server/cache
USER expressjs
# Expose port
EXPOSE 5000
# Health check - use 127.0.0.1 instead of localhost for IPv4 compatibility
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1
# Start server
CMD ["node", "dist/server/index.js"]