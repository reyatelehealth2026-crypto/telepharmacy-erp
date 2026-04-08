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

| Module | Path | Endpoints |
|--------|------|-----------|
| auth | `/v1/auth/*` | LINE login, staff login, refresh, register |
| patient | `/v1/patients/*` | Profile, allergies, diseases, medications, addresses |
| product | `/v1/products/*` | Catalog, search, Odoo sync |
| orders | `/v1/orders/*`, `/v1/staff/orders/*` | CRUD, status, slip verify, refund |
| prescriptions | `/v1/prescriptions/*` | Upload, queue, verify, interventions |
| inventory | `/v1/staff/inventory/*` | Stock, lots, movements, receive, adjust |
| payment | (internal) | Omise PromptPay, slip OCR |
| loyalty | `/v1/loyalty/*`, `/v1/staff/loyalty/*` | Points, redeem, adjust |
| adherence | `/v1/adherence/*`, `/v1/staff/adherence/*` | Reminders, stats |
| adr | `/v1/adr/*` | ADR reports, causality, export |
| drug-info | `/v1/drug-info/*` | Lookup, MR, TDM |
| drug-safety | (internal) | DDI, allergy, contraindication, dose, duplicate |
| notifications | `/v1/notifications/*` | Push, read, mark all |
| line | `/v1/line/*` | Webhook, send, broadcast, chat |
| health | `/v1/health/*`, `/v1/system/*` | Health check, system config |
| telemedicine/consultation | `/v1/telemedicine/consultations/*` | Request, consent, token, start, end |
| telemedicine/kyc | `/v1/telemedicine/kyc/*` | Upload, liveness, face, OTP, email |
| telemedicine/consent | `/v1/telemedicine/consent/*` | Template, accept, withdraw |
| telemedicine/* | Various | Audit, scope, license, referral, PDPA, compliance |

---

## Frontend (apps/admin)

### State Management: SWR
```typescript
// useApi hook — auto-caching + revalidation
const { data, isLoading, mutate } = useApi<T>('/v1/endpoint');

// API calls
import { api } from '@/lib/api-client';
await api.post('/v1/endpoint', body);
await api.patch('/v1/endpoint', body);
```

### Admin Lib Files
| File | Purpose |
|------|---------|
| `api-client.ts` | Auth-aware fetch + JWT refresh |
| `use-api.ts` | SWR hooks (useApi, useApiPaginated) |
| `auth-context.tsx` | Staff auth provider |
| `products.ts` | Product API helpers |
| `orders.ts` | Pending slips, verify, refund |
| `adr.ts` | ADR reports API |
| `drug-info.ts` | MR + TDM API |
| `adherence.ts` | Staff adherence API |
| `inventory.ts` | Movements, lots, receive |
| `loyalty.ts` | Staff loyalty adjust |
| `line-messaging.ts` | Push + broadcast |

---

## Frontend (apps/shop)

### State Management: Zustand
```typescript
// Auth store
import { useAuthStore } from '@/store/auth';
const { accessToken, patient, isAuthenticated } = useAuthStore();

// Cart store
import { useCartStore } from '@/store/cart';

// Address store (syncs with backend)
import { useAddressStore } from '@/store/address';
```

### Auth Guard
```typescript
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function ProtectedPage() {
  const { loading, token, patient } = useAuthGuard();
  if (loading) return <Loader />;
  // ... page content
}
```

### Shop Lib Files
| File | Purpose |
|------|---------|
| `api.ts` | Fetch wrapper + auto token refresh |
| `use-auth-guard.ts` | Auth guard hook |
| `consultation.ts` | Request consultation |
| `telemedicine.ts` | Consultation, consent, video API |
| `kyc.ts` | KYC upload, liveness, OTP |
| `address-api.ts` | Address CRUD + Zustand sync |
| `ai-chat.ts` | AI chatbot API |
| `chat.ts` | Chat sessions + messages |
| `adr.ts` | ADR report submission |
| `drug-info.ts` | Drug lookup, MR, TDM |

---

## Database (packages/db)

### Schema Files
| File | Tables |
|------|--------|
| `enums.ts` | PostgreSQL enums |
| `staff.ts` | staff |
| `patients.ts` | patients, allergies, diseases, medications, addresses |
| `drugs.ts` | drugs, interactions, allergy groups |
| `products.ts` | products, categories |
| `inventory.ts` | inventory_lots, stock_movements |
| `prescriptions.ts` | prescriptions, rx_items, interventions |
| `orders.ts` | orders, order_items, payments, deliveries |
| `loyalty.ts` | loyalty_points, transactions |
| `chat.ts` | chat_sessions, chat_messages |
| `notifications.ts` | notifications |
| `clinical.ts` | medication_reviews, tdm_requests, adr_reports |
| `system.ts` | audit_log, system_config, medication_reminders |
| `telemedicine.ts` | consultations, kyc_verifications, consent_records |

### Commands
```bash
pnpm db:push       # Push schema to DB (dev)
pnpm db:generate   # Generate migration SQL
pnpm db:migrate    # Run migrations (prod)
pnpm db:seed       # Seed initial data
pnpm db:studio     # Open Drizzle Studio (GUI)
```

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `user-profile.tsx` |
| Components | PascalCase | `UserProfile` |
| Functions | camelCase | `getPatient()` |
| Constants | SCREAMING_SNAKE | `JWT_SECRET` |
| DB tables | snake_case | `patient_allergies` |
| API routes | kebab-case | `/v1/patient-allergies` |

---

## Testing

```bash
# All tests
pnpm test

# API unit tests
cd apps/api && pnpm test

# Specific test file
cd apps/api && pnpm test -- --testPathPattern=drug-safety

# E2E tests
cd apps/api && pnpm test:e2e
```

---

## Common Tasks

### เพิ่ม API endpoint ใหม่
1. สร้าง DTO ใน `dto/` (Zod schema)
2. เพิ่ม method ใน service
3. เพิ่ม route ใน controller
4. Register ใน module (ถ้าเป็น module ใหม่)

### เพิ่มหน้า Admin ใหม่
1. สร้าง `page.tsx` ใน `apps/admin/src/app/dashboard/<name>/`
2. เพิ่ม lib helper ใน `apps/admin/src/lib/`
3. เพิ่ม nav item ใน `apps/admin/src/components/sidebar.tsx`

### เพิ่มหน้า Shop ใหม่
1. สร้าง `page.tsx` ใน `apps/shop/src/app/(shop)/<name>/`
2. เพิ่ม lib helper ใน `apps/shop/src/lib/`
3. เพิ่ม `useAuthGuard()` ถ้าต้อง login

### เพิ่ม DB table ใหม่
1. เพิ่ม table ใน `packages/db/src/schema/`
2. Export จาก `packages/db/src/schema/index.ts`
3. `pnpm build --filter @telepharmacy/db`
4. `pnpm db:push`

### Deploy production / staging

ดูคู่มือเดียวที่ใช้ทั้งโปรเจกต์: **[`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)** — มีแยก **แบบ Docker Compose** (`make prod-up`) กับ **แบบ PM2 บน host** (`make deploy-shop` / `deploy-admin` และขั้นตอน copy static)
