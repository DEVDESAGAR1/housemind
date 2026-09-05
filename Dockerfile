# ==============================================================================
# HouseMind Production Multi-Stage Containerfile
# Hardened for Google Cloud Run with Google Cloud Secret Manager Injection
# ==============================================================================

# --- Stage 1: Build & Bundle ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application source (excluding files listed in .dockerignore)
COPY . .

# Compile frontend client bundle and backend server bundle
RUN npm run build

# Prune devDependencies to keep image slim
RUN npm prune --production

# --- Stage 2: Minimal Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy only production dependencies, compiled bundles, and configuration
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Security hardening: Run as non-privileged node user
USER node

# Expose standard Cloud Run port
EXPOSE 3000

# Healthcheck configuration for container runtime
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start compiled server (Express + Static Assets)
CMD ["node", "dist/server.cjs"]
