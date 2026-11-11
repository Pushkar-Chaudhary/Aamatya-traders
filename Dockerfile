# Production Multi-Stage Dockerfile for Amatya Traders
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace and package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN npm ci

# Copy application source code
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build both API and Web frontend
RUN npm run build --workspaces

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy root manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled backend and frontend assets
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]

