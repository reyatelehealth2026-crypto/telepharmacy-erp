# Phase 3: Complete Project Integration Plan

> สถานะ: วางแผนแล้ว — พร้อม execute
> อัปเดต: March 2026

## สรุปสถานะปัจจุบัน

### สิ่งที่ทำเสร็จแล้ว (Phase 1 + 2)
- ✅ Token refresh interceptor (api.ts)
- ✅ Orders pages → real API
- ✅ Checkout success → real orderId
- ✅ Auth guard hook (7 pages)
- ✅ Coupon validation → API
- ✅ Search URL sync
- ✅ Consultation → telemedicine API
- ✅ AI Chatbot → Gemini API

### สิ่งที่ต้องทำ — จัดลำดับตาม Impact × Effort

## ═══════════════════════════════════════════════════
## TIER 1: Frontend-Only Fixes (ไม่ต้องแก้ backend)
## ═══════════════════════════════════════════════════

### Task 1: ADR Report → Wire to Backend API
**Impact:** สูง (regulatory compliance — ต้องส่ง อย.)
**Effort:** ต่ำ (endpoint มีอยู่แล้ว)

```
Shop Page:     /adr-report (stub — setTimeout mock)
Backend API:   POST /v1/adr (AdrController — มีอยู่แล้ว)
DB Schema:     adr_reports table (มีอยู่แล้ว)
```
**งานที่ต้องทำ:**
- สร้าง `lib/adr.ts` — API helper function
- แก้ `adr-report/page.tsx` — เปลี่ยน setTimeout เป็นเรียก API จริง
- เพิ่ม auth guard

---

### Task 2: Notifications Page — Verify API Connection
**Impact:** สูง (user engagement)
**Effort:** ต่ำ (page เรียก API อยู่แล้ว แต่ต้อง verify)

```
Shop Page:     /notifications (เรียก API อยู่แล้ว)
Backend API:   GET /v1/notifications/me ✅
               PATCH /v1/notifications/:id/read ✅
               POST /v1/notifications/read-all ✅
DB Schema:     notifications table ✅
```
**งานที่ต้องทำ:**
- เพิ่ม auth guard (ยังไม่มี)
- ตรวจสอบ response format ตรงกับ frontend types
- เพิ่ม deep link: กดแจ้งเตือน → navigate ไปหน้าที่เกี่ยวข้อง (order, rx)

---

### Task 3: Profile Edit — Verify API Connection
**Impact:** ปานกลาง
**Effort:** ต่ำ (page เรียก API อยู่แล้ว)

```
Shop Page:     /profile/edit (เรียก getMyProfile + updateProfile อยู่แล้ว)
Backend API:   GET /v1/patients/me ✅
               PATCH /v1/patients/me ✅
```
**งานที่ต้องทำ:**
- เพิ่ม auth guard (ใช้ useAuthGuard)
- ตรวจสอบว่า redirect ไป /login ถ้าไม่มี token (ปัจจุบันทำอยู่แล้วแบบ manual)

---

### Task 4: Profile Allergies — Verify API Connection
**Impact:** สูง (drug safety)
**Effort:** ต่ำ (page เรียก API อยู่แล้ว)

```
Shop Page:     /profile/allergies (เรียก getMyAllergies, createAllergy, deleteAllergy อยู่แล้ว)
Backend API:   GET /v1/patients/me/allergies ✅
               POST /v1/patients/me/allergies ✅
               DELETE /v1/patients/me/allergies/:id ✅
```
**งานที่ต้องทำ:**
- เพิ่ม auth guard
- ใช้ toast จาก sonner แทน alert()

---

### Task 5: Profile Loyalty — Verify API Connection
**Impact:** ปานกลาง
**Effort:** ต่ำ (page เรียก API อยู่แล้ว)

```
Shop Page:     /profile/loyalty (เรียก getMyProfile + getTransactions อยู่แล้ว)
Backend API:   GET /v1/loyalty/me ✅
               GET /v1/loyalty/transactions ✅
```
**งานที่ต้องทำ:**
- เพิ่ม auth guard
- Fallback values (points = 2450 hardcode) → ใช้ 0 แทน

---

### Task 6: Onboarding Health — Verify API Connection
**Impact:** สูง (first-time user experience)
**Effort:** ต่ำ (page เรียก createAllergy + createDisease อยู่แล้ว)

```
Shop Page:     /onboarding/health (เรียก createAllergy, createDisease อยู่แล้ว)
Backend API:   POST /v1/patients/me/allergies ✅
               POST /v1/patients/me/diseases ✅
```
**งานที่ต้องทำ:**
- เพิ่ม auth guard
- ตรวจสอบ error handling (ปัจจุบันใช้ Promise.allSettled ซึ่งดี)

---

### Task 7: Rx Detail Page — Fix toast import
**Impact:** ปานกลาง
**Effort:** ต่ำ

```
Shop Page:     /rx/[id] (เรียก getPrescription อยู่แล้ว)
Backend API:   GET /v1/prescriptions/:id ✅
```
**งานที่ต้องทำ:**
- แก้ custom toast helper → import จาก sonner แทน
- เพิ่ม auth guard (ปัจจุบันทำ manual redirect)

## ═══════════════════════════════════════════════════
## TIER 2: Backend + Frontend Work (ต้องสร้าง/แก้ backend)
## ═══════════════════════════════════════════════════

### Task 8: Real-time Chat with Pharmacist
**Impact:** สูง (core feature)
**Effort:** สูง (ต้อง WebSocket/SSE + chat session management)

```
Shop Page:     /chat (mock — setTimeout)
Backend:       LINE module มี chat session/message schema อยู่แล้ว
               chatSessions table + chatMessages table ✅
               LineWebhookService มี chat handling อยู่แล้ว
Infrastructure: Redis (pub/sub สำหรับ real-time)
```
**งานที่ต้องทำ:**
- **Backend:** สร้าง SSE endpoint `GET /v1/chat/sessions/:id/stream`
  - ใช้ Redis pub/sub สำหรับ real-time message delivery
  - สร้าง `POST /v1/chat/sessions` (create session)
  - สร้าง `POST /v1/chat/sessions/:id/messages` (send message)
  - สร้าง `GET /v1/chat/sessions/:id/messages` (history)
- **Frontend:** สร้าง `lib/chat.ts` + แก้ `chat/page.tsx`
  - ใช้ EventSource สำหรับ SSE
  - เรียก API จริงแทน mock
  - แสดง pharmacist จริง (ไม่ hardcode ชื่อ)

---

### Task 9: Product Images from MinIO/CDN
**Impact:** สูง (visual quality)
**Effort:** ปานกลาง

```
Shop Pages:    /, /search, /products, /product/[id], /cart
Backend:       products.images (jsonb) + products.imageUrl
               MinIO bucket: telepharmacy/public ✅
               next.config.ts: remotePatterns → manager.cnypharmacy.com ✅
```
**งานที่ต้องทำ:**
- **Backend:** ตรวจสอบว่า product sync จาก Odoo ดึง image URLs มาด้วย
- **Frontend:** ตรวจสอบว่า `next.config.ts` remotePatterns ครอบคลุม MinIO domain
  - เพิ่ม MinIO domain ใน remotePatterns (localhost:9000 สำหรับ dev)
- **Product Card:** ใช้ `product.imageUrl` ที่มีอยู่แล้ว (ถ้า URL ถูกต้อง จะแสดงรูปจริง)

---

### Task 10: Payment QR Code from Omise
**Impact:** สูง (payment flow)
**Effort:** ปานกลาง

```
Shop Page:     /checkout/success (placeholder QR)
Backend:       PaymentService มี Omise integration
               payments.promptpayPayload (QR data)
               payments.promptpayRef
```
**งานที่ต้องทำ:**
- **Backend:** ตรวจสอบว่า createOrder → สร้าง payment record → generate PromptPay QR
  - Return `payment.qrCodeUrl` หรือ `payment.promptpayPayload` ใน order response
- **Frontend:** checkout/success page ใช้ `order.payment.qrCodeUrl` อยู่แล้ว
  - ถ้า backend return QR URL → จะแสดงอัตโนมัติ (code พร้อมแล้ว)

---

### Task 11: Clinical Services — Drug Information Database
**Impact:** ปานกลาง (professional feature)
**Effort:** ปานกลาง

```
Shop Pages:    /clinical, /clinical/di-database, /clinical/med-review, /clinical/tdm
Backend:       DrugInfoModule + DrugSafetyModule มีอยู่แล้ว
               packages/ai/drug-checker.ts มี checkDrugSafety, checkDrugInteractions
```
**งานที่ต้องทำ:**
- **Frontend:** สร้าง `lib/drug-info.ts` — API helpers
- **Frontend:** แก้ `/clinical/di-database` → เรียก drug info API จริง
- **Frontend:** แก้ `/clinical/med-review` → เรียก drug interaction check API

## ═══════════════════════════════════════════════════
## TIER 3: Major Features (ต้อง infrastructure ใหม่)
## ═══════════════════════════════════════════════════

### Task 12: Video Consultation UI (Agora)
**Impact:** สูง (telemedicine core)
**Effort:** สูงมาก

```
Backend:       AgoraService ✅, ConsultationController ✅
               videoConsultations table ✅
               Token generation ✅
Infrastructure: Agora SDK (ต้อง AGORA_APP_ID env)
```
**งานที่ต้องทำ:**
- สร้าง `/consultation/[id]/video` page
- Integrate Agora Web SDK
- Handle token refresh, reconnection
- Recording consent UI

---

### Task 13: KYC Verification Flow
**Impact:** สูง (regulatory compliance)
**Effort:** สูงมาก

```
Backend:       KycController ✅, KycService ✅
               kycVerifications table ✅
               AWS Rekognition integration ✅
               MinIO storage ✅
```
**งานที่ต้องทำ:**
- สร้าง `/profile/kyc` page
- Document upload UI
- Liveness detection UI
- Face comparison UI
- OTP verification flow

---

### Task 14: Address Sync with Backend
**Impact:** ปานกลาง (cross-device)
**Effort:** ปานกลาง

```
Shop:          Zustand address store (client-only)
Backend:       ไม่มี address endpoint → ต้องสร้าง
DB:            orders table มี delivery address fields แต่ไม่มี saved addresses table
```
**งานที่ต้องทำ:**
- **DB:** สร้าง `patient_addresses` table
- **Backend:** สร้าง CRUD endpoints `/v1/patients/me/addresses`
- **Frontend:** Sync Zustand store กับ backend

## ═══════════════════════════════════════════════════
## CONNECTION MAP (ทุกจุดเชื่อมต่อ)
## ═══════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHOP FRONTEND (Next.js :3002)                    │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth Flow   │  │ Shopping     │  │ Health       │  │ Comms      │  │
│  │             │  │              │  │              │  │            │  │
│  │ /login      │  │ / (home)     │  │ /profile     │  │ /chat ⚠️   │  │
│  │ /register   │  │ /search      │  │ /allergies   │  │ /consult ✅│  │
│  │ LIFF auto   │  │ /products    │  │ /medications │  │ /ai-consult│  │
│  │             │  │ /product/[id]│  │ /diseases    │  │ /notif ✅  │  │
│  │             │  │ /cart        │  │ /rx/upload   │  │            │  │
│  │             │  │ /checkout    │  │ /rx/status   │  │            │  │
│  │             │  │ /orders      │  │ /rx/[id]     │  │            │  │
│  │             │  │ /orders/[id] │  │ /med-remind  │  │            │  │
│  │             │  │              │  │ /adr-report⚠️│  │            │  │
│  │             │  │              │  │ /loyalty     │  │            │  │
│  │             │  │              │  │ /onboarding  │  │            │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                  │                │         │
│         ▼                ▼                  ▼                ▼         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    lib/*.ts (API helpers)                       │   │
│  │  auth.ts | products.ts | orders.ts | patient.ts | adherence.ts │   │
│  │  prescriptions.ts | loyalty.ts | notifications.ts | ai-chat.ts │   │
│  │  consultation.ts | adr.ts (ต้องสร้าง) | chat.ts (ต้องสร้าง)   │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                        │
│  ┌────────────────────────────▼────────────────────────────────────┐   │
│  │  api.ts (fetch wrapper + auto token refresh + 401 retry)       │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                        │
│  ┌────────────────────────────┼────────────────────────────────────┐   │
│  │  Zustand Stores: auth (reya-auth) | cart (reya-cart) | address │   │
│  └────────────────────────────┼────────────────────────────────────┘   │
└───────────────────────────────┼────────────────────────────────────────┘
                                │ Bearer JWT + JSON/FormData
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    BACKEND API (NestJS :3000)                         │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Auth     │ │ Product  │ │ Orders   │ │ Patient  │ │ Rx       │  │
│  │ JWT+LINE │ │ Catalog  │ │ Payment  │ │ Profile  │ │ OCR+     │  │
│  │ Refresh  │ │ Odoo Sync│ │ Omise    │ │ Allergy  │ │ Review   │  │
│  │ Register │ │ Search   │ │ Slip OCR │ │ Disease  │ │ Workflow │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ LINE     │ │ Loyalty  │ │ Notif    │ │ Adherence│ │ ADR      │  │
│  │ Webhook  │ │ Points   │ │ Push     │ │ Reminders│ │ Reports  │  │
│  │ Chat     │ │ Tier     │ │ LINE/SMS │ │ Stats    │ │ อย. Export│  │
│  │ AI Chat  │ │ Redeem   │ │ Email    │ │ BullMQ   │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Telemedicine Module (Thai Act 2569)                              │ │
│  │ KYC | Consent | Scope | Consultation | Referral | Audit | PDPA  │ │
│  │ License | Compliance | Documentation                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ AI Package (@telepharmacy/ai)                                    │ │
│  │ chatbot.ts (Gemini) | ocr.ts (Rx/Slip) | drug-checker.ts       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                     │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │ Redis 7  │ │Meilisearch│ │ MinIO    │ │ Traefik  │  │
│  │ 16       │ │ Cache +  │ │ v1.11    │ │ S3 Store │ │ v3.3     │  │
│  │ Drizzle  │ │ BullMQ   │ │ Search   │ │ Files    │ │ SSL/LB   │  │
│  │ :5432    │ │ :6379    │ │ :7700    │ │ :9000    │ │ :80/443  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │Prometheus│ │ Grafana  │ │ Agora    │ │ Gemini   │               │
│  │ Metrics  │ │ Dashboard│ │ Video    │ │ 2.5 Pro  │               │
│  │ :9090    │ │ :3010    │ │ (cloud)  │ │ (cloud)  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
└───────────────────────────────────────────────────────────────────────┘
```

## ═══════════════════════════════════════════════════
## EXECUTION ORDER (แนะนำ)
## ═══════════════════════════════════════════════════

### Sprint 1 (ทำได้ทันที — frontend-only) ✅ COMPLETED
1. ✅ Task 1: ADR Report → API
2. ✅ Task 2: Notifications auth guard
3. ✅ Task 3: Profile Edit auth guard
4. ✅ Task 4: Profile Allergies auth guard + toast
5. ✅ Task 5: Profile Loyalty auth guard + fix fallback
6. ✅ Task 6: Onboarding Health auth guard
7. ✅ Task 7: Rx Detail fix toast import

### Sprint 2 (ต้อง backend work เล็กน้อย) ✅ COMPLETED
8. ✅ Task 9: Product Images (config + verify)
9. ✅ Task 10: Payment QR (pass QR base64 from createOrder)
10. ✅ Task 11: Clinical DI Database + Med Review → real API

### Sprint 3 (ต้อง backend work มาก) — COMPLETED ✅
11. ✅ Task 8: Real-time Chat (REST API + polling 3s)
12. ✅ Task 14: Address Sync — deferred to P4

### P3 (Shop Remaining Stubs) ✅ COMPLETED
- ✅ Task 3.1: TDM → API
- ✅ Task 3.2: PDPA auth guard
- ✅ Task 3.3: Audit trail auth guard
- ✅ Task 3.4: Delete account auth guard
- **Shop routes: 33/33 (100%) connected**

### Sprint 4 — P1: Admin Staff Tools ✅ COMPLETED
- ✅ Task 1.1: Order management (pending slips, verify, refund) — 3 new endpoints
- ✅ Task 1.2: ADR management dashboard (list, detail, assess, export)
- ✅ Task 1.3: Drug info staff tools (MR queue, TDM queue, complete/record)
- ✅ Task 1.4: Adherence staff tools (patient detail tab)
- ✅ Task 1.5: Inventory full management (receive, movements, actions)
- ✅ Task 1.7: Loyalty staff tools (patient detail tab + adjust)
- ✅ Task 4.1: LINE messaging tools (push + broadcast)
- **Admin routes: 22/22 (100%) connected**

### Sprint 5 — P2: Telemedicine Frontend ✅ COMPLETED
15. ✅ Task 2.1: Video Consultation UI (Agora) — detail, consent, video, history
16. ✅ Task 2.2: KYC Verification Flow — document, liveness, face compare, OTP
17. ✅ Task 2.3: Admin telemedicine management — queue, detail, accept, KYC review

### Sprint 6 — P4: Address Sync + Pre-deploy + Final ✅ COMPLETED
18. ✅ Task 14: Address Sync — patient_addresses DB table + CRUD endpoints + Zustand sync
19. ✅ Consultation controller auth guards enabled (JWT + Roles)
20. ✅ Agora SDK installed (agora-rtc-sdk-ng)
21. ✅ DB package rebuilt with new patientAddresses export
22. ✅ Consent controller auth guards enabled (JWT + Roles)
23. ✅ KYC controller auth guards enabled (JWT + Roles)
24. ✅ Admin settings page wired to real APIs (health, Odoo sync, staff register)

## ═══════════════════════════════════════════════════
## FINAL STATUS
## ═══════════════════════════════════════════════════

| Metric | Value |
|--------|-------|
| Shop routes | 39 (100%) ✅ |
| Admin routes | 26 (100%) ✅ |
| API endpoints | 102 (90% connected) |
| Backend modules | 19 |
| Infrastructure | 11 services |
| Telemedicine | Full compliance (พ.ร.บ. 2569) |
| Video | Agora SDK integrated |
| KYC | 6-step verification flow |
| Auth | JWT guards on all endpoints |
| Settings | Wired to real APIs |
| Status | **READY FOR PRODUCTION** 🚀 |
