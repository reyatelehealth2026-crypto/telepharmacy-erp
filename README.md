# Telepharmacy ERP

ระบบ **LINE Telepharmacy ERP (B2C)** สำหรับร้านขายยาออนไลน์ผ่าน LINE — รองรับการสั่งซื้อยา, อัปโหลดใบสั่งยา (OCR), ปรึกษาเภสัชกร, ชำระเงินผ่าน PromptPay และจัดส่งพัสดุ

## สถาปัตยกรรม

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  apps/shop   │     │  apps/admin  │     │  LINE        │
│  (LIFF+Next) │     │  (Next.js)   │     │  Platform    │
│  :3002       │     │  :3001       │     │  Webhook     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────┬───────┘────────────────────┘
                    ▼
            ┌───────────────┐
            │   apps/api    │
            │  (NestJS 11)  │
            │  :3000 /v1    │
            └───────┬───────┘
                    │
       ┌────────────┼────────────┬──────────────┐
       ▼            ▼            ▼              ▼
  PostgreSQL 16  Redis 7    Meilisearch     MinIO
  (Drizzle ORM) (BullMQ)   (Full-text)   (S3 Storage)
```

| App | คำอธิบาย | Port |
|-----|---------|------|
| `apps/api` | NestJS 11 REST API — Auth, Patient, Prescription, Order, LINE Webhook | 3000 |
| `apps/admin` | Next.js 15 Admin Dashboard สำหรับเภสัชกร/Staff | 3001 |
| `apps/shop` | LIFF + Next.js 15 Customer Shop (เปิดผ่าน LINE) | 3002 |

| Package | คำอธิบาย |
|---------|---------|
| `packages/db` | Drizzle ORM schema — 15 schema modules, 30+ tables |
| `packages/shared` | TypeScript types + Zod validators |
| `packages/ai` | Gemini 2.5 Pro — Chatbot, OCR ใบสั่งยา, Drug interaction checker |

## Tech Stack

- **Runtime:** Node.js ≥ 20, pnpm 10.28
- **Backend:** NestJS 11, Drizzle ORM, PostgreSQL 16
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **Queue/Cache:** Redis 7, BullMQ
- **Search:** Meilisearch v1.11
- **Storage:** MinIO (S3-compatible)
- **AI:** Gemini 2.5 Pro (Vercel AI SDK), OCR ใบสั่งยา
- **LINE:** @line/bot-sdk v9, LIFF SDK
- **Payment:** Omise, PromptPay QR
- **Reverse Proxy:** Traefik v3.3 (Let's Encrypt TLS)
- **Monitoring:** Prometheus + Grafana
- **Build:** Turborepo, pnpm workspaces

---

## Quick Start (Development)

### ข้อกำหนดเบื้องต้น

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 10 (`corepack enable && corepack prepare pnpm@latest --activate`)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

### 1. Clone & Install

```bash
git clone <repo-url> telepharmacy-erp
cd telepharmacy-erp
pnpm install
```

### 2. ตั้งค่า Environment

```bash
cp .env.example .env
```

แก้ไข `.env` ตามต้องการ — ค่า default ใช้งานได้กับ Docker Compose ทันที สำหรับ development ต้องเพิ่ม:

| ตัวแปร | จำเป็น | คำอธิบาย |
|--------|--------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ใช่ | LINE Messaging API token |
| `LINE_CHANNEL_SECRET` | ใช่ | LINE Channel secret |
| `LINE_LIFF_ID` | ใช่ | LIFF App ID |
| `GEMINI_API_KEY` | ใช่ | Google Gemini API key |
| `OMISE_PUBLIC_KEY` | ไม่บังคับ | Omise public key (สำหรับ payment) |
| `OMISE_SECRET_KEY` | ไม่บังคับ | Omise secret key |
| `JWT_SECRET` | ใช่ | เปลี่ยนจาก default |
| `JWT_REFRESH_SECRET` | ใช่ | เปลี่ยนจาก default |

### 3. เริ่ม Infrastructure Services

```bash
docker compose up -d
```

Services ที่จะเริ่ม:
- **PostgreSQL** — `localhost:5432` (user/pass, db: telepharmacy)
- **Redis** — `localhost:6379`
- **Meilisearch** — `localhost:7700`
- **MinIO** — `localhost:9000` (console: `localhost:9001`)
- **Traefik** — `localhost:80/443` (dashboard: `localhost:8080`)
- **Prometheus** — `localhost:9090`
- **Grafana** — `localhost:3002` (admin/admin) ⚠️ ชน port กับ shop — ดู [Port Conflicts](#port-conflicts)

ตรวจสอบสถานะ:

```bash
docker compose ps
docker compose logs -f postgres redis
```

### 4. Database Migration

```bash
pnpm db:push
```

หรือใช้ migration-based workflow:

```bash
pnpm db:generate   # สร้าง migration files
pnpm db:migrate    # รัน migrations
```

เปิด Drizzle Studio เพื่อดูข้อมูล:

```bash
cd packages/db && pnpm db:studio
```

### 5. เริ่มทุก App พร้อมกัน

```bash
pnpm dev
```

หรือเริ่มทีละ app:

```bash
pnpm dev:api     # NestJS API       → http://localhost:3000/v1
pnpm dev:admin   # Admin Dashboard  → http://localhost:3001
pnpm dev:shop    # Customer Shop    → http://localhost:3002
```

### 6. ตรวจสอบว่าระบบทำงาน

```bash
# Health check
curl http://localhost:3000/v1/health

# Readiness (ตรวจ DB connection)
curl http://localhost:3000/v1/health/ready
```

---

## Project Structure

```
telepharmacy-erp/
├── apps/
│   ├── api/                         # NestJS 11 Backend
│   │   └── src/
│   │       ├── main.ts              # Entry point (/v1 prefix, CORS, Helmet)
│   │       ├── app.module.ts        # Root module
│   │       ├── config/              # App, DB, JWT, LINE config
│   │       ├── database/            # Drizzle connection module
│   │       ├── common/              # Pipes, Filters, Interceptors, Decorators
│   │       └── modules/
│   │           ├── auth/            # LINE Login + Staff JWT + RBAC guards
│   │           ├── health/          # Health check endpoints
│   │           ├── line/            # Webhook + Flex Messages
│   │           └── patient/         # Patient CRUD + allergies + chronic diseases
│   ├── admin/                       # Next.js 15 Admin Dashboard
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/    # Staff login page
│   │       │   └── dashboard/       # Dashboard pages
│   │       │       ├── pharmacist/  # Rx queue
│   │       │       ├── orders/      # Order management
│   │       │       ├── patients/    # Patient records
│   │       │       ├── products/    # Catalog management
│   │       │       ├── inventory/   # Stock management
│   │       │       ├── reports/     # Analytics
│   │       │       └── settings/    # System settings
│   │       └── components/          # Sidebar, Header, StatCard, etc.
│   └── shop/                        # LIFF + Next.js 15 Customer Shop
│       └── src/
│           ├── app/
│           │   └── (shop)/
│           │       ├── page.tsx     # Home / Product catalog
│           │       ├── search/      # ค้นหายา (Meilisearch)
│           │       ├── product/[id] # รายละเอียดสินค้า
│           │       ├── cart/        # ตะกร้าสินค้า
│           │       ├── checkout/    # Checkout + PromptPay QR
│           │       ├── rx/upload/   # อัปโหลดใบสั่งยา
│           │       ├── rx/status/   # สถานะใบสั่งยา
│           │       ├── orders/      # ประวัติออเดอร์
│           │       ├── profile/     # โปรไฟล์ + แพ้ยา + ยาที่กิน
│           │       ├── consultation/# ปรึกษาเภสัชกร
│           │       └── notifications/
│           └── components/          # UI components, Layout
├── packages/
│   ├── db/                          # Drizzle ORM Schema
│   │   └── src/schema/
│   │       ├── enums.ts             # PostgreSQL ENUMs
│   │       ├── staff.ts             # Staff accounts
│   │       ├── patients.ts          # Patient records
│   │       ├── drugs.ts             # Drug database
│   │       ├── products.ts          # Product catalog
│   │       ├── inventory.ts         # Stock & lot tracking
│   │       ├── prescriptions.ts     # Rx & pharmacist reviews
│   │       ├── orders.ts            # Orders & payments
│   │       ├── loyalty.ts           # Points & membership
│   │       ├── chat.ts              # LINE chat history
│   │       ├── notifications.ts     # Push notifications
│   │       ├── content.ts           # CMS content
│   │       ├── complaints.ts        # Customer complaints
│   │       ├── system.ts            # Audit logs & settings
│   │       └── relations.ts         # Drizzle relations
│   ├── shared/                      # Shared TypeScript + Zod
│   │   └── src/
│   │       ├── types/               # Interfaces (Patient, Order, etc.)
│   │       ├── validators/          # Zod schemas (auth, patient, order, etc.)
│   │       ├── constants/           # Shared constants
│   │       └── utils/               # Shared utilities
│   └── ai/                          # AI Services
│       └── src/
│           ├── chatbot.ts           # Gemini chatbot
│           ├── ocr.ts               # Prescription OCR (Gemini Vision)
│           ├── drug-checker.ts      # Drug interaction checker
│           └── config.ts            # AI configuration
├── infra/
│   ├── prometheus/prometheus.yml    # Prometheus scrape config
│   └── grafana/provisioning/        # Grafana datasource config
├── docker-compose.yml               # Infrastructure services
├── turbo.json                       # Turborepo pipeline config
├── pnpm-workspace.yaml              # pnpm workspace config
└── .env.example                     # Environment template
```

---

## Available Scripts

รันจาก root directory:

| คำสั่ง | คำอธิบาย |
|--------|---------|
| `pnpm dev` | เริ่มทุก app ใน dev mode (watch) |
| `pnpm dev:api` | เริ่มเฉพาะ API |
| `pnpm dev:admin` | เริ่มเฉพาะ Admin Dashboard |
| `pnpm dev:shop` | เริ่มเฉพาะ Customer Shop |
| `pnpm build` | Build ทุก app + package |
| `pnpm lint` | Lint ทุก app |
| `pnpm type-check` | TypeScript type checking |
| `pnpm test` | รัน tests |
| `pnpm db:generate` | สร้าง Drizzle migration files |
| `pnpm db:migrate` | รัน database migrations |
| `pnpm db:push` | Push schema ไป DB โดยตรง (dev only) |
| `pnpm clean` | ลบ build artifacts |
| `pnpm format` | Format code ด้วย Prettier |
| `pnpm format:check` | ตรวจ format |

---

## API Reference

Base URL: `http://localhost:3000/v1`

### Health

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/v1/health` | Basic health check (status, uptime, version) |
| GET | `/v1/health/ready` | Readiness probe (ตรวจ DB connection) |

### Authentication

| Method | Endpoint | Auth | คำอธิบาย |
|--------|----------|------|---------|
| POST | `/v1/auth/line-login` | — | LINE Login (ลูกค้า) |
| POST | `/v1/auth/staff/login` | — | Staff login (email/password) |
| POST | `/v1/auth/refresh` | Refresh token | Refresh access token |
| POST | `/v1/auth/pdpa-consent` | JWT | บันทึก PDPA consent |

### Patient

| Method | Endpoint | Auth | คำอธิบาย |
|--------|----------|------|---------|
| GET | `/v1/patients/me` | Patient JWT | ดูโปรไฟล์ตัวเอง |
| PATCH | `/v1/patients/me` | Patient JWT | แก้ไขโปรไฟล์ |
| GET | `/v1/patients/me/allergies` | Patient JWT | ดูประวัติแพ้ยา |
| POST | `/v1/patients/me/allergies` | Patient JWT | เพิ่มประวัติแพ้ยา |
| GET | `/v1/staff/patients` | Staff JWT | ดูรายชื่อผู้ป่วย (Staff) |
| GET | `/v1/staff/patients/:id` | Staff JWT | ดูข้อมูลผู้ป่วย (Staff) |

### LINE Webhook

| Method | Endpoint | Auth | คำอธิบาย |
|--------|----------|------|---------|
| POST | `/v1/line/webhook` | LINE Signature | รับ events จาก LINE Platform |

> ดู API spec ฉบับเต็มที่ `.cursor/telepharmacy-api-design.md`

---

## Deployment

### Production Architecture

```
                    ┌─────────────┐
                    │   Traefik   │
                    │  (TLS/LB)   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   api.re-ya.com    admin.re-ya.com   shop.re-ya.com
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │  API       │   │  Admin     │   │  Shop      │
   │  Container │   │  Container │   │  Container │
   │  :3000     │   │  :3001     │   │  :3002     │
   └─────┬──────┘   └────────────┘   └────────────┘
         │
    ┌────┼────┬──────────┬──────────┐
    ▼    ▼    ▼          ▼          ▼
  PG  Redis  Meili     MinIO    BullMQ
```

### Option A: Docker Compose (แนะนำสำหรับ Single Server)

ดูไฟล์ `docker-compose.prod.yml` สำหรับ production config ที่รวม app containers:

```bash
# Build & start ทุกอย่าง
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ดู logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api admin shop
```

### Option B: Manual Deployment (PM2)

#### ข้อกำหนดบน Server

- Ubuntu 22.04+ / Debian 12+
- Node.js ≥ 20 (ใช้ [nvm](https://github.com/nvm-sh/nvm) หรือ [fnm](https://github.com/Schniz/fnm))
- pnpm ≥ 10
- PM2 (`npm install -g pm2`)
- PostgreSQL 16, Redis 7, Meilisearch, MinIO (ผ่าน Docker Compose หรือ managed service)

#### ขั้นตอน Deploy

```bash
# 1. Clone & install
git clone <repo-url> /opt/telepharmacy-erp
cd /opt/telepharmacy-erp
pnpm install --frozen-lockfile

# 2. ตั้งค่า environment
cp .env.example .env
nano .env  # ใส่ค่า production

# 3. เริ่ม infrastructure
docker compose up -d

# 4. รัน database migration
pnpm db:migrate

# 5. Build ทุก app
pnpm build

# 6. เริ่ม apps ด้วย PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # ให้ PM2 เริ่มตอน boot
```

### Traefik Routing (Production)

เพิ่ม labels ใน `docker-compose.prod.yml` สำหรับ routing:

```yaml
# API: api.re-ya.com → :3000
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`api.re-ya.com`)"
  - "traefik.http.routers.api.tls.certresolver=letsencrypt"
  - "traefik.http.services.api.loadbalancer.server.port=3000"

# Admin: admin.re-ya.com → :3001
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.admin.rule=Host(`admin.re-ya.com`)"
  - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
  - "traefik.http.services.admin.loadbalancer.server.port=3001"

# Shop: shop.re-ya.com → :3002
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.shop.rule=Host(`shop.re-ya.com`)"
  - "traefik.http.routers.shop.tls.certresolver=letsencrypt"
  - "traefik.http.services.shop.loadbalancer.server.port=3002"
```

### Environment Variables (Production)

ค่าที่ **ต้องเปลี่ยน** จาก default:

| ตัวแปร | Production Value |
|--------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://<user>:<strong-password>@<host>:5432/telepharmacy` |
| `JWT_SECRET` | Random 64-char string |
| `JWT_REFRESH_SECRET` | Random 64-char string (ต่างจาก JWT_SECRET) |
| `MEILI_MASTER_KEY` | Random 32-char string |
| `MINIO_ACCESS_KEY` | Strong access key |
| `MINIO_SECRET_KEY` | Strong secret key |
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | จาก LINE Developers Console |
| `GEMINI_API_KEY` | จาก Google AI Studio |
| `NEXT_PUBLIC_API_URL` | `https://api.re-ya.com` |
| `NEXT_PUBLIC_SHOP_URL` | `https://shop.re-ya.com` |

สร้าง random secrets:

```bash
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 48  # JWT_REFRESH_SECRET
openssl rand -hex 16     # MEILI_MASTER_KEY
```

---

## Monitoring

### Health Checks

```bash
# Basic health
curl https://api.re-ya.com/v1/health

# Readiness (ตรวจ DB)
curl https://api.re-ya.com/v1/health/ready
```

### Prometheus

- URL: `http://localhost:9090`
- Scrape targets: API (:3000/metrics), PostgreSQL, Redis, Meilisearch, Traefik

### Grafana

- URL: `http://localhost:3002` (dev) — ⚠️ ชน port กับ shop
- Login: admin / admin
- Datasource: Prometheus (pre-configured)

---

## Database

### Schema Modules

| Module | Tables | คำอธิบาย |
|--------|--------|---------|
| `enums` | — | PostgreSQL ENUM types ทั้งหมด |
| `staff` | staff | บัญชี Staff/เภสัชกร |
| `patients` | patients, patient_allergies, patient_chronic_diseases | ข้อมูลผู้ป่วย |
| `drugs` | drugs, drug_interactions | ฐานข้อมูลยา |
| `products` | products, product_variants, categories | สินค้า |
| `inventory` | inventory_lots, stock_movements | คลังสินค้า |
| `prescriptions` | prescriptions, prescription_items, pharmacist_reviews | ใบสั่งยา |
| `orders` | orders, order_items, payments, payment_slips | ออเดอร์ & ชำระเงิน |
| `loyalty` | loyalty_members, points_transactions, promotions | สะสมแต้ม |
| `chat` | line_messages | ประวัติแชท LINE |
| `notifications` | notifications | การแจ้งเตือน |
| `content` | articles, banners | CMS |
| `complaints` | complaints | ข้อร้องเรียน |
| `system` | audit_logs, system_settings | ระบบ |

### Drizzle Commands

```bash
pnpm db:push       # Push schema → DB (dev, no migration files)
pnpm db:generate   # Generate migration SQL files
pnpm db:migrate    # Apply pending migrations
cd packages/db && pnpm db:studio  # Visual DB browser
```

---

## LINE Integration Setup

### 1. LINE Developers Console

1. สร้าง **Messaging API Channel** ที่ [LINE Developers](https://developers.line.biz/)
2. คัดลอก **Channel Access Token** และ **Channel Secret** ใส่ `.env`
3. ตั้ง Webhook URL: `https://api.re-ya.com/v1/line/webhook`
4. เปิด **Use webhook** = ON

### 2. LIFF App

1. สร้าง LIFF App ใน LINE Developers Console
2. ตั้ง Endpoint URL: `https://shop.re-ya.com`
3. ตั้ง Scope: `profile`, `openid`
4. คัดลอก LIFF ID ใส่ `NEXT_PUBLIC_LIFF_ID` ใน `.env`

### 3. Rich Menu

ตั้งค่า Rich Menu ใน LINE Official Account Manager เพื่อลิงก์ไปยัง LIFF App

---

## Troubleshooting

### Port Conflicts

| Port | Service | แก้ไข |
|------|---------|-------|
| 3000 | API | เปลี่ยน `PORT` ใน `.env` |
| 3001 | Admin | เปลี่ยนใน `apps/admin/package.json` (`--port`) |
| 3002 | Shop / Grafana | เปลี่ยน Grafana port ใน `docker-compose.yml` (เช่น `3003:3000`) |
| 5432 | PostgreSQL | เปลี่ยนใน `docker-compose.yml` |
| 6379 | Redis | เปลี่ยนใน `docker-compose.yml` |

### Database Connection Issues

```bash
# ตรวจว่า PostgreSQL ทำงาน
docker compose ps postgres
docker compose logs postgres

# ทดสอบ connection
docker compose exec postgres psql -U user -d telepharmacy -c "SELECT 1"
```

### pnpm Install Fails

```bash
# ลบ cache แล้วลองใหม่
pnpm store prune
rm -rf node_modules
pnpm install
```

### Build Errors

```bash
# ลบ build artifacts แล้ว build ใหม่
pnpm clean
pnpm build
```

---

## Security Notes

- **PDPA Compliance:** ระบบจัดเก็บ consent ของผู้ป่วยตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
- **JWT:** Access token หมดอายุ 15 นาที, Refresh token 7 วัน
- **Rate Limiting:** 60 requests / 60 วินาที (ThrottlerModule)
- **Helmet:** HTTP security headers เปิดใช้งาน
- **RBAC:** Role-based access control สำหรับ Staff (pharmacist, admin, staff)
- **LINE Signature:** Webhook ตรวจสอบ X-Line-Signature ทุก request
- **Secrets:** ห้าม commit `.env` — ใช้ `.env.example` เป็น template

---

## License

Private — Re-Ya Pharmacy. All rights reserved.
