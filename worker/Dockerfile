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

# Install FFmpeg, FFprobe, fonts for drawtext compositor, ca-certificates, and tini for PID 1 signal handling
RUN apk add --no-cache ffmpeg fontconfig ttf-dejavu ca-certificates tini

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy compiled source from builder
COPY --from=builder /app/dist ./dist

# Create a non-root user (node user is pre-created in the node image)
USER node

# Use tini for proper signal forwarding (SIGTERM, SIGINT) to child processes
ENTRYPOINT ["/sbin/tini", "--"]

# Start the compiled worker
CMD ["node", "dist/index.js"]
