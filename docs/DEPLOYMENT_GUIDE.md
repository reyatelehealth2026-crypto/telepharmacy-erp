# REYA Telepharmacy — คู่มือ Deploy ฉบับสมบูรณ์

> สำหรับ DevOps / Developer
> อัปเดต: April 3, 2026

## สารบัญ

1. [ข้อกำหนดเบื้องต้น](#1-ข้อกำหนดเบื้องต้น)
2. [ขั้นตอน Deploy ทีละขั้น](#2-ขั้นตอน-deploy-ทีละขั้น)
3. [Environment Variables](#3-environment-variables)
4. [การแก้ไขปัญหา (Troubleshooting)](#4-การแก้ไขปัญหา)
5. [Monitoring & Maintenance](#5-monitoring--maintenance)

**รูปแบบ production สรุป:** โปรเจกต์รองรับ **(A) แอปใน Docker Compose** (`docker-compose.prod.yml` + Dockerfile — รวม static ใน image แล้ว) หรือ **(B) แอปบน host ด้วย PM2** + Docker เฉพาะ infra — รายละเอียดอยู่ที่ [ขั้นที่ 9](#step-9-production)

---

## 1. ข้อกำหนดเบื้องต้น

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|-----------|----------------|----------|
| Node.js | ≥ 20 | LTS recommended |
| pnpm | ≥ 10.28 | `npm install -g pnpm` |
| Docker + Compose | ≥ 24 | สำหรับ infrastructure services |
| PostgreSQL | 16 | ผ่าน Docker หรือ managed |
| Redis | 7 | ผ่าน Docker หรือ managed |

### Hardware ขั้นต่ำ (Production)

| Resource | ขั้นต่ำ | แนะนำ |
|----------|--------|-------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Bandwidth | 100 Mbps | 1 Gbps |

---

## 2. ขั้นตอน Deploy ทีละขั้น

### ขั้นที่ 1: Clone และติดตั้ง Dependencies

```bash
git clone https://github.com/reyatelehealth2026-crypto/telepharmacy-erp.git
cd telepharmacy-erp
pnpm install
```

### ขั้นที่ 2: ตั้งค่า Environment Variables

```bash
cp .env.example .env
# แก้ไขค่าใน .env ตามหัวข้อ 3
```

สร้าง `.env` สำหรับ API ด้วย:
```bash
cp apps/api/.env.example apps/api/.env
# หรือ copy จาก .env หลัก
```

### ขั้นที่ 3: เริ่ม Infrastructure Services

```bash
docker compose up -d
```

ตรวจสอบว่าทุก service ทำงาน:
```bash
docker compose ps
```

ควรเห็น:
| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5432 | healthy |
| Redis | 6379 | healthy |
| Meilisearch | 7700 | healthy |
| MinIO | 9000/9001 | healthy |
| Traefik | 80/443/8080 | running |
| Prometheus | 9090 | healthy |
| Grafana | 3010 | healthy |

### ขั้นที่ 4: Build Packages

```bash
# Build shared packages ก่อน (ลำดับสำคัญ)
pnpm build --filter @telepharmacy/db
pnpm build --filter @telepharmacy/shared
pnpm build --filter @telepharmacy/ai
```

### ขั้นที่ 5: Push Database Schema

```bash
pnpm db:push
```

ถ้าใช้ migration แทน:
```bash
pnpm db:generate
pnpm db:migrate
```

### ขั้นที่ 6: Seed ข้อมูลเริ่มต้น

```bash
pnpm db:seed
```

จะสร้าง:
- ข้อมูลยา (drug database)
- กลุ่มแพ้ยา (allergy groups)
- Drug interactions
- Staff accounts เริ่มต้น
- Scope rules สำหรับ telemedicine

### ขั้นที่ 7: Build Applications

```bash
pnpm build
```

หรือ build ทีละ app:
```bash
pnpm build --filter @telepharmacy/api
pnpm build --filter @telepharmacy/admin
pnpm build --filter @telepharmacy/shop
```

### ขั้นที่ 8: Start Applications — Development

```bash
pnpm dev          # ทุก app พร้อมกัน
# หรือ
pnpm dev:api      # API :3000
pnpm dev:admin    # Admin :3001
pnpm dev:shop     # Shop :3002
```

<a id="step-9-production"></a>

### ขั้นที่ 9: Production — เลือกแบบใดแบบหนึ่ง

อย่ารัน **แบบ A กับแบบ B พร้อมกันสำหรับแอปเดียวกัน** (จะชนกันที่พอร์ต 3000–3002) — เลือกหนึ่งสายแล้วยึด runbook นั้น

#### แบบ A: Docker Compose — แนะนำตาม spec / `docker-compose.prod.yml`

- **Dockerfile** (`Dockerfile.api`, `Dockerfile.admin`, `Dockerfile.shop`) จัดการคัดลอก `.next/static`, `public` และ standalone ให้แล้ว — **ไม่ต้อง** รัน `make copy-*-static` แยกหลัง build
- ตั้งค่า `.env` ให้ครบตาม [หัวข้อ 3](#3-environment-variables) และ `NEXT_PUBLIC_*` ใน `docker-compose.prod.yml` (build args)
- จาก root ของ monorepo:

```bash
make prod-build    # หรือ: docker compose -f docker-compose.yml -f docker-compose.prod.yml build
make prod-up       # หรือ: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

- ดูล็อกแอป: `make prod-logs` หรือ `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api admin shop`
- รีสตาร์ตแอป: `make prod-restart`

Traefik + TLS ใน `docker-compose.prod.yml` จัดการ `*.re-ya.com` ตาม labels [ขั้นที่ 11](#step-11-ssl)

#### แบบ B: PM2 บน host — แอปรันนอก container, Docker เฉพาะ infra

เหมาะเมื่อทีม deploy บนเซิร์ฟเวอร์ด้วย `git pull` + build + process manager — **ต้อง** ทำขั้นตอนคัดลอก static หลังทุก build ของ admin/shop (Next ใช้ `output: 'standalone'`)

**API (NestJS — build แล้ว):**

```bash
cd apps/api && node dist/main.js
# หรือจัดการด้วย PM2 ให้ชี้ไปที่ dist/main.js
```

**Admin & Shop (Next.js standalone + PM2):**

หลัง `pnpm build` (หรือ `pnpm --filter @telepharmacy/shop build` / `admin`) ให้รัน:

```bash
make copy-shop-static
make copy-admin-static
```

หรือรวม build + copy + reload PM2:

```bash
make deploy-shop
make deploy-admin
```

ถ้าเซิร์ฟเวอร์ไม่มี `make` ให้ใช้คำสั่ง `rm`/`cp` ตามเป้าหมาย `copy-shop-static` / `copy-admin-static` ใน **`Makefile`** ที่ root

จากนั้นรัน `node` จาก `apps/*/ .next/standalone/.../server.js` ตามที่ PM2 กำหนด (ดู `script path` ใน `pm2 show`)

**หมายเหตุ:** แบบ B ไม่ต้องใช้ `docker compose logs` สำหรับ api/admin/shop — ใช้ `pm2 logs` หรือไฟล์ใน `apps/*/logs/` ตามที่ตั้งค่า

### ขั้นที่ 10: ตรวจสอบ Health

```bash
# API Health
curl http://localhost:3000/v1/health

# API Readiness (ตรวจ DB connection)
curl http://localhost:3000/v1/health/ready
```

<a id="step-11-ssl"></a>

### ขั้นที่ 11: ตั้งค่า SSL (Production)

Traefik จัดการ Let's Encrypt อัตโนมัติ เพียงตั้งค่า domain (ใช้ร่วมกับ **แบบ A** หรือเมื่อ Traefik ชี้ไปที่พอร์ตแอปของ **แบบ B**):

```yaml
# docker-compose.prod.yml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.re-ya.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
  admin:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.re-ya.com`)"
      - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
  shop:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.shop.rule=Host(`shop.re-ya.com`)"
      - "traefik.http.routers.shop.tls.certresolver=letsencrypt"
```

---

## 3. Environment Variables

### ตัวแปรที่ต้องตั้งค่า (Production)

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/telepharmacy` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | Secret สำหรับ JWT token (สุ่ม 64 ตัวอักษร) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret สำหรับ refresh token | `openssl rand -hex 32` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API token | จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | จาก LINE Developers Console |
| `LINE_LIFF_ID` | LIFF App ID | จาก LINE Developers Console |
| `GEMINI_API_KEY` | Google Gemini API key | จาก Google AI Studio |
| `OMISE_PUBLIC_KEY` | Omise public key | จาก Omise Dashboard |
| `OMISE_SECRET_KEY` | Omise secret key | จาก Omise Dashboard |
| `AGORA_APP_ID` | Agora App ID สำหรับ video call | จาก Agora Console |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate | จาก Agora Console |
| `AWS_ACCESS_KEY_ID` | AWS credentials สำหรับ Rekognition | จาก AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | จาก AWS IAM |
| `MEILI_MASTER_KEY` | Meilisearch master key | `openssl rand -hex 16` |
| `AUDIT_ENCRYPTION_KEY` | Encryption key สำหรับ audit trail | `openssl rand -hex 32` |

### ตัวแปร Frontend (NEXT_PUBLIC_*)

| ตัวแปร | คำอธิบาย |
|--------|---------|
| `NEXT_PUBLIC_API_URL` | URL ของ API (เช่น `https://api.re-ya.com`) |
| `NEXT_PUBLIC_LIFF_ID` | LIFF App ID |
| `NEXT_PUBLIC_SHOP_URL` | URL ของ Shop |

---

## 4. การแก้ไขปัญหา (Troubleshooting)

### 4.1 Database

**ปัญหา: `ECONNREFUSED` เมื่อเชื่อมต่อ PostgreSQL**
```
สาเหตุ: PostgreSQL ยังไม่พร้อม หรือ connection string ผิด
แก้ไข:
1. ตรวจสอบ Docker: docker compose ps postgres
2. ตรวจสอบ DATABASE_URL ใน .env
3. ทดสอบ: docker exec -it telepharmacy-postgres psql -U user -d telepharmacy
```

**ปัญหา: Migration failed / Schema push error**
```
สาเหตุ: Schema ไม่ตรงกับ DB ที่มีอยู่
แก้ไข:
1. pnpm db:push --force  (dev only — จะลบข้อมูล)
2. Production: pnpm db:generate แล้ว review migration ก่อน pnpm db:migrate
```

**ปัญหา: `relation "xxx" does not exist`**
```
สาเหตุ: ยังไม่ได้ push schema
แก้ไข: pnpm db:push
```

### 4.2 Redis

**ปัญหา: `ECONNREFUSED` Redis**
```
แก้ไข:
1. docker compose ps redis
2. docker compose restart redis
3. ตรวจสอบ REDIS_URL ใน .env
```

**ปัญหา: BullMQ queue ไม่ทำงาน**
```
สาเหตุ: Redis ไม่เชื่อมต่อ หรือ memory เต็ม
แก้ไข:
1. docker exec -it telepharmacy-redis redis-cli ping
2. docker exec -it telepharmacy-redis redis-cli info memory
3. เพิ่ม maxmemory ใน docker-compose.yml
```

### 4.3 Authentication

**ปัญหา: 401 Unauthorized ทุก request**
```
สาเหตุ: JWT_SECRET ไม่ตรงกัน หรือ token หมดอายุ
แก้ไข:
1. ตรวจสอบ JWT_SECRET ใน .env ตรงกันทุก instance
2. ตรวจสอบ JWT_EXPIRATION (default 15m)
3. ตรวจสอบ system clock ของ server
```

**ปัญหา: LINE Login ไม่ทำงาน**
```
สาเหตุ: LIFF ID หรือ Channel Secret ผิด
แก้ไข:
1. ตรวจสอบ LINE_LIFF_ID, LINE_CHANNEL_SECRET
2. ตรวจสอบ Callback URL ใน LINE Developers Console
3. LIFF endpoint URL ต้องเป็น HTTPS
```

### 4.4 Payment

**ปัญหา: PromptPay QR ไม่แสดง**
```
สาเหตุ: Omise keys ไม่ถูกต้อง หรือ PromptPay ไม่ได้เปิดใช้
แก้ไข:
1. ตรวจสอบ OMISE_PUBLIC_KEY, OMISE_SECRET_KEY
2. เปิดใช้ PromptPay ใน Omise Dashboard
3. ตรวจสอบ log API (Docker: `docker compose ... logs api` — PM2: `pm2 logs telepharmacy-api`) แล้ว grep omise
```

### 4.5 Telemedicine / Video Call

**ปัญหา: Video call ไม่เชื่อมต่อ**
```
สาเหตุ: Agora credentials ผิด หรือ firewall block
แก้ไข:
1. ตรวจสอบ AGORA_APP_ID, AGORA_APP_CERTIFICATE
2. เปิด port: UDP 8000-8999, TCP 443
3. ตรวจสอบ browser permissions (camera/microphone)
4. ทดสอบ: https://webdemo.agora.io/basicVideoCall/
```

**ปัญหา: KYC face compare ล้มเหลว**
```
สาเหตุ: AWS Rekognition credentials หรือ region ผิด
แก้ไข:
1. ตรวจสอบ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
2. AWS_REGION ต้องเป็น ap-southeast-1 (Singapore)
3. ตรวจสอบ IAM permissions: rekognition:CompareFaces, rekognition:DetectFaces
```

### 4.6 Next.js production / standalone

**ปัญหา: หน้า Shop/Admin ขาว หรือข้อความ client-side exception / `ChunkLoadError` / โหลด `/_next/static/chunks/*.js` ไม่ได้**

```
สาเหตุ (แบบ B — PM2): หลัง build ยังไม่ได้คัดลอก .next/static และ public เข้าไปในโฟลเดอร์ standalone
แก้ไข:
1. รัน make copy-shop-static และ make copy-admin-static (หรือคำสั่ง cp จาก Makefile)
2. reload process (เช่น pm2 reload telepharmacy-shop / telepharmacy-admin)
3. ตรวจสอบว่า URL static ตอบ 200: curl -sI https://shop.re-ya.com/_next/static/chunks/...

สาเหตุ (แบบ A — Docker): หายาก — image ควรรวม static แล้ว — ถ้าเจอให้ rebuild image โดยไม่ cache เก่า และตรวจสอบ Dockerfile.* ว่า COPY .next/static ครบ
```

### 4.7 Build Errors

**ปัญหา: `Module not found: @telepharmacy/db`**
```
แก้ไข: pnpm build --filter @telepharmacy/db
(ต้อง build packages ก่อน apps)
```

**ปัญหา: `agora-rtc-sdk-ng` import error**
```
แก้ไข:
1. cd apps/shop && pnpm add agora-rtc-sdk-ng
2. Video page ใช้ dynamic import — ต้องรันบน browser เท่านั้น
```

**ปัญหา: TypeScript errors ใน seed files**
```
แก้ไข: tsconfig.json ของ packages/db exclude seed files แล้ว
ถ้ายังมีปัญหา: pnpm build --filter @telepharmacy/db
```

### 4.8 MinIO / Storage

**ปัญหา: Upload ไฟล์ไม่ได้**
```
แก้ไข:
1. ตรวจสอบ MinIO: http://localhost:9001 (admin console)
2. ตรวจสอบ bucket "telepharmacy" มีอยู่
3. ตรวจสอบ MINIO_ACCESS_KEY, MINIO_SECRET_KEY
4. Production: ตรวจสอบ MINIO_USE_SSL=true
```

### 4.9 Meilisearch

**ปัญหา: ค้นหาสินค้าไม่ทำงาน**
```
แก้ไข:
1. ตรวจสอบ Meilisearch: curl http://localhost:7700/health
2. ตรวจสอบ MEILI_HOST, MEILI_MASTER_KEY
3. Sync products: เรียก POST /v1/products/sync จาก admin
4. ตรวจสอบ index: curl http://localhost:7700/indexes -H "Authorization: Bearer <key>"
```

---

## 5. Monitoring & Maintenance

### Prometheus Metrics

เข้าถึง: `http://localhost:9090`

Metrics สำคัญ:
- `http_request_duration_seconds` — API response time
- `http_requests_total` — จำนวน request
- `nodejs_heap_used_bytes` — Memory usage

### Grafana Dashboards

เข้าถึง: `http://localhost:3010` (admin/admin)

Dashboard แนะนำ:
- API Performance — latency, error rate, throughput
- Prescription Queue — SLA compliance, queue depth
- Infrastructure — CPU, memory, disk

### Backup Strategy

```bash
# PostgreSQL daily backup
docker exec telepharmacy-postgres pg_dump -U user telepharmacy > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i telepharmacy-postgres psql -U user telepharmacy < backup_20260331.sql

# MinIO backup (rsync)
docker exec telepharmacy-minio mc mirror local/telepharmacy /backup/minio/
```

### Log Management

**แอปรันใน Docker (แบบ A):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api admin shop
docker compose logs -f
docker compose logs api 2>&1 | grep -i error
```

**แอปรัน PM2 (แบบ B):** `docker compose logs` สำหรับ api/admin/shop จะไม่มี — ใช้ `pm2 logs` หรือไฟล์ใน `apps/api` / `apps/admin` / `apps/shop` ตามที่ตั้งค่า

### Health Check Cron

```bash
# เพิ่มใน crontab
*/5 * * * * curl -sf http://localhost:3000/v1/health || echo "API DOWN" | mail -s "Alert" admin@re-ya.com
```
