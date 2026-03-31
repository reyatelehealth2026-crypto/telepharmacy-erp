# Technology Stack

## Build System

- **Monorepo**: Turborepo + pnpm workspaces
- **Package Manager**: pnpm 10.28+ (required)
- **Node.js**: ≥ 20
- **Build**: Turbo for parallel builds and caching

## Backend (apps/api)

- **Framework**: NestJS 11
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Cache/Queue**: Redis 7 + BullMQ
- **Search**: Meilisearch v1.11
- **Storage**: MinIO (S3-compatible)
- **Auth**: JWT + Passport strategies
- **Video**: Agora (telemedicine consultations)
- **PDF**: PDFKit (consent documents)
- **Validation**: Zod + class-validator
- **Testing**: Jest + ts-jest

## Frontend (apps/admin, apps/shop)

- **Framework**: Next.js 15 + React 19 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Theme**: next-themes
- **State**: SWR (admin), Zustand stores (shop)
- **Forms**: react-hook-form + @hookform/resolvers + Zod
- **LIFF**: @line/liff SDK (shop only)

## Shared Packages

- `@telepharmacy/db` — Drizzle ORM schemas, migrations, seeds
- `@telepharmacy/shared` — TypeScript types + Zod validators
- `@telepharmacy/ai` — Gemini 2.5 Pro via Vercel AI SDK

## External Integrations

- **LINE**: @line/bot-sdk v9 (messaging, webhooks, LIFF)
- **AI**: Google Gemini 2.5 Pro via `@ai-sdk/google`
- **Payment**: Omise + PromptPay QR
- **Monitoring**: Prometheus + Grafana
- **Reverse Proxy**: Traefik v3.3

## Common Commands

```bash
# Development
pnpm dev              # All apps
pnpm dev:api          # API on :3000
pnpm dev:admin        # Admin on :3001
pnpm dev:shop         # Shop on :3002
docker compose up -d  # Infrastructure services

# Database
pnpm db:push          # Push schema (dev)
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations (prod)
pnpm db:seed          # Seed data

# Build & Quality
pnpm build            # Build all
pnpm type-check       # TypeScript check
pnpm lint             # ESLint
pnpm format           # Prettier

# Testing
pnpm test                       # All tests
cd apps/api && pnpm test        # API unit tests
cd apps/api && pnpm test:e2e    # API e2e tests
```

## Development Ports

| Service | Port |
|---------|------|
| API | 3000 |
| Admin | 3001 |
| Shop | 3002 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Meilisearch | 7700 |
| MinIO | 9000/9001 |
| Traefik | 8080 |
| Prometheus | 9090 |
| Grafana | 3010 |
