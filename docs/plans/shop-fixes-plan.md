# Shop App Critical Fixes Plan

## Context
จากการวิเคราะห์ shop app พบปัญหาหลักที่ต้องแก้ไข โฟกัสเฉพาะ fixes ที่ทำได้ทันทีโดยไม่ต้องสร้าง backend ใหม่

## Task 1: Token Refresh Interceptor
**Files:** `apps/shop/src/lib/api.ts`, `apps/shop/src/store/auth.ts`

เพิ่ม automatic token refresh ใน API client:
- เมื่อได้ 401 response → เรียก POST /v1/auth/refresh ด้วย refreshToken
- ถ้า refresh สำเร็จ → update tokens ใน auth store → retry original request
- ถ้า refresh ล้มเหลว → clearAuth() → redirect ไป /login
- ป้องกัน race condition: ถ้ามีหลาย request 401 พร้อมกัน ให้ refresh แค่ครั้งเดียว (queue pattern)
- เพิ่ม `isRefreshing` flag และ `failedQueue` array

## Task 2: Wire Up Orders Pages to Real API
**Files:** `apps/shop/src/app/(shop)/orders/page.tsx`, `apps/shop/src/app/(shop)/orders/[id]/page.tsx`

แก้ orders pages จาก mock data เป็นเรียก API จริง:
- `/orders` page: เปลี่ยนจาก mockOrders เป็นเรียก `getMyOrders(token)` จาก `lib/orders.ts`
  - เพิ่ม loading state, error handling, empty state
  - ใช้ auth store เพื่อดึง token
  - redirect ไป /login ถ้าไม่มี token
- `/orders/[id]` page: เปลี่ยนจาก mockOrder เป็นเรียก `getOrder(token, id)` จาก `lib/orders.ts`
  - เพิ่ม loading state, error handling
  - ใช้ข้อมูลจริงแทน hardcoded tracking steps
  - wire up "สั่งซื้อซ้ำ" button ให้เรียก `reOrder(token, orderId)`

API endpoints ที่มีอยู่แล้ว:
- GET /v1/orders (listMyOrders) — query: status, page, limit
- GET /v1/orders/:id (getMyOrder)
- POST /v1/orders/:id/reorder

## Task 3: Fix Checkout Success — Pass Real Order ID
**Files:** `apps/shop/src/app/(shop)/checkout/page.tsx`, `apps/shop/src/app/(shop)/checkout/success/page.tsx`

แก้ checkout flow ให้ส่ง orderId จริง:
- ใน checkout page: หลัง createOrder สำเร็จ → ดึง order.id จาก response → pass ผ่าน URL query param `router.push('/checkout/success?orderId=' + order.id)`
- ใน success page: อ่าน orderId จาก searchParams → ใช้ orderId จริงใน uploadPaymentSlip แทน 'latest'
- เพิ่ม: เรียก getOrder(token, orderId) เพื่อแสดงข้อมูล order จริง (orderNo, totalAmount, QR code URL ถ้ามี)
- Handle กรณีไม่มี orderId → redirect กลับ /orders

## Task 4: Auth Guard — Protect Pages ที่ต้อง Login
**Files:** `apps/shop/src/app/(shop)/checkout/page.tsx`, `apps/shop/src/app/(shop)/orders/page.tsx`, `apps/shop/src/app/(shop)/orders/[id]/page.tsx`, `apps/shop/src/app/(shop)/rx/upload/page.tsx`, `apps/shop/src/app/(shop)/profile/page.tsx`, `apps/shop/src/app/(shop)/medication-reminders/page.tsx`, `apps/shop/src/app/(shop)/consultation/page.tsx`, `apps/shop/src/app/(shop)/chat/page.tsx`

สร้าง reusable auth guard hook:
- สร้าง `apps/shop/src/lib/use-auth-guard.ts` — custom hook ที่:
  - check `useAuthStore().isAuthenticated()`
  - ถ้าไม่ authenticated → redirect ไป /login
  - return `{ token, patient, loading }` 
- Apply hook ในทุก page ที่ต้อง login (checkout, orders, rx/upload, profile, medication-reminders, consultation, chat)
- หน้าที่ทำ auth check อยู่แล้ว (rx/status) → เปลี่ยนมาใช้ hook เดียวกัน

## Task 5: Fix Coupon Validation — Call API Instead of Stub
**Files:** `apps/shop/src/app/(shop)/checkout/page.tsx`, `apps/shop/src/lib/orders.ts`

แก้ coupon validation จาก hardcode เป็นเรียก API:
- เพิ่ม function `validateCoupon(token, code)` ใน `lib/orders.ts` → POST /v1/orders/validate-coupon
- ใน checkout page: handleApplyCoupon เรียก API จริง
- Handle error: coupon ไม่ถูกต้อง, หมดอายุ, ใช้แล้ว
- ถ้า API ยังไม่มี endpoint → ใช้ try/catch gracefully แสดง toast error แทน hardcode discount
