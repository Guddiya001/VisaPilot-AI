FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy root configs
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY packages/database ./packages/database

# Copy web app
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
ENV NEXT_STANDALONE=true
RUN pnpm --filter @visapilot/web build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
