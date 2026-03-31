# REYA Pharmacy Shop — Architecture & Flow Documentation

> สถานะ: อัปเดตล่าสุดหลังการแก้ไข 5 critical fixes (March 2026)

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 + React 19 (App Router) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand 5 (with localStorage persistence) |
| API Client | fetch wrapper with auto token refresh |
| LINE SDK | @line/liff v2.28 |
| Icons | lucide-react |
| Notifications | sonner |
| Date | date-fns + date-fns-tz |
| Font | Noto Sans Thai (Google Fonts) |

## 2. Application Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Root Layout                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  LiffProvider (LIFF init + auto-login + context)          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Toaster (sonner)                                   │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  Shop Layout (route group)                    │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  ShopHeader (sticky top, cart badge)    │  │  │  │  │
│  │  │  │  ├─────────────────────────────────────────┤  │  │  │  │
│  │  │  │  │  <main> Page Content (pb-20)            │  │  │  │  │
│  │  │  │  ├─────────────────────────────────────────┤  │  │  │  │
│  │  │  │  │  BottomNav (fixed bottom, 5 tabs)       │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. State Management

```
┌──────────────────────────────────────────────────────────────┐
│                    Zustand Stores                             │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth Store      │  │  Cart Store  │  │ Address Store  │  │
│  │  key: reya-auth  │  │  key: reya-  │  │ key: reya-     │  │
│  │                  │  │  cart         │  │ addresses      │  │
│  │  - accessToken   │  │              │  │                │  │
│  │  - refreshToken  │  │  - items[]   │  │ - addresses[]  │  │
│  │  - patient       │  │  - saved[]   │  │ - selectedId   │  │
│  │  - setAuth()     │  │  - addItem() │  │ - addAddress() │  │
│  │  - clearAuth()   │  │  - remove()  │  │ - setDefault() │  │
│  │  - isAuth()      │  │  - subtotal()│  │ - getSelected()│  │
│  └────────┬─────────┘  └──────┬───────┘  └───────┬────────┘  │
│           │                   │                   │           │
│           ▼                   ▼                   ▼           │
│     localStorage         localStorage        localStorage    │
└──────────────────────────────────────────────────────────────┘
```

## 4. Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  User opens  │────▶│ LiffProvider │────▶│ LIFF SDK init    │
│  LIFF App    │     │  useEffect() │     │ liff.init()      │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                      │
                    ┌───────▼───────┐      ┌───────▼──────────┐
                    │ No LIFF_ID?   │──yes─▶│ Web-only mode   │
                    │ (dev mode)    │       │ ready = true     │
                    └───────┬───────┘       └─────────────────┘
                        no  │
                    ┌───────▼───────┐
                    │ LINE logged   │──no──▶ ready = true
                    │ in?           │       (show login page)
                    └───────┬───────┘
                        yes │
                    ┌───────▼───────────────┐
                    │ getLiffProfile()       │
                    │ getLiffAccessToken()   │
                    └───────┬───────────────┘
                            │
                    ┌───────▼───────────────┐
                    │ Has accessToken in    │──yes──▶ ready = true
                    │ Zustand store?        │        (already logged in)
                    └───────┬───────────────┘
                        no  │
                    ┌───────▼───────────────┐
                    │ POST /v1/auth/line    │
                    │ { lineAccessToken }   │
                    └───────┬───────┬───────┘
                    success │       │ fail
                    ┌───────▼──┐  ┌─▼──────────┐
                    │ setAuth()│  │ redirect   │
                    │ ready=   │  │ /register  │
                    │ true     │  └────────────┘
                    └──────────┘

Token Refresh (automatic):
┌──────────┐    401     ┌──────────────┐   success   ┌──────────┐
│ API call │───────────▶│ doRefresh()  │────────────▶│ Retry    │
│ (any)    │            │ POST /v1/    │             │ original │
└──────────┘            │ auth/refresh │             │ request  │
                        └──────┬───────┘             └──────────┘
                          fail │
                        ┌──────▼───────┐
                        │ clearAuth()  │
                        │ → /login     │
                        └──────────────┘

Race condition: refreshPromise (module-level) ensures only 1 refresh at a time
```

## 5. Auth Guard (useAuthGuard hook)

```
Protected pages: checkout, orders, orders/[id], rx/upload, rx/status,
                 profile, medication-reminders, consultation, chat

┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Page renders │────▶│ useAuthGuard()   │────▶│ isAuth()?    │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                                                 yes │    │ no
                                              ┌──────▼──┐ │
                                              │ loading │ │
                                              │ = false │ │
                                              │ render  │ │
                                              │ page    │ │
                                              └─────────┘ │
                                                    ┌─────▼──────┐
                                                    │ redirect   │
                                                    │ → /login   │
                                                    └────────────┘
```

## 6. Complete Route Map & Status

### Public Pages (ไม่ต้อง login)

| Route | Type | API Connected | Status |
|-------|------|--------------|--------|
| `/` | Server | ✅ `GET /v1/products` (featured) | ✅ Production-ready |
| `/login` | Client | ✅ LIFF auto-login | ✅ Production-ready |
| `/register` | Client | ✅ `POST /v1/auth/register` | ✅ Production-ready |
| `/search` | Client | ✅ `GET /v1/products` (search/filter) | ✅ Production-ready |
| `/products` | Client | ✅ `GET /v1/products` (browse) | ✅ Production-ready |
| `/product/[id]` | Server | ✅ `GET /v1/products/:id` | ✅ Production-ready |

### Protected Pages (ต้อง login — useAuthGuard)

| Route | Type | API Connected | Status |
|-------|------|--------------|--------|
| `/cart` | Client | ❌ Client-only (Zustand) | ✅ Works (no API needed) |
| `/checkout` | Client | ✅ `POST /v1/orders` + `POST /v1/orders/validate-coupon` | ✅ Fixed — real coupon API |
| `/checkout/success` | Client | ✅ `GET /v1/orders/:id` + `POST /v1/orders/:id/slip` | ✅ Fixed — real orderId |
| `/orders` | Client | ✅ `GET /v1/orders` | ✅ Fixed — real API |
| `/orders/[id]` | Client | ✅ `GET /v1/orders/:id` + `POST /v1/orders/:id/reorder` | ✅ Fixed — real API |
| `/rx/upload` | Client | ✅ `POST /v1/prescriptions` (FormData) | ✅ Production-ready |
| `/rx/status` | Client | ✅ `GET /v1/patients/me/prescriptions` | ✅ Production-ready |
| `/rx/[id]` | Client | ✅ `GET /v1/prescriptions/:id` | ✅ Production-ready |
| `/profile` | Client | ✅ `GET /v1/patients/me` + allergies/diseases/meds | ✅ Production-ready |
| `/profile/edit` | Client | ✅ `PATCH /v1/patients/me` | ✅ Production-ready |
| `/profile/allergies` | Client | ✅ CRUD `/v1/patients/me/allergies` | ✅ Production-ready |
| `/profile/medications` | Client | ✅ CRUD `/v1/patients/me/medications` | ✅ Production-ready |
| `/profile/diseases` | Client | ✅ CRUD `/v1/patients/me/diseases` | ✅ Production-ready |
| `/profile/loyalty` | Client | ✅ `GET /v1/loyalty/me` + transactions | ✅ Production-ready |
| `/profile/notifications` | Client | ✅ Connected | ✅ Production-ready |
| `/profile/pdpa` | Client | ⚠️ Likely connected | ⚠️ Not verified |
| `/profile/audit-trail` | Client | ⚠️ Likely connected | ⚠️ Not verified |
| `/profile/delete-account` | Client | ⚠️ Likely connected | ⚠️ Not verified |
| `/medication-reminders` | Client | ✅ CRUD `/v1/adherence/my-reminders` | ✅ Production-ready |
| `/notifications` | Client | ✅ `GET /v1/notifications/me` | ✅ Production-ready |
| `/consultation` | Client | ✅ `POST /v1/telemedicine/consultations/request` | ✅ Fixed — real API |
| `/chat` | Client | ✅ `POST /v1/chat/sessions` + messages API (polling) | ✅ Fixed — real API |
| `/ai-consult` | Client | ✅ `POST /v1/ai/chat` → Gemini 2.5 Pro | ✅ Fixed — real AI |
| `/adr-report` | Client | ✅ `POST /v1/adr` | ✅ Fixed — real API |
| `/clinical/*` | Client | ✅ `GET /v1/drug-info/lookup` + `POST /v1/drug-info/medication-review` | ✅ Fixed — real API |
| `/onboarding/health` | Client | ✅ `POST /v1/patients/me/allergies` + diseases | ✅ Production-ready |

## 7. Shopping Flow (Complete Purchase Journey)

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│  Home   │───▶│  Search  │───▶│ Product      │───▶│  Cart    │
│  /      │    │  /search │    │ /product/[id]│    │  /cart   │
│         │    │          │    │              │    │          │
│ Featured│    │ Filter   │    │ Detail +     │    │ Items +  │
│ products│    │ Sort     │    │ Add to cart  │    │ Save for │
│ Quick   │    │ Paginate │    │ Consult link │    │ later    │
│ actions │    │          │    │              │    │ Subtotal │
└─────────┘    └──────────┘    └──────────────┘    └────┬─────┘
                                                        │
                                                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    Checkout /checkout                         │
│                                                              │
│  Step 1: Address                Step 2: Review               │
│  ┌─────────────────┐           ┌─────────────────────────┐  │
│  │ Select existing │           │ Order items summary     │  │
│  │ or add new      │──────────▶│ Shipping method         │  │
│  │ address         │           │ Payment method          │  │
│  │ (Zustand store) │           │ Coupon → API validate   │  │
│  └─────────────────┘           │ Total calculation       │  │
│                                │ ─────────────────────── │  │
│                                │ POST /v1/orders         │  │
│                                └────────────┬────────────┘  │
└─────────────────────────────────────────────┼────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Checkout Success /checkout/success?orderId=xxx   │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │ GET /v1/orders/  │───▶│ Show real order data:        │   │
│  │ :orderId         │    │ - orderNo                    │   │
│  └──────────────────┘    │ - totalAmount                │   │
│                          │ - QR code (if promptpay)     │   │
│                          │ - PromptPay number + copy    │   │
│                          │ - 30 min payment timer       │   │
│                          └──────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Slip Upload: POST /v1/orders/:orderId/slip           │   │
│  │ → auto-verify or manual review                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [ดูออเดอร์] → /orders    [กลับหน้าหลัก] → /               │
└──────────────────────────────────────────────────────────────┘
```

## 8. Prescription Flow

```
┌──────────────┐     ┌──────────────────────────────────────┐
│ /rx/upload   │     │ Upload Process                       │
│              │     │                                      │
│ Select up to │────▶│ 1. POST /v1/prescriptions (FormData) │
│ 5 images     │     │ 2. Show upload progress bar          │
│ Add notes    │     │ 3. Show OCR progress (simulated)     │
│              │     │ 4. Display rxNo + status             │
└──────────────┘     └──────────────┬───────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                  Prescription Status Flow                     │
│                                                              │
│  received → ai_processing → ai_completed → pending_review   │
│                                                    │         │
│                                          ┌─────────┼────┐    │
│                                          │         │    │    │
│                                          ▼         ▼    ▼    │
│                                      approved  rejected      │
│                                          │                   │
│                                          ▼                   │
│                                      dispensing              │
│                                          │                   │
│                                          ▼                   │
│                                       shipped                │
└──────────────────────────────────────────────────────────────┘

/rx/status  → GET /v1/patients/me/prescriptions (list)
/rx/[id]    → GET /v1/prescriptions/:id (detail + timeline)
```

## 9. API Endpoints Map (Shop → Backend)

### Authentication
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| POST | `/v1/auth/line` | `loginWithLine()` | LiffProvider |
| POST | `/v1/auth/register` | `registerPatient()` | /register |
| POST | `/v1/auth/refresh` | inline fetch in api.ts | Auto token refresh |
| PATCH | `/v1/patients/me` | `updateProfile()` | /profile/edit |

### Products (public)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| GET | `/v1/products` | `getProducts()` | /search, /products, / |
| GET | `/v1/products/:id` | `getProduct()` | /product/[id] |

### Orders (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| POST | `/v1/orders` | `createOrder()` | /checkout |
| GET | `/v1/orders` | `getMyOrders()` | /orders |
| GET | `/v1/orders/:id` | `getOrder()` | /orders/[id], /checkout/success |
| POST | `/v1/orders/:id/slip` | `uploadPaymentSlip()` | /checkout/success |
| POST | `/v1/orders/:id/reorder` | `reOrder()` | /orders/[id] |
| POST | `/v1/orders/validate-coupon` | `validateCoupon()` | /checkout |

### Prescriptions (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| POST | `/v1/prescriptions` | `uploadPrescription()` | /rx/upload |
| GET | `/v1/patients/me/prescriptions` | `getMyPrescriptions()` | /rx/status |
| GET | `/v1/prescriptions/:id` | `getPrescription()` | /rx/[id] |

### Patient Profile (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| GET | `/v1/patients/me` | `getMyProfile()` | /profile |
| GET | `/v1/patients/me/allergies` | `getMyAllergies()` | /profile, /profile/allergies |
| POST | `/v1/patients/me/allergies` | `createAllergy()` | /profile/allergies |
| DELETE | `/v1/patients/me/allergies/:id` | `deleteAllergy()` | /profile/allergies |
| GET | `/v1/patients/me/diseases` | `getMyDiseases()` | /profile, /profile/diseases |
| POST | `/v1/patients/me/diseases` | `createDisease()` | /profile/diseases |
| DELETE | `/v1/patients/me/diseases/:id` | `deleteDisease()` | /profile/diseases |
| GET | `/v1/patients/me/medications` | `getMyMedications()` | /profile, /profile/medications |
| POST | `/v1/patients/me/medications` | `createMedication()` | /profile/medications |
| DELETE | `/v1/patients/me/medications/:id` | `deleteMedication()` | /profile/medications |

### Adherence (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| GET | `/v1/adherence/my-reminders` | `getMyReminders()` | /medication-reminders |
| POST | `/v1/adherence/my-reminders` | `createReminder()` | /medication-reminders |
| PATCH | `/v1/adherence/reminders/:id/acknowledge` | `acknowledgeReminder()` | /medication-reminders |
| PATCH | `/v1/adherence/my-reminders/:id/toggle` | `toggleReminder()` | /medication-reminders |
| DELETE | `/v1/adherence/my-reminders/:id` | `deleteReminder()` | /medication-reminders |
| GET | `/v1/adherence/my-stats` | `getMyStats()` | /medication-reminders |

### Loyalty (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| GET | `/v1/loyalty/me` | `getMyLoyalty()` | /profile/loyalty |
| GET | `/v1/loyalty/transactions` | `getTransactions()` | /profile/loyalty |
| POST | `/v1/loyalty/redeem` | `redeemPoints()` | /profile/loyalty |

### Notifications (auth required)
| Method | Endpoint | Lib Function | Used By |
|--------|----------|-------------|---------|
| GET | `/v1/notifications/me` | `getMyNotifications()` | /notifications |
| PATCH | `/v1/notifications/:id/read` | `markRead()` | /notifications |
| POST | `/v1/notifications/read-all` | `markAllRead()` | /notifications |

## 10. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                        │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │ React    │──▶│ Zustand      │──▶│ localStorage           │  │
│  │ Pages    │   │ Stores       │   │ (reya-auth, reya-cart, │  │
│  │          │   │ (auth, cart, │   │  reya-addresses)       │  │
│  │          │   │  address)    │   └────────────────────────┘  │
│  │          │   └──────────────┘                                │
│  │          │                                                   │
│  │          │   ┌──────────────┐   ┌────────────────────────┐  │
│  │          │──▶│ lib/*.ts     │──▶│ api.ts (fetch wrapper) │  │
│  │          │   │ (domain      │   │ + auto token refresh   │  │
│  │          │   │  helpers)    │   │ + 401 → refresh → retry│  │
│  └──────────┘   └──────────────┘   └───────────┬────────────┘  │
│                                                 │               │
│  ┌──────────────────────────────────────────────┼────────────┐  │
│  │ LiffProvider (context)                       │            │  │
│  │ - LIFF SDK init                              │            │  │
│  │ - LINE profile                               │            │  │
│  │ - Auto-login to backend                      │            │  │
│  └──────────────────────────────────────────────┼────────────┘  │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
                                    Bearer token  │  JSON / FormData
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS API :3000)                    │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │ Auth     │   │ Orders       │   │ Products               │  │
│  │ Module   │   │ Module       │   │ Module                 │  │
│  │ JWT +    │   │ CRUD +       │   │ Catalog +              │  │
│  │ Passport │   │ Payment      │   │ Search                 │  │
│  └──────────┘   └──────────────┘   └────────────────────────┘  │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │ Patient  │   │ Prescription │   │ Adherence              │  │
│  │ Module   │   │ Module       │   │ Module                 │  │
│  │ Profile  │   │ OCR + Review │   │ Reminders              │  │
│  │ Allergy  │   │ Workflow     │   │ Stats                  │  │
│  └──────────┘   └──────────────┘   └────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL 16 (Drizzle ORM) + Redis 7 + Meilisearch     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 11. Component Architecture

```
apps/shop/src/
├── app/
│   ├── layout.tsx              ← Root: font, LiffProvider, Toaster
│   ├── globals.css             ← Tailwind CSS v4
│   └── (shop)/
│       ├── layout.tsx          ← ShopHeader + BottomNav + max-w-lg
│       ├── page.tsx            ← Home (Server Component)
│       └── [30+ route dirs]    ← See Route Map above
│
├── components/
│   ├── layout/
│   │   ├── shop-header.tsx     ← Logo, notifications, cart badge
│   │   └── bottom-nav.tsx      ← 5 tabs: home, search, cart, orders, profile
│   ├── product/
│   │   ├── product-card.tsx    ← Reusable card (grid display)
│   │   └── product-add-to-cart.tsx ← Add-to-cart button (Rx check)
│   ├── providers/
│   │   └── liff-provider.tsx   ← LIFF context + auto-login
│   └── ui/
│       ├── badge.tsx           ← shadcn badge
│       ├── button.tsx          ← shadcn button
│       ├── input.tsx           ← shadcn input
│       └── progress.tsx        ← shadcn progress bar
│
├── lib/
│   ├── api.ts                  ← Fetch wrapper + token refresh
│   ├── auth.ts                 ← Login, register, refresh, profile update
│   ├── liff.ts                 ← LIFF SDK wrapper functions
│   ├── products.ts             ← Product API helpers
│   ├── orders.ts               ← Order API + shipping/payment options
│   ├── prescriptions.ts        ← Rx API + status config + timeline builder
│   ├── patient.ts              ← Profile, allergies, diseases, medications
│   ├── adherence.ts            ← Medication reminders API
│   ├── loyalty.ts              ← Points & tier API
│   ├── notifications.ts        ← Notification API
│   ├── use-auth-guard.ts       ← Auth guard hook (redirect if not logged in)
│   └── utils.ts                ← cn(), formatPrice(), formatDate()
│
└── store/
    ├── auth.ts                 ← Auth state (persist: reya-auth)
    ├── cart.ts                 ← Cart state (persist: reya-cart)
    └── address.ts              ← Address state (persist: reya-addresses)
```

## 12. สิ่งที่แก้ไขแล้ว (Critical Fixes Applied)

| # | ปัญหา | แก้ไข | ไฟล์ |
|---|-------|------|------|
| 1 | Token หมดอายุ → error ไม่ refresh | Auto token refresh + race condition prevention | `lib/api.ts` |
| 2 | Orders pages ใช้ mock data | Wire up กับ `GET /v1/orders` + `GET /v1/orders/:id` จริง | `orders/page.tsx`, `orders/[id]/page.tsx` |
| 3 | Checkout success ใช้ orderId = 'latest' | ส่ง orderId จริงผ่าน URL, ดึงข้อมูล order จริง | `checkout/page.tsx`, `checkout/success/page.tsx` |
| 4 | ไม่มี auth guard สม่ำเสมอ | สร้าง `useAuthGuard()` hook, apply 7 pages | `use-auth-guard.ts` + 7 pages |
| 5 | Coupon validation hardcode 50฿ | เรียก `POST /v1/orders/validate-coupon` จริง | `lib/orders.ts`, `checkout/page.tsx` |

## 13. Phase 2 Fixes Applied

| # | ปัญหา | แก้ไข | ไฟล์ |
|---|-------|------|------|
| 6 | Search ไม่ sync URL params | เพิ่ม `router.replace()` sync query/filter/sort → shareable URLs | `search/page.tsx` |
| 7 | Consultation ไม่เรียก API | Wire up กับ `POST /v1/telemedicine/consultations/request` | `lib/consultation.ts`, `consultation/page.tsx` |
| 8 | AI Chatbot เป็น client-side stub | สร้าง `POST /v1/ai/chat` endpoint + เชื่อม Gemini API จริง | `ai-chat.controller.ts`, `lib/ai-chat.ts`, `ai-consult/page.tsx` |

## 14. Phase 3 Sprint 1 Fixes Applied

| # | ปัญหา | แก้ไข | ไฟล์ |
|---|-------|------|------|
| 9 | ADR Report เป็น stub | Wire up กับ `POST /v1/adr` | `lib/adr.ts`, `adr-report/page.tsx` |
| 10 | Notifications ไม่มี auth guard | เพิ่ม `useAuthGuard` | `notifications/page.tsx` |
| 11 | Profile Edit ไม่มี auth guard | เพิ่ม `useAuthGuard` | `profile/edit/page.tsx` |
| 12 | Profile Allergies ใช้ alert() | เปลี่ยนเป็น toast + auth guard | `profile/allergies/page.tsx` |
| 13 | Profile Loyalty fallback ผิด | แก้ fallback 2450→0, silver→bronze + auth guard | `profile/loyalty/page.tsx` |
| 14 | Onboarding Health ไม่มี auth guard | เพิ่ม `useAuthGuard` | `onboarding/health/page.tsx` |
| 15 | Rx Detail ใช้ custom toast | เปลี่ยนเป็น sonner toast + auth guard | `rx/[id]/page.tsx` |

## 15. Phase 3 Sprint 2 Fixes Applied

| # | ปัญหา | แก้ไข | ไฟล์ |
|---|-------|------|------|
| 16 | Product images ไม่แสดงจาก MinIO | เพิ่ม MinIO remote pattern ใน next.config.ts | `next.config.ts` |
| 17 | Payment QR เป็น placeholder | ส่ง promptpayQrBase64 จาก createOrder → แสดง QR จริง | `checkout/page.tsx`, `checkout/success/page.tsx` |
| 18 | Clinical DI Database เป็น mock | Wire up กับ `GET /v1/drug-info/lookup` | `lib/drug-info.ts`, `di-database/page.tsx` |
| 19 | Med Review เป็น stub | Wire up กับ `POST /v1/drug-info/medication-review` | `med-review/page.tsx` |

## 17. Phase 3 Sprint 3 Fixes Applied

| # | ปัญหา | แก้ไข | ไฟล์ |
|---|-------|------|------|
| 20 | Chat เป็น mock (setTimeout) | สร้าง Chat REST API (controller + service) + polling 3s | `chat.controller.ts`, `chat.service.ts`, `lib/chat.ts`, `chat/page.tsx` |

## 18. สิ่งที่ยังเป็น Stub / ต้องทำต่อ

| Feature | สถานะ | สิ่งที่ต้องทำ |
|---------|-------|-------------|
| Address sync | ⚠️ Client-only (Zustand) | สร้าง patient_addresses table + CRUD API |
| OCR Progress | ⚠️ Simulated (setInterval) | Poll สถานะจริงจาก API หรือใช้ SSE |
| Video Consultation | ⚠️ Backend ready, no frontend | สร้าง Agora Web SDK integration |
| KYC Verification | ⚠️ Backend ready, no frontend | สร้าง document upload + liveness UI |
| Chat → SSE upgrade | ⚠️ Polling (3s) | อัปเกรดเป็น SSE สำหรับ real-time ที่ดีขึ้น |
