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

# Single app test (from repo root)
pnpm --filter @telepharmacy/api test
```

## Architecture

### API (NestJS)
- **Modules:** `HealthModule`, `AuthModule`, `LineModule`, `PatientModule`, `OdooModule`, `ProductModule`
- **Auth:** LINE Login for patients (LIFF), JWT for staff with RBAC
- **Rate limiting:** 60 requests/60s via `ThrottlerModule`
- **Validation:** Zod-based global validation pipe
- **Config files:** `apps/api/src/config/` — app, database, jwt, line, odoo configs

### Frontend Apps
- **Admin:** Staff login → pharmacist Rx queue, order management, patient records, inventory, reports
- **Shop:** Patient-facing LIFF app — catalog, search, cart, checkout (PromptPay QR), prescription upload, consultation chat

### Shared Packages
- `@telepharmacy/db` — Import schema modules directly; relations defined in `relations.ts`
- `@telepharmacy/shared` — Use sub-path imports: `@telepharmacy/shared/types`, `/validators`, `/constants`, `/utils`
- `@telepharmacy/ai` — Sub-path imports: `@telepharmacy/ai/ocr`, `/chatbot`, `/drug-checker`

### Database (PostgreSQL 16 + Drizzle ORM)
Schema organized in `packages/db/src/schema/` by domain: `enums`, `staff`, `patients`, `drugs`, `products`, `inventory`, `prescriptions`, `orders`, `loyalty`, `chat`, `notifications`, `content`, `complaints`, `system`.

### External Integrations
- **LINE Messaging API** — Webhook handler in `LineModule`, Flex Messages for order updates
- **Odoo ERP** — Product catalog sync via `OdooModule` (base URL: `erp.cnyrxapp.com`)
- **Meilisearch** — Full-text product search (Thai language support)
- **MinIO** — S3-compatible storage for prescription images, product photos
- **Gemini 2.5 Pro** — OCR prescription parsing, drug interaction checking, patient chatbot

## Infrastructure (docker-compose.yml)

Dev services: PostgreSQL 16 (5432), Redis 7 (6379), Meilisearch (7700), MinIO (9000/9001), Traefik (80/443/8080), Prometheus (9090), Grafana (3010).

Production adds app containers with Traefik routing to `api/admin/shop.re-ya.com` with Let's Encrypt TLS.

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
