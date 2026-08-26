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
COPY packages/ai ./packages/ai
COPY packages/ats ./packages/ats
COPY packages/crawler ./packages/crawler
COPY packages/resume ./packages/resume
COPY packages/notifier ./packages/notifier

# Copy API app
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @visapilot/database db:generate

# Build all packages
RUN pnpm build

# Deploy API app
RUN pnpm deploy --filter @visapilot/api --prod /deploy

# Generate prisma client in deployed out dir
RUN cp /app/packages/database/prisma/schema.prisma /deploy/schema.prisma
RUN cp -r $(find /app/node_modules/.pnpm -type d -path "*/node_modules/.prisma" | head -n 1) $(find /deploy/node_modules/.pnpm -type d -name "@prisma+client*" | head -n 1)/node_modules/
# Production image
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /deploy ./
COPY --from=builder /app/packages/database/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
