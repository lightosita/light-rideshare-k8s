# Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .


# Build TypeScript
RUN npm run build

# ---- Production Image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S driveruser -u 1001

# Copy only what's needed for runtime
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev                   # production deps only
COPY --from=builder /app/dist ./dist


EXPOSE 3003

# Healthcheck (optional but recommended for driver service)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "dist/index.js"]