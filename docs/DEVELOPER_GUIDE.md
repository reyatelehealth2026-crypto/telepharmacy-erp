# REYA Telepharmacy — Developer Guide

> สำหรับนักพัฒนาที่เข้ามาทำงานต่อ
> อัปเดต: March 31, 2026

---

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> && cd telepharmacy-erp
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Build packages
pnpm build --filter @telepharmacy/db
pnpm build --filter @telepharmacy/shared
pnpm build --filter @telepharmacy/ai

# 4. Push DB schema & seed
pnpm db:push
pnpm db:seed

# 5. Start dev servers
pnpm dev
```

เปิด:
- API: http://localhost:3000
- Admin: http://localhost:3001
- Shop: http://localhost:3002

---

## สถาปัตยกรรม

```
telepharmacy-erp/
├── apps/
│   ├── api/          # NestJS 11 backend (REST API)
│   ├── admin/        # Next.js 15 admin dashboard (SWR)
│   └── shop/         # Next.js 15 customer LIFF app (Zustand)
├── packages/
│   ├── db/           # Drizzle ORM schemas + migrations
│   ├── shared/       # TypeScript types + Zod validators
│   └── ai/           # Gemini 2.5 Pro integrations
├── infra/            # Prometheus, Grafana configs
└── docker-compose.yml
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS 11, Drizzle ORM, Zod |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Search | Meilisearch v1.11 |
| Storage | MinIO (S3-compatible) |
| Auth | JWT + Passport |
| Video | Agora RTC SDK |
| AI | Gemini 2.5 Pro via @ai-sdk/google |
| Frontend | Next.js 15, React 19, Tailwind v4 |
| Admin State | SWR |
| Shop State | Zustand 5 |
| Payment | Omise (PromptPay) |
| LINE | @line/liff, @line/bot-sdk v9 |

---

## Backend (apps/api)

### Module Pattern
```
module-name/
├── module-name.module.ts      # NestJS module
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Zod-based DTOs
└── *.spec.ts                  # Jest tests
```

### Auth Pattern
```typescript
// Patient-only endpoint
@PatientOnly()
@Get('me')
getMyProfile(@CurrentUser() user: RequestUser) { ... }

// Staff-only endpoint
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin')
@Get()
listAll() { ... }
```

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 },
  "message": "optional message"
}
```

### 19 Backend Modules
