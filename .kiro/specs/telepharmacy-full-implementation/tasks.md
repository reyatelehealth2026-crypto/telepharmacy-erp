# Implementation Plan: Telepharmacy ERP — Full Implementation

## Overview

Implement 8 remaining modules across backend (NestJS 11), frontend (Next.js 15), and LINE integration. Tasks are grouped by module/feature area, building incrementally from backend services → frontend pages → integration wiring. All code in TypeScript. Property-based tests use fast-check with Jest.

## Tasks

- [x] 1. PromotionsModule — Backend
  - [x] 1.1 Create PromotionsModule scaffolding and DTOs
    - Create `apps/api/src/modules/promotions/promotions.module.ts` with module definition
    - Create `apps/api/src/modules/promotions/dto/create-promotion.dto.ts` with Zod validation (code, name, type, value, minOrderAmount, maxDiscount, usageLimit, usagePerCustomer, startsAt, endsAt, tierRequired, productIds, categoryIds, buyQuantity, getQuantity)
    - Create `apps/api/src/modules/promotions/dto/update-promotion.dto.ts` (partial of create)
    - Create `apps/api/src/modules/promotions/dto/validate-coupon.dto.ts` (code, orderAmount, patientTier)
    - Enforce type-specific validation: `percentage_discount` requires value 1–100 and maxDiscount; `buy_x_get_y` requires buyQuantity and getQuantity
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Implement PromotionsService with CRUD and coupon validation
    - Create `apps/api/src/modules/promotions/promotions.service.ts`
    - Implement `create`, `update`, `findAll` (with status/type/date filters + pagination), `findOne`, `delete`, `activate`, `deactivate`
    - Implement `validateCoupon(code, patientId, orderAmount, patientTier)` checking: code exists, status active, usageCount < usageLimit, orderAmount >= minOrderAmount, tier meets tierRequired, date within startsAt–endsAt
    - Implement `applyCoupon(promotionId, orderId)` incrementing usageCount and recording discount on order
    - Return Thai error messages for all validation failures
    - Use existing `promotions` table from `@telepharmacy/db`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.3 Implement PromotionsController (staff) and PromotionsPublicController (patient)
    - Create `apps/api/src/modules/promotions/promotions.controller.ts` — staff CRUD at `/v1/staff/promotions` with JWT guard
    - Create `apps/api/src/modules/promotions/promotions-public.controller.ts` — patient coupon validation at `POST /v1/orders/validate-coupon`
    - _Requirements: 1.1, 1.4_

  - [ ]* 1.4 Write property tests for PromotionsService (Properties 1–5)
    - **Property 1: Promotion CRUD round-trip** — Create promotion then read back, all fields preserved
    - **Validates: Requirements 1.1**
    - **Property 2: Promotion type-specific validation** — percentage_discount requires value 1–100 + maxDiscount; buy_x_get_y requires buyQuantity + getQuantity
    - **Validates: Requirements 1.2, 1.3**
    - **Property 3: Coupon validation correctness** — valid=true iff code exists, active, usage not exceeded, amount met, tier met, date in range
    - **Validates: Requirements 1.4**
    - **Property 4: Coupon usage count invariant** — applyCoupon increments usageCount by exactly 1
    - **Validates: Requirements 1.6**
    - **Property 5: Promotion list filtering** — returned promotions match all active filters, no matching promotion excluded
    - **Validates: Requirements 1.7**
    - File: `apps/api/src/modules/promotions/promotions.service.property.spec.ts`

  - [ ]* 1.5 Write unit tests for PromotionsService and controllers
    - Test percentage_discount with value=50, maxDiscount=100 → success
    - Test percentage_discount with value=150 → validation error
    - Test validate coupon with expired date → Thai error message
    - Test apply coupon → usageCount increments
    - Test controller auth guards and response shapes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.6 Register PromotionsModule in AppModule
    - Import PromotionsModule in `apps/api/src/app.module.ts`
    - _Requirements: 1.1_

- [x] 2. ContentModule — Backend
  - [x] 2.1 Create ContentModule scaffolding and DTOs
    - Create `apps/api/src/modules/content/content.module.ts`
    - Create `apps/api/src/modules/content/dto/create-content.dto.ts` with Zod (type, titleTh, titleEn, slug, body, excerpt, tags, seoKeywords, metaTitle, metaDescription, featuredImageUrl, relatedProductIds)
    - Create `apps/api/src/modules/content/dto/update-content.dto.ts`
    - Create `apps/api/src/modules/content/dto/query-content.dto.ts` (type, tags, q, page, limit)
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 2.2 Implement ContentService
    - Create `apps/api/src/modules/content/content.service.ts`
    - Implement `create`, `update`, `publish` (set publishedAt + status=published), `unpublish` (status=draft), `findAll` (pagination + type/tag/search filters), `findBySlug`, `incrementViewCount`, `delete`
    - Public queries must only return status=published items
    - Use existing `content` table from `@telepharmacy/db`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 2.3 Implement ContentController (public) and ContentStaffController
    - Create `apps/api/src/modules/content/content.controller.ts` — public at `/v1/content` (browse, view by slug, increment view)
    - Create `apps/api/src/modules/content/content-staff.controller.ts` — staff CRUD at `/v1/staff/content` with JWT guard
    - _Requirements: 3.1, 3.4_

  - [ ]* 2.4 Write property tests for ContentService (Properties 6–9)
    - **Property 6: Content CRUD round-trip** — Create content then read back, all fields preserved
    - **Validates: Requirements 3.1, 3.6, 3.7**
    - **Property 7: Content publish state transition** — Publishing sets status=published + publishedAt non-null; unpublishing sets status=draft
    - **Validates: Requirements 3.3**
    - **Property 8: Public content filtering — published only** — Public endpoint returns only status=published with non-null publishedAt, matching type/tag filters
    - **Validates: Requirements 3.4**
    - **Property 9: Content view count increment** — Calling view endpoint increments viewCount by exactly 1
    - **Validates: Requirements 3.5**
    - File: `apps/api/src/modules/content/content.service.property.spec.ts`

  - [ ]* 2.5 Write unit tests for ContentService and controllers
    - Test create article with duplicate slug → 409 error
    - Test publish draft article → publishedAt set
    - Test public query returns only published items
    - Test SEO fields preserved on create/update
    - _Requirements: 3.1, 3.3, 3.4, 3.6_

  - [x] 2.6 Register ContentModule in AppModule
    - Import ContentModule in `apps/api/src/app.module.ts`
    - _Requirements: 3.1_

- [x] 3. ComplaintsModule — Backend
  - [x] 3.1 Create ComplaintsModule scaffolding and DTOs
    - Create `apps/api/src/modules/complaints/complaints.module.ts`
    - Create `apps/api/src/modules/complaints/dto/create-complaint.dto.ts` (category, description, severity, images as JSONB, optional orderId, optional chatSessionId)
    - Create `apps/api/src/modules/complaints/dto/resolve-complaint.dto.ts` (resolution text)
    - Create `apps/api/src/modules/complaints/dto/query-complaints.dto.ts` (status, severity, category, page, limit)
    - _Requirements: 5.1, 5.3_

  - [x] 3.2 Implement ComplaintsService
    - Create `apps/api/src/modules/complaints/complaints.service.ts`
    - Implement `create` (set status=open), `findMyComplaints` (filter by patientId), `findAll` (staff with status/severity/category filters + pagination), `findOne`, `resolve` (set resolution, resolvedBy, resolvedAt, status=resolved), `updateStatus`
    - On status change, call NotificationSenderService to notify patient (referenceType=complaint)
    - Use existing `complaints` table from `@telepharmacy/db`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.3 Implement ComplaintsController (patient) and ComplaintsStaffController
    - Create `apps/api/src/modules/complaints/complaints.controller.ts` — patient at `/v1/complaints` (create, list own)
    - Create `apps/api/src/modules/complaints/complaints-staff.controller.ts` — staff at `/v1/staff/complaints` (list all, resolve, update status)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.4 Write property tests for ComplaintsService (Properties 10–13)
    - **Property 10: Complaint CRUD round-trip** — Create complaint then read back, all fields preserved with status=open
    - **Validates: Requirements 5.1**
    - **Property 11: Patient complaint isolation** — Patient query returns only their own complaints
    - **Validates: Requirements 5.2**
    - **Property 12: Complaint resolution state transition** — Resolving sets resolution, resolvedBy, resolvedAt, status=resolved
    - **Validates: Requirements 5.4**
    - **Property 13: Complaint status change triggers notification** — Status change creates notification with referenceType=complaint
    - **Validates: Requirements 5.5**
    - File: `apps/api/src/modules/complaints/complaints.service.property.spec.ts`

  - [ ]* 3.5 Write unit tests for ComplaintsService and controllers
    - Test create complaint with images → images stored as JSONB
    - Test resolve complaint → all resolution fields set
    - Test patient can only see own complaints
    - Test image upload limit (max 5)
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 3.6 Register ComplaintsModule in AppModule
    - Import ComplaintsModule in `apps/api/src/app.module.ts`
    - _Requirements: 5.1_

- [x] 4. Checkpoint — Backend core modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. NotificationSenderService — Backend Enhancement
  - [x] 5.1 Implement NotificationSenderService with BullMQ dispatch
    - Create `apps/api/src/modules/notifications/notification-sender.service.ts`
    - Implement `send(patientId, type, channel, title, body, referenceType, referenceId, lineMessageData)`
    - Check notification preferences before creating record (skip if disabled)
    - Create notification record in DB with status=pending
    - Enqueue BullMQ job to `notification-queue`
    - Register BullMQ module in NotificationsModule
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 5.2 Implement NotificationProcessor (BullMQ worker)
    - Create `apps/api/src/modules/notifications/notification.processor.ts`
    - Process jobs: call `LineClientService.pushMessage` with Flex Message data
    - On success: update sentAt + status=sent
    - On failure: update errorMessage, increment retryCount
    - Configure retry: 3 attempts, exponential backoff (5s, 25s, 125s)
    - When retryCount reaches maxRetries, set status=failed
    - _Requirements: 7.2, 7.5, 7.6_

  - [x] 5.3 Wire notification triggers into existing services
    - In OrdersService: trigger notification on status change to paid/shipped/delivered
    - In PrescriptionService: trigger notification on status change to approved/rejected/dispensed
    - In ComplaintsService: trigger notification on complaint status change (already wired in 3.2)
    - _Requirements: 7.3, 7.4_

  - [ ]* 5.4 Write property tests for NotificationSenderService (Properties 14–18)
    - **Property 14: Notification send creates DB record and enqueues job** — Valid send creates pending record + BullMQ job
    - **Validates: Requirements 7.1**
    - **Property 15: Status change triggers notification** — Order/prescription status changes create notifications
    - **Validates: Requirements 7.3, 7.4**
    - **Property 16: Notification retry respects maxRetries** — retryCount increments, stops at maxRetries with status=failed
    - **Validates: Requirements 7.5**
    - **Property 17: Notification delivery status update** — Success sets sentAt+status=sent; failure sets errorMessage+retryCount++
    - **Validates: Requirements 7.6**
    - **Property 18: Notification preferences respected** — Disabled preference skips notification creation
    - **Validates: Requirements 7.7**
    - File: `apps/api/src/modules/notifications/notification-sender.service.property.spec.ts`

  - [ ]* 5.5 Write unit tests for NotificationSenderService and Processor
    - Test send with disabled preference → skipped
    - Test failed notification retries up to 3 times
    - Test successful notification sets sentAt
    - Test exponential backoff timing
    - _Requirements: 7.1, 7.5, 7.6, 7.7_

- [x] 6. EventsModule — WebSocket Gateway
  - [x] 6.1 Create EventsModule with Socket.IO gateway
    - Create `apps/api/src/modules/events/events.module.ts`
    - Create `apps/api/src/modules/events/events.gateway.ts` — `@WebSocketGateway('/ws')` with Socket.IO adapter
    - Create `apps/api/src/modules/events/guards/ws-jwt.guard.ts` — JWT auth via handshake token
    - Implement `handleConnection` (verify JWT, reject unauthorized), `handleDisconnect`, `handleSubscribe` (join rooms: room:prescriptions, room:orders, room:chat, room:complaints)
    - _Requirements: 8.1, 8.6_

  - [x] 6.2 Implement EventsService with emit helpers
    - Create `apps/api/src/modules/events/events.service.ts`
    - Implement `emitPrescriptionUpdate`, `emitOrderUpdate`, `emitChatMessage`, `emitNewComplaint`
    - Each method emits to the corresponding room only
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 6.3 Wire EventsService into existing services
    - Inject EventsService into PrescriptionService → emit on prescription status change
    - Inject EventsService into OrdersService → emit on order status change
    - Inject EventsService into LineWebhookService → emit on new chat message
    - Inject EventsService into ComplaintsService → emit on new complaint
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.4 Write property test for EventsGateway (Property 19)
    - **Property 19: WebSocket room-based event delivery** — Events emitted only to subscribed room clients; non-subscribed clients don't receive
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6**
    - File: `apps/api/src/modules/events/events.gateway.property.spec.ts`

  - [ ]* 6.5 Write unit tests for EventsGateway
    - Test unauthenticated connection → rejected
    - Test subscribe to room:orders → receives order:update events
    - Test not subscribed → does not receive events
    - _Requirements: 8.1, 8.6_

  - [x] 6.6 Register EventsModule in AppModule
    - Import EventsModule in `apps/api/src/app.module.ts`
    - _Requirements: 8.1_

- [x] 7. Checkpoint — Backend notification + WebSocket modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Shop LIFF — Articles & Complaints Pages (New)
  - [x] 8.1 Create articles listing page and article detail page
    - Create `apps/shop/src/app/(shop)/articles/page.tsx` — list published articles with title, excerpt, featured image, publication date, pagination
    - Create `apps/shop/src/app/(shop)/articles/[slug]/page.tsx` — full article body, related products, share button
    - Create API helper in `apps/shop/src/lib/content.ts` for fetching articles from `/v1/content`
    - Add search within articles using `q` query parameter
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 8.2 Create complaint submission and history pages
    - Create `apps/shop/src/app/(shop)/complaints/new/page.tsx` — form with category select, description textarea, image upload (max 5), optional order reference
    - Create `apps/shop/src/app/(shop)/complaints/page.tsx` — list complaints with status badges (open, in_progress, resolved, closed)
    - Create API helper in `apps/shop/src/lib/complaints.ts` for complaint endpoints
    - _Requirements: 6.1, 6.2_

  - [x] 8.3 Update home page to show dynamic health tips
    - Replace hardcoded health tips on home page with latest 3 published articles from Content API
    - _Requirements: 4.3_

- [x] 9. Shop LIFF — Product Search Enhancement
  - [x] 9.1 Enhance search page with filters and product cards
    - Update `apps/shop/src/app/(shop)/search/page.tsx` — add debounced search input (300ms), category filter, drug classification filter, price range filter, in-stock toggle
    - Update product card component to show: Thai product name, brand, price, member price, unit, stock status badge, "requires prescription" indicator for dangerous/controlled drugs
    - Ensure product tap navigates to `/product/[id]` with full details
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 9.2 Write property test for product search filtering (Property 20)
    - **Property 20: Product search filter correctness** — All returned products match every active filter; no matching product excluded
    - **Validates: Requirements 9.3**
    - File: `apps/shop/src/__tests__/search-filter.property.spec.ts`

  - [ ]* 9.3 Write property test for product card display (Property 21)
    - **Property 21: Product card displays all required fields** — Card contains Thai name, brand, price, unit, stock status, prescription indicator for controlled drugs
    - **Validates: Requirements 9.4**
    - File: `apps/shop/src/__tests__/product-card.property.spec.ts`

- [x] 10. Shop LIFF — Prescription Upload & Status Enhancement
  - [x] 10.1 Enhance prescription pages
    - Update `apps/shop/src/app/(shop)/rx/upload/page.tsx` — camera capture + gallery selection, multiple images (up to 5), call `POST /v1/prescriptions`, show confirmation with RX number
    - Update `apps/shop/src/app/(shop)/rx/page.tsx` — list prescriptions with status badges (received, AI processing, pharmacist reviewing, approved, rejected)
    - Update `apps/shop/src/app/(shop)/rx/[id]/page.tsx` — show OCR results, pharmacist notes, approved medication items, "สั่งซื้อยาตามใบสั่ง" button to add approved items to cart
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Shop LIFF — Orders Enhancement
  - [x] 11.1 Enhance order history and tracking pages
    - Update `apps/shop/src/app/(shop)/orders/page.tsx` — list orders with order number, date, total, status badge, item count
    - Update `apps/shop/src/app/(shop)/orders/[id]/page.tsx` — full order details, payment status, visual tracking timeline (confirmed → preparing → shipped → delivered), tracking number + carrier, "สั่งซื้อซ้ำ" reorder button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 11.2 Write property test for order tracking timeline (Property 22)
    - **Property 22: Order tracking timeline correctness** — Timeline shows correct completed/active/pending steps based on order status
    - **Validates: Requirements 11.3**
    - File: `apps/shop/src/__tests__/order-timeline.property.spec.ts`

  - [ ]* 11.3 Write property test for reorder (Property 23)
    - **Property 23: Reorder adds same items to cart** — Reorder adds exactly N items with same product IDs and quantities
    - **Validates: Requirements 11.5**
    - File: `apps/shop/src/__tests__/reorder.property.spec.ts`

- [x] 12. Shop LIFF — Profile, Consultation, Reminders, ADR, AI, Notifications Enhancement
  - [x] 12.1 Enhance profile pages
    - Update `apps/shop/src/app/(shop)/profile/page.tsx` — display name, DOB, gender, phone, address, loyalty tier/points
    - Ensure `/profile/edit`, `/profile/allergies`, `/profile/diseases`, `/profile/loyalty`, `/profile/kyc` pages are functional with proper API integration
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 12.2 Enhance consultation pages
    - Update `apps/shop/src/app/(shop)/consultation/page.tsx` — request new consultation with type selection (chat/video)
    - Ensure `/consultation/[id]` chat interface, `/consultation/[id]/video` Agora integration, `/consultation/[id]/consent` informed consent, `/consultation/history` listing are functional
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 12.3 Write property test for consultation consent (Property 24)
    - **Property 24: Consultation requires consent** — System blocks consultation (chat/video) unless consent recorded
    - **Validates: Requirements 13.4**
    - File: `apps/shop/src/__tests__/consultation-consent.property.spec.ts`

  - [x] 12.4 Enhance medication reminders and ADR pages
    - Update `apps/shop/src/app/(shop)/medication-reminders/page.tsx` — list active reminders with medication name, dosage, schedule, acknowledgment status; acknowledge button calls Adherence API
    - Update `apps/shop/src/app/(shop)/adr-report/page.tsx` — form for drug name, reaction, severity, onset date, images; submit to `POST /v1/adr/reports`, show confirmation with reference number
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 12.5 Enhance AI consultation and notifications pages
    - Update `apps/shop/src/app/(shop)/ai-consult/page.tsx` — chat interface using `chatWithPatient` AI service, disclaimer text, "ปรึกษาเภสัชกร" button when AI detects pharmacist-needed symptoms
    - Update `apps/shop/src/app/(shop)/notifications/page.tsx` — list notifications with read/unread status from `GET /v1/notifications`, tap to mark read and navigate to relevant page
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 12.6 Write property test for notification routing (Property 25)
    - **Property 25: Notification tap routes to correct page** — Notification with referenceType routes to correct detail page
    - **Validates: Requirements 15.5**
    - File: `apps/shop/src/__tests__/notification-routing.property.spec.ts`

- [x] 13. Checkpoint — Shop LIFF pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Admin Dashboard — Promotions Management Pages
  - [x] 14.1 Create promotions management pages
    - Create `apps/admin/src/app/dashboard/promotions/page.tsx` — list promotions with columns: code, name, type, status, usage count/limit, date range; activate/deactivate toggle
    - Create `apps/admin/src/app/dashboard/promotions/new/page.tsx` — form with type selector, value input, date range picker, product/category targeting, tier requirement, usage limits
    - Create `apps/admin/src/app/dashboard/promotions/[id]/page.tsx` — edit promotion form
    - Create API helper in `apps/admin/src/lib/promotions.ts` for staff promotion endpoints
    - Display usage statistics: total usage, remaining uses, revenue impact
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 15. Admin Dashboard — Content Management Pages
  - [x] 15.1 Create content management pages
    - Create `apps/admin/src/app/dashboard/content/page.tsx` — list articles with title, type, status, author, publish date, view count
    - Create `apps/admin/src/app/dashboard/content/new/page.tsx` — content editor with rich text editor for body, SEO fields (metaTitle, metaDescription, seoKeywords), tag management, featured image upload, related product selection, publish/unpublish toggle
    - Create `apps/admin/src/app/dashboard/content/[id]/page.tsx` — edit content (reuse editor component)
    - Create API helper in `apps/admin/src/lib/content.ts` for staff content endpoints
    - _Requirements: 16.1, 16.2_

- [x] 16. Admin Dashboard — Complaints Management Pages
  - [x] 16.1 Create complaints management pages
    - Create `apps/admin/src/app/dashboard/complaints/page.tsx` — list complaints with filters for status, severity, category; columns: patient name, category, severity, status, created date
    - Create `apps/admin/src/app/dashboard/complaints/[id]/page.tsx` — complaint detail with patient info, related order, images, resolution form
    - Create API helper in `apps/admin/src/lib/complaints.ts` for staff complaint endpoints
    - _Requirements: 6.3, 6.4_

- [x] 17. Admin Dashboard — Enhanced Reports & Analytics
  - [x] 17.1 Enhance reports page with interactive charts
    - Update `apps/admin/src/app/dashboard/reports/page.tsx` — add Recharts charts for daily sales trends, prescription volume, top products
    - Add loyalty/promotions report tab: active promotions performance, coupon usage rates, points earned/redeemed, tier distribution
    - Add patient demographics report tab: new registrations over time, geographic distribution by province, age/gender breakdown
    - Add inventory health report tab: low-stock alerts, expiry warnings
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ]* 17.2 Write property test for report demographics invariant (Property 26)
    - **Property 26: Report demographic invariant** — Sum of age group counts = total patient count; sum of gender counts = total patient count
    - **Validates: Requirements 17.3**
    - File: `apps/admin/src/__tests__/report-demographics.property.spec.ts`

  - [ ]* 17.3 Write property test for promotion report metrics (Property 27)
    - **Property 27: Promotion report metrics correctness** — remainingUses = usageLimit - usageCount; usageRate = usageCount / usageLimit
    - **Validates: Requirements 17.2**
    - File: `apps/admin/src/__tests__/promotion-metrics.property.spec.ts`

  - [x] 17.4 Implement CSV export for all report types
    - Add CSV export button to each report tab
    - Generate CSV with correct column names, row values, numeric precision
    - _Requirements: 17.5_

  - [ ]* 17.5 Write property test for CSV export (Property 28)
    - **Property 28: CSV export round-trip** — Export to CSV and parse back preserves all data values
    - **Validates: Requirements 17.5**
    - File: `apps/admin/src/__tests__/csv-export.property.spec.ts`

- [x] 18. Admin Dashboard — Messaging & Settings Enhancement
  - [x] 18.1 Enhance messaging and settings pages
    - Update `apps/admin/src/app/dashboard/messaging/page.tsx` — integrate with BroadcastService for creating, scheduling, monitoring LINE broadcast campaigns
    - Update `apps/admin/src/app/dashboard/settings/page.tsx` — system config: LINE channel settings, payment gateway settings, delivery fee rules, notification preferences
    - _Requirements: 16.3, 16.4_

- [x] 19. Admin Dashboard — WebSocket Integration
  - [x] 19.1 Integrate Socket.IO client in admin dashboard
    - Add Socket.IO client connection in admin layout with JWT auth token
    - Listen for `prescription:update`, `order:update`, `chat:message`, `complaint:new` events
    - Update prescription queue count, order list, inbox badge, complaint count in real-time without page refresh
    - _Requirements: 8.7_

- [x] 20. Checkpoint — Admin dashboard pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. LINE Module — Webhook Routing Enhancement
  - [x] 21.1 Enhance LINE webhook routing
    - Update `LineWebhookService` to route text messages: AI chatbot response first → fallback to staff inbox if AI confidence below threshold
    - Update `LineWebhookService` to route image messages: attempt prescription OCR → create prescription record if detected → route to staff inbox otherwise
    - Handle follow event: send welcome Flex Message with quick action buttons + registration prompt
    - _Requirements: 18.1, 18.2, 18.5_

  - [ ]* 21.2 Write property test for LINE text message routing (Property 29)
    - **Property 29: LINE text message routing** — AI chatbot first, fallback to staff inbox if confidence below threshold
    - **Validates: Requirements 18.1**
    - File: `apps/api/src/modules/line/line-webhook.property.spec.ts`

  - [ ]* 21.3 Write property test for LINE image message routing (Property 30)
    - **Property 30: LINE image message routing** — OCR detects prescription → create record; otherwise → staff inbox
    - **Validates: Requirements 18.2**
    - File: `apps/api/src/modules/line/line-webhook.property.spec.ts`

- [x] 22. LINE Module — Flex Message Templates
  - [x] 22.1 Implement 7 Flex Message templates
    - Add to `FlexMessageService`: order confirmation, payment QR, prescription status, delivery tracking, medication reminder, promotional message, welcome message templates
    - Each template generates valid LINE Flex Message JSON with relevant data fields
    - _Requirements: 18.3, 18.4, 18.5_

  - [ ]* 22.2 Write property test for Flex Message completeness (Property 31)
    - **Property 31: Flex Message template completeness** — Each event type generates valid LINE Flex Message JSON with relevant data fields
    - **Validates: Requirements 18.3**
    - File: `apps/api/src/modules/line/flex-message.property.spec.ts`

- [x] 23. Final Checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties using fast-check (31 properties total)
- All existing DB schemas are reused — no migrations needed
- Backend modules follow NestJS pattern: module → controller → service → DTOs
- Frontend follows existing patterns: SWR + useApi (admin), Zustand stores (shop)
