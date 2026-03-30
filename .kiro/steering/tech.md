# Technology Stack

## Build System & Package Management

- **Monorepo**: Turborepo with pnpm workspaces
- **Package Manager**: pnpm 10.28+ (required)
- **Node.js**: ≥ 20 (required)
- **Build Tool**: Turbo for parallel builds and caching

## Core Technologies

### Backend (apps/api)
- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Cache/Queue**: Redis 7 with BullMQ
- **Search**: Meilisearch v1.11 for full-text search
- **Storage**: MinIO (S3-compatible) for file storage
- **Authentication**: JWT with Passport strategies

### Frontend
- **Admin Dashboard** (apps/admin): Next.js 15 + React 19
- **Customer Shop** (apps/shop): Next.js 15 + React 19 + LIFF SDK
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Theme**: next-themes for dark/light mode

### Shared Packages
- **Database** (packages/db): Drizzle ORM schemas and migrations
- **Shared Types** (packages/shared): TypeScript types + Zod validators
- **AI Services** (packages/ai): Gemini 2.5 Pro integration

### External Integrations
- **LINE Platform**: @line/bot-sdk v9 for messaging and LIFF
- **AI**: Google Gemini 2.5 Pro via Vercel AI SDK
- **Payment**: Omise + PromptPay QR integration
- **Monitoring**: Prometheus + Grafana

## Common Commands

### Development
```bash
# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm dev:api     # NestJS API on :3000
pnpm dev:admin   # Admin dashboard on :3001
pnpm dev:shop    # Customer shop on :3002

# Infrastructure services
docker compose up -d
```

### Database Operations
```bash
# Push schema changes (development)
pnpm db:push

# Generate migration files
pnpm db:generate

# Run migrations (production)
pnpm db:migrate

# Open Drizzle Studio
cd packages/db && pnpm db:studio
```

### Build & Deploy
```bash
# Build all apps and packages
pnpm build

# Type checking across workspace
pnpm type-check

# Linting
pnpm lint

# Code formatting
pnpm format
```

### Testing
```bash
# Run all tests
pnpm test

# API-specific testing
cd apps/api && pnpm test
cd apps/api && pnpm test:e2e
```

## Development Ports

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000/v1 |
| Admin | 3001 | http://localhost:3001 |
| Shop | 3002 | http://localhost:3002 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Meilisearch | 7700 | http://localhost:7700 |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Traefik Dashboard | 8080 | http://localhost:8080 |

## Environment Setup

1. Copy `.env.example` to `.env`
2. Required environment variables for development:
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET` 
   - `LINE_LIFF_ID`
   - `GEMINI_API_KEY`
   - `JWT_SECRET` (change from default)
   - `JWT_REFRESH_SECRET` (change from default)