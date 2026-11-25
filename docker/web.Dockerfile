FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm config set network-timeout 300000

# Copy root configs
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY packages/database ./packages/database

# Copy core engine & schemas
COPY src ./src
COPY vault ./vault

# Copy web app
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build workspace dependencies first, then Next.js app
ENV NEXT_STANDALONE=true
RUN pnpm --filter @visapilot/shared build && pnpm --filter @visapilot/config build && pnpm --filter @visapilot/web build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/vault ./vault
COPY --from=builder /app/vault ./apps/web/vault

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
