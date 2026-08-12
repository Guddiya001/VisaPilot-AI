# VisaPilot AI 🛂✨

> **AI-Powered International Job Search Platform** — Automate job hunting, optimize resumes, match skills, and detect visa sponsorships across global job boards.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node >=20.0.0" />
  <img src="https://img.shields.io/badge/pnpm-9.15.0-orange.svg" alt="pnpm 9.15.0" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" />
</p>

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Start Infrastructure (Docker)](#3-start-infrastructure-docker)
  - [4. Database Setup](#4-database-setup)
  - [5. Run the Application](#5-run-the-application)
- [All Commands](#-all-commands)
  - [Root Workspace Commands](#root-workspace-commands)
  - [API Service (`@visapilot/api`)](#api-service-visapilotapi)
  - [Web Frontend (`@visapilot/web`)](#web-frontend-visapilotweb)
  - [Worker Service (`@visapilot/worker`)](#worker-service-visapilotworker)
  - [Database Package (`@visapilot/database`)](#database-package-visapilotdatabase)
  - [AI Package (`@visapilot/ai`)](#ai-package-visapilotai)
  - [Crawler Package (`@visapilot/crawler`)](#crawler-package-visapilotcrawler)
  - [Notifier Package (`@visapilot/notifier`)](#notifier-package-visapilotnotifier)
  - [Resume Package (`@visapilot/resume`)](#resume-package-visapilotresume)
  - [ATS Package (`@visapilot/ats`)](#ats-package-visapilotats)
  - [Config Package (`@visapilot/config`)](#config-package-visapilotconfig)
  - [Shared Package (`@visapilot/shared`)](#shared-package-visapilotailed)
  - [Scripts](#scripts)
  - [Docker Commands](#docker-commands)
  - [Code Quality & Git Hooks](#code-quality--git-hooks)
- [Project Structure](#-project-structure)
- [Ports Overview](#-ports-overview)
- [Commit Convention](#-commit-convention)
- [License](#-license)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Backend** | NestJS (Fastify) + TypeScript |
| **Frontend** | Next.js 15 (React 19) + Tailwind CSS 4 |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache / Queue** | Redis 7 + BullMQ |
| **AI / LLM** | Ollama (local) + Gemini / Groq (cloud) |
| **Worker** | BullMQ worker (tsx) |
| **Crawler** | Cheerio + RSS Parser |
| **ORM** | Prisma 6 |
| **Auth** | JWT (Passport) |
| **Validation** | Zod + class-validator |
| **Containerization** | Docker + Docker Compose |
| **Code Quality** | ESLint, Prettier, Commitlint, Husky |

---

## 🏗 Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Web App   │────▶│   API       │────▶│  PostgreSQL  │
│ (Next.js)   │     │  (NestJS)   │     │  + pgvector  │
│  :3000      │     │  :4000      │     │  :5432       │
└─────────────┘     └──────┬──────┘     └──────────────┘
                           │                    ▲
                           │                    │
                    ┌──────▼──────┐     ┌───────┴───────┐
                    │   Worker    │◀───▶│    Redis      │
                    │  (BullMQ)   │     │   :6379       │
                    └──────┬──────┘     └───────────────┘
                           │
                    ┌──────▼──────┐
                    │   Ollama    │
                    │  :11434     │
                    └─────────────┘
```

---

## ✅ Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** 9.15.0+ (`npm install -g pnpm@9.15.0`)
- **Docker** & **Docker Compose** (for PostgreSQL, Redis, Ollama)
- **Git** (with Husky hooks)

---

## 🚀 Getting Started

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd JobSearch

# Install dependencies
pnpm install
```

### 2️⃣ Environment Variables

Copy the example environment files (if available) or create the following:

**API (`apps/api/.env`):**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://visapilot:visapilot@localhost:5432/visapilot
REDIS_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://localhost:11434
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

**Worker (`apps/worker/.env`):**
```env
NODE_ENV=development
DATABASE_URL=postgresql://visapilot:visapilot@localhost:5432/visapilot
REDIS_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://localhost:11434
```

**Web (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 3️⃣ Start Infrastructure (Docker)

```bash
pnpm docker:up
```

This starts:
- **PostgreSQL 16** with pgvector on port `5432`
- **Redis 7** on port `6379`
- **Ollama** on port `11434`

Check container health:
```bash
docker compose -f docker/docker-compose.yml ps
```

### 4️⃣ Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed the database
pnpm db:seed
```

### 5️⃣ Run the Application

```bash
# Start all services in development mode (API + Web + Worker + packages)
pnpm dev
```

Or start individual services:

```bash
# API only (port 4000)
pnpm --filter @visapilot/api dev

# Web only (port 3000)
pnpm --filter @visapilot/web dev

# Worker only
pnpm --filter @visapilot/worker dev
```

---

## 📖 All Commands

### Root Workspace Commands

Run these from the **root** directory (`d:/AI_Project/JobSearch`).

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start **all** dev servers concurrently (API + Web + Worker) |
| `pnpm build` | Build **all** packages and apps |
| `pnpm test` | Run **all** tests |
| `pnpm lint` | Lint **all** packages and apps |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Clean all build outputs (`dist/`, `.next/`) and `node_modules` |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed the database with initial data |
| `pnpm db:studio` | Open Prisma Studio GUI to browse/edit data |
| `pnpm docker:up` | Start all Docker containers (PostgreSQL, Redis, Ollama) |
| `pnpm docker:down` | Stop and remove all Docker containers |

---

### API Service (`@visapilot/api`)

**Location:** `apps/api/` — NestJS backend (Fastify)

```bash
pnpm --filter @visapilot/api <command>
```

| Command | Description |
|---------|-------------|
| `build` | Build the API (`nest build`) |
| `dev` | Start in development mode with watch (`nest start --watch`) |
| `start` | Start the API normally |
| `start:prod` | Start the production build (`node dist/main`) |
| `lint` | Lint API source files |
| `test` | Run unit tests (Jest) |
| `test:e2e` | Run end-to-end tests |

---

### Web Frontend (`@visapilot/web`)

**Location:** `apps/web/` — Next.js 15 application

```bash
pnpm --filter @visapilot/web <command>
```

| Command | Description |
|---------|-------------|
| `dev` | Start Next.js dev server on port `3000` |
| `build` | Build for production |
| `start` | Start production Next.js server |
| `lint` | Lint web source files |
| `test` | Run Jest tests |

---

### Worker Service (`@visapilot/worker`)

**Location:** `apps/worker/` — BullMQ background worker

```bash
pnpm --filter @visapilot/worker <command>
```

| Command | Description |
|---------|-------------|
| `dev` | Start worker in development mode with watch (`tsx watch src/index.ts`) |
| `build` | Compile TypeScript (`tsc`) |
| `start` | Start compiled worker (`node dist/index.js`) |
| `lint` | Lint worker source files |
| `test` | Run Jest tests |

---

### Database Package (`@visapilot/database`)

**Location:** `packages/database/` — Prisma ORM + repositories

```bash
pnpm --filter @visapilot/database <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript (`tsc`) |
| `dev` | Watch mode (`tsc --watch`) |
| `clean` | Remove `dist/` directory |
| `lint` | Lint database source files |
| `db:generate` | Generate Prisma client (`prisma generate`) |
| `db:push` | Push schema to database (`prisma db push`) |
| `db:migrate` | Create and apply migrations (`prisma migrate dev`) |
| `db:seed` | Run database seed script (`tsx src/seed.ts`) |
| `db:studio` | Open Prisma Studio GUI (`prisma studio`) |

---

### AI Package (`@visapilot/ai`)

**Location:** `packages/ai/` — AI agents, LLM providers, RAG, embeddings

```bash
pnpm --filter @visapilot/ai <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint AI source files |

---

### Crawler Package (`@visapilot/crawler`)

**Location:** `packages/crawler/` — Job board scraper (Ashby, Greenhouse, Lever, RSS)

```bash
pnpm --filter @visapilot/crawler <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint crawler source files |

---

### Notifier Package (`@visapilot/notifier`)

**Location:** `packages/notifier/` — Email/push notification service

```bash
pnpm --filter @visapilot/notifier <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint notifier source files |

---

### Resume Package (`@visapilot/resume`)

**Location:** `packages/resume/` — Resume parsing and generation

```bash
pnpm --filter @visapilot/resume <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint resume source files |

---

### ATS Package (`@visapilot/ats`)

**Location:** `packages/ats/` — ATS (Applicant Tracking System) compatibility checker

```bash
pnpm --filter @visapilot/ats <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint ATS source files |

---

### Config Package (`@visapilot/config`)

**Location:** `packages/config/` — Shared configuration (env vars, Zod schemas)

```bash
pnpm --filter @visapilot/config <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint config source files |

---

### Shared Package (`@visapilot/shared`)

**Location:** `packages/shared/` — Common types, enums, constants, interfaces

```bash
pnpm --filter @visapilot/shared <command>
```

| Command | Description |
|---------|-------------|
| `build` | Compile TypeScript |
| `dev` | Watch mode |
| `clean` | Remove `dist/` directory |
| `lint` | Lint shared source files |

---

### Scripts

| Command | Description |
|---------|-------------|
| `node scripts/fix-chat-page.cjs` | Fix AI chat page issues |
| `node scripts/test-ollama-connection.mjs` | Test connectivity to Ollama server |

---

### Docker Commands

| Command | Description |
|---------|-------------|
| `pnpm docker:up` | Start all containers in detached mode |
| `pnpm docker:down` | Stop and remove all containers |
| `docker compose -f docker/docker-compose.yml logs -f` | Tail container logs |
| `docker compose -f docker/docker-compose.yml ps` | List container statuses |
| `docker compose -f docker/docker-compose.yml restart <service>` | Restart a specific service |

---

### Code Quality & Git Hooks

| Command | Description |
|---------|-------------|
| `pnpm lint` | Lint all projects with ESLint |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run all tests |

This project uses **Husky** + **Commitlint** to enforce conventional commit messages. Commits are automatically linted on `commit-msg` hook.

---

## 📁 Project Structure

```
JobSearch/
├── apps/
│   ├── api/                    # NestJS backend API
│   │   └── src/
│   │       ├── ai/             # AI service endpoints
│   │       ├── applications/   # Job applications CRUD
│   │       ├── auth/           # Authentication (JWT)
│   │       ├── common/         # Guards, decorators, filters, interceptors
│   │       ├── jobs/           # Job listings CRUD
│   │       └── users/          # User management
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # App router pages
│   │       │   ├── ai-chat/    # AI chat interface
│   │       │   ├── analytics/  # Analytics dashboard
│   │       │   ├── applications/ # Applications page
│   │       │   ├── dashboard/  # Main dashboard
│   │       │   ├── jobs/       # Job listings & details
│   │       │   ├── login/      # Authentication page
│   │       │   ├── resume-builder/ # Resume builder
│   │       │   └── settings/   # Settings page
│   │       ├── components/     # Shared UI components
│   │       └── lib/            # API client & utilities
│   └── worker/                 # BullMQ background worker
│       └── src/
│           └── queues/         # Queue definitions
├── packages/
│   ├── ai/                     # AI agents & LLM providers
│   │   └── src/
│   │       ├── agents/         # Specialized AI agents
│   │       ├── ollama/         # Ollama client & embeddings
│   │       ├── providers/      # LLM providers (Gemini, Groq, Ollama)
│   │       └── rag/            # Retrieval-Augmented Generation
│   ├── ats/                    # ATS compatibility checker
│   ├── config/                 # Shared configuration
│   ├── crawler/                # Job board crawlers
│   │   └── src/
│   │       └── adapters/       # Platform adapters (Ashby, Greenhouse, Lever, RSS)
│   ├── database/               # Prisma ORM & repositories
│   │   ├── prisma/             # Schema & migrations
│   │   └── src/
│   │       └── repositories/   # Data access layer
│   ├── notifier/               # Notification service
│   ├── resume/                 # Resume parser/generator
│   └── shared/                 # Shared types, enums, constants
├── docker/                     # Docker files
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── worker.Dockerfile
│   ├── docker-compose.yml      # Infrastructure compose file
│   └── init.sql                # DB initialization script
├── scripts/                    # Utility scripts
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
├── commitlint.config.js        # Commit convention config
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── tsconfig.base.json          # Base TypeScript config
└── tsconfig.json               # Root TypeScript config
```

---

## 🔌 Ports Overview

| Service | Port |
|---------|------|
| Web Frontend (Next.js) | `3000` |
| API (NestJS) | `4000` |
| PostgreSQL | `5432` |
| Redis | `6379` |
| Ollama | `11434` |

---

## 📝 Commit Convention

This project enforces **Conventional Commits** via Commitlint + Husky.

**Format:**
```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes:** `web`, `api`, `worker`, `ai`, `crawler`, `ats`, `resume`, `notifier`, `shared`, `database`, `config`, `deps`, `docker`, `ci`, `root`

**Examples:**
```
feat(api): add visa sponsorship detection endpoint
fix(web): resolve job search pagination issue
docs(root): update README with API endpoints
chore(deps): upgrade prisma to v6
```

---

## 📄 License

This project is **private** and proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ using Turborepo, NestJS, Next.js & AI
</p>

