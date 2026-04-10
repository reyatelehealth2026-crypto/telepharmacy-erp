# LINE Customer-First CRM / Inbox / Webhook Roadmap

แผนนี้ยกระดับ `telepharmacy-erp` จาก LINE webhook/inbox แบบพื้นฐาน ไปสู่ customer-first onboarding + CRM + inbox workflow + webhook observability โดย reuse โครงสร้าง `patient/chat` เดิม และหยิบ pattern ที่พิสูจน์แล้วจาก `odoo` มาใช้แบบค่อยเป็นค่อยไป

## 1. เป้าหมายของแผน

- ทำให้ flow `ลูกค้าแอด LINE → รับ welcome → เลือกเส้นทาง → link/register → ส่งข้อความแรก → ถูก route ถูกคน` เป็นประสบการณ์ที่ต่อเนื่องและวัดผลได้
- เพิ่มฟีเจอร์ย่อยฝั่ง CRM/inbox ที่ยังไม่มีจริงใน `telepharmacy-erp` โดยไม่พอร์ตระบบ `odoo` มาทั้งก้อน
- วาง phase implementation ที่เริ่มจาก **customer journey first** แล้วค่อยต่อยอดไปยัง inbox CRM แลมี real-time event สำหรับ `chat:message` แต่ inbox UI ยังใช้ polling เป็นหลัก

### 2.2 Frontend / Admin / Shop

- ะ webhook reliability
- เตรียมงานให้พร้อมสำหรับ execution แบบ `subagent-driven-development`

## 2. สิ่งที่มีอยู่แล้วใน `telepharmacy-erp`

### 2.1 Backend / LINE flow

- `apps/api/src/modules/line/line.controller.ts`
  - มี webhook endpoint และตอบ `200` แบบ fire-and-forget
- `apps/api/src/modules/line/services/line-webhook.service.ts`
  - รับ `follow`, `message`, `postback`
  - auto create patient skeleton ผ่าน `findOrCreatePatient()`
  - สร้าง `chat_session` และ `chat_messages`
  - มี rule-based replies + AI fallback + sentiment escalation
- `apps/api/src/modules/line/services/inbox.service.ts`
  - มี `list/get/reply/assign/resolve`
  - ยังไม่มี unread, internal note, quick reply, tags, follow-up, reopen, SLA
- `apps/api/src/modules/auth/auth.service.ts`
  - มี `requestAccountLink()` และ `confirmAccountLink()` อยู่แล้ว
- ## `apps/api/src/modules/events/events.service.ts`
- `apps/admin/src/app/dashboard/inbox/page.tsx`
  - มี session list + chat panel + assign + resolve + reply
  - ยังเป็น inbox แบบ minimal
- `apps/admin/src/app/dashboard/patients/[id]/page.tsx`
  - มี patient profile, allergies, diseases, medications, rx history, adherence, loyalty
  - ยังไม่มี customer timeline / CRM activity / next action
- `apps/shop/src/app/(shop)/register/page.tsx`
  - มี register flow ผ่าน LIFF
- `apps/shop/src/app/(shop)/onboarding/health/page.tsx`
  - มี onboarding health step แล้ว
- `apps/shop/src/app/(shop)/profile/notifications/page.tsx`
  - มี notification preferences

### 2.3 Schema ที่ reuse ได้

- `packages/db/src/schema/chat.ts`
  - `chat_sessions` มี `assignedTo`, `assignedAt`, `resolvedAt`, `firstResponseAt`, `avgResponseTime`
  - `chat_messages` มี `role`, `messageType`, `attachments`, `sentByStaff`, `sentiment`
- `packages/db/src/schema/patients.ts`
  - `patients` มี `lineUserId`, `lineLinkedAt`, profile + clinical data
- `packages/db/src/schema/campaigns.ts`
  - มี `account_link_tokens`, `broadcast_campaigns`, `notification_preferences`

## 3. Pattern สำคัญที่ควรยืมจาก `odoo`

- `classes/CRMManager.php`
  - tags, drip campaign, auto-assign rules
- `classes/InboxService.php`
  - unread count, filters, tag filter, assignment state, multi-assignee concept
- `classes/CRMDashboardService.php`
  - customer list, tags, customer 360, customer timeline
- `classes/OdooCustomerDashboardService.php`
  - timeline summary จาก webhook logs
- `classes/WebhookLoggingService.php`
  - event log, duplicate detection, retry, DLQ, stats
- `api/odoo-webhooks-dashboard.php`
  - monitoring endpoints เช่น `list`, `detail`, `webhook_stats_mini`, `dlq_list`, `dlq_retry`, `customer_360`, `order_timeline`

## 4. Gap analysis: ของที่ยังไม่มีจริงใน `telepharmacy-erp`


| Area                      | มีแล้ว                                                      | ยังขาด                                                                                         |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Customer entry            | follow event, welcome flex, menu, basic registration prompt | stateful onboarding, persona branching, existing-account linking UX, onboarding funnel metrics |
| First message routing     | save session/message, AI fallback, staff inbox fallback     | explicit entry intent, handoff reason, queue status, urgency, expected response messaging      |
| Inbox ops                 | assign, resolve, reply                                      | unread, reopen, internal notes, quick replies, tags, follow-up due date, queue filters, SLA    |
| CRM context               | patient profile, rx history, adherence, loyalty             | customer 360 in inbox, activity timeline, next action, support history summary                 |
| Webhook reliability       | signature guard, async processing                           | raw event log, dedupe/idempotency, searchable errors, replay/retry, mini dashboard             |
| Outbound LINE reliability | push/reply API wrapper + logger                             | persisted failure records, retry classification, operator visibility                           |


## 5. Risk / discovery ที่สำคัญที่สุด

### 5.1 `stub patient` ชนกับ `link existing account`

ปัจจุบันมี behavior ดังนี้

- `follow` / `lineLogin()` สร้าง patient skeleton ที่ bind `lineUserId` ทันที
- `confirmAccountLink()` จะ reject ถ้า `lineUserId` นี้ bind อยู่กับ patient คนอื่นแล้ว

ผลคือ customer flow แบบนี้มีโอกาสพัง:

1. ลูกค้าแอด LINE
2. ระบบสร้าง skeleton patient จาก `lineUserId`
3. ลูกค้าจริงต้องการ link กับ account เดิมที่เคยมีอยู่ในระบบ
4. `confirmAccountLink()` มองว่า LINE นี้ถูก bind ไปแล้ว จึง conflict

### 5.2 ข้อสรุปเชิงออกแบบ

Phase แรกต้องมี **claim / rebind strategy** ชัดเจน ไม่อย่างนั้น feature “เชื่อมบัญชีเดิม” จะ UX ไม่จบจริง

แนวทางที่แนะนำ:

- ถ้า target patient เป็นเจ้าของตัวจริง และ record ที่ bind `lineUserId` เป็นเพียง skeleton ที่ยังไม่ registered
  - อนุญาต `rebind lineUserId` ไปยัง target patient
  - mark skeleton เป็น merged / archived / soft-deleted หรือ clear `lineUserId`
- ถ้า skeleton มีข้อมูล clinical/transaction แล้ว
  - block อัตโนมัติ และส่งเข้าสู่ staff-assisted merge flow

นี่คือ requirement เชิง business + data integrity ที่ต้อง implement ก่อน/พร้อม account linking UX

## 6. Design options

### Option A — Recommended: Extend patient/chat foundation แบบ additive

ใช้ `patients` เป็น source of truth ต่อไป, ใช้ `chat_sessions` เป็น conversation source of truth ต่อไป, แล้วเพิ่ม table/fields เท่าที่จำเป็นสำหรับ onboarding, CRM context, webhook logging

**ข้อดี**

- ได้ quick wins เร็ว
- impact ต่ำกว่าการพอร์ต CRM model ใหม่
- ใช้กับ UI/route ที่มีอยู่แล้วได้ทันที
- เหมาะกับ `subagent-driven-development` เพราะแยก task ได้ชัด

**ข้อเสีย**

- ต้องออกแบบ state ให้ดี ไม่ให้ logic ไปกระจุกใน `line-webhook.service.ts`

### Option B — พอร์ต model แบบ `odoo` มาเต็ม

แยก user/conversation/tag/assignment/log/dashboard เป็นก้อนใหม่แบบ CRM เต็มรูปแบบ

**ข้อดี**

- feature parity ง่ายกว่าในระยะยาว

**ข้อเสีย**

- scope ใหญ่เกิน “ฟีเจอร์ย่อยๆ”
- data migration และ UX integration หนักเกินจำเป็น

### Option C — ทำ UI อย่างเดียว ไม่แตะ data model

เพิ่มปุ่ม/หน้าใหม่โดย reuse ของเดิมให้มากที่สุด

**ข้อดี**

- ทำเร็ว

**ข้อเสีย**

- แก้ปัญหา account linking conflict ไม่ได้
- unread/SLA/webhook observability ทำได้ไม่ครบ
- จะกลายเป็น UI patch มากกว่า solution

### Recommendation

เลือก **Option A**

## 7. Product design เป้าหมาย: customer flow ตั้งแต่แอด LINE

### 7.1 Target journey

1. ลูกค้า `follow` LINE OA
2. ระบบ resolve contact state ว่าเป็น
  - `new_unregistered`
  - `existing_registered_unlinked`
  - `linked_returning`
  - `stub_unfinished`
3. ส่ง welcome experience ที่ต่างกันตาม state
4. ลูกค้าเลือก action หลัก
  - สมัครใหม่
  - เชื่อมบัญชีเดิม
  - ปรึกษาเภสัชกร
  - อัปโหลดใบสั่งยา
  - ดูสินค้า / ติดตามออเดอร์
5. เมื่อมีข้อความแรก ระบบทำ triage
  - self-service
  - AI-assisted
  - needs-human
6. สร้าง/อัปเดต session พร้อม metadata ที่ staff ใช้ทำงานได้ทันที
7. ถ้าต้อง handoff ให้คน ระบบต้องแจ้ง expectation เช่น “เภสัชกรจะตอบกลับโดยเร็วที่สุด” พร้อม queue status
8. ทุก event สำคัญถูก log เพื่อ debug, audit, replay ได้

### 7.2 สิ่งที่ผู้ใช้ควรรู้สึก

- ไม่ต้องเริ่มใหม่ทุกครั้งที่แอด LINE
- ถ้ามี account เดิม ต้องเชื่อมได้เองโดยไม่งง
- ถ้าถามเรื่องยา/ปรึกษา ต้องรู้ว่า bot กำลังช่วยอยู่หรือส่งต่อคนแล้ว
- ถ้ามีเรื่องที่ sensitive หรือ urgent ต้องถูกดันเข้า staff queue เร็ว

## 8. Detailed requirements

### R1. Contact onboarding & identity

- `R1.1` ระบบต้องเก็บสถานะ onboarding ของ contact ได้
- `R1.2` follow ครั้งแรกต้องแยกได้ว่าควรไปทาง register, link, หรือ returning menu
- `R1.3` welcome message ต้องมี CTA ที่ชัดอย่างน้อย 4 ทาง: register, link existing, consult, rx upload
- `R1.4` incomplete onboarding ต้อง resume ได้ ไม่เริ่มใหม่ทุกครั้ง
- `R1.5` existing account linking ต้องรองรับ rebind/claim กรณีมี skeleton record
- `R1.6` ต้องวัด funnel ได้: follow → click CTA → register/link success → first meaningful message

### R2. First-message triage & routing

- `R2.1` ข้อความแรกต้องถูก map เป็น `entryIntent`
- `R2.2` ต้องมี `handoffReason` เมื่อ AI/rules ตอบไม่พอ
- `R2.3` ต้องมี `queueStatus` อย่างน้อย `self_service`, `needs_human`, `assigned`, `resolved`
- `R2.4` ต้องมี `priority` อย่างน้อย `normal`, `urgent`
- `R2.5` ต้องส่ง acknowledgement ที่เหมาะกับเส้นทางนั้น
- `R2.6` duplicate events ต้องไม่สร้าง session/message ซ้ำ

### R3. Inbox CRM (phase 2)

- `R3.1` list view ต้อง filter ได้มากกว่า `active/resolved`
- `R3.2` ต้องมี unread/awaiting-reply signal
- `R3.3` ต้องมี internal note ที่ลูกค้าไม่เห็น
- `R3.4` ต้องมี quick replies / canned responses
- `R3.5` ต้องมี tags/labels สำหรับ segmentation และ workflow
- `R3.6` ต้องมี follow-up date / next action
- `R3.7` resolved session ต้อง reopen ได้

### R4. Customer 360 / timeline

- `R4.1` inbox ต้องมี patient summary แบบเปิดดูเร็ว
- `R4.2` timeline ต้องรวมอย่างน้อย chat, prescriptions, orders, consultations, complaints, adherence/notifications ที่สำคัญ
- `R4.3` staff ต้องเห็น linking status, onboarding stage, latest clinical context
- `R4.4` patient page และ inbox ควร share data model เดียวกันเพื่อไม่ให้ข้อมูลซ้ำ logic

### R5. Webhook observability & recovery

- `R5.1` inbound LINE events ต้องถูก persist พร้อม status
- `R5.2` ต้องมี dedupe key / idempotency policy
- `R5.3` ต้อง query recent failures ได้
- `R5.4` ต้องดู payload/detail ได้จาก admin tooling
- `R5.5` ต้อง replay failed event ได้อย่างปลอดภัย
- `R5.6` ต้องแยก `received`, `processing`, `processed`, `failed`, `duplicate` ได้
- `R5.7` phase หลังจากนั้นค่อยต่อยอด retry queue/DLQ สำหรับ internal reprocessing และ outbound failures

## 9. Non-functional requirements

- webhook ต้องตอบ `200` เร็วและไม่ block ด้วยงานหนัก
- ห้าม log access token หรือข้อมูลลับจาก LINE/LIFF
- ทุก staff action สำคัญต้องมี actor + timestamp
- API response สำหรับ tooling ใหม่ควรมี shape คงที่และ timestamps เป็น ISO 8601
- feature ใหม่ต้องเป็น additive migration ไม่ทำลาย flow เก่า
- Thai UI labels, internal naming เป็น English

## 10. Proposed data model

## 10.1 Extend `chat_sessions`

แนะนำเพิ่ม field ต่อไปนี้

- `entryPoint` — `follow`, `message`, `postback`, `rich_menu`, `liff`
- `entryIntent` — `consult`, `register`, `link_account`, `rx_upload`, `order_tracking`, `product_search`, `other`
- `queueStatus` — `self_service`, `needs_human`, `assigned`, `resolved`
- `priority` — `normal`, `urgent`
- `lastInboundAt`
- `lastOutboundAt`
- `lastStaffReadAt`
- `followUpAt` (phase 2)
- `reopenedAt` (phase 2)

หมายเหตุ: field อย่าง `assignedAt`, `firstResponseAt`, `resolvedAt` มีอยู่แล้ว ให้ reuse ก่อน

## 10.2 Extend `chat_messages`

แนะนำเพิ่ม

- `kind` — `message`, `internal_note`, `system_event`
- `metadata` — jsonb สำหรับ intent/routing/debug info
- `deliveryStatus` — เฉพาะ outbound ที่อยาก track ภายหลัง

เหตุผล: role เดิม (`user`, `bot`, `pharmacist`, `system`) ยังไม่พอสำหรับ internal note และ operational events

## 10.3 New table: `line_contact_journeys`

ใช้เก็บ onboarding/customer entry state โดยไม่ยัดทุกอย่างลง `patients`

Suggested fields

- `id`
- `patientId`
- `lineUserId`
- `state`
- `currentStep`
- `sourceEventId`
- `startedAt`
- `completedAt`
- `metadata`

## 10.4 New tables: `patient_tags`, `patient_tag_assignments`

ยืมแนวคิดจาก `odoo` แต่ผูกกับ patient-centric model ของระบบนี้

## 10.5 New table: `line_webhook_events`

Suggested fields

- `id`
- `providerEventKey`
- `dedupeKey`
- `eventType`
- `lineUserId`
- `patientId`
- `sessionId`
- `status`
- `payload`
- `errorMessage`
- `receivedAt`
- `processedAt`
- `replayedFromEventId`

## 10.6 New table: `chat_follow_ups` (phase 2)

ใช้สำหรับ next action / callback / promised response

## 11. API / module design

## 11.1 Phase 1: reuse ของเดิมให้มากที่สุด

อัปเดต logic หลักใน

- `apps/api/src/modules/line/services/line-webhook.service.ts`
- `apps/api/src/modules/line/services/inbox.service.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/line/line-staff.controller.ts`

### ควรเพิ่ม service แยกออกจาก `line-webhook.service.ts`

- `LineContactJourneyService`
- `LineTriageService`
- `LineWebhookLogService`

เหตุผล: ลด god-service และทำให้แต่ละ task แยก subagent ได้ง่าย

## 11.2 Candidate endpoints

### Customer / public

- reuse `POST /auth/line/link/request`
- reuse `POST /auth/line/link/confirm`
- เพิ่ม LIFF landing/page สำหรับ link existing account แบบ end-to-end

### Staff / inbox

- extend `GET /staff/line/inbox`
  - filter by `queueStatus`, `priority`, `linkState`, `needsFollowUp`
- extend `GET /staff/line/inbox/:sessionId`
  - return customer context summary
- add `POST /staff/line/inbox/:sessionId/notes`
- add `PATCH /staff/line/inbox/:sessionId/reopen`
- add `PATCH /staff/line/inbox/:sessionId/follow-up`

### Staff / webhook monitor

- add `GET /staff/line/webhooks`
- add `GET /staff/line/webhooks/:id`
- add `POST /staff/line/webhooks/:id/replay`
- add `GET /staff/line/webhooks/stats/mini`

## 12. UI design

## 12.1 Customer-facing

### Welcome / add-friend flow

- ปรับ welcome message ให้มี stateful CTA มากกว่า menu ทั่วไป
- CTA ที่ควรมีทันที
  - `สมัครสมาชิก`
  - `เชื่อมบัญชีเดิม`
  - `ปรึกษาเภสัชกร`
  - `อัปโหลดใบสั่งยา`
  - `ดูร้านค้า`

### Link existing account UX

แนวทางที่แนะนำสำหรับ phase แรก

- ให้ลูกค้าเปิด LIFF page ที่รู้ `lineUserId`
- login / identify patient ใน web flow
- เรียก `requestAccountLink()`
- auto call `confirmAccountLink(token, lineUserId)` จากหน้าเดียวกัน
- จัดการ stub conflict ตาม rule ในข้อ 5

ข้อดี: reuse endpoint ที่มีอยู่แล้ว ไม่ต้องสร้าง OTP system ใหม่ใน phase แรก

## 12.2 Admin inbox

### Phase 1 minimal changes

- badge: `ใหม่`, `ยังไม่ลงทะเบียน`, `รอเชื่อมบัญชี`, `ต้องคนตอบ`, `ด่วน`
- header summary: patient name, phone, link state, entry intent
- chat panel: แสดง system events ที่สำคัญ เช่น `followed`, `handoff`, `link completed`

### Phase 2 richer inbox

- quick replies
- internal notes
- filters
- follow-up due badges
- customer 360 side panel / drawer

## 12.3 Webhook monitor UI

หน้าใหม่แนะนำ: `apps/admin/src/app/dashboard/line-webhooks/page.tsx`

ควรมี

- mini stats cards
- recent failures
- search by `lineUserId`, `eventType`, status
- payload detail drawer
- replay action

## 13. Phase plan

## Phase 0 — Domain alignment & safety rails

### Outcome

วาง state model, แก้ risk เรื่อง link conflict, เตรียม schema สำหรับ phase แรก

### Tasks

- define contact state model
- define dedupe/idempotency policy
- define stub-claim / rebind rules
- add schema/migration plan for `chat_sessions` metadata + `line_contact_journeys` + `line_webhook_events`
- split services จาก `line-webhook.service.ts`

### Acceptance

- ทุกคนในทีมตอบได้ว่า skeleton patient จะถูก merge/claim อย่างไร
- ไม่มี ambiguous state ระหว่าง `new`, `registered`, `linked`, `needs-human`

## Phase 1 — Customer flow first MVP

### Outcome

ลูกค้าแอด LINE มาแล้วเจอ flow ที่พาไป register/link/consult ได้จริง และข้อความแรกถูก route พร้อม context

### Tasks

- personalize follow/welcome flow ตาม contact state
- add link-existing journey โดย reuse existing auth endpoints
- capture `entryIntent`, `queueStatus`, `priority`, `handoffReason`
- create system events ใน chat เมื่อ onboarding/handoff เกิดขึ้น
- add minimal inbox badges + customer summary
- add webhook event persistence + duplicate-safe processing

### Acceptance

- follow ใหม่เห็น CTA ชัดเจน
- existing account link จบได้โดยไม่ต้องแก้ DB manual
- first message ที่ต้องคนตอบขึ้น inbox พร้อม badge/context
- duplicate follow/message/postback ไม่สร้าง session ซ้ำ

## Phase 2 — Inbox CRM workflow

### Outcome

staff ทำงานใน inbox ได้ลื่นขึ้นและไม่ต้องใช้ความจำล้วน

### Tasks

- unread model (`lastStaffReadAt` หรือ equivalent)
- internal notes
- quick replies / canned responses
- reopen session
- follow-up due date / next action
- basic tags/labels
- richer filtering in inbox list

### Acceptance

- staff แยกได้ว่าอันไหนยังไม่ได้ตอบ
- note ภายในไม่หลุดไปหาลูกค้า
- follow-up ที่นัดไว้สามารถค้นและปิดงานได้

## Phase 3 — Customer 360 mini + timeline

### Outcome

staff เห็นบริบทลูกค้าในจุดตอบแชท ไม่ต้องกระโดดหลายหน้า

### Tasks

- build `patient timeline` service
- aggregate chat, prescriptions, orders, consultations, complaints, adherence signals
- embed summary/drawer ใน inbox
- add patient next-action block

### Acceptance

- staff เปิดแชทแล้วเห็น clinical + commerce + support context ภายใน 1 หน้าจอ

## Phase 4 — Webhook observability & recovery

### Outcome

ทีมงาน debug LINE integration ได้เองและเห็นปัญหาก่อนลูกค้าร้อง

### Tasks

- event status detail page
- mini stats dashboard
- replay failed event
- search/filter failures
- optional outbound failure persistence + retry policy

### Acceptance

- failure ล่าสุดหาดูได้จาก UI
- replay event ได้แบบมี audit trail
- duplicate rate / failure trend พอดูได้แล้ว

## Phase 5 — Automation backlog (optional)

### Candidates

- drip follow-up หลัง register ไม่จบ
- auto-tag by intent/behavior
- pharmacist handoff SLA reminders
- segmented broadcast จาก onboarding state / tags

## 14. Suggested implementation bundles for `subagent-driven-development`

เรียง bundle ตาม dependency และลด file conflict

### Bundle A — Schema + domain state

- chat metadata
- contact journey table
- webhook event log table
- stub claim rules

### Bundle B — Welcome + linking journey

- follow/postback flow
- LIFF link page
- auth flow integration

### Bundle C — First-message triage + inbox badges

- triage service
- queue status/priority
- admin inbox list/header updates

### Bundle D — Inbox CRM workflow

- internal notes
- quick replies
- follow-up
- tags

### Bundle E — Customer 360

- timeline aggregation service
- inbox side panel
- patient timeline endpoint

### Bundle F — Webhook monitoring

- event list/detail/stats/replay
- admin monitor page

### Execution rule

สำหรับแต่ละ bundle ให้ใช้ flow แบบนี้

1. implementer subagent
2. spec reviewer subagent
3. code quality reviewer subagent
4. mark task complete

ห้ามรัน implementation subagents ที่แตะ file เดียวกันพร้อมกัน

## 15. Test / validation checklist

### Customer flow

- ลูกค้าใหม่ add LINE แล้วเข้า welcome flow ถูกต้อง
- ลูกค้าที่มี account เดิม link ได้สำเร็จ
- returning linked customer ได้ menu ที่เหมาะกว่า first-time user
- first message ถูก classify และ route ถูก queue

### Inbox

- assign / resolve flow เดิมไม่พัง
- reply จาก staff ยัง push ไป LINE ได้
- inbox badge/filter แสดงตรงกับ state จริง

### Webhook

- duplicate event ไม่สร้าง patient/session/message ซ้ำ
- failed processing ถูก log พร้อม detail
- replay แล้วไม่เกิด duplicate side effect

### Data integrity

- ไม่เกิด patient ซ้ำจาก link flow
- skeleton record ถูกจัดการตาม policy ที่กำหนด
- timestamps และ audit fields ถูกเขียนครบ

## 16. Out of scope สำหรับรอบแรก

- พอร์ต CRM deal/ticket แบบ `odoo` เต็มระบบ
- multi-platform inbox (Facebook/TikTok)
- campaign/drip automation เต็มรูปแบบ
- full outbound delivery analytics ระดับ enterprise
- OTP identity system ใหม่ ถ้า LIFF-based linking เพียงพอใน phase แรก

## 17. Recommendation สุดท้าย

เริ่ม implement ตามลำดับนี้

1. **Phase 0 + Phase 1 ก่อน**
  - เพราะแก้ปัญหาจริงที่กระทบลูกค้าเข้า LINE โดยตรง
2. **Phase 2 ต่อทันที**
  - เพื่อให้ทีมตอบแชททำงานได้จริง ไม่ใช่แค่รับงานเข้า
3. **Phase 3 และ 4 ตามมา**
  - customer 360 และ webhook observability จะยกระดับคุณภาพการดูแลและ debugging อย่างมาก

ถ้าต้องตัด scope ให้เล็กที่สุดสำหรับรอบแรก ให้ส่งมอบชุดนี้ก่อน

- welcome journey แบบใหม่
- safe account linking
- first-message triage metadata
- inbox badges + customer summary
- webhook event logging + dedupe