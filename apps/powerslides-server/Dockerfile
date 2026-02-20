# Build from repo root: docker build -f apps/powerslides-server/Dockerfile -t powerslides-server .
# Run: docker run -p 4001:4001 powerslides-server

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace config and dependency manifests
COPY package.json package-lock.json ./
COPY apps/ ./apps/
COPY libs/ ./libs/

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source and config needed for build
COPY tsconfig.base.json tsconfig.json nx.json ./

# Sync TypeScript project references (required in CI/Docker where nx can't prompt)
RUN npx nx sync

# Build the server (nx builds powerslides-shared first via dependsOn)
RUN npx nx run powerslides-server:build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 powerslides

# Copy production dependencies (workspace package.json files needed for npm ci)
COPY package.json package-lock.json ./
COPY apps/powerslides-server/package.json ./apps/powerslides-server/
COPY libs/powerslides-shared/package.json ./libs/powerslides-shared/
RUN npm ci --omit=dev --ignore-scripts

# Copy built server output
COPY --from=builder /app/dist/apps/powerslides-server ./dist/apps/powerslides-server

USER powerslides

EXPOSE 4001

ENV PORT=4001
ENV NODE_ENV=production

CMD ["node", "dist/apps/powerslides-server/src/main.js"]
