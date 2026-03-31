# REYA Telepharmacy ERP — Unified Integration Map

> ทุกจุดเชื่อมต่อระหว่าง Shop, Admin, API, และ Infrastructure
> อัปเดต: March 2026

## 1. System Overview

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  SHOP (Next.js)  │  │ ADMIN (Next.js)  │  │  LINE Platform   │
│  :3002           │  │ :3001            │  │  (Webhook)       │
│  Customer LIFF   │  │ Staff Dashboard  │  │  Messaging API   │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         │  Bearer JWT         │  Bearer JWT          │  Signature
         │  (patient)          │  (staff)             │  Verified
         ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API (:3000)                            │
│  19 modules · JWT auth · Zod validation · BullMQ queues         │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │ Redis 7      │  │ MinIO        │
│ 16 + Drizzle │  │ Cache+Queue  │  │ S3 Storage   │
│ :5432        │  │ :6379        │  │ :9000        │
└──────────────┘  └──────────────┘  └──────────────┘
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Meilisearch  │  │ Gemini 2.5   │  │ Agora Video  │
│ :7700        │  │ Pro (AI)     │  │ (Cloud)      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 2. Complete API Endpoint Map

### Legend
- 🟢 = Shop ใช้งานแล้ว (connected)
- 🔵 = Admin ใช้งานแล้ว (connected)
- ⚪ = มี endpoint แต่ยังไม่มี frontend ใช้
- 🔒 = Staff-only (pharmacist/admin role required)

### Auth Module (`/v1/auth`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/auth/line` | Public | 🟢 LiffProvider | — | LINE OAuth login |
| POST | `/v1/auth/register` | Public | 🟢 /register | — | Patient registration + PDPA |
| POST | `/v1/auth/staff-login` | Public | — | 🔵 /login | Staff email/password login |
| POST | `/v1/auth/refresh` | Public | 🟢 api.ts auto | 🔵 api-client.ts auto | Token refresh |
| POST | `/v1/auth/logout` | JWT | — | — | Stateless (client discards) |
| GET | `/v1/auth/me` | JWT | — | 🔵 Header | Get current user profile |
| POST | `/v1/auth/pdpa-consent` | Patient | 🟢 /register | — | PDPA consent acceptance |
| POST | `/v1/auth/line/link/request` | Patient | — | — | Account linking request |
| POST | `/v1/auth/line/link/confirm` | Public | — | — | Account linking confirm |

### Products Module (`/v1/products`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/products` | Public | 🟢 /, /search, /products | 🔵 /products | List + search + filter |
| GET | `/v1/products/:id` | Public | 🟢 /product/[id] | 🔵 /products/[id] | Product detail |
| GET | `/v1/products/:id/stock` | Public | — | 🔵 /inventory | Real-time stock |
| POST | `/v1/products` | 🔒 Staff | — | 🔵 /products/new | Create product |
| PATCH | `/v1/products/:id` | 🔒 Staff | — | 🔵 /products/[id] | Update product |
| DELETE | `/v1/products/:id` | 🔒 Staff | — | ⚪ | Delete product |
| POST | `/v1/products/sync` | 🔒 Staff | — | 🔵 Odoo sync button | Sync from Odoo |
| POST | `/v1/products/sync-all` | 🔒 Staff | — | 🔵 Odoo sync button | Sync all from Odoo |
| GET | `/v1/products/odoo-status` | 🔒 Staff | — | ⚪ | Check Odoo connection |

### Orders Module (`/v1/orders`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/orders` | Patient | 🟢 /checkout | — | Create OTC order |
| GET | `/v1/orders` | Patient | 🟢 /orders | — | List my orders |
| GET | `/v1/orders/:id` | Patient | 🟢 /orders/[id], /checkout/success | — | Order detail |
| POST | `/v1/orders/:id/cancel` | Patient | — | — | Cancel order |
| POST | `/v1/orders/:id/reorder` | Patient | 🟢 /orders/[id] | — | Reorder |
| POST | `/v1/orders/validate-coupon` | Patient | 🟢 /checkout | — | Validate coupon |
| GET | `/v1/staff/orders` | 🔒 Staff | — | 🔵 /orders | List all orders |
| POST | `/v1/orders/:id/slip` | Patient | 🟢 /checkout/success | — | Upload payment slip |
| GET | `/v1/staff/orders/pending-slip` | 🔒 Staff | — | ⚪ | Pending slip queue |
| POST | `/v1/staff/orders/:id/verify-slip` | 🔒 Staff | — | ⚪ | Manual slip verify |
| POST | `/v1/staff/orders/:id/refund` | 🔒 Staff | — | ⚪ | Process refund |

### Prescriptions Module (`/v1/prescriptions`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/prescriptions` | Patient | 🟢 /rx/upload | — | Upload Rx images |
| GET | `/v1/prescriptions/:id` | JWT | 🟢 /rx/[id] | 🔵 /pharmacist/[id] | Rx detail |
| GET | `/v1/prescriptions/queue` | 🔒 Staff | — | 🔵 /pharmacist | Pharmacist queue |
| PATCH | `/v1/prescriptions/:id/verify` | 🔒 Staff | — | 🔵 /pharmacist/[id] | Verify/approve Rx |
| GET | `/v1/prescriptions/:id/signature` | 🔒 Staff | — | ⚪ | Get pharmacist signature |
| POST | `/v1/prescriptions/:id/interventions` | 🔒 Staff | — | 🔵 /pharmacist/[id] | Log intervention |
| POST | `/v1/prescriptions/:id/counseling` | 🔒 Staff | — | ⚪ | Start counseling |
| PATCH | `/v1/prescriptions/:id/counseling/:sid` | 🔒 Staff | — | ⚪ | Update counseling |
| GET | `/v1/patients/me/prescriptions` | Patient | 🟢 /rx/status | — | My prescriptions |

### Patient Module (`/v1/patients`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/patients/me` | Patient | 🟢 /profile | — | My profile |
| PATCH | `/v1/patients/me` | Patient | 🟢 /profile/edit | — | Update profile |
| GET | `/v1/patients/me/allergies` | Patient | 🟢 /profile/allergies | — | My allergies |
| POST | `/v1/patients/me/allergies` | Patient | 🟢 /profile/allergies, /onboarding | — | Add allergy |
| PATCH | `/v1/patients/me/allergies/:id` | Patient | — | — | Update allergy |
| DELETE | `/v1/patients/me/allergies/:id` | Patient | 🟢 /profile/allergies | — | Delete allergy |
| GET | `/v1/patients/me/diseases` | Patient | 🟢 /profile/diseases | — | My diseases |
| POST | `/v1/patients/me/diseases` | Patient | 🟢 /profile/diseases, /onboarding | — | Add disease |
| DELETE | `/v1/patients/me/diseases/:id` | Patient | 🟢 /profile/diseases | — | Delete disease |
| GET | `/v1/patients/me/medications` | Patient | 🟢 /profile/medications | — | My medications |
| POST | `/v1/patients/me/medications` | Patient | 🟢 /profile/medications | — | Add medication |
| DELETE | `/v1/patients/me/medications/:id` | Patient | 🟢 /profile/medications | — | Delete medication |
| GET | `/v1/staff/patients` | 🔒 Staff | — | 🔵 /patients | List all patients |

### Adherence Module (`/v1/adherence`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/adherence/my-reminders` | Patient | 🟢 /medication-reminders | — | My reminders |
| POST | `/v1/adherence/my-reminders` | Patient | 🟢 /medication-reminders | — | Create reminder |
| PATCH | `/v1/adherence/reminders/:id/acknowledge` | Patient | 🟢 /medication-reminders | — | Mark taken |
| PATCH | `/v1/adherence/my-reminders/:id/toggle` | Patient | 🟢 /medication-reminders | — | Toggle on/off |
| DELETE | `/v1/adherence/my-reminders/:id` | Patient | 🟢 /medication-reminders | — | Delete reminder |
| GET | `/v1/adherence/my-stats` | Patient | 🟢 /medication-reminders | — | Adherence stats |
| POST | `/v1/staff/adherence/reminders` | 🔒 Staff | — | ⚪ | Create for patient |
| GET | `/v1/staff/adherence/reminders` | 🔒 Staff | — | ⚪ | List all reminders |
| GET | `/v1/staff/adherence/stats/:patientId` | 🔒 Staff | — | ⚪ | Patient stats |
| POST | `/v1/staff/adherence/reminders/:id/send-now` | 🔒 Staff | — | ⚪ | Force send |

### Loyalty Module (`/v1/loyalty`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/loyalty/me` | Patient | 🟢 /profile/loyalty | — | My points & tier |
| POST | `/v1/loyalty/redeem` | Patient | 🟢 /profile/loyalty | — | Redeem points |
| GET | `/v1/loyalty/transactions` | Patient | 🟢 /profile/loyalty | — | Points history |
| POST | `/v1/staff/loyalty/:patientId/adjust` | 🔒 Staff | — | ⚪ | Adjust points |
| GET | `/v1/staff/loyalty/:patientId` | 🔒 Staff | — | ⚪ | Patient loyalty |

### Notifications Module (`/v1/notifications`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/notifications/me` | JWT | 🟢 /notifications | — | My notifications |
| PATCH | `/v1/notifications/:id/read` | JWT | 🟢 /notifications | — | Mark read |
| POST | `/v1/notifications/read-all` | JWT | 🟢 /notifications | — | Mark all read |

### ADR Module (`/v1/adr`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/adr` | 🔒 Staff | 🟢 /adr-report | — | Submit ADR report |
| GET | `/v1/adr` | 🔒 Staff | — | ⚪ | List ADR reports |
| GET | `/v1/adr/:id` | 🔒 Staff | — | ⚪ | ADR detail |
| PATCH | `/v1/adr/:id/assess` | 🔒 Staff | — | ⚪ | Causality assessment |
| GET | `/v1/adr/export` | 🔒 Staff | — | ⚪ | Export for อย. |

### Drug Info Module (`/v1/drug-info`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/drug-info/lookup` | JWT | 🟢 /clinical/di-database | — | Drug lookup |
| POST | `/v1/drug-info/medication-review` | JWT | 🟢 /clinical/med-review | — | Request MR |
| GET | `/v1/drug-info/medication-review` | 🔒 Staff | — | ⚪ | List MR requests |
| PATCH | `/v1/drug-info/medication-review/:id/complete` | 🔒 Staff | — | ⚪ | Complete MR |
| POST | `/v1/drug-info/tdm` | JWT | — | ⚪ | Request TDM |
| GET | `/v1/drug-info/tdm` | 🔒 Staff | — | ⚪ | List TDM requests |
| PATCH | `/v1/drug-info/tdm/:id/result` | 🔒 Staff | — | ⚪ | Record TDM result |

### Chat Module (`/v1/chat`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/chat/sessions` | JWT | 🟢 /chat | — | Create/get session |
| GET | `/v1/chat/sessions/:id/messages` | JWT | 🟢 /chat (polling 3s) | — | Get messages |
| POST | `/v1/chat/sessions/:id/messages` | JWT | 🟢 /chat | — | Send message |

### AI Module (`/v1/ai`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/ai/chat` | JWT | 🟢 /ai-consult | — | AI chatbot (Gemini) |

### LINE Module (`/v1/line`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/line/webhook` | LINE Sig | — | — | LINE webhook handler |
| POST | `/v1/line/send` | JWT | — | ⚪ | Push message to user |
| POST | `/v1/line/broadcast` | JWT | — | ⚪ | Broadcast to all |

### Telemedicine Module (`/v1/telemedicine`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/telemedicine/consultations/request` | JWT | 🟢 /consultation | — | Request consultation |
| POST | `/v1/telemedicine/consultations/:id/accept-consent` | JWT | ⚪ | — | Accept e-consent |
| POST | `/v1/telemedicine/consultations/:id/accept` | 🔒 Staff | — | ⚪ | Pharmacist accepts |
| GET | `/v1/telemedicine/consultations/:id/token` | JWT | ⚪ | — | Get Agora token |
| POST | `/v1/telemedicine/consultations/:id/start` | JWT | ⚪ | ⚪ | Start video session |
| POST | `/v1/telemedicine/consultations/:id/end` | JWT | ⚪ | ⚪ | End video session |
| GET | `/v1/telemedicine/consultations/:id` | JWT | ⚪ | ⚪ | Consultation detail |
| GET | `/v1/telemedicine/consultations` | JWT | ⚪ | ⚪ | List consultations |

### Telemedicine KYC (`/v1/telemedicine/kyc`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| POST | `/v1/telemedicine/kyc/upload-document` | JWT | ⚪ | — | Upload ID document |
| POST | `/v1/telemedicine/kyc/liveness-check` | JWT | ⚪ | — | Liveness detection |
| POST | `/v1/telemedicine/kyc/face-compare` | JWT | ⚪ | — | Face matching |
| POST | `/v1/telemedicine/kyc/send-otp` | JWT | ⚪ | — | Send OTP |
| POST | `/v1/telemedicine/kyc/verify-otp` | JWT | ⚪ | — | Verify OTP |
| GET | `/v1/telemedicine/kyc/verify-email/:token` | Public | ⚪ | — | Email verification |
| GET | `/v1/telemedicine/kyc/status/:patientId` | JWT | ⚪ | ⚪ | KYC status |
| POST | `/v1/telemedicine/kyc/manual-review` | 🔒 Staff | — | ⚪ | Manual review |

### Inventory Module (`/v1/staff/inventory`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/staff/inventory` | 🔒 Staff | — | 🔵 /inventory | Stock overview |
| GET | `/v1/staff/inventory/alerts` | 🔒 Staff | — | 🔵 /inventory | Low stock/expiry |
| GET | `/v1/staff/inventory/movements` | 🔒 Staff | — | ⚪ | Movement history |
| GET | `/v1/staff/inventory/products/:id/lots` | 🔒 Staff | — | ⚪ | Lots by product |
| POST | `/v1/staff/inventory/lots` | 🔒 Staff | — | ⚪ | Receive lot |
| POST | `/v1/staff/inventory/adjustments` | 🔒 Staff | — | ⚪ | Adjust stock |
| POST | `/v1/staff/inventory/write-off` | 🔒 Staff | — | ⚪ | Write off |

### Reports Module (`/v1/staff/reports`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/staff/reports/summary` | 🔒 Staff | — | 🔵 /, /reports | Dashboard summary |
| GET | `/v1/staff/reports/daily-sales` | 🔒 Staff | — | 🔵 /reports | Sales chart |
| GET | `/v1/staff/reports/top-products` | 🔒 Staff | — | 🔵 /reports | Top products |
| GET | `/v1/staff/reports/rx-volume` | 🔒 Staff | — | 🔵 /reports | Rx volume chart |
| GET | `/v1/staff/reports/interventions` | 🔒 Staff | — | 🔵 /reports | Interventions pie |
| GET | `/v1/staff/reports/low-stock` | 🔒 Staff | — | 🔵 / | Low stock summary |
| GET | `/v1/staff/reports/expiry` | 🔒 Staff | — | ⚪ | Expiry report |

### Health Module (`/v1/health`)
| Method | Endpoint | Auth | Shop | Admin | Description |
|--------|----------|------|------|-------|-------------|
| GET | `/v1/health` | Public | — | — | Basic health check |
| GET | `/v1/health/ready` | Public | — | — | Readiness (DB check) |

## 3. Admin Dashboard Route Map

| Route | API Endpoints Used | Status |
|-------|-------------------|--------|
| `/dashboard` | `GET /v1/staff/reports/summary`, `GET /v1/prescriptions/queue`, `GET /v1/staff/orders`, `GET /v1/staff/reports/low-stock` | 🔵 Connected (SWR) |
| `/dashboard/orders` | `GET /v1/staff/orders?status=&page=&limit=` | 🔵 Connected (SWR) |
| `/dashboard/orders/[id]` | `GET /v1/orders/:id` (staff view) | 🔵 Connected |
| `/dashboard/pharmacist` | `GET /v1/prescriptions/queue?limit=50` | 🔵 Connected (SWR, auto-refresh 15s) |
| `/dashboard/pharmacist/[id]` | `GET /v1/prescriptions/:id`, `PATCH /v1/prescriptions/:id/verify` | 🔵 Connected |
| `/dashboard/products` | `GET /v1/products` (server-side fetch) | 🔵 Connected (Server Component) |
| `/dashboard/products/new` | `POST /v1/products` | 🔵 Connected |
| `/dashboard/products/[id]` | `GET /v1/products/:id`, `PATCH /v1/products/:id` | 🔵 Connected |
| `/dashboard/inventory` | `GET /v1/products` (stock view) | 🔵 Connected (Server Component) |
| `/dashboard/patients` | `GET /v1/staff/patients?q=&page=&limit=` | 🔵 Connected (SWR) |
| `/dashboard/patients/[id]` | Patient detail + allergies/diseases/meds | 🔵 Connected |
| `/dashboard/reports` | `GET /v1/staff/reports/summary`, `daily-sales`, `top-products`, `rx-volume`, `interventions` | 🔵 Connected (SWR, Recharts) |
| `/dashboard/settings` | System configuration | ⚪ UI only |

## 4. Shop Route Map (Complete)

| Route | API Endpoints Used | Status |
|-------|-------------------|--------|
| `/` | `GET /v1/products` (featured) | 🟢 Server Component |
| `/login` | LIFF SDK → `POST /v1/auth/line` | 🟢 |
| `/register` | `POST /v1/auth/register` | 🟢 |
| `/search` | `GET /v1/products` (search/filter/sort) | 🟢 URL sync |
| `/products` | `GET /v1/products` (browse by category) | 🟢 |
| `/product/[id]` | `GET /v1/products/:id` | 🟢 Server Component |
| `/cart` | Zustand store (client-only) | 🟢 |
| `/checkout` | `POST /v1/orders`, `POST /v1/orders/validate-coupon` | 🟢 |
| `/checkout/success` | `GET /v1/orders/:id`, `POST /v1/orders/:id/slip` | 🟢 QR base64 |
| `/orders` | `GET /v1/orders` | 🟢 |
| `/orders/[id]` | `GET /v1/orders/:id`, `POST /v1/orders/:id/reorder` | 🟢 |
| `/rx/upload` | `POST /v1/prescriptions` (FormData) | 🟢 |
| `/rx/status` | `GET /v1/patients/me/prescriptions` | 🟢 |
| `/rx/[id]` | `GET /v1/prescriptions/:id` | 🟢 |
| `/profile` | `GET /v1/patients/me` + allergies/diseases/meds | 🟢 |
| `/profile/edit` | `GET /v1/patients/me`, `PATCH /v1/patients/me` | 🟢 |
| `/profile/allergies` | CRUD `/v1/patients/me/allergies` | 🟢 |
| `/profile/medications` | CRUD `/v1/patients/me/medications` | 🟢 |
| `/profile/diseases` | CRUD `/v1/patients/me/diseases` | 🟢 |
| `/profile/loyalty` | `GET /v1/loyalty/me`, `GET /v1/loyalty/transactions` | 🟢 |
| `/profile/notifications` | Settings UI | 🟢 |
| `/profile/pdpa` | PDPA settings | 🟢 Auth guarded |
| `/profile/audit-trail` | Audit log | 🟢 Auth guarded |
| `/profile/delete-account` | Account deletion | 🟢 Auth guarded |
| `/medication-reminders` | CRUD `/v1/adherence/my-reminders` | 🟢 |
| `/notifications` | `GET /v1/notifications/me`, mark read | 🟢 |
| `/consultation` | `POST /v1/telemedicine/consultations/request` | 🟢 |
| `/chat` | `POST /v1/chat/sessions`, messages API (polling) | 🟢 |
| `/ai-consult` | `POST /v1/ai/chat` → Gemini 2.5 Pro | 🟢 |
| `/adr-report` | `POST /v1/adr` | 🟢 |
| `/clinical` | Navigation hub | 🟢 |
| `/clinical/di-database` | `GET /v1/drug-info/lookup` | 🟢 |
| `/clinical/med-review` | `POST /v1/drug-info/medication-review` | 🟢 |
| `/clinical/tdm` | TDM consultation | 🟢 `POST /v1/drug-info/tdm` |
| `/onboarding/health` | `POST /v1/patients/me/allergies` + diseases | 🟢 |

## 5. Coverage Summary

### API Endpoints: 95 total
| Category | Total | Shop 🟢 | Admin 🔵 | Unused ⚪ |
|----------|-------|---------|----------|----------|
| Auth | 9 | 4 | 3 | 2 |
| Products | 8 | 2 | 6 | 1 |
| Orders | 11 | 6 | 1 | 4 |
| Prescriptions | 9 | 3 | 3 | 3 |
| Patient | 13 | 10 | 1 | 2 |
| Adherence | 10 | 6 | 0 | 4 |
| Loyalty | 5 | 3 | 0 | 2 |
| Notifications | 3 | 3 | 0 | 0 |
| ADR | 5 | 1 | 0 | 4 |
| Drug Info | 7 | 2 | 0 | 5 |
| Chat | 3 | 3 | 0 | 0 |
| AI | 1 | 1 | 0 | 0 |
| LINE | 3 | 0 | 0 | 3 |
| Telemedicine | 8 | 1 | 0 | 7 |
| KYC | 8 | 0 | 0 | 8 |
| Inventory | 7 | 0 | 2 | 5 |
| Reports | 7 | 0 | 6 | 1 |
| Health | 2 | 0 | 0 | 2 |

### Frontend Pages
| App | Total Routes | Connected | Stub/Unverified |
|-----|-------------|-----------|-----------------|
| Shop | 33 | 33 (100%) | 0 |
| Admin | 12 | 11 (92%) | 1 |

### Remaining Gaps (⚪ endpoints not used by any frontend)
1. Telemedicine video consultation flow (8 endpoints)
2. KYC verification flow (8 endpoints)
3. Inventory management (5 endpoints — admin only)
4. ADR management (4 endpoints — admin only)
5. Drug info staff tools (5 endpoints — admin only)
6. Adherence staff tools (4 endpoints — admin only)
7. Payment staff tools (3 endpoints — admin only)
8. LINE messaging tools (3 endpoints — admin only)

## 6. Database Schema Coverage

| Schema File | Tables | Used By Shop | Used By Admin | Used By API |
|-------------|--------|-------------|---------------|-------------|
| patients.ts | patients | ✅ | ✅ | ✅ |
| staff.ts | staff | — | ✅ | ✅ |
| products.ts | products, categories | ✅ | ✅ | ✅ |
| drugs.ts | drugs | — | — | ✅ |
| inventory.ts | inventory_lots, stock_movements | — | ✅ | ✅ |
| orders.ts | orders, order_items, payments, deliveries | ✅ | ✅ | ✅ |
| prescriptions.ts | prescriptions, rx_items, interventions | ✅ | ✅ | ✅ |
| chat.ts | chat_sessions, chat_messages | ✅ | — | ✅ |
| notifications.ts | notifications | ✅ | — | ✅ |
| loyalty.ts | loyalty_transactions | ✅ | — | ✅ |
| clinical.ts | patient_allergies, chronic_diseases, medications | ✅ | ✅ | ✅ |
| campaigns.ts | campaigns | — | — | ✅ |
| complaints.ts | complaints | — | — | ✅ |
| content.ts | content | — | — | ✅ |
| system.ts | system_settings, audit_logs | — | — | ✅ |
| telemedicine.ts | kyc, consultations, consents, scope_rules, referrals | — | — | ✅ |

## 7. Infrastructure Services

| Service | Port | Used By | Status |
|---------|------|---------|--------|
| PostgreSQL 16 | 5432 | API (Drizzle ORM) | ✅ Running |
| Redis 7 | 6379 | API (BullMQ queues, cache) | ✅ Running |
| Meilisearch v1.11 | 7700 | API (product search) | ✅ Running |
| MinIO | 9000/9001 | API (file storage), Shop (product images) | ✅ Running |
| Traefik v3.3 | 80/443/8080 | Reverse proxy, SSL | ✅ Running |
| Prometheus v3.2.1 | 9090 | Metrics collection | ✅ Running |
| Grafana 11.5.2 | 3010 | Monitoring dashboards | ✅ Running |
| Agora | Cloud | Telemedicine video | ⚪ Configured, not used by frontend |
| Gemini 2.5 Pro | Cloud | AI chatbot, OCR, drug checker | ✅ Used by Shop |
| Omise | Cloud | Payment processing | ✅ Used by API |
| LINE Messaging API | Cloud | Webhooks, push messages | ✅ Used by API |
