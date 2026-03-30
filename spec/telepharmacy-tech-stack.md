# LINE Telepharmacy ERP — Tech Stack Deep Dive

> **Version:** 1.0  
> **Date:** 2026-03-30  
> **Business Model:** B2C Retail Telepharmacy  
> **Status:** Recommendation — รอตัดสินใจ

---

## 1. Recommendation Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED STACK                         │
│                                                              │
│  Backend:      NestJS 11 (Node.js + TypeScript)             │
│  ORM:          Drizzle ORM                                   │
│  Database:     PostgreSQL 16                                 │
│  Cache:        Redis 7                                       │
│  Queue:        BullMQ (Redis-based)                          │
│  Search:       Meilisearch                                   │
│  Admin UI:     Next.js 15 (React 19)                         │
│  LINE Front:   LIFF + Flex Messages                          │
│  AI/OCR:       Gemini 2.5 Pro (Vision)                       │
│  Payment:      Omise + PromptPay                              │
│  Shipping:     Kerry / Flash API                             │
│  Storage:      MinIO (self-hosted S3)                        │
│  Monitoring:   Grafana + Prometheus + Loki                    │
│  CI/CD:        GitHub Actions                                │
│  Container:    Docker + Docker Compose                       │
│  Reverse Proxy: Traefik                                      │
│  Server:       Alibaba Cloud ECS (ขยายได้)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Framework — ทำไมต้อง NestJS?

### 2.1 Comparison

| Criteria | **NestJS** | Laravel | FastAPI |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | PHP (FrankenPHP) | Python |
| **Language** | TypeScript ✅ | PHP | Python |
| **Performance** | 4,332 req/s (P95: 39ms) ⚡ | ~1,400 req/s | 2,471 req/s |
| **Architecture** | Modular, DI, OOP | MVC, Service | Router-based |
| **Real-time** | WebSocket built-in ✅ | Laravel Echo (extra) | WebSockets (extra) |
| **LINE SDK** | Official TS SDK ✅ | PHP SDK | Community |
| **AI Integration** | Excellent (Vercel AI SDK) ✅ | Good | **Best** (native Python) |
| **Type Safety** | Full TypeScript ✅ | Partial | Good (Pydantic) |
| **Team Skill** | ต้องเรียนรู้ | **รู้อยู่แล้ว** ✅ | ต้องเรียนรู้ |
| **Ecosystem** | Growing fast | Huge | Growing |
| **Hiring** | Easy (TS dev) | Easy (TH) | Medium |
| **Microservices** | Built-in support ✅ | Octane (limited) | FastAPI native |
| **Testing** | Jest built-in ✅ | PHPUnit | Pytest |

### 2.2 Benchmark (จาก okami101.io, 2026)

```
Requests/second (higher = better):
NestJS    ████████████████████████████████████████████████ 4,332
FastAPI   ██████████████████████████████████████████ 2,471
Laravel   ████████████████████████ 1,378

Response time P95 (lower = better):
NestJS    ████████████ 39ms
FastAPI   ██████████████████████████ 114ms
Laravel   ████████████████████████████████████ 158ms
```

### 2.3 ทำไม NestJS เหมาะกับ Telepharmacy B2C

| เหตุผล | รายละเอียด |
|--------|------------|
| **Real-time** | LINE messages, notification push, pharmacist queue — ต้อง WebSocket |
| **TypeScript** | Type safety ตลอด stack — frontend + backend ใช้ภาษาเดียวกัน |
| **Modular** | แยก module ง่าย (Patient, Prescription, Order, Inventory, AI) |
| **Scalability** | รับ concurrent 200-1000+ users ได้ดีกว่า PHP |
| **LINE SDK** | Official `@line/bot-sdk` เป็น TypeScript อยู่แล้ว |
| **Vercel AI SDK** | integrate กับ Gemini/OpenAI ได้ง่ายมาก |
| **Next.js Sync** | Admin frontend ใช้ Next.js → share types กับ backend ได้ |

### 2.4 ทางเลือก: Laravel (ถ้าอยากใช้ PHP)

ถ้าทีมรู้ PHP ดีกว่าและอยากลด learning curve:

| Pros | Cons |
|------|------|
| ทีมรู้อยู่แล้ว | Performance ต่ำกว่า ~3x |
| Ecosystem ใหญ่ | Real-time ต้องเพิ่ม Echo/Pusher |
| Laravel Scout (Meilisearch) | AI integration ไม่สะดวกเท่า Node |
| Livewire (ไม่ต้องเขียน React) | Microservices ยากกว่า |
| พัฒนาเร็วกว่า | TypeScript coverage ไม่เต็ม |

**คำแนะนำ:** ถ้าจะเริ่มโปรเจคใหม่ตั้งแต่ศูนย์ → **NestJS** ดีกว่า แต่ถ้าอยาก iterate เร็วด้วย PHP ที่รู้อยู่ → **Laravel** ก็ใช้ได้

---

## 3. ORM — Drizzle ORM

### 3.1 Comparison

| Criteria | **Drizzle** | Prisma 7 | TypeORM |
|----------|------------|----------|---------|
| **Bundle Size** | **7.4 KB** ⚡ | 1.6 MB | ~300 KB |
| **Dependencies** | **Zero** ⚡ | Many | Many |
| **Performance** | **4,600 req/s** ⚡ | ~3,000 req/s | ~1,500 req/s |
| **Type Safety** | Instant inference ✅ | Generate step | Manual |
| **SQL Control** | **Full visibility** ✅ | Abstract | Mixed |
| **Cold Start** | **~50ms** ⚡ | ~200ms | ~300ms |
| **Learning Curve** | SQL knowledge | Easy (DSL) | Moderate |
| **Migrations** | SQL generation | Migration files | CLI tooling |
| **NestJS Integration** | Official ✅ | Community | Official |
| **PostgreSQL** | Full support ✅ | Full support | Full support |
| **Maturity** | Newer (growing fast) | Mature | Very mature |

### 3.2 ตัวอย่าง Drizzle Schema

```typescript
// schema/patients.ts
import { pgTable, uuid, varchar, text, date, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineUserId: varchar('line_user_id', { length: 50 }).notNull().unique(),
  prefix: varchar('prefix', { length: 10 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  birthDate: date('birth_date').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  province: varchar('province', { length: 50 }),
  postalCode: varchar('postal_code', { length: 10 }),
  allergies: jsonb('allergies').$type<DrugAllergy[]>(),
  chronicDiseases: jsonb('chronic_diseases').$type<string[]>(),
  currentMedications: jsonb('current_medications').$type<CurrentMedication[]>(),
  isPregnant: boolean('is_pregnant').default(false),
  isBreastfeeding: boolean('is_breastfeeding').default(false),
  pdpaConsentAt: timestamp('pdpa_consent_at'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ตัวอย่าง Query
const result = await db
  .select()
  .from(patients)
  .where(eq(patients.lineUserId, 'U1234567890'));

// ดึงพร้อม relation
const patientWithRx = await db
  .select()
  .from(patients)
  .leftJoin(prescriptions, eq(patients.id, prescriptions.patientId))
  .where(eq(patients.id, patientId));
```

### 3.3 ทำไม Drizzle

- **เร็วที่สุด** — 4,600 req/s, bundle 7.4 KB
- **SQL-like syntax** — ถ้ารู้ SQL ก็รู้ Drizzle แล้ว
- **Type safety เต็ม** — ไม่ต้อง generate step แบบ Prisma
- **PostgreSQL features** — JSONB, full-text search, generated columns
- **ง่ายกับ NestJS** — official integration

---

## 4. Database — PostgreSQL 16

### 4.1 ทำไมไม่ใช้ MySQL ที่มีอยู่

| Feature | PostgreSQL | MySQL (MariaDB) |
|---------|-----------|-----------------|
| **JSON Support** | JSONB (indexed, queryable) ⚡ | JSON (limited) |
| **Full-Text Search (Thai)** | Built-in ✅ | Limited |
| **Array Type** | Native ✅ | No |
| **UUID Type** | Native ✅ | CHAR(36) |
| **ENUM** | Native ✅ | ENUM |
| **CTE (WITH clause)** | Full support ✅ | Recursive only |
| **Window Functions** | Full ✅ | Full ✅ |
| **Row-Level Security** | Yes ✅ | No |
| **Partitioning** | Native, declarative ✅ | Basic |
| **Extensions** | PostGIS, pg_trgm, etc. | Limited |
| **Drug Data** | JSONB เก็บ drug interaction rules ได้ดี | ยากกว่า |

### 4.2 สิ่งที่ PostgreSQL ทำดีกว่าสำหรับ Telepharmacy

```sql
-- 1. JSONB สำหรับ Drug Interaction Rules (flexible schema)
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY,
  drug_a_id UUID REFERENCES drugs(id),
  drug_b_id UUID REFERENCES drugs(id),
  severity VARCHAR(20) NOT NULL, -- contraindicated, major, moderate, minor
  mechanism TEXT,
  clinical_effect TEXT,
  management TEXT,
  evidence_level VARCHAR(20),
  extra_data JSONB DEFAULT '{}' -- เพิ่ม field ได้เลย ไม่ต้อง alter table
);

-- 2. Full-Text Search สำหรับภาษาไทย (สำรอง Meilisearch)
ALTER TABLE products ADD COLUMN search_vector TSVECTOR;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- 3. Array สำหรับ Tags
ALTER TABLE products ADD COLUMN tags TEXT[];
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- 4. Row-Level Security สำหรับ PDPA
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_access ON patients
  USING (id = current_setting('app.pharmacist_id')::UUID
         OR current_setting('app.role') = 'admin');
```

### 4.3 Migration จาก MySQL

- ใช้ `pgloader` หรือ `AWS DMS` สำหรับ migrate data
- Drizzle migration สร้าง schema ใหม่บน PostgreSQL
- รัน parallel — ระบบเก่า (MySQL) และ ระบบใหม่ (PostgreSQL) ชั่วคราว

---

## 5. Frontend — Next.js 15 (Admin Dashboard)

### 5.1 Architecture

```
┌──────────────────────────────────────────────┐
│              Next.js 15 App Router            │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Pharmacist│ │Operations│ │Admin/Reports │  │
│  │Dashboard │ │Dashboard │ │Dashboard     │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Patient   │ │Product   │ │Order         │  │
│  │Management│ │Catalog   │ │Management    │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Inventory │ │Loyalty & │ │Settings      │  │
│  │          │ │Promotions│ │              │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│                                               │
│  UI Library: shadcn/ui + Tailwind CSS v4      │
│  State: Zustand / TanStack Query              │
│  Charts: Recharts / Tremor                    │
│  Tables: TanStack Table                      │
│  Forms: React Hook Form + Zod                 │
└──────────────────────────────────────────────┘
```

### 5.2 ทำไม Next.js

| เหตุผล | รายละเอียด |
|--------|------------|
| **Share Types** | import types จาก backend NestJS ได้ตรง |
| **Server Components** | ลด JS bundle ที่ client |
| **App Router** | Layout system ดี |
| **เคยวางไว้แล้ว** | ใน modernization plan ของระบบเก่า |
| **shadcn/ui** | สวย, customizable, ฟรี |
| **Vercel** | deploy ง่าย (หรือ self-hosted) |

### 5.3 UI Component Stack

```
Next.js 15
├── shadcn/ui (components: button, dialog, table, form, etc.)
├── Tailwind CSS v4 (styling)
├── TanStack Table (data tables — sortable, filterable, paginated)
├── TanStack Query (data fetching + caching)
├── React Hook Form + Zod (form validation)
├── Recharts (charts: line, bar, pie)
├── Tremor (dashboard components — KPI cards, sparklines)
├── Lucide Icons (icons)
├── Sonner (toast notifications)
└── date-fns (date formatting — Thai locale)
```

---

## 6. LINE Integration Stack

### 6.1 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ LINE Platform│────>│ Webhook      │────>│ AI Router    │
│ (Webhook)    │     │ (NestJS)     │     │              │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    ┌──────┴──────┐        ┌──────┴──────┐
                    ▼             ▼        ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
              │Message   │ │Image     │ │Follow    │ │Postback  │
              │Handler   │ │Handler   │ │Handler   │ │Handler   │
              └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │            │
                   ▼            ▼            ▼            ▼
              ┌──────────────────────────────────────────────┐
              │          LINE Reply API                      │
              │  - Text, Flex Message, Image, Carousel      │
              │  - Quick Reply, Confirm Template             │
              └──────────────────────────────────────────────┘
```

### 6.2 LINE Packages

```json
{
  "@line/bot-sdk": "^9.x",        // Messaging API + Webhook
  "@line/liff": "^2.27",           // LIFF SDK (in-LINE web)
  "@line/liff-multiprofile": "latest", // Multi-LIFF
  "line-login": "^1.0"             // LINE Login (optional)
}
```

### 6.3 Message Types ที่ใช้

| Type | ใช้ที่ไหน |
|------|-----------|
| **Text** | ตอบคำถาม, แจ้งเตือน |
| **Flex Message** | สรุปออเดอร์, แสดงสินค้า, menu |
| **Carousel** | แสดงสินค้าหลายตัว, promotions |
| **Quick Reply** | เลือกยา, confirm order |
| **Confirm Template** | ยืนยันการชำระเงิน |
| **Image** | ส่งฉลากยา, รูปสินค้า |
| **Buttons Template** | Rich Menu alternatives |
| **LIFF** | Product catalog, checkout, ข้อมูลสุขภาพ |

### 6.4 Flex Message Example — Order Summary

```json
{
  "type": "bubble",
  "header": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      { "type": "text", "text": "🧾 สรุปคำสั่งซื้อ", "weight": "bold", "size": "xl" }
    ]
  },
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      { "type": "text", "text": "REYA-20260330-001", "color": "#888888", "size": "xs" },
      {
        "type": "box",
        "layout": "vertical",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "Paracetamol 500mg x1     ฿35", "size": "sm" },
          { "type": "text", "text": "Vitamin C 1000mg x1     ฿89", "size": "sm" },
          { "type": "separator", "margin": "sm" },
          { "type": "text", "text": "ค่าจัดส่ง                    ฿50", "size": "sm", "color": "#888888" },
          { "type": "text", "text": "ยอดรวม                    ฿174", "size": "md", "weight": "bold" }
        ]
      }
    ]
  },
  "footer": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "action": { "type": "uri", "label": "💳 ชำระเงิน PromptPay", "uri": "promptpay://..." },
        "style": "primary",
        "color": "#00B900"
      },
      {
        "type": "button",
        "action": { "type": "message", "label": "📷 ส่งสลิปโอนเงิน", "text": "ส่งสลิป" },
        "style": "secondary"
      }
    ]
  }
}
```

---

## 7. Search — Meilisearch

### 7.1 ทำไม Meilisearch

| Feature | Meilisearch | Elasticsearch |
|---------|------------|---------------|
| **Setup** | 5 นาที ⚡ | 2-3 วัน |
| **Response Time** | <50ms ⚡ | 100-500ms |
| **Thai Support** | Built-in (Charabia) ⚡ | ต้อง config analyzer |
| **Typo Tolerance** | Built-in ⚡ | ต้อง config |
| **Memory** | ~100MB ⚡ | 4-16GB |
| **Learning Curve** | ชั่วโมง ⚡ | สัปดาห์ |
| **Scale** | ล้าน documents | พันล้าน |
| **Cost** | ฟรี / $30/เดือน | ฟรี / $99+/เดือน |

### 7.2 ใช้ที่ไหน

- 🔍 ค้นหาสินค้า (ชื่อยา, ยี่ห้อ, อาการ)
- 🔍 ค้นหาบทความสุขภาพ
- 🔍 ค้นหาข้อมูลยา (drug database)
- 🔍 ค้นหาลูกค้า/ผู้ป่วย (admin)

### 7.3 Example

```typescript
// index.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({ host: 'http://localhost:7700' });

// ค้นหาสินค้า — ภาษาไทย
const results = await client.index('products').search('พาราเซตามอล', {
  filter: ['status = active'],
  facets: ['category', 'drug_classification', 'brand'],
  limit: 20,
});

// ค้นหาแบบ AI — จากอาการ
const symptomResults = await client.index('products').search('ไข้ ปวดหัว คัดจมูก', {
  filter: ['drug_classification = hhr'],
  sort: ['popularity:desc'],
});
```

---

## 8. AI Stack

### 8.1 Architecture

```
┌──────────────────────────────────────────────────────┐
│                     AI Layer                          │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ LLM (Gemini) │  │ OCR (Vision) │  │ Drug Safety│ │
│  │ Chatbot      │  │ Rx + Slip    │  │ Checker    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
│         │                  │                  │       │
│         └──────────────────┼──────────────────┘       │
│                            │                          │
│                   ┌────────┴────────┐                 │
│                   │  AI Orchestrator│                 │
│                   │  (LangChain.js) │                 │
│                   └─────────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### 8.2 AI Components

| Component | Tool | ใช้ที่ไหน |
|-----------|------|-----------|
| **LLM** | Gemini 2.5 Pro (Flash) | ตอบคำถาม, แนะนำสินค้า, สรุป |
| **Vision/OCR** | Gemini 2.5 Pro (Vision) | อ่านใบสั่งยา, สลิป |
| **Embedding** | text-embedding-3-small | Semantic search |
| **Orchestration** | LangChain.js / Vercel AI SDK | Route, chain, memory |
| **Drug Safety** | Local rules engine | Interaction, dose, allergy check |
| **NLP Thai** | PyThaiNLP (Python microservice) | Word segmentation, NER |

### 8.3 Vercel AI SDK Integration

```typescript
// ai/chatbot.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function chatWithPatient(message: string, patientContext: PatientContext) {
  const result = await streamText({
    model: google('gemini-2.5-pro'),
    system: `คุณเป็นเภสัชกรประจำร้าน REYA Pharmacy
คำตอบต้อง:
- เป็นภาษาไทยที่เป็นธรรมชาติ
- ไม่วินิจฉัยโรค
- ไม่แนะนำยาอันตรายโดยตรง
- แนะนำให้ปรึกษาเภสัชกรถ้าเรื่องซับซ้อน

ข้อมูลคนไข้:
${JSON.stringify(patientContext)}`,
    messages: [{ role: 'user', content: message }],
  });

  return result.textStream;
}
```

### 8.4 OCR Pipeline

```typescript
// ai/ocr.ts
import { GoogleGenAI } from '@google/genai';

export async function extractPrescription(imageBuffer: Buffer) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBuffer.toString('base64'),
            },
          },
          {
            text: `อ่านใบสั่งยาภาษาไทยนี้ และสกัดข้อมูลออกมาเป็น JSON:
{
  "prescriber": { "name": "", "license_no": "", "hospital": "" },
  "patient": { "name": "", "age": "" },
  "items": [
    { "drug_name": "", "strength": "", "dosage_form": "", "quantity": "", "sig": "" }
  ],
  "diagnosis": "",
  "rx_date": ""
}

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown`,
          },
        ],
      },
    ],
  });

  return JSON.parse(response.text);
}
```

---

## 9. Queue & Background Jobs — BullMQ

### 9.1 Jobs

| Job | Trigger | Description |
|-----|---------|-------------|
| `process-prescription` | รับรูป Rx | OCR → pre-check → เข้าคิว |
| `process-slip` | รับรูปสลิป | OCR → match order → confirm payment |
| `send-notification` | สถานะเปลี่ยน | ส่ง LINE notification |
| `send-reminder` | Cron | แจ้งเตือน refill ยาเรื้อรัง |
| `send-promotion` | Cron/Schedule | ส่ง promotion |
| `sync-search-index` | Product CRUD | Sync ข้อมูลไป Meilisearch |
| `generate-report` | Cron (รายวัน) | สร้าง daily report |
| `check-expiry` | Cron (รายวัน) | ตรวจยาใกล้หมดอายุ |
| `check-low-stock` | Cron (รายชั่วโมง) | ตรวจสต็อกต่ำ |
| `clean-records` | Cron (รายเดือน) | anonymize ข้อมูลตาม PDPA |

### 9.2 Example

```typescript
// queues/prescription.queue.ts
import { Queue, Worker } from 'bullmq';

export const prescriptionQueue = new Queue('prescription', {
  connection: redisConnection,
});

export const prescriptionWorker = new Worker('prescription', async (job) => {
  switch (job.name) {
    case 'process-rx':
      // OCR → pre-check → queue for pharmacist
      break;
    case 'verify-rx':
      // Pharmacist verified → create order
      break;
    case 'dispense':
      // Dispense + label + notify
      break;
  }
}, {
  connection: redisConnection,
  concurrency: 5, // ประมวลผล 5 พร้อมกัน
});
```

---

## 10. Infrastructure

### 10.1 Docker Compose (Development)

```yaml
version: '3.8'
services:
  # Backend
  api:
    build: ./apps/api
    ports: ['3000:3000']
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/telepharmacy
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on: [postgres, redis, meilisearch]

  # Admin Dashboard
  admin:
    build: ./apps/admin
    ports: ['3001:3000']
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000

  # Database
  postgres:
    image: postgres:16-alpine
    volumes: ['postgres_data:/var/lib/postgresql/data']
    environment:
      POSTGRES_DB: telepharmacy
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports: ['5432:5432']

  # Cache + Queue
  redis:
    image: redis:7-alpine
    volumes: ['redis_data:/data']
    ports: ['6379:6379']

  # Search
  meilisearch:
    image: getmeili/meilisearch:v1.11
    volumes: ['meili_data:/meili_data']
    ports: ['7700:7700']
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}

  # File Storage
  minio:
    image: minio/minio
    volumes: ['minio_data:/data']
    ports: ['9000:9000', '9001:9001']
    command: server /data --console-address ':9001'

  # Reverse Proxy
  traefik:
    image: traefik:v3
    ports: ['80:80', '443:443']
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik/letsencrypt:/letsencrypt

  # Monitoring
  grafana:
    image: grafana/grafana
    ports: ['3002:3000']
    volumes: ['grafana_data:/var/lib/grafana']

  prometheus:
    image: prom/prometheus
    ports: ['9090:9090']
    volumes: ['./prometheus.yml:/etc/prometheus/prometheus.yml']

volumes:
  postgres_data:
  redis_data:
  meili_data:
  minio_data:
  grafana_data:
```

### 10.2 Production Server Requirements

| Spec | Minimum | Recommended |
|------|---------|-------------|
| **CPU** | 4 vCPU | 8 vCPU |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 100 GB SSD | 200 GB SSD |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 LTS |
| **Network** | 10 Mbps | 100 Mbps |
| **Cost/month** | ~฿2,000-3,000 | ~฿5,000-8,000 |

### 10.3 Alibaba Cloud ECS

```
ECS Instance ( ecs.c7.xlarge )
├── 4 vCPU (Intel Xeon)
├── 16 GB RAM
├── 200 GB ESSD (SSD)
├── Ubuntu 24.04 LTS
├── Bandwidth: 10 Mbps (upgrade ได้)
└── ราคาประมาณ: ฿5,000-7,000/เดือน
```

---

## 11. Project Structure (Monorepo)

```
telepharmacy-erp/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Authentication & RBAC
│   │   │   │   ├── patient/    # Patient Records
│   │   │   │   ├── prescription/ # Rx Management
│   │   │   │   ├── drug/       # Drug Database
│   │   │   │   ├── product/    # Product Catalog
│   │   │   │   ├── order/      # Order Management
│   │   │   │   ├── payment/    # Payment Processing
│   │   │   │   ├── inventory/  # Inventory Management
│   │   │   │   ├── delivery/   # Delivery Tracking
│   │   │   │   ├── line/       # LINE Integration
│   │   │   │   ├── ai/         # AI Services
│   │   │   │   ├── loyalty/    # Loyalty & Points
│   │   │   │   ├── notification/ # Notifications
│   │   │   │   ├── report/     # Reports
│   │   │   │   └── health/     # Health Check
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── guards/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   ├── drizzle/             # Drizzle migrations
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── admin/                  # Next.js Admin Dashboard
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   │   ├── pharmacist/
│       │   │   ├── operations/
│       │   │   ├── patients/
│       │   │   ├── products/
│       │   │   ├── orders/
│       │   │   ├── inventory/
│       │   │   ├── reports/
│       │   │   └── settings/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/             # shadcn/ui
│       │   ├── forms/
│       │   ├── tables/
│       │   └── charts/
│       ├── lib/
│       │   ├── api.ts          # API client (generated types)
│       │   └── utils.ts
│       ├── Dockerfile
│       ├── next.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types & utils
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── constants/      # Drug classifications, etc.
│   │   │   ├── validators/     # Zod schemas
│   │   │   └── utils/
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── db/                     # Drizzle ORM
│   │   ├── src/
│   │   │   ├── schema/         # Table definitions
│   │   │   │   ├── patients.ts
│   │   │   │   ├── prescriptions.ts
│   │   │   │   ├── drugs.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   └── ...
│   │   │   ├── relations/
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ai/                     # AI services
│       ├── src/
│       │   ├── chatbot.ts
│       │   ├── ocr.ts
│       │   ├── drug-checker.ts
│       │   ├── recommendation.ts
│       │   └── nlp-thai.ts
│       └── package.json
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
├── .env.example
├── .github/workflows/          # CI/CD
└── README.md
```

---

## 12. Cost Estimation

### 12.1 Monthly Cost (สำหรับเริ่มต้น)

| Item | Cost | หมายเหตุ |
|------|------|----------|
| **Server (ECS)** | ฿5,000-7,000 | 4 vCPU, 16GB RAM |
| **Domain** | ฿500 | ต่อปี |
| **SSL** | ฿0 | Let's Encrypt (ฟรี) |
| **LINE OA** | ฿0 | ฟรี (ถ้าไม่ broadcast มาก) |
| **Gemini API** | ฿2,000-5,000 | ขึ้นกับ usage |
| **Omise** | ฿0 + 3.65% | transaction fee |
| **Meilisearch** | ฿0 | Self-hosted |
| **Monitoring** | ฿0 | Grafana + Prometheus |
| **Total** | **~฿8,000-13,000/เดือน** | |

### 12.2 Scaling Cost

| Scale | Server | DB | Est. Cost |
|-------|--------|-----|-----------|
| **เริ่ม (100-500 users/day)** | 1 server | Same server | ฿8,000-13,000 |
| **กลาง (500-2000 users/day)** | 2 servers | Separate RDS | ฿15,000-25,000 |
| **ใหญ่ (2000+ users/day)** | K8s cluster | Managed PG | ฿30,000-50,000 |

---

## 13. Development Roadmap

### Phase 1: Foundation (Week 1-4)
- [ ] Setup monorepo (Turborepo + pnpm)
- [ ] NestJS + Drizzle + PostgreSQL
- [ ] Auth + RBAC
- [ ] LINE webhook integration
- [ ] Basic admin dashboard (Next.js)
- [ ] CI/CD pipeline

### Phase 2: Core (Week 5-10)
- [ ] Patient records + allergies
- [ ] Product catalog + Meilisearch
- [ ] Prescription OCR + verification
- [ ] Drug interaction + dose check
- [ ] Order + payment (PromptPay)
- [ ] AI chatbot (basic)

### Phase 3: Operations (Week 11-16)
- [ ] Inventory management
- [ ] Delivery tracking
- [ ] Loyalty + points
- [ ] Notification system
- [ ] Reports dashboard
- [ ] Slip OCR

### Phase 4: Polish (Week 17-20)
- [ ] Promotions engine
- [ ] Medication reminders
- [ ] Health articles
- [ ] Performance optimization
- [ ] Security audit
- [ ] UAT + soft launch

---

## 14. Team Requirements

| Role | จำนวน | Skill |
|------|-------|-------|
| **Backend Dev** | 1-2 | NestJS, TypeScript, PostgreSQL, Redis |
| **Frontend Dev** | 1 | Next.js, React, Tailwind, shadcn/ui |
| **AI/ML Engineer** | 0.5 (part-time) | LLM, OCR, NLP Thai |
| **Pharmacist (SME)** | 1 | Domain knowledge, workflow review |
| **DevOps** | 0.5 (part-time) | Docker, CI/CD, monitoring |
| **QA** | 0.5 (part-time) | Testing, UAT |

**Total: 3-5 คน** (สำหรับเริ่มต้น)

---

## Appendix: Alternative Stacks

### Alternative A: Laravel (PHP)

```
Backend:     Laravel 12 (FrankenPHP)
ORM:         Eloquent
Database:    MySQL 8 / MariaDB
Queue:       Laravel Horizon (Redis)
Search:      Laravel Scout (Meilisearch)
Admin:       Livewire 3 + Filament
AI:          Laravel AI (community)
```

**Pros:** ทีมรู้ PHP, พัฒนาเร็ว  
**Cons:** Performance ต่ำกว่า, AI integration ยากกว่า

### Alternative B: Python (FastAPI)

```
Backend:     FastAPI
ORM:         SQLAlchemy 2.0
Database:    PostgreSQL
Queue:       Celery + Redis
Search:      Meilisearch
Admin:       React (separate)
AI:          Native Python (LangChain)
```

**Pros:** AI integration ดีที่สุด, มี PyThaiNLP  
**Cons:** ทีมอาจไม่รู้ Python, async ซับซ้อน
