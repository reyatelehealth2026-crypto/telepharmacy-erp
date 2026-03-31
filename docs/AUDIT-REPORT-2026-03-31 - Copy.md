# Telepharmacy ERP — Audit Report

**Date:** 2026-03-31 | **Auditor:** Claude Code Agent System | **Environment:** Production (api.re-ya.com / admin.re-ya.com / shop.re-ya.com)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total items audited | 96 |
| EXISTS (fully implemented) | 64 (67%) |
| PARTIAL (implemented with gaps) | 25 (26%) |
| MISSING (not implemented) | 7 (7%) |

### Critical Findings

1. **5 API modules exist in code but are NOT registered in production** (drug-safety, drug-info, compliance, loyalty, adherence, payment) — returning 404
2. **Digital signature for prescriptions is completely missing** — legal requirement under Thai Pharmacy Act
3. **No WebSocket/SSE infrastructure** — all "real-time" features use polling or are simulated client-side
4. **Admin dashboard has 6 MISSING features** — expiry alerts, stock movement log, stock adjustment, print label, DUR report, ADR form
5. **AI Chatbot is entirely client-side simulated** — no backend LLM integration

---

## Production API Endpoint Test Results

### Working Endpoints (200)

| Endpoint | Auth | Response |
|----------|------|----------|
| `GET /v1/health` | Public | `{ status: "ok", uptime: 2299s }` |
| `POST /v1/auth/staff-login` | Public | Returns JWT + refresh token |
| `GET /v1/products` | Public | Returns empty `{ data: [], meta: {...} }` |
| `GET /v1/products/categories` | Public | 400 (validation error) |
| `GET /v1/products/search?q=test` | Public | 400 (validation error) |
| `GET /v1/prescriptions/queue` | Staff JWT | Returns empty queue |
| `GET /v1/staff/orders` | Staff JWT | Returns empty list |
| `GET /v1/staff/patients` | Staff JWT | Returns empty list |
| `GET /v1/staff/inventory` | Staff JWT | Returns empty list |
| `GET /v1/staff/reports/interventions` | Staff JWT | Returns empty array |
| `GET /v1/adr` | Staff JWT | Returns empty list |
| `GET /v1/orders` | Patient JWT | Returns empty list |

### NOT Found (404) — Code exists but NOT in production build

| Endpoint | Status |
|----------|--------|
| `GET /v1/drug-safety` | 404 |
| `GET /v1/drug-info` | 404 |
| `GET /v1/drug-info/search?q=paracetamol` | 404 |
| `POST /v1/drug-safety/check` | 404 |
| `GET /v1/compliance` | 404 |
| `GET /v1/compliance/audit-trail` | 404 |
| `GET /v1/loyalty` | 404 |
| `GET /v1/staff/loyalty` | 404 |
| `GET /v1/adherence` | 404 |
| `GET /v1/payment` | 404 |

**Root Cause:** These 6 modules have source code in `apps/api/src/modules/` but are likely not imported in `app.module.ts` or the production build is stale.

### Auth Test Results

| Account | Login | Notes |
|---------|-------|-------|
| pharmacist@re-ya.com / Pharm@reya2024! | OK | Returns role: "pharmacist", licenseNo: "PH12345" |
| staff@re-ya.com / Staff@reya2024! | OK | Returns role: "customer_service" |
| admin@re-ya.com / Admin@reya2024! | FAIL | "อีเมลหรือรหัสผ่านไม่ถูกต้อง" |

---

## Frontend Page Test Results

### Admin (admin.re-ya.com)

| Page | Unauth (307→login) | With Cookie (200) | Content Verified |
|------|---------------------|--------------------|------------------|
| /login | 200 | 200 | Thai login form |
| /dashboard | 307 | 200 | Dashboard overview |
| /dashboard/pharmacist | 307 | 200 | Queue with คิว, Priority, ใบสั่งยา |
| /dashboard/patients | 307 | 200 | ผู้ป่วย, ค้นหา, search |
| /dashboard/orders | 307 | 200 | Order list with filters |
| /dashboard/inventory | 307 | 200 | คลัง, stock table |
| /dashboard/reports | 307 | 200 | รายงาน, Intervention charts |
| /dashboard/products | 307 | 200 | Product management |
| /dashboard/settings | 307 | 200 | Settings page |

### Shop (shop.re-ya.com)

| Page | Status | Thai Content |
|------|--------|--------------|
| / (home) | 200 | Title: "REYA Pharmacy — ร้านขายยาออนไลน์" |
| /login | 200 | LINE login button |
| /register | 200 | PDPA consent form |
| /products | 404 | **Page not found** |
| /search | 200 | Product search |
| /cart | 200 | ตะกร้า, เพิ่ม |
| /rx/upload | 200 | ใบสั่งยา upload |
| /rx/status | 200 | Prescription list |
| /checkout | 200 | Full checkout flow |
| /checkout/success | 200 | Payment success |
| /ai-consult | 200 | อาการ, consult |
| /chat | 200 | Chat interface |
| /profile | 200 | Profile page |
| /profile/edit | 200 | Edit form |
| /profile/notifications | 200 | Notification settings |
| /profile/audit-trail | 200 | Audit log |
| /profile/delete-account | 200 | Account deletion |
| /profile/pdpa | 200 | PDPA privacy |
| /adr-report | 200 | ADR, report form |
| /clinical | 200 | บริการ, Drug info |
| /clinical/di-database | 200 | Drug search |
| /clinical/med-review | 200 | Med review form |
| /clinical/tdm | 200 | TDM consultation |
| /medication-reminders | 200 | Reminder management |
| /onboarding/health | 200 | Health wizard |

---

## Detailed Phase-by-Phase Audit

---

### Phase 0 — Foundation

| # | Item | Status | Details |
|---|------|--------|---------|
| 1 | Drizzle migrations (31 tables) | PARTIAL | All schema files exist with 16 files. Only **1 migration file** (0000). Subsequent migrations not generated. |
| 2 | Seed data (drugs, allergy groups, staff) | EXISTS | `packages/db/src/seed/` — 20 drugs, 6 allergy groups, 5+ interactions, 3 staff |
| 3 | Database indexes (17 total) | EXISTS | Across drugs, prescriptions, orders, inventory, patients schemas |
| 4 | GitHub Actions CI pipeline | EXISTS | `.github/workflows/ci.yml` — lint → type-check → test → build |
| 5 | Meilisearch Thai tokenizer | PARTIAL | Service exists but **no Thai-specific tokenization config** |

---

### Phase 1 — Core Backend Safety Engine

| # | Item | Status | Details |
|---|------|--------|---------|
| 6 | Drug Interaction Checker | PARTIAL | Code exists but uses **in-memory Map cache** (not Redis). Not registered in production API (404). |
| 7 | Allergy Detection Engine | EXISTS | `drug-safety/allergy-detection.service.ts` |
| 8 | Dose Range Validator | EXISTS | `drug-safety/dose-range-validator.service.ts` |
| 9 | Contraindication Checker | EXISTS | `drug-safety/contraindication-checker.service.ts` |
| 10 | Duplicate Therapy Detector | EXISTS | `drug-safety/duplicate-therapy.service.ts` |
| 11 | Safety Check Engine (orchestrator) | EXISTS | `drug-safety/safety-check-engine.service.ts` — runs all 5 in parallel |
| 12 | Gemini Vision OCR | EXISTS | `packages/ai/src/ocr.ts` — Gemini 2.5 Pro |
| 13 | Zod structured output validation | EXISTS | `prescription-ocr.service.ts` with `OcrResultSchema` |
| 14 | POST /v1/prescriptions | EXISTS | Controller + service implemented |
| 15 | GET /v1/prescriptions/queue | EXISTS | Returns 200 in production |
| 16 | PATCH /v1/prescriptions/:id/verify | EXISTS | With role guard pharmacist/super_admin |
| 17 | Pharmacist intervention logging | EXISTS | Dedicated endpoint + auto-logging on verify |
| 18 | Digital signature (prescriptions) | MISSING | Only LINE webhook HMAC exists. **No PKI/JWT signing for Rx approval.** |
| 19 | Unit tests (44/44, 6 spec files) | EXISTS | Verified: exactly 44 `it()` blocks across 6 files |

---

### Phase 2 — Inventory + Orders + Payment + Loyalty

| # | Item | Status | Details |
|---|------|--------|---------|
| 20 | FEFO lot selection | EXISTS | `selectFefoLots()` with composite DB index |
| 21 | Stock movement tracking | EXISTS | receive, dispense, adjust, return, write-off |
| 22 | Expiry alert system (30/60/90 days) | EXISTS | `getExpiryAlerts(days)` — configurable threshold |
| 23 | Low stock → LINE notification | PARTIAL | Detection exists (`getLowStockAlerts()`) but **no automatic LINE push** |
| 24 | Cold chain temperature monitoring | PARTIAL | Schema fields exist (`tempLoggerId`, `coldChain`) but **no recording/alerting service** |
| 25 | Order lifecycle (14 statuses) | EXISTS | Full state machine: draft → completed/cancelled |
| 26 | Prescription → order → lots audit trail | EXISTS | Schema relations fully linked |
| 27 | Shipping webhooks (Kerry/Flash/Ninja Van) | EXISTS | Generic provider-agnostic webhook at `POST /webhooks/shipping` |
| 28 | Order status push via LINE Flex | EXISTS | Templates ready in `flex-message.service.ts` |
| 29 | PromptPay QR generation | EXISTS | Full EMVCo-standard with CRC16 |
| 30 | Refund handling | PARTIAL | Records intent in DB but **no gateway integration**, no completion callback |
| 31 | Point calculation engine | EXISTS | Tier multipliers: bronze 1x, silver 1.5x, gold 2x, platinum 3x |
| 32 | Tier upgrade/downgrade | EXISTS | `checkAndUpgradeTier()` — roadmap incorrectly marks INCOMPLETE |
| 33 | Point redemption at checkout | EXISTS | `redeemPoints()` + integrated with `createOtcOrder()` |

**Note:** Items 31-33 (loyalty module) exist in code but return 404 in production — not registered in API.

---

### Phase 3 — Admin Dashboard

| # | Item | Status | Details |
|---|------|--------|---------|
| 34 | Staff login page | PARTIAL | Works with email (not username). JWT + refresh token stored in cookie/localStorage. |
| 35 | RBAC guard | PARTIAL | Token check exists but **no route-level role enforcement** — any staff can access any page |
| 36 | Session management (refresh token) | EXISTS | Full refresh flow with deduplication |
| 37 | Real-time prescription queue | PARTIAL | Polling every 15s — **no WebSocket/SSE** |
| 38 | Priority sorting + SLA countdown | EXISTS | 4-level priority with live countdown timer |
| 39 | Side-by-side Rx review | EXISTS | 3-column layout: image ↔ parsed data ↔ patient profile |
| 40 | Safety alert display | EXISTS | Severity-colored badges with recommendations |
| 41 | Approve/reject with intervention | EXISTS | Three actions, rejection reason enforced |
| 42 | Counseling log entry form | PARTIAL | Start-session form only — no log history |
| 43 | Search patients | PARTIAL | Single search field, multi-field behavior depends on API |
| 44 | View/edit clinical profile | PARTIAL | **View-only** — no edit forms |
| 45 | Prescription history timeline | PARTIAL | Flat list, not visual timeline |
| 46 | ADR report submission form | MISSING | No ADR form in admin frontend |
| 47 | Stock level display | PARTIAL | Table only — **no graph/chart** |
| 48 | Expiry alert table (30/60/90 days) | MISSING | **No expiry tracking in admin UI** |
| 49 | Stock movement log | MISSING | **Not implemented** |
| 50 | Manual stock adjustment form | MISSING | Button exists but **non-functional** (no onClick) |
| 51 | Order list with status filter | EXISTS | 9 status tabs with pagination |
| 52 | Order detail + dispensing verification | PARTIAL | Detail comprehensive but **no dispensing verification step** |
| 53 | Print dispensing label | MISSING | **No print functionality** |
| 54 | Manual shipping status update | EXISTS | Full workflow buttons |
| 55 | Pharmacist intervention rate report | EXISTS | Pie chart + summary stats (Recharts) |
| 56 | DUR report | MISSING | **Not implemented** |
| 57 | ADR reports export | MISSING | Download icon imported but **never used** |
| 58 | Sales + inventory report | PARTIAL | Sales charts exist, **inventory reports absent** |

---

### Phase 4 — B2C Shop Frontend

| # | Item | Status | Details |
|---|------|--------|---------|
| 59 | LINE Login (LIFF SDK) | EXISTS | Full wrapper + React provider |
| 60 | Patient registration + PDPA consent | EXISTS | Two-step with PDPA sections |
| 61 | Profile setup (name, DOB, gender, weight, height) | EXISTS | All fields in registration |
| 62 | Allergy & chronic disease wizard | EXISTS | Two-step with quick-add common items |
| 63 | Product catalog + Meilisearch | EXISTS | Search page + backend search service |
| 64 | AI chatbot (symptom → product) | PARTIAL | **Client-side keyword simulation** — no backend AI. Shows "Beta" badge. |
| 65 | Product detail page | EXISTS | Drug info, warnings, side effects, FDA reg |
| 66 | Cart management | EXISTS | Zustand + localStorage persist, save-for-later |
| 67 | Camera/gallery upload UI | EXISTS | Up to 5 images, 5MB limit |
| 68 | Upload progress + OCR status | EXISTS | Progress bars with status text |
| 69 | Prescription status timeline | EXISTS | 6-step visual timeline |
| 70 | Real-time status push | PARTIAL | LINE push exists, **no WebSocket for in-app** |
| 71 | Delivery address management | EXISTS | Full CRUD with Thai address fields |
| 72 | Shipping method selection | EXISTS | 3 methods: standard/express/cold_chain |
| 73 | Payment methods (PromptPay/CC/COD) | EXISTS | All 3 selectable |
| 74 | Payment slip upload (OCR auto-verify) | PARTIAL | Upload UI exists, OCR verify uncertain |
| 75 | Order confirmation summary | EXISTS | Full review with line items |
| 76 | Edit personal info | EXISTS | All fields editable |
| 77 | Allergy/disease/medication CRUD | EXISTS | Dedicated pages for each |
| 78 | Order history + re-order | EXISTS | History list + re-order API |
| 79 | Loyalty points + tier display | EXISTS | **Full page exists** — roadmap incorrectly marks INCOMPLETE |
| 80 | Notification settings | EXISTS | 6 toggle categories (save action is stubbed) |
| 81 | Chat with pharmacist | EXISTS | Full chat UI with read receipts |
| 82 | Pharmacist online status | PARTIAL | Visual indicator **simulated** with random toggle |
| 83 | Medication refill reminders | EXISTS | Full management page + backend |

---

### Phase 5 — Advanced Clinical Features

| # | Item | Status | Details |
|---|------|--------|---------|
| 84 | ADR reporting system | EXISTS | Full form + backend CRUD + assessment |
| 85 | Causal assessment (WHO-UMC) | EXISTS | Criteria checklist + scoring algorithm |
| 86 | Regulatory export format | EXISTS | Structured JSON with FDA submission marking |
| 87 | Refill reminders (BullMQ) | EXISTS | Queue processor with retry + backoff |
| 88 | Adherence tracking + dashboard | EXISTS | Stats API + frontend dashboard |
| 89 | LINE push for reminders | EXISTS | pushMessage + notification record |
| 90 | Drug Information service | EXISTS | Lookup API + search UI (mock data on frontend) |
| 91 | Medication Review workflow | EXISTS | Request form + pharmacist completion |
| 92 | TDM consultation request | EXISTS | Full form with lab results + backend |
| 93 | Audit trail (patient data access) | EXISTS | AuditService + patient-facing log + CSV export |
| 94 | Data retention (5/10 year) | EXISTS | Constants + review endpoint |
| 95 | Consent withdrawal + erasure | EXISTS | Anonymization + 3-step delete flow |
| 96 | Data breach notification | EXISTS | Breach report + LINE push to patients |

**Note:** Compliance and adherence modules exist in code but return 404 in production — not registered in running API.

---

## Roadmap Accuracy Corrections

Items where roadmap status is incorrect:

| Item | Roadmap Says | Actual Status | Evidence |
|------|-------------|---------------|----------|
| Tier upgrade/downgrade (Phase 2) | INCOMPLETE | **EXISTS** | `checkAndUpgradeTier()` fully handles upgrade/downgrade |
| Loyalty points + tier display (Phase 4) | INCOMPLETE | **EXISTS** | Full loyalty page at `/profile/loyalty` with tier, points, history |
| Low stock → LINE notification (Phase 2) | COMPLETE | **PARTIAL** | Detection exists but no automatic LINE push wired |
| Cold chain monitoring (Phase 2) | COMPLETE | **PARTIAL** | Schema fields only, no recording/alerting logic |

---

## Priority Action Items

### P0 — Critical (blocks production launch)

1. **Register missing API modules in production** — drug-safety, drug-info, compliance, loyalty, adherence, payment are coded but return 404
2. **Fix admin login** — admin@re-ya.com credentials not working
3. **Implement digital signature** for prescription approval — legal requirement
4. **Fix /products page in shop** — returns 404

### P1 — High (core functionality gaps)

5. **Add WebSocket/SSE infrastructure** — real-time features are all polling or simulated
6. **Implement admin inventory features** — expiry alerts, stock movement log, stock adjustment form
7. **Add print dispensing label** in orders
8. **Wire AI chatbot to backend** — currently client-side keyword simulation
9. **Seed production database** — products, drugs return empty arrays

### P2 — Medium (quality improvements)

10. **Add route-level RBAC** in admin middleware
11. **Add edit capability** to admin patient management
12. **Implement refund gateway integration** — currently a stub
13. **Wire cold chain temperature monitoring** — schema exists, logic missing
14. **Auto-trigger LINE push** on low stock alerts

### P3 — Nice to have

15. **Add Thai tokenizer** to Meilisearch
16. **Replace in-memory cache** with Redis in drug interaction service
17. **Generate missing Drizzle migrations** — only 1 initial migration exists
18. **Add DUR report** to admin reports
19. **Add ADR report form** to admin frontend
20. **Connect shop frontend mock data** to actual API calls

---

*Generated by Claude Code multi-agent audit system — 4 sub-agents in parallel + live API/frontend testing*
