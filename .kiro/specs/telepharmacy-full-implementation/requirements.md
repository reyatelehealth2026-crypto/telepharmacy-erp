# Requirements Document — Telepharmacy ERP: Full Implementation ของส่วนที่ขาด

## Introduction

เอกสารนี้ระบุ requirements สำหรับการ implement ส่วนที่ยังขาดหายไปในระบบ LINE Telepharmacy ERP monorepo ครอบคลุม 8 โมดูลหลักที่ยังไม่มีหรือยังไม่สมบูรณ์ ได้แก่: Promotions Engine, Content/Health Articles CMS, Complaints System, Notification Push Engine, WebSocket Real-time Events, Customer Shop (LIFF) ส่วนที่ยังเป็น stub, Admin Dashboard ส่วนที่ยังไม่สมบูรณ์ และ Reports/Analytics ที่ยังขาด

## Glossary

- **System**: ระบบ LINE Telepharmacy ERP ทั้งหมด (Backend + Frontend)
- **API**: NestJS backend ที่ `apps/api`
- **Shop**: Customer LIFF app ที่ `apps/shop` (Next.js)
- **Admin**: Admin dashboard ที่ `apps/admin` (Next.js)
- **Promotions_Engine**: โมดูลจัดการโปรโมชั่น คูปอง ส่วนลด flash sale
- **Content_Module**: โมดูลจัดการบทความสุขภาพ FAQ และ content อื่นๆ
- **Complaints_Module**: โมดูลจัดการข้อร้องเรียนจากลูกค้า
- **Notification_Engine**: ระบบส่ง push notification ผ่าน LINE, BullMQ queue
- **WebSocket_Gateway**: NestJS WebSocket gateway สำหรับ real-time events
- **Patient**: ลูกค้า/ผู้ป่วยที่ใช้งานผ่าน LINE
- **Staff**: เจ้าหน้าที่ร้านยา (เภสัชกร, admin, CS)
- **LIFF**: LINE Front-end Framework สำหรับ web app ภายใน LINE
- **BullMQ**: Redis-based job queue สำหรับ background processing
- **Flex_Message**: LINE message format ที่แสดงผลแบบ rich card

---

## Requirements

### Requirement 1: Promotions Engine — Backend API

**User Story:** As a Staff, I want to create and manage promotions (coupon codes, percentage/fixed discounts, buy-X-get-Y, flash sales), so that I can drive sales and customer engagement.

#### Acceptance Criteria

1. THE Promotions_Engine SHALL provide CRUD endpoints for promotions at `/v1/staff/promotions` with fields matching the existing `promotions` database table (code, name, type, value, min order amount, max discount, usage limits, date range, status, tier requirement, product/category targeting).
2. WHEN a Staff creates a promotion with type `percentage_discount`, THE Promotions_Engine SHALL validate that `value` is between 1 and 100 and `maxDiscount` is provided.
3. WHEN a Staff creates a promotion with type `buy_x_get_y`, THE Promotions_Engine SHALL require `buyQuantity` and `getQuantity` fields.
4. WHEN a Patient submits a coupon code via `POST /v1/orders/validate-coupon`, THE Promotions_Engine SHALL verify the code exists, is active, has not exceeded usage limits, meets minimum order amount, meets tier requirements, and is within the valid date range.
5. IF a coupon code is invalid or expired, THEN THE Promotions_Engine SHALL return a descriptive error message in Thai indicating the specific reason for rejection.
6. WHEN an order is placed with a valid coupon, THE Promotions_Engine SHALL increment the `usageCount` of the promotion and record the discount applied to the order.
7. THE Promotions_Engine SHALL support filtering promotions by status, type, and date range in the list endpoint.


### Requirement 2: Promotions Engine — Admin Dashboard UI

**User Story:** As a Staff, I want to manage promotions from the admin dashboard, so that I can create, edit, activate, and monitor promotions without using the API directly.

#### Acceptance Criteria

1. THE Admin SHALL provide a promotions management page at `/dashboard/promotions` listing all promotions with columns: code, name, type, status, usage count/limit, date range.
2. WHEN a Staff clicks "สร้างโปรโมชั่น", THE Admin SHALL display a form with all promotion fields including type selector, value input, date range picker, product/category targeting, tier requirement, and usage limits.
3. WHEN a Staff activates or deactivates a promotion, THE Admin SHALL call the API to update the promotion status and reflect the change immediately in the list.
4. THE Admin SHALL display promotion usage statistics including total usage count, remaining uses, and revenue impact.

---

### Requirement 3: Content/Health Articles CMS — Backend API

**User Story:** As a Staff, I want to create and publish health articles and FAQ content, so that Patients can access reliable health information through the shop.

#### Acceptance Criteria

1. THE Content_Module SHALL provide CRUD endpoints at `/v1/staff/content` for creating, updating, listing, and deleting content items using the existing `content` database table.
2. THE Content_Module SHALL support content types: `health_article`, `product_review`, `faq`, `drug_info`, and `promotion_banner` as defined in the `contentTypeEnum`.
3. WHEN a Staff publishes an article, THE Content_Module SHALL set the `publishedAt` timestamp and change status to `published`.
4. THE Content_Module SHALL provide a public endpoint at `/v1/content` for Patients to browse published articles with pagination, filtering by type and tags, and full-text search on title and body.
5. WHEN a Patient views an article, THE Content_Module SHALL increment the `viewCount` counter.
6. THE Content_Module SHALL support SEO fields: `metaTitle`, `metaDescription`, `seoKeywords`, and `slug` for each content item.
7. THE Content_Module SHALL support relating articles to products via the `relatedProductIds` field.

---

### Requirement 4: Content/Health Articles — Shop UI

**User Story:** As a Patient, I want to browse health articles and drug information in the shop, so that I can learn about medications and health topics.

#### Acceptance Criteria

1. THE Shop SHALL provide a health articles listing page at `/articles` displaying published articles with title, excerpt, featured image, and publication date.
2. WHEN a Patient taps an article, THE Shop SHALL navigate to `/articles/[slug]` showing the full article body, related products, and share functionality.
3. THE Shop SHALL display health tips on the home page by fetching the latest 3 published articles from the Content_Module API instead of using hardcoded content.
4. THE Shop SHALL provide a search function within articles using the `q` query parameter.

---

### Requirement 5: Complaints System — Backend API

**User Story:** As a Patient, I want to submit complaints about orders or service, so that the pharmacy can resolve issues and improve service quality.

#### Acceptance Criteria

1. THE Complaints_Module SHALL provide a `POST /v1/complaints` endpoint for Patients to create complaints with fields: category, description, severity, images, and optional orderId or chatSessionId, using the existing `complaints` database table.
2. THE Complaints_Module SHALL provide a `GET /v1/complaints` endpoint for Patients to view their own complaint history with status tracking.
3. THE Complaints_Module SHALL provide staff endpoints at `/v1/staff/complaints` for listing, filtering (by status, severity, category), and resolving complaints.
4. WHEN a Staff resolves a complaint, THE Complaints_Module SHALL record the resolution text, resolvedBy staff ID, and resolvedAt timestamp.
5. WHEN a complaint status changes, THE Complaints_Module SHALL trigger a notification to the Patient via the Notification_Engine.

---

### Requirement 6: Complaints System — Shop & Admin UI

**User Story:** As a Patient, I want to submit and track complaints from the shop app, and as a Staff, I want to manage complaints from the admin dashboard.

#### Acceptance Criteria

1. THE Shop SHALL provide a complaint submission page at `/complaints/new` with a form for category selection, description text area, image upload (up to 5 images), and optional order reference.
2. THE Shop SHALL provide a complaints history page at `/complaints` showing all submitted complaints with status badges (open, in_progress, resolved, closed).
3. THE Admin SHALL provide a complaints management page at `/dashboard/complaints` listing all complaints with filters for status, severity, and category.
4. WHEN a Staff opens a complaint detail, THE Admin SHALL display the full complaint information, patient details, related order (if any), and a resolution form.

---

### Requirement 7: Notification Push Engine — Backend

**User Story:** As a System operator, I want automated notifications sent to Patients via LINE when important events occur (order status changes, prescription updates, medication reminders, promotions), so that Patients stay informed.

#### Acceptance Criteria

1. THE Notification_Engine SHALL provide a `NotificationSenderService` that creates notification records in the database and dispatches them via BullMQ queue for async processing.
2. THE Notification_Engine SHALL support sending notifications through the LINE channel using the existing `LineClientService.pushMessage` method with appropriate Flex Messages.
3. WHEN an order status changes (confirmed, shipped, delivered), THE Notification_Engine SHALL send a LINE push notification to the Patient with order details using the existing `FlexMessageService` order summary template.
4. WHEN a prescription status changes (approved, rejected, ready for pickup), THE Notification_Engine SHALL send a LINE push notification to the Patient with prescription status details.
5. IF a LINE push notification fails, THEN THE Notification_Engine SHALL retry up to `maxRetries` (default 3) times with exponential backoff, recording each attempt and error message.
6. THE Notification_Engine SHALL update the notification record with `sentAt`, `deliveredAt`, or `errorMessage` based on the delivery result.
7. THE Notification_Engine SHALL support notification preferences per Patient, respecting the `notificationPreferences` table to skip disabled notification types.

---

### Requirement 8: WebSocket Real-time Events Gateway

**User Story:** As a Staff, I want to receive real-time updates on the admin dashboard (new prescriptions in queue, order status changes, new chat messages, new complaints), so that I can respond promptly without refreshing the page.

#### Acceptance Criteria

1. THE WebSocket_Gateway SHALL implement a NestJS `@WebSocketGateway` at path `/ws` using Socket.IO adapter with JWT authentication via handshake token.
2. WHEN a new prescription is received or its status changes, THE WebSocket_Gateway SHALL emit a `prescription:update` event to all connected Staff clients with the prescription summary.
3. WHEN an order status changes, THE WebSocket_Gateway SHALL emit an `order:update` event to connected Staff clients.
4. WHEN a new chat message arrives from a Patient, THE WebSocket_Gateway SHALL emit a `chat:message` event to connected Staff clients handling the inbox.
5. WHEN a new complaint is submitted, THE WebSocket_Gateway SHALL emit a `complaint:new` event to connected Staff clients.
6. THE WebSocket_Gateway SHALL support room-based subscriptions so Staff can subscribe to specific event types (e.g., `room:prescriptions`, `room:orders`, `room:chat`).
7. THE Admin SHALL integrate Socket.IO client to listen for real-time events and update dashboard data (prescription queue count, order list, inbox badge) without full page refresh.


---

### Requirement 9: Customer Shop (LIFF) — Product Search & Listing

**User Story:** As a Patient, I want to search and browse products with filters, so that I can find the medications and health products I need.

#### Acceptance Criteria

1. THE Shop SHALL provide a search page at `/search` with a text input that queries the Product API using the `q` parameter and displays results with product cards.
2. WHEN a Patient types a search query, THE Shop SHALL debounce the input (300ms) and fetch results from `GET /v1/products` with the search term.
3. THE Shop SHALL support filtering search results by category, drug classification (OTC, dangerous drug, specially controlled), price range, and in-stock status.
4. THE Shop SHALL display product cards with: product name (Thai), brand, price, member price (if applicable), unit, stock status badge, and "requires prescription" indicator for dangerous/controlled drugs.
5. WHEN a Patient taps a product card, THE Shop SHALL navigate to `/product/[id]` showing full product details including description, dosage information, warnings, and related products.

---

### Requirement 10: Customer Shop (LIFF) — Prescription Upload & Status

**User Story:** As a Patient, I want to upload prescription images and track their verification status, so that I can order prescription medications.

#### Acceptance Criteria

1. THE Shop SHALL provide a prescription upload page at `/rx/upload` with camera capture and gallery selection supporting multiple images (up to 5).
2. WHEN a Patient uploads prescription images, THE Shop SHALL call `POST /v1/prescriptions` with the image URLs and display a confirmation with the generated RX number.
3. THE Shop SHALL provide a prescription status page at `/rx` listing all Patient prescriptions with status badges (received, AI processing, pharmacist reviewing, approved, rejected).
4. WHEN a Patient taps a prescription, THE Shop SHALL navigate to `/rx/[id]` showing prescription details, OCR results, pharmacist notes, and approved medication items.
5. IF a prescription is approved, THEN THE Shop SHALL display a "สั่งซื้อยาตามใบสั่ง" (Order prescription medications) button that adds the approved items to the cart.

---

### Requirement 11: Customer Shop (LIFF) — Order History & Tracking

**User Story:** As a Patient, I want to view my order history and track delivery status, so that I know when my medications will arrive.

#### Acceptance Criteria

1. THE Shop SHALL provide an orders page at `/orders` listing all Patient orders with order number, date, total amount, status badge, and item count.
2. WHEN a Patient taps an order, THE Shop SHALL navigate to `/orders/[id]` showing full order details: items, payment status, delivery tracking steps, and shipping information.
3. THE Shop SHALL display a visual tracking timeline showing order progression: confirmed → preparing → shipped → delivered.
4. WHEN an order has a tracking number, THE Shop SHALL display the tracking number and carrier name.
5. THE Shop SHALL support reordering by providing a "สั่งซื้อซ้ำ" (Reorder) button that adds the same items to the cart.

---

### Requirement 12: Customer Shop (LIFF) — Profile & Health Records

**User Story:** As a Patient, I want to manage my profile, health records, allergies, and chronic diseases, so that pharmacists have accurate information for drug safety checks.

#### Acceptance Criteria

1. THE Shop SHALL provide a profile page at `/profile` displaying Patient information: name, date of birth, gender, phone, address, and loyalty tier/points.
2. THE Shop SHALL provide an edit profile page at `/profile/edit` with a form to update personal information and address.
3. THE Shop SHALL provide an allergies management page at `/profile/allergies` where Patients can add, edit, and remove drug allergies with allergen name, reaction type, and severity.
4. THE Shop SHALL provide a chronic diseases page at `/profile/diseases` where Patients can manage their chronic disease records.
5. THE Shop SHALL provide a loyalty page at `/profile/loyalty` showing current points, tier status, points history, and available rewards.
6. THE Shop SHALL provide a KYC verification flow at `/profile/kyc` with steps: document upload, liveness check, and OTP verification for telemedicine eligibility.

---

### Requirement 13: Customer Shop (LIFF) — Consultation & Chat

**User Story:** As a Patient, I want to consult with a pharmacist via chat or video call, so that I can get professional pharmaceutical advice.

#### Acceptance Criteria

1. THE Shop SHALL provide a consultation page at `/consultation` where Patients can request a new consultation with a pharmacist, selecting consultation type (chat or video).
2. WHEN a Patient starts a chat consultation, THE Shop SHALL navigate to `/consultation/[id]` with a real-time chat interface showing message history and input field.
3. WHEN a Patient starts a video consultation, THE Shop SHALL navigate to `/consultation/[id]/video` integrating the Agora SDK for video calling with the pharmacist.
4. THE Shop SHALL require informed consent at `/consultation/[id]/consent` before starting a telemedicine consultation, as required by Thai Telemedicine Act B.E. 2569.
5. THE Shop SHALL provide a consultation history page at `/consultation/history` listing past consultations with date, pharmacist name, type, and summary.

---

### Requirement 14: Customer Shop (LIFF) — Medication Reminders & ADR Reporting

**User Story:** As a Patient, I want to manage medication reminders and report adverse drug reactions, so that I can maintain medication adherence and safety.

#### Acceptance Criteria

1. THE Shop SHALL provide a medication reminders page at `/medication-reminders` listing active reminders with medication name, dosage, schedule, and acknowledgment status.
2. WHEN a Patient acknowledges a reminder, THE Shop SHALL call the Adherence API to record the acknowledgment with timestamp.
3. THE Shop SHALL provide an ADR reporting page at `/adr-report` with a form for reporting adverse drug reactions including: drug name, reaction description, severity, onset date, and optional images.
4. WHEN a Patient submits an ADR report, THE Shop SHALL call `POST /v1/adr/reports` and display a confirmation with the report reference number.

---

### Requirement 15: Customer Shop (LIFF) — AI Consultation & Notifications

**User Story:** As a Patient, I want to use AI-powered symptom consultation and receive in-app notifications, so that I can get quick health guidance and stay updated.

#### Acceptance Criteria

1. THE Shop SHALL provide an AI consultation page at `/ai-consult` with a chat interface that uses the existing `chatWithPatient` AI service for symptom-based guidance.
2. THE Shop SHALL display AI responses with appropriate disclaimers that AI advice does not replace professional pharmacist consultation.
3. WHEN the AI detects symptoms requiring pharmacist attention, THE Shop SHALL display a prominent "ปรึกษาเภสัชกร" (Consult pharmacist) button linking to the consultation page.
4. THE Shop SHALL provide a notifications page at `/notifications` listing all Patient notifications with read/unread status, fetched from `GET /v1/notifications`.
5. WHEN a Patient taps a notification, THE Shop SHALL mark it as read and navigate to the relevant page (order detail, prescription status, consultation).

---

### Requirement 16: Admin Dashboard — Promotions & Content Management Pages

**User Story:** As a Staff, I want complete admin pages for promotions and content management, so that I can manage all aspects of the business from one dashboard.

#### Acceptance Criteria

1. THE Admin SHALL provide a content management page at `/dashboard/content` listing all articles with title, type, status, author, publish date, and view count.
2. THE Admin SHALL provide a content editor page at `/dashboard/content/new` and `/dashboard/content/[id]` with a rich text editor for article body, SEO fields, tag management, featured image upload, and related product selection.
3. THE Admin SHALL provide a messaging/broadcast page at `/dashboard/messaging` that integrates with the existing `BroadcastService` to create, schedule, and monitor LINE broadcast campaigns.
4. THE Admin SHALL provide a settings page at `/dashboard/settings` with system configuration options including: LINE channel settings, payment gateway settings, delivery fee rules, and notification preferences.

---

### Requirement 17: Admin Dashboard — Enhanced Reports & Analytics

**User Story:** As a Staff, I want comprehensive reports and analytics, so that I can make data-driven decisions about inventory, sales, and patient care.

#### Acceptance Criteria

1. THE Admin SHALL enhance the reports page at `/dashboard/reports` with interactive charts for daily sales trends, prescription volume, and top products using a charting library (e.g., Recharts).
2. THE Admin SHALL provide a loyalty/promotions report showing: active promotions performance, coupon usage rates, points earned/redeemed, and tier distribution.
3. THE Admin SHALL provide a patient demographics report showing: new patient registrations over time, geographic distribution by province, and age/gender breakdown.
4. THE Admin SHALL provide an inventory health report combining low-stock alerts and expiry warnings with actionable recommendations.
5. THE Admin SHALL support exporting report data to CSV format for all report types.

---

### Requirement 18: LINE Module — Complete Webhook & Flex Message Integration

**User Story:** As a System operator, I want the LINE module to handle all webhook events and send rich Flex Messages for key interactions, so that Patients have a seamless experience within LINE.

#### Acceptance Criteria

1. WHEN a Patient sends a text message via LINE, THE API SHALL route the message through the existing `LineWebhookService` to the AI chatbot for automated response, and fall back to the staff inbox if the AI cannot handle the query.
2. WHEN a Patient sends an image via LINE, THE API SHALL check if it is a prescription image (using OCR) and automatically create a prescription record, or route it to the staff inbox.
3. THE API SHALL send Flex Messages for: order confirmation, payment QR code, prescription status updates, delivery tracking updates, medication reminders, and promotional messages using the existing `FlexMessageService`.
4. THE API SHALL support Rich Menu management via the existing `RichMenuService` with menus for: สั่งซื้อยา (Order), ส่งใบสั่งยา (Upload Rx), ปรึกษาเภสัชกร (Consult), ติดตามออเดอร์ (Track Order), โปรไฟล์ (Profile).
5. WHEN a follow event is received (new friend), THE API SHALL send a welcome Flex Message with quick action buttons and prompt for patient registration.

