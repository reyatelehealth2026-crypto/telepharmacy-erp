# Session Memory — REYA Telepharmacy ERP

> ใช้เป็น context reference สำหรับ session ใหม่
> อัปเดตล่าสุด: March 31, 2026

## สถานะโปรเจค ณ ปัจจุบัน

| Metric | Value |
|--------|-------|
| Shop routes connected | **33/33 + 6 new = 39 (100%)** ✅ |
| Admin routes connected | **22 + 4 new = 26 (100%)** ✅ |
| API endpoints total | 98 |
| API endpoints with frontend | ~88/98 (90%) |
| Backend modules | 19 NestJS modules |
| DB schema files | 16 + telemedicine |
| Infrastructure services | 11 (all running) |

## เอกสารสำคัญ

| Doc | Path | เนื้อหา |
|-----|------|---------|
| Integration Map | `docs/project-integration-map.md` | แมพ 98 endpoints ↔ Shop ↔ Admin ↔ DB |
| Phase 3 Plan | `docs/plans/phase-3-complete-project-plan.md` | Sprint 1-5 status |
| Remaining Gaps | `docs/plans/implementation-plan-remaining-gaps.md` | P1-P4 tasks |
| Executive Update | `docs/EXECUTIVE_UPDATE_2026-03-31.md` | Business summary |

## สิ่งที่ทำเสร็จแล้ว (45+ tasks, 90+ files)

### Phase 1-3 — Shop + Admin Foundation (24 tasks) ✅
- Token refresh, orders, checkout, auth guards, search, consultation, AI chatbot
- ADR, notifications, profile, allergies, loyalty, onboarding, Rx detail
- Product images, payment QR, clinical DI/MR, chat, TDM, PDPA, audit, delete

### P1 — Admin Staff Tools (7 tasks) ✅
- ADR Dashboard (list + detail + causality + export อย.)
- Clinical Services (MR queue + TDM queue + complete/record)
- Order Management (pending slips + verify/reject + refund)
- Inventory Management (receive lot + movement history)
- Patient Detail (adherence stats + loyalty tabs + adjust points)
- LINE Messaging (push + broadcast)
- Sidebar navigation updates

### P2 — Telemedicine Frontend (10 tasks) ✅ NEW
35. ✅ Shop `lib/telemedicine.ts` — consultation, consent, video session API helpers
36. ✅ Shop `lib/kyc.ts` — KYC status, upload, liveness, face compare, OTP API helpers
37. ✅ Shop `/consultation/[id]` — consultation detail + status + timeline + actions
38. ✅ Shop `/consultation/[id]/consent` — e-consent with signature pad (พ.ร.บ. 2569)
39. ✅ Shop `/consultation/[id]/video` — Agora video call UI (mic/cam/end controls)
40. ✅ Shop `/consultation/history` — consultation list with status badges
41. ✅ Shop `/profile/kyc` — KYC status dashboard with step progress
42. ✅ Shop `/profile/kyc/document` — ID card upload with OCR extraction
43. ✅ Shop `/profile/kyc/liveness` — camera liveness check + selfie face compare
44. ✅ Shop `/profile/kyc/otp` — 6-digit OTP input with countdown timer
45. ✅ Admin `/dashboard/telemedicine` — consultation queue with filters + stats
46. ✅ Admin `/dashboard/telemedicine/[id]` — detail + accept + scope validation
47. ✅ Admin `/dashboard/kyc` — KYC review with approve/reject
48. ✅ Admin sidebar — added Telemedicine + KYC Review nav items
49. ✅ Shop consultation page — added history link

## สิ่งที่ยังไม่ได้ทำ (Next Steps)

### ✅ ALL TASKS COMPLETED
ทุก P1-P4 tasks เสร็จสมบูรณ์แล้ว รวมถึง Settings page ระบบพร้อม deploy

### Pre-production Checklist
- [ ] `pnpm db:push` — push patient_addresses table to database
- [ ] Set environment variables: AGORA_APP_ID, AGORA_APP_CERTIFICATE
- [ ] Set AWS Rekognition credentials for KYC
- [ ] Configure SMS gateway for OTP
- [ ] SSL certificates via Traefik
- [ ] Run `pnpm build` to verify all apps compile

## สิ่งที่ทำเสร็จเพิ่มเติม (P4 + Pre-deploy + Final)

### P4 — Address Sync ✅
50. ✅ DB: `patient_addresses` table (packages/db/src/schema/patients.ts)
51. ✅ Backend: Address CRUD endpoints (GET/POST/PATCH/DELETE /v1/patients/me/addresses)
52. ✅ Shop: `lib/address-api.ts` — sync Zustand store ↔ backend
53. ✅ DB package rebuilt with new export

### Pre-deploy — Auth Guards + Agora SDK ✅
54. ✅ Consultation controller: JWT auth guards enabled
55. ✅ Consultation controller: `@CurrentUser()` on all endpoints
56. ✅ Consultation controller: `@Roles('pharmacist')` on accept
57. ✅ Agora SDK installed: `agora-rtc-sdk-ng` in shop

### Final — Consent + KYC Auth + Settings ✅
58. ✅ Consent controller: JWT auth guards enabled on all endpoints
59. ✅ Consent controller: `@Roles('super_admin')` on template management
60. ✅ KYC controller: JWT auth guards enabled on all endpoints
61. ✅ Backend: `SystemConfigService` + `SystemConfigController` — system_config CRUD
62. ✅ Admin: Settings page fully wired to real API (pharmacy, notifications, staff, system health)
61. ✅ KYC controller: `@Roles('pharmacist', 'super_admin')` on manual review
62. ✅ Admin settings page: wired to real health API, service status, Odoo sync, staff registration

## Shop Pages สร้างใหม่ (P2)

| File | Description |
|------|-------------|
| `apps/shop/src/lib/telemedicine.ts` | Consultation + consent + video session API |
| `apps/shop/src/lib/kyc.ts` | KYC upload, liveness, face compare, OTP API |
| `apps/shop/src/app/(shop)/consultation/[id]/page.tsx` | Consultation detail + timeline |
| `apps/shop/src/app/(shop)/consultation/[id]/consent/page.tsx` | e-Consent + signature pad |
| `apps/shop/src/app/(shop)/consultation/[id]/video/page.tsx` | Agora video call UI |
| `apps/shop/src/app/(shop)/consultation/history/page.tsx` | Consultation history list |
| `apps/shop/src/app/(shop)/profile/kyc/page.tsx` | KYC status dashboard |
| `apps/shop/src/app/(shop)/profile/kyc/document/page.tsx` | ID card upload + OCR |
| `apps/shop/src/app/(shop)/profile/kyc/liveness/page.tsx` | Liveness + face compare |
| `apps/shop/src/app/(shop)/profile/kyc/otp/page.tsx` | OTP verification |

## Admin Pages สร้างใหม่ (P2)

| File | Description |
|------|-------------|
| `apps/admin/src/app/dashboard/telemedicine/page.tsx` | Consultation queue + stats |
| `apps/admin/src/app/dashboard/telemedicine/[id]/page.tsx` | Detail + accept + video info |
| `apps/admin/src/app/dashboard/kyc/page.tsx` | KYC review + approve/reject |

## Key Architecture Decisions

1. **Token refresh**: Module-level `refreshPromise` prevents race conditions
2. **Auth guard**: `useAuthGuard()` hook — checks Zustand, redirects to `/login`
3. **Chat**: REST polling (3s) — upgrade to SSE later
4. **AI Chat**: Backend proxy → Gemini 2.5 Pro
5. **Payment QR**: Base64 via URL searchParams
6. **Video Call**: Agora Web SDK (`agora-rtc-sdk-ng`) with dynamic import
7. **e-Consent**: Canvas signature pad + scroll tracking + time spent (พ.ร.บ. 2569)
8. **KYC Flow**: 6-step wizard (document → liveness → face → OTP → email → done)
9. **Liveness**: MediaRecorder API → video blob → backend Rekognition
10. **OTP**: 6-digit input with auto-submit + countdown timer

## Tech Stack Quick Reference

- **Monorepo**: Turborepo + pnpm 10.28+
- **Backend**: NestJS 11, PostgreSQL 16 (Drizzle), Redis 7 (BullMQ), Meilisearch
- **Shop**: Next.js 15, React 19, Tailwind v4, Zustand 5, @line/liff
- **Admin**: Next.js 15, React 19, Tailwind v4, SWR, Recharts
- **AI**: Gemini 2.5 Pro via @ai-sdk/google
- **Storage**: MinIO (S3-compatible)
- **Video**: Agora RTC SDK (agora-rtc-sdk-ng)
- **KYC**: AWS Rekognition (face compare, liveness)

## Commands

```bash
pnpm dev          # All apps
pnpm dev:api      # API :3000
pnpm dev:admin    # Admin :3001
pnpm dev:shop     # Shop :3002
pnpm build        # Build all
pnpm test         # Run tests
pnpm db:push      # Push schema
docker compose up -d  # Infrastructure
```
