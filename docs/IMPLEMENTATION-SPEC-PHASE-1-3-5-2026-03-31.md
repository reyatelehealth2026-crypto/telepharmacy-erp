# Telepharmacy ERP — Implementation Spec (Phase 1, 3, 5)

**Date:** 2026-03-31  
**Scope:** LINE-first B2C retail pharmacy  
**Focus phases:**
- Phase 1: Core LINE Integration
- Phase 3: Smart Features
- Phase 5: Customer Engagement

---

## 1) Current-State Architecture Audit (As-Is)

## 1.1 Monorepo and service structure

- Monorepo with `apps/api` (NestJS), `apps/shop` (Next.js + LIFF), `apps/admin` (Next.js), and shared `packages/*`.
- Relevant modules exist in API:
  - `line`, `auth`, `payment`, `orders`, `adherence`, `loyalty`, `prescription`.
- Data model already has core entities for:
  - LINE chat/session/message, sentiment fields
  - Loyalty account + points transactions
  - Medication reminders + notifications
  - Slip OCR storage fields in payments

## 1.2 Phase 1 capability audit (LINE Integration)

### ✅ Existing

1. **Webhook handler + signature verification**
   - `POST /line/webhook` with HMAC guard.
   - Event routing (`message`, `follow`, `postback`, etc.) exists.
2. **Push/Broadcast primitives**
   - Push endpoint and service support are in place.
   - Broadcast endpoint exists (currently global, non-segmented).
3. **LINE Login (LIFF)**
   - LIFF provider initializes, fetches profile, and auto-login flow exists.
   - Backend LINE token verification flow exists in auth service.
4. **Basic auto-reply**
   - Rule-based Thai keyword replies and menu flex message exist.

### ⚠️ Gaps / risks

1. **Rich Menu management not implemented**
   - No API/service for LINE Rich Menu create/link/switch.
2. **Broadcast segmentation missing**
   - Current broadcast sends one payload to all users.
3. **Account linking not explicit**
   - Current flow auto-creates patient by LINE ID.
   - No dedicated “link existing patient account with LINE” flow.
4. **Frontend/API mismatches**
   - Shop calls endpoints not present in API in several places (e.g. register and payment-slip route shape).

## 1.3 Phase 3 capability audit (Smart Features)

### ✅ Existing

1. **Prescription OCR already production-oriented**
   - Queue-based OCR pipeline for Rx exists.
   - Zod validation and confidence handling are already implemented.
2. **Slip OCR library exists**
   - AI package has `extractSlip()` and payment model has `slipOcrResult` fields.

### ⚠️ Gaps / risks

1. **Slip OCR not wired end-to-end**
   - Upload flow sets payment status to processing but no automatic OCR trigger pipeline.
2. **Smart order recognition not implemented**
   - No intent parser from free-text chat to cart/order draft.
3. **Sentiment analysis not implemented operationally**
   - Schema has sentiment columns, but no scoring pipeline in webhook/message processing.
4. **No confidence-based human handoff policy**
   - Needed for safe pharmacy operation.

## 1.4 Phase 5 capability audit (Customer Engagement)

### ✅ Existing

1. **Loyalty module exists (API + schema)**
   - Accounts, points transactions, tier logic, redeem APIs are implemented.
2. **Adherence/reminder backend exists**
   - Queue + processor sends LINE reminders.

### ⚠️ Gaps / risks

1. **Loyalty not integrated with order lifecycle**
   - No direct hook from order completion/payment completion to earn points.
2. **Shop loyalty/reminder pages still rely on mock data**
   - UI exists but not fully connected to backend endpoints.
3. **Medication reminder UX vs backend model mismatch**
   - Frontend supports times/days form; backend create DTO currently centered on single schedule timestamp.
4. **Notification preferences are local-only UI**
   - No persisted preference model + no enforcement in send pipeline.

---

## 2) Target Design (To-Be)

## 2.1 Design principles

1. **LINE-first, API-centric**: all LINE actions route through API orchestration.
2. **Safety-first for pharmacy**: low-confidence AI must escalate to pharmacist.
3. **Async by default**: OCR/NLP/sentiment via queue workers.
4. **Observable pipelines**: every outbound LINE action persisted in notification/audit logs.

---

## 3) Phase 1 — Detailed Spec & Design

## 3.1 Functional scope

1. Rich Menu (6 buttons):
   - สั่งซื้อ
   - ใบสั่งยา
   - ติดตาม
   - สลิป
   - สอบถาม
   - โทรหาเรา
2. Chatbot v2 (intent-based fallback over existing keyword rules)
3. Segmented broadcast
4. Link Account flow (bind LINE user to existing patient)

## 3.2 API design

### A) Rich Menu admin APIs

- `POST /v1/staff/line/rich-menu/sync`
  - Upload image, create menu, set aliases.
- `POST /v1/staff/line/rich-menu/link`
  - Link rich menu to all or selected segments.
- `POST /v1/staff/line/rich-menu/switch`
  - Switch per user/segment (e.g., first-time vs registered).

### B) Broadcast APIs

- `POST /v1/staff/line/broadcast`
  - Payload: content + segment filter + schedule time + idempotency key.
- `GET /v1/staff/line/broadcast/:id`
  - Delivery summary.

### C) Account linking APIs

- `POST /v1/auth/line/link/request`
  - Generate short-lived link token.
- `POST /v1/auth/line/link/confirm`
  - Verify token + bind patientId ↔ lineUserId.

## 3.3 Data design additions

- `line_broadcast_campaigns`
  - campaign metadata, filter JSON, schedule, status, stats.
- `line_broadcast_recipients`
  - recipient-level delivery status + error.
- `line_account_link_tokens`
  - token, patientId, expiry, usedAt.

## 3.4 Processing flow

1. Staff creates campaign with filter.
2. API resolves recipient list from patient/segment query.
3. Enqueue per batch (e.g., 500 users/batch).
4. Worker sends multicast/push and records delivery results.
5. Retry transient failures with backoff.

## 3.5 Non-functional

- LINE webhook P95 < 1.5s response (ack early + async processing).
- Broadcast idempotency key required.
- Full audit for account linking.

---

## 4) Phase 3 — Detailed Spec & Design

## 4.1 Functional scope

1. Slip OCR auto-match with payment/order
2. Smart order recognition from chat text
3. Sentiment analysis + escalation

## 4.2 Slip OCR pipeline

### API

- `POST /v1/orders/:orderId/slip` (normalize route contract)
  - Stores file URL/message reference, sets processing.
- Internal worker job `process-slip-ocr`
  - Fetch image → OCR (`extractSlip`) → match amount/time/window.
- `POST /v1/internal/payments/:paymentId/ocr-result`
  - Writes `slipOcrResult`, `slipMatchStatus`, triggers payment transition if matched.

### Matching policy

- Amount tolerance default ±5% (already in service)
- Time window config (e.g., -2h to +24h from payment creation)
- Confidence threshold:
  - >= 0.85 + matched: auto approve
  - 0.60–0.84: needs staff review
  - < 0.60: manual only

## 4.3 Smart order recognition

### Intent/entity schema

- Intent: `buy_otc`, `refill_request`, `rx_upload`, `ask_pharmacist`, `order_tracking`
- Entities: product/drug name, quantity, unit, dosage form

### Flow

1. LINE text enters webhook.
2. Classifier returns intent + confidence.
3. If `buy_otc` and confidence >= threshold:
   - resolve products (exact/fuzzy), build draft cart, return confirmation flex.
4. If ambiguous/low confidence:
   - ask disambiguation question or transfer to pharmacist.

## 4.4 Sentiment analysis

- Per inbound message compute:
  - label: positive/neutral/negative/angry
  - score 0..1
- Write to `chat_messages.sentiment*`
- Trigger escalation rule:
  - `angry` OR `negative` with score >= 0.75 for 2 consecutive messages
  - assign session to staff queue + send acknowledgement message

## 4.5 Non-functional

- OCR worker retries with DLQ.
- NLP execution budget: < 2s per message (fallback to rule-based path).
- Strict PHI masking in logs.

---

## 5) Phase 5 — Detailed Spec & Design

## 5.1 Functional scope

1. Loyalty points + tier fully integrated
2. Refill reminder automation
3. Medication reminder scheduling + adherence tracking

## 5.2 Loyalty integration design

### Trigger points

- On payment confirmed and/or order completed:
  - call `loyalty.earnPoints(patientId, orderId, amount)`
- On checkout with redeem option:
  - reserve and consume redeemed points atomically

### Consistency rules

- Use transaction boundary for order total, points redeemed, payment status.
- Deduplicate with `referenceType=order` + unique logical constraint.

### API harmonization

- Shop reads loyalty from `/v1/loyalty/me` and `/v1/loyalty/transactions`.
- Remove mock history from UI.

## 5.3 Refill reminder design

### Eligibility engine

- Source: `patient_medications` + historical dispensing/order items.
- Estimate run-out date from qty/sig/frequency.
- Reminder windows: T-7, T-3, T-1 days.

### Delivery

- Queue `send-refill-reminder`
- Respect opt-out preferences before LINE send.

## 5.4 Medication reminder design

### Model refinement

- Extend reminder DTO/model to support:
  - multiple times/day
  - day-of-week recurrence
  - timezone and snooze

### UX/API

- Shop reminder page to CRUD via `/v1/adherence/reminders`.
- Acknowledge endpoint used for “กินแล้ว”.
- Adherence score recomputed nightly + on acknowledge event.

## 5.5 Notification preferences

- New table `notification_preferences` per patient/channel/type.
- Enforce at send-time in reminder/broadcast/order-update workers.

---

## 6) Implementation Tasks (Detailed)

## 6.1 Workstream A — Backend (API + workers)

### Phase 1 tasks

1. Add Rich Menu service + admin controller
2. Add segmented broadcast campaign model + worker
3. Implement link account token flow
4. Add migration + indexes for campaign/link tables
5. Add e2e tests for webhook + broadcast + linking

### Phase 3 tasks

1. Wire slip upload -> OCR queue -> verification pipeline
2. Add parser service for smart order intent/entity extraction
3. Integrate parser in LINE webhook text path (feature flag)
4. Add sentiment service + escalation rules
5. Add staff queue assignment endpoint for escalated chats

### Phase 5 tasks

1. Hook loyalty earn/redeem into order/payment transitions
2. Add reminder recurrence support in DTO/schema/worker
3. Build refill eligibility job + schedule
4. Add notification preference enforcement middleware/service
5. Add integration tests for points idempotency and reminders

## 6.2 Workstream B — Frontend (Shop/Admin)

### Shop

1. Remove mock loyalty/history data and bind real APIs
2. Align payment slip upload endpoint with backend contract
3. Connect medication reminders page to adherence APIs
4. Add account-link UI (if user exists before LINE bind)

### Admin

1. Broadcast campaign builder (segment, schedule, preview)
2. Rich menu sync UI
3. Escalated chat monitor with sentiment badge

## 6.3 Workstream C — Data/Migrations

1. New tables: campaigns, recipients, link tokens, notification preferences
2. Optional columns/indexes for chat escalation and parser metadata
3. Backfill scripts for existing patients/reminders if needed

## 6.4 Workstream D — QA/Observability/Security

1. Contract tests for all new endpoints
2. Worker metrics: queue latency, success rate, retry count
3. Webhook replay protection and idempotency checks
4. PDPA/security review for new linking + NLP logs

---

## 7) Acceptance Criteria (DoD)

## Phase 1 DoD

- Rich menu live and switchable by segment
- Broadcast supports filtered recipients with delivery report
- Existing patient can link LINE safely with expiring token flow

## Phase 3 DoD

- Slip OCR auto-approves high-confidence matches and routes others to review queue
- Chat text can produce structured draft order for common OTC intents
- Sentiment-based escalation works and is visible to staff

## Phase 5 DoD

- Loyalty points update automatically from real order lifecycle
- Refill reminders are generated and sent by schedule
- Medication reminders are fully API-backed and adherence is measurable

---

## 8) Suggested Delivery Plan (Parts 1/3/5 only)

- **Sprint A (Week 1-2):** Phase 1 backend+admin foundation
- **Sprint B (Week 3-4):** Phase 1 completion + Phase 3 slip OCR integration
- **Sprint C (Week 5-6):** Smart order recognition + sentiment escalation
- **Sprint D (Week 7-8):** Loyalty integration + refill/reminder API alignment
- **Sprint E (Week 9-10):** Hardening, QA, observability, rollout controls

---

## 9) Immediate Priority Backlog (first 10 tasks)

1. Normalize auth/register + line login endpoint contracts (shop/api)
2. Normalize slip upload endpoint contract (shop/api)
3. Implement Rich Menu service (API)
4. Add campaign tables + migration
5. Implement segmented broadcast worker
6. Add account link token flow
7. Wire `extractSlip()` into payment workflow
8. Add smart-order parser service (feature-flagged)
9. Add sentiment scoring + escalation rule engine
10. Integrate loyalty earn/redeem into order/payment completion transaction
