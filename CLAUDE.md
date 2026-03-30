# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Telepharmacy ERP (B2C)** — LINE-based online pharmacy platform for Thailand. The system handles patient records, prescription workflows, drug safety checks, and PromptPay/Omise payments with full PDPA and Thai Pharmacy Act compliance.

Brand name: **REYA Pharmacy** (`re-ya.com`)

## Monorepo Structure

Turborepo + pnpm workspaces monorepo:

- `apps/api` — NestJS 11 REST API (port 3000), global prefix `/v1`
- `apps/admin` — Next.js 15 admin dashboard (port 3001) for staff/pharmacists
- `apps/shop` — Next.js 15 + LIFF customer shop (port 3002), Thai language UI
- `packages/db` — Drizzle ORM schema definitions + migrations
- `packages/shared` — Zod validators, TypeScript types, constants, utils
- `packages/ai` — Gemini AI services: OCR (prescriptions), chatbot, drug checker
- `infra/` — Prometheus + Grafana configs

## Common Commands

```bash
# Setup
pnpm install
cp .env.example .env
docker compose up -d      # Start PostgreSQL, Redis, Meilisearch, MinIO, Traefik, Prometheus, Grafana
pnpm db:push              # Push schema to database (dev)

# Development
pnpm dev                  # All apps
pnpm dev:api              # API only
pnpm dev:admin            # Admin only
pnpm dev:shop             # Shop only

# Build & Quality
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm format

# Database
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema directly (dev)
pnpm db:studio            # Open Drizzle Studio
pnpm db:seed              # Seed drugs, staff accounts, allergy groups

# Single app test (from repo root)
pnpm --filter @telepharmacy/api test
# Run a single spec file
pnpm --filter @telepharmacy/api test -- --testPathPattern=drug-interaction
```

## API Architecture (NestJS)

### Global Setup (`apps/api/src/main.ts`)
- Global prefix: `v1` — all routes are `/v1/...`
- **Do NOT include `v1/` in `@Controller()` decorators** — it creates double-prefix `/v1/v1/...`
- Global guards: `JwtAuthGuard` + `RolesGuard` + `PatientOnlyGuard` (registered in `AuthModule` via `APP_GUARD`)
- Global interceptor: `ResponseInterceptor` wraps all responses as `{ success: true, data: ..., message: "OK" }`
- Global filter: `HttpExceptionFilter` catches all exceptions → `{ success: false, error: { code, message } }`

### Auth Pattern
- `@Public()` decorator — skips JWT guard for a route
- `@Roles('pharmacist', 'admin')` — restricts to specific staff roles
- `@PatientOnly()` — restricts to LINE-authenticated patients
- `@CurrentUser()` — injects the authenticated user into the handler
- `@SkipResponseWrap()` — used on LINE webhook to return raw body

### Module Structure
Every module follows: `module.ts` → `controller.ts` → `service.ts` → `dto/`

Current modules in `apps/api/src/modules/`:
`auth`, `line`, `patient`, `product`, `odoo`, `drug-safety`, `prescription`, `inventory`, `payment`, `orders`, `loyalty`, `reports`, `adr`, `adherence`, `drug-info`, `compliance`, `health`

### Controller Route Prefixes (actual URL = `/v1/<prefix>/<route>`)
| Controller | Prefix | Auth |
|-----------|--------|------|
| auth | `auth` | Mixed (`@Public` on login) |
| patient | `patients` | Patient JWT |
| product | `products` | `@Public` on GET |
| prescription | `prescriptions` | Patient/Staff JWT |
| orders | `orders` | Patient JWT |
| staff orders | `staff/orders` | Staff JWT |
| staff patients | `staff/patients` | Staff JWT |
| inventory | `staff/inventory` | Staff JWT |
| reports | `staff/reports` | Staff JWT |
| loyalty | `loyalty` | Patient JWT |
| staff loyalty | `staff/loyalty` | Staff JWT |
| adherence | `adherence` | Patient JWT |
| adr | `adr` | Patient/Staff JWT |
| compliance | `compliance` | Staff JWT |
| drug-info | `drug-info` | Staff JWT |

### BullMQ Queues (require Redis)
- `ocr-queue` — prescription OCR processing
- `adherence-queue` — medication reminder jobs

### Response Format
All API responses (success): `{ success: true, data: <payload>, message: "OK" }`
All API errors: `{ success: false, error: { code: "NOT_FOUND"|"UNAUTHORIZED"|..., message: "..." } }`

## Frontend Apps

### Admin (`apps/admin/src/`)
- **Auth:** Cookie-based (`access_token` cookie read by `middleware.ts`). Login calls `POST /v1/auth/staff-login` with `{ email, password }`.
- **API client:** `lib/api-client.ts` — `apiFetch(path)` prepends `NEXT_PUBLIC_API_URL`. `lib/use-api.ts` — SWR-style hook for GET requests.
- **Products lib:** `lib/products.ts` — server-side fetch for inventory pages (also uses `NEXT_PUBLIC_API_URL`).
- **Middleware:** Redirects unauthenticated requests to `/login?from=<path>`.
- **Pages:** `/login`, `/dashboard`, `/dashboard/pharmacist`, `/dashboard/patients`, `/dashboard/orders`, `/dashboard/inventory`, `/dashboard/reports`, `/dashboard/products`, `/dashboard/settings`

### Shop (`apps/shop/src/`)
- **Auth:** LIFF SDK (`lib/liff.ts`) — `LiffProvider` initializes on mount, stores token in Zustand `authStore`.
- **State:** Zustand stores in `store/` — `cart.ts` (with save-for-later), `auth.ts`, `address.ts`. Cart persists to localStorage.
- **LIFF Provider:** `components/providers/liff-provider.tsx` — wraps the app, calls `liff.init()` with `NEXT_PUBLIC_LIFF_ID`.

### Shared Packages
- `@telepharmacy/db` — Import schema tables directly (e.g., `import { products } from '@telepharmacy/db'`)
- `@telepharmacy/shared` — Sub-path imports: `/types`, `/validators`, `/constants`, `/utils`
- `@telepharmacy/ai` — Sub-path imports: `/ocr`, `/chatbot`, `/drug-checker`

## Database (PostgreSQL 16 + Drizzle ORM)

Schema in `packages/db/src/schema/` by domain:
`enums` → `staff` → `patients` → `drugs` → `products` → `inventory` → `prescriptions` → `orders` → `loyalty` → `chat` → `notifications` → `content` → `complaints` → `system` → `clinical`

Relations are in `relations.ts` (separate from table definitions).

Seed scripts: `packages/db/src/seed/seed-drugs.ts`, `seed-staff.ts`

## Infrastructure

### Docker Compose
- `docker-compose.yml` — dev services only (PostgreSQL, Redis, Meilisearch, MinIO, Traefik, Prometheus, Grafana)
- `docker-compose.prod.yml` — production (adds `api`, `admin`, `shop` app containers with Traefik TLS)

### Dockerfiles
- `Dockerfile.api`, `Dockerfile.admin`, `Dockerfile.shop`
- Build args for `NEXT_PUBLIC_*` env vars must be declared as `ARG` **and** set as `ENV VARNAME=${VARNAME}` (not `ENV VARNAME=`) so Next.js bakes them into the bundle at build time.

### Production URLs
- API: `https://api.re-ya.com` (health: `GET /v1/health`)
- Admin: `https://admin.re-ya.com`
- Shop: `https://shop.re-ya.com`

### Environment Variables
The admin and shop apps use `NEXT_PUBLIC_API_URL` for the backend URL. This is a build-time variable passed as a Docker build arg — it must be set correctly in `docker-compose.prod.yml` before rebuilding.

## Key Domain Concepts

- **Prescription workflow:** Upload (OCR) → AI pre-check → Pharmacist review → Approve/Reject → Dispensing → Delivery
- **Drug safety:** Allergy alerts, drug-drug interaction checking, contraindication detection before dispensing
- **Patient records:** PDPA-compliant; includes chronic diseases, current medications, allergies
- **Compliance:** Thai Pharmacy Act (พ.ร.บ.ยา), Telepharmacy Standards (ประกาศ สภาเภสัชกรรม 56/2563), PDPA

## Spec Files

Detailed documentation in `spec/`:
- `telepharmacy-api-design.md` — Full REST API endpoint reference
- `telepharmacy-database-schema.md` — Complete schema definitions
- `telepharmacy-erp-b2c-requirements.md` — Business requirements
- `telepharmacy-deep-dive.md` — Domain knowledge, Thai pharmacy law
- `telepharmacy-tech-stack.md` — Tech decisions and rationale
