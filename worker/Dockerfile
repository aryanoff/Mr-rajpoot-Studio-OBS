# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS production

# Install FFmpeg, FFprobe, fonts for drawtext compositor, ca-certificates, procps (pgrep), and tini for PID 1 signal handling
RUN apk add --no-cache ffmpeg fontconfig ttf-dejavu ca-certificates tini procps

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy compiled source from builder
COPY --from=builder /app/dist ./dist

# Pre-create media cache volume mount point with node user ownership
RUN mkdir -p /data/media_cache && chown -R node:node /data/media_cache

# Create a non-root user (node user is pre-created in the node image)
USER node

# Healthcheck: verify the node process is alive (worker has no HTTP port)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1

# Use tini for proper signal forwarding (SIGTERM, SIGINT) to child processes
ENTRYPOINT ["/sbin/tini", "--"]

# Start the compiled worker
CMD ["node", "dist/index.js"]
