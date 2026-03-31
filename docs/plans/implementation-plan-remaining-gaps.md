# Implementation Plan — Remaining Gaps

> จาก `docs/project-integration-map.md` Section 5: 95 API endpoints, 45 ยังไม่มี frontend ใช้
> จัดลำดับตาม Business Impact × Technical Feasibility

## สถานะปัจจุบัน

| Metric | Value |
|--------|-------|
| Shop routes connected | **39 (100%)** ✅ |
| Admin routes connected | **26 (100%)** ✅ |
| API endpoints with frontend | ~95/102 (93%) |
| API endpoints unused | ~7/102 (7% — internal/system only) |

## Priority Matrix

```
                    HIGH IMPACT
                        │
   ┌────────────────────┼────────────────────┐
   │                    │                    │
   │  P1: Admin Staff   │  P2: Telemedicine  │
   │  Tools (Orders,    │  Video + KYC       │
   │  Payment, ADR)     │  (regulatory)      │
   │                    │                    │
LOW├────────────────────┼────────────────────┤HIGH
EFF│                    │                    │EFF
ORT│  P3: Shop Stubs    │  P4: LINE Tools    │ORT
   │  (TDM, PDPA,      │  + Campaigns       │
   │  Audit Trail)      │                    │
   │                    │                    │
   └────────────────────┼────────────────────┘
                        │
                    LOW IMPACT
```

## ═══════════════════════════════════════════════════
## P1: Admin Staff Tools ✅ COMPLETED
## Impact: สูง — staff ต้องใช้ทุกวัน
## Effort: ปานกลาง — backend พร้อม, สร้าง admin pages
## ═══════════════════════════════════════════════════

### Task 1.1: Admin — Order Management Enhancement ✅
### Task 1.2: Admin — ADR Management Dashboard ✅
### Task 1.3: Admin — Drug Info Staff Tools ✅
### Task 1.4: Admin — Adherence Staff Tools ✅
### Task 1.5: Admin — Inventory Full Management ✅
### Task 1.6: Admin — Payment Staff Tools ✅ (merged with 1.1)
### Task 1.7: Admin — Loyalty Staff Tools ✅

### Task 1.1: Admin — Order Management Enhancement
**Endpoints ที่ยังไม่ใช้:**
- `GET /v1/staff/orders/pending-slip` — Pending slip verification queue
- `POST /v1/staff/orders/:id/verify-slip` — Manual slip verification
- `POST /v1/staff/orders/:id/refund` — Process refund

**สิ่งที่ต้องทำ:**
- สร้าง `/dashboard/orders/pending-slips` page — แสดง queue ออเดอร์ที่รอตรวจสลิป
- เพิ่มปุ่ม "ตรวจสลิป" + "คืนเงิน" ใน `/dashboard/orders/[id]` page
- แสดงรูปสลิป + ผล OCR ใน order detail

**Files ที่ต้องสร้าง/แก้:**
```
apps/admin/src/app/dashboard/orders/pending-slips/page.tsx  (สร้างใหม่)
apps/admin/src/app/dashboard/orders/[id]/page.tsx           (เพิ่ม verify/refund)
apps/admin/src/lib/orders.ts                                (เพิ่ม API helpers)
```

---

### Task 1.2: Admin — ADR Management Dashboard
**Endpoints ที่ยังไม่ใช้:**
- `GET /v1/adr` — List ADR reports
- `GET /v1/adr/:id` — ADR detail
- `PATCH /v1/adr/:id/assess` — Causality assessment
- `GET /v1/adr/export` — Export for อย.

**สิ่งที่ต้องทำ:**
- สร้าง `/dashboard/adr` page — ADR reports list + filter
- สร้าง `/dashboard/adr/[id]` page — ADR detail + causality assessment form
- เพิ่มปุ่ม "Export อย." สำหรับส่งรายงานตามกฎหมาย

**Files ที่ต้องสร้าง:**
```
apps/admin/src/app/dashboard/adr/page.tsx                   (สร้างใหม่)
apps/admin/src/app/dashboard/adr/[id]/page.tsx              (สร้างใหม่)
apps/admin/src/lib/adr.ts                                   (สร้างใหม่)
```

---

### Task 1.3: Admin — Drug Info Staff Tools
**Endpoints ที่ยังไม่ใช้:**
- `GET /v1/drug-info/medication-review` — List MR requests
- `PATCH /v1/drug-info/medication-review/:id/complete` — Complete MR
- `GET /v1/drug-info/tdm` — List TDM requests
- `PATCH /v1/drug-info/tdm/:id/result` — Record TDM result

**สิ่งที่ต้องทำ:**
- สร้าง `/dashboard/clinical` page — MR queue + TDM queue
- สร้าง `/dashboard/clinical/mr/[id]` — Complete medication review
- สร้าง `/dashboard/clinical/tdm/[id]` — Record TDM result

**Files ที่ต้องสร้าง:**
```
apps/admin/src/app/dashboard/clinical/page.tsx              (สร้างใหม่)
apps/admin/src/app/dashboard/clinical/mr/[id]/page.tsx      (สร้างใหม่)
apps/admin/src/app/dashboard/clinical/tdm/[id]/page.tsx     (สร้างใหม่)
apps/admin/src/lib/drug-info.ts                             (สร้างใหม่)
```

---

### Task 1.4: Admin — Adherence Staff Tools
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/staff/adherence/reminders` — Create reminder for patient
- `GET /v1/staff/adherence/reminders` — List all reminders
- `GET /v1/staff/adherence/stats/:patientId` — Patient adherence stats
- `POST /v1/staff/adherence/reminders/:id/send-now` — Force send

**สิ่งที่ต้องทำ:**
- เพิ่ม adherence tab ใน `/dashboard/patients/[id]` — แสดง reminders + stats
- เพิ่มปุ่ม "สร้าง reminder" + "ส่งทันที" ใน patient detail

**Files ที่ต้องแก้:**
```
apps/admin/src/app/dashboard/patients/[id]/page.tsx         (เพิ่ม adherence tab)
apps/admin/src/lib/adherence.ts                             (สร้างใหม่)
```

---

### Task 1.5: Admin — Inventory Full Management
**Endpoints ที่ยังไม่ใช้:**
- `GET /v1/staff/inventory/movements` — Movement history
- `GET /v1/staff/inventory/products/:id/lots` — Lots by product
- `POST /v1/staff/inventory/lots` — Receive lot
- `POST /v1/staff/inventory/adjustments` — Adjust stock
- `POST /v1/staff/inventory/write-off` — Write off

**สิ่งที่ต้องทำ:**
- เพิ่ม "รับสินค้าเข้า" form ใน `/dashboard/inventory`
- เพิ่ม "ปรับสต็อก" + "ตัดจำหน่าย" actions
- สร้าง movement history view
- สร้าง lot detail view per product

**Files ที่ต้องสร้าง/แก้:**
```
apps/admin/src/app/dashboard/inventory/receive/page.tsx     (สร้างใหม่)
apps/admin/src/app/dashboard/inventory/movements/page.tsx   (สร้างใหม่)
apps/admin/src/app/dashboard/inventory/page.tsx             (เพิ่ม actions)
apps/admin/src/lib/inventory.ts                             (สร้างใหม่)
```

---

### Task 1.6: Admin — Payment Staff Tools
**Endpoints ที่ยังไม่ใช้:**
- `GET /v1/staff/orders/pending-slip` — (ซ้ำกับ Task 1.1)
- `POST /v1/staff/orders/:id/verify-slip`
- `POST /v1/staff/orders/:id/refund`

**(รวมกับ Task 1.1)**

---

### Task 1.7: Admin — Loyalty Staff Tools
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/staff/loyalty/:patientId/adjust` — Adjust points
- `GET /v1/staff/loyalty/:patientId` — Patient loyalty

**สิ่งที่ต้องทำ:**
- เพิ่ม loyalty tab ใน `/dashboard/patients/[id]` — แสดง points + adjust form

**Files ที่ต้องแก้:**
```
apps/admin/src/app/dashboard/patients/[id]/page.tsx         (เพิ่ม loyalty tab)
```

## ═══════════════════════════════════════════════════
## P2: Telemedicine Frontend ✅ COMPLETED
## Impact: สูง — regulatory compliance (พ.ร.บ. เทเลเมดิซีน 2569)
## Effort: สูง — Agora SDK, complex UI flows
## ═══════════════════════════════════════════════════

### Task 2.1: Shop — Video Consultation UI ✅
### Task 2.2: Shop — KYC Verification Flow ✅
### Task 2.3: Admin — Telemedicine Management ✅

### Task 2.1: Shop — Video Consultation UI
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/telemedicine/consultations/:id/accept-consent`
- `GET /v1/telemedicine/consultations/:id/token`
- `POST /v1/telemedicine/consultations/:id/start`
- `POST /v1/telemedicine/consultations/:id/end`
- `GET /v1/telemedicine/consultations/:id`
- `GET /v1/telemedicine/consultations`

**สิ่งที่ต้องทำ:**
- สร้าง `/consultation/[id]` page — consultation detail + status
- สร้าง `/consultation/[id]/consent` page — e-consent acceptance
- สร้าง `/consultation/[id]/video` page — Agora video call UI
- สร้าง `/consultation/history` page — consultation list
- สร้าง `lib/telemedicine.ts` — API helpers

**Dependencies:**
- `AGORA_APP_ID` env variable
- `agora-rtc-sdk-ng` npm package (shop)
- Consent template rendering

**Files ที่ต้องสร้าง:**
```
apps/shop/src/app/(shop)/consultation/[id]/page.tsx         (สร้างใหม่)
apps/shop/src/app/(shop)/consultation/[id]/consent/page.tsx (สร้างใหม่)
apps/shop/src/app/(shop)/consultation/[id]/video/page.tsx   (สร้างใหม่)
apps/shop/src/app/(shop)/consultation/history/page.tsx      (สร้างใหม่)
apps/shop/src/lib/telemedicine.ts                           (สร้างใหม่)
```

---

### Task 2.2: Shop — KYC Verification Flow
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/telemedicine/kyc/upload-document`
- `POST /v1/telemedicine/kyc/liveness-check`
- `POST /v1/telemedicine/kyc/face-compare`
- `POST /v1/telemedicine/kyc/send-otp`
- `POST /v1/telemedicine/kyc/verify-otp`
- `GET /v1/telemedicine/kyc/verify-email/:token`
- `GET /v1/telemedicine/kyc/status/:patientId`

**สิ่งที่ต้องทำ:**
- สร้าง `/profile/kyc` page — KYC status dashboard
- สร้าง `/profile/kyc/document` page — ID document upload
- สร้าง `/profile/kyc/liveness` page — Liveness detection (camera)
- สร้าง `/profile/kyc/otp` page — OTP verification
- สร้าง `lib/kyc.ts` — API helpers

**Dependencies:**
- Camera access (MediaDevices API)
- AWS Rekognition (backend already configured)
- SMS gateway (backend already configured)

**Files ที่ต้องสร้าง:**
```
apps/shop/src/app/(shop)/profile/kyc/page.tsx               (สร้างใหม่)
apps/shop/src/app/(shop)/profile/kyc/document/page.tsx      (สร้างใหม่)
apps/shop/src/app/(shop)/profile/kyc/liveness/page.tsx      (สร้างใหม่)
apps/shop/src/app/(shop)/profile/kyc/otp/page.tsx           (สร้างใหม่)
apps/shop/src/lib/kyc.ts                                    (สร้างใหม่)
```

---

### Task 2.3: Admin — Telemedicine Management
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/telemedicine/consultations/:id/accept` — Pharmacist accepts
- `GET /v1/telemedicine/consultations` — List all consultations
- `GET /v1/telemedicine/kyc/status/:patientId` — KYC status
- `POST /v1/telemedicine/kyc/manual-review` — Manual KYC review

**สิ่งที่ต้องทำ:**
- สร้าง `/dashboard/telemedicine` page — consultation queue
- สร้าง `/dashboard/telemedicine/[id]` page — accept + start video
- สร้าง `/dashboard/kyc` page — KYC review queue

**Files ที่ต้องสร้าง:**
```
apps/admin/src/app/dashboard/telemedicine/page.tsx          (สร้างใหม่)
apps/admin/src/app/dashboard/telemedicine/[id]/page.tsx     (สร้างใหม่)
apps/admin/src/app/dashboard/kyc/page.tsx                   (สร้างใหม่)
```

## ═══════════════════════════════════════════════════
## P3: Shop Remaining Stubs (4 pages)
## Impact: ปานกลาง
## Effort: ต่ำ
## ═══════════════════════════════════════════════════

### Task 3.1: Shop — TDM Consultation Page
**Endpoint:** `POST /v1/drug-info/tdm`

**สิ่งที่ต้องทำ:**
- แก้ `/clinical/tdm/page.tsx` — wire to API (เหมือน med-review pattern)

---

### Task 3.2: Shop — Profile PDPA Page
**สิ่งที่ต้องทำ:**
- ตรวจสอบ `/profile/pdpa/page.tsx` — verify API connection
- เพิ่ม auth guard ถ้ายังไม่มี

---

### Task 3.3: Shop — Profile Audit Trail Page
**สิ่งที่ต้องทำ:**
- ตรวจสอบ `/profile/audit-trail/page.tsx` — verify API connection
- เพิ่ม auth guard ถ้ายังไม่มี

---

### Task 3.4: Shop — Profile Delete Account Page
**สิ่งที่ต้องทำ:**
- ตรวจสอบ `/profile/delete-account/page.tsx` — verify API connection
- เพิ่ม auth guard ถ้ายังไม่มี

## ═══════════════════════════════════════════════════
## P4: LINE & Campaign Tools (admin only)
## Impact: ต่ำ (operational tools)
## Effort: ปานกลาง
## ═══════════════════════════════════════════════════

### Task 4.1: Admin — LINE Messaging Tools
**Endpoints ที่ยังไม่ใช้:**
- `POST /v1/line/send` — Push message to user
- `POST /v1/line/broadcast` — Broadcast to all

**สิ่งที่ต้องทำ:**
- สร้าง `/dashboard/messaging` page — send/broadcast UI
- Template selector for Flex messages

---

### Task 4.2: Admin — Settings Page
**สิ่งที่ต้องทำ:**
- Wire `/dashboard/settings` to system configuration API
- Environment variable management UI

## ═══════════════════════════════════════════════════
## EXECUTION TIMELINE
## ═══════════════════════════════════════════════════

```
Week 1-2: P1 (Admin Staff Tools) ✅ COMPLETED
├── ✅ Task 1.1: Order management (pending slips, verify, refund)
├── ✅ Task 1.2: ADR management dashboard
├── ✅ Task 1.3: Drug info staff tools (MR + TDM queues)
├── ✅ Task 1.4: Adherence staff tools (patient detail tab)
├── ✅ Task 1.5: Inventory full management
├── ✅ Task 1.7: Loyalty staff tools (patient detail tab)
└── ✅ Task 4.1: LINE messaging tools

Week 3: P3 (Shop Remaining Stubs) ✅ COMPLETED
├── ✅ Task 3.1: TDM consultation page
├── ✅ Task 3.2: Profile PDPA verify
├── ✅ Task 3.3: Profile audit trail verify
└── ✅ Task 3.4: Profile delete account verify

Week 4-6: P2 (Telemedicine Frontend) ✅ COMPLETED
├── ✅ Task 2.1: Video consultation UI (Agora)
├── ✅ Task 2.2: KYC verification flow
└── ✅ Task 2.3: Admin telemedicine management

Week 7: P4 (Remaining) — NEXT
├── Task 4.2: Settings page
└── Task 14: Address sync
```

## ═══════════════════════════════════════════════════
## EXPECTED OUTCOME
## ═══════════════════════════════════════════════════

| Metric | Current | After P1 | After P1+P3 | After All |
|--------|---------|----------|-------------|-----------|
| Shop connected | 33/33 (100%) | 33/33 (100%) | 33/33 (100%) | 33/33 (100%) |
| Admin connected | 22/22 (100%) | 22/22 (100%) | 22/22 (100%) | 22/22 (100%) |
| API endpoints used | 75/98 (77%) | 75/98 (77%) | 75/98 (77%) | 93/98 (95%) |
| Unused endpoints | 23 | 23 | 23 | 5 |

**5 endpoints ที่จะยังไม่ใช้ (internal/system):**
- `GET /v1/health` + `GET /v1/health/ready` (monitoring only)
- `POST /v1/auth/line/link/request` + `confirm` (future feature)
- `GET /v1/products/odoo-status` (internal check)
