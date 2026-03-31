# Deployment Guide — Telepharmacy ERP

คู่มือ deploy ระบบ Telepharmacy ERP สำหรับ production server

---

## สารบัญ

1. [ข้อกำหนดเบื้องต้น](#1-ข้อกำหนดเบื้องต้น)
2. [วิธี A: Docker Compose (แนะนำ)](#2-วิธี-a-docker-compose-แนะนำ)
3. [วิธี B: PM2 + Docker Infra](#3-วิธี-b-pm2--docker-infra)
4. [ตั้งค่า DNS & Domain](#4-ตั้งค่า-dns--domain)
5. [ตั้งค่า LINE Platform](#5-ตั้งค่า-line-platform)
6. [Database Migration](#6-database-migration)
7. [Backup & Restore](#7-backup--restore)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [SSL/TLS Certificate](#9-ssltls-certificate)
10. [Scaling](#10-scaling)
11. [Rollback](#11-rollback)
12. [Security Checklist](#12-security-checklist)

---

## 1. ข้อกำหนดเบื้องต้น

### Hardware (Minimum)

| Resource | Minimum | แนะนำ |
|----------|---------|-------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 100 GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software

| Software | Version | หมายเหตุ |
|----------|---------|---------|
| OS | Ubuntu 22.04 LTS+ / Debian 12+ | |
| Docker | 24+ | `docker compose` v2 built-in |
| Node.js | ≥ 20 | เฉพาะวิธี B (PM2) |
| pnpm | ≥ 10 | เฉพาะวิธี B |
| PM2 | latest | เฉพาะวิธี B |

### ติดตั้ง Docker (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## 2. วิธี A: Docker Compose (แนะนำ)

วิธีนี้ deploy ทุกอย่างผ่าน Docker — ทั้ง infrastructure และ application containers

### 2.1 เตรียม Server

```bash
# Clone repository
git clone <repo-url> /opt/telepharmacy-erp
cd /opt/telepharmacy-erp

# สร้าง .env จาก template
cp .env.example .env
```

### 2.2 ตั้งค่า Environment Variables

แก้ไข `.env` ด้วยค่า production:

```bash
nano .env
```

**ค่าที่ต้องเปลี่ยน (สำคัญมาก):**

```bash
# สร้าง secrets
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
MEILI_MASTER_KEY=$(openssl rand -hex 16)

# Database — ใช้ password ที่แข็งแรง
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://user:<strong-random-password>@postgres:5432/telepharmacy

# MinIO — เปลี่ยนจาก default
MINIO_ACCESS_KEY=<random-access-key>
MINIO_SECRET_KEY=<random-secret-key>

# LINE credentials (จาก LINE Developers Console)
LINE_CHANNEL_ACCESS_TOKEN=<your-token>
LINE_CHANNEL_SECRET=<your-secret>
LINE_LIFF_ID=<your-liff-id>
NEXT_PUBLIC_LIFF_ID=<your-liff-id>

# Gemini AI
GEMINI_API_KEY=<your-gemini-key>

# Omise Payment (ถ้าใช้)
OMISE_PUBLIC_KEY=<your-key>
OMISE_SECRET_KEY=<your-key>

# Production URLs
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.re-ya.com
NEXT_PUBLIC_SHOP_URL=https://shop.re-ya.com
NEXT_PUBLIC_ADMIN_API_URL=https://api.re-ya.com
```

### 2.3 Build & Deploy

```bash
# Build Docker images
make prod-build

# หรือ
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# เริ่มทุก service
make prod-up

# หรือ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2.4 ตรวจสอบ

```bash
# ดูสถานะ containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# ดู logs
make prod-logs

# Health check
curl https://api.re-ya.com/v1/health
curl https://api.re-ya.com/v1/health/ready
```

### 2.5 Update / Re-deploy

```bash
cd /opt/telepharmacy-erp

# ดึง code ใหม่
git pull origin main

# Rebuild & restart
make prod-build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api admin shop
```

---

## 3. วิธี B: PM2 + Docker Infra

วิธีนี้รัน infrastructure ผ่าน Docker แต่รัน Node.js apps ผ่าน PM2 โดยตรง — เหมาะสำหรับ debug ง่ายกว่า

### 3.1 ติดตั้ง Node.js & pnpm

```bash
# ติดตั้ง Node.js 20 ผ่าน fnm
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 20
fnm use 20

# เปิด corepack สำหรับ pnpm
corepack enable
corepack prepare pnpm@latest --activate

# ติดตั้ง PM2
npm install -g pm2
```

### 3.2 เตรียม Application

```bash
git clone <repo-url> /opt/telepharmacy-erp
cd /opt/telepharmacy-erp

cp .env.example .env
nano .env  # ตั้งค่า production (ดูหัวข้อ 2.2)

pnpm install --frozen-lockfile
```

### 3.3 เริ่ม Infrastructure

```bash
docker compose up -d
```

### 3.4 Database Migration

```bash
pnpm db:migrate
```

### 3.5 Build & Start

```bash
# Build ทุก app
pnpm build

# เริ่มด้วย PM2
pm2 start ecosystem.config.cjs --env production

# ตั้งค่า auto-start เมื่อ server reboot
pm2 save
pm2 startup
```

### 3.6 PM2 Commands

```bash
pm2 status                    # ดูสถานะ
pm2 logs                      # ดู logs ทั้งหมด
pm2 logs telepharmacy-api     # ดู logs เฉพาะ API
pm2 restart all               # Restart ทั้งหมด
pm2 restart telepharmacy-api  # Restart เฉพาะ API
pm2 reload all                # Zero-downtime reload
pm2 monit                     # Monitor dashboard
```

### 3.7 Update / Re-deploy (PM2)

```bash
cd /opt/telepharmacy-erp
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 reload all  # zero-downtime reload
```

---

## 4. ตั้งค่า DNS & Domain

### DNS Records

เพิ่ม A records ที่ domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api.re-ya.com | `<server-ip>` | 300 |
| A | admin.re-ya.com | `<server-ip>` | 300 |
| A | shop.re-ya.com | `<server-ip>` | 300 |

### ตรวจสอบ DNS

```bash
dig api.re-ya.com +short
dig admin.re-ya.com +short
dig shop.re-ya.com +short
```

---

## 5. ตั้งค่า LINE Platform

### 5.1 Messaging API Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider → สร้าง Messaging API Channel
3. ตั้งค่า:
   - **Webhook URL:** `https://api.re-ya.com/v1/line/webhook`
   - **Use webhook:** ON
   - **Auto-reply messages:** OFF
   - **Greeting messages:** OFF (จัดการผ่าน code)
4. คัดลอก **Channel Access Token** (long-lived) และ **Channel Secret**

### 5.2 LIFF App

1. ใน LINE Developers Console → Channel → LIFF tab
2. สร้าง LIFF App:
   - **Size:** Full
   - **Endpoint URL:** `https://shop.re-ya.com`
   - **Scope:** `profile`, `openid`
   - **Bot link feature:** Aggressive
3. คัดลอก **LIFF ID** ใส่ `NEXT_PUBLIC_LIFF_ID`

### 5.3 Rich Menu

1. ไปที่ [LINE Official Account Manager](https://manager.line.biz/)
2. สร้าง Rich Menu ที่ลิงก์ไปยัง LIFF URL: `https://liff.line.me/<LIFF_ID>`

### 5.4 ทดสอบ Webhook

```bash
# ส่ง test event
curl -X POST https://api.re-ya.com/v1/line/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test" \
  -d '{"events":[]}'
```

---

## 6. Database Migration

### Production Migration Workflow

```bash
# 1. สร้าง migration files (ทำบน dev machine)
pnpm db:generate

# 2. ตรวจสอบ SQL ที่สร้าง
ls packages/db/drizzle/

# 3. Commit migration files
git add packages/db/drizzle/
git commit -m "add: database migration"

# 4. Deploy & run migration บน server
git pull origin main
pnpm db:migrate
```

### Emergency: Push Schema โดยตรง

⚠️ **ใช้เฉพาะ development เท่านั้น** — อาจทำให้ข้อมูลหาย

```bash
pnpm db:push
```

---

## 7. Backup & Restore

### Database Backup

```bash
# Manual backup
docker compose exec postgres pg_dump -U user telepharmacy > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose exec postgres pg_dump -U user -Fc telepharmacy > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Automated Daily Backup (cron)

```bash
# เพิ่มใน crontab
crontab -e
```

```cron
# Backup ทุกวัน 02:00 เก็บไว้ 30 วัน
0 2 * * * cd /opt/telepharmacy-erp && docker compose exec -T postgres pg_dump -U user -Fc telepharmacy > /opt/backups/telepharmacy_$(date +\%Y\%m\%d).dump && find /opt/backups -name "telepharmacy_*.dump" -mtime +30 -delete
```

### Restore

```bash
# จาก SQL file
docker compose exec -T postgres psql -U user telepharmacy < backup.sql

# จาก compressed dump
docker compose exec -T postgres pg_restore -U user -d telepharmacy --clean < backup.dump
```

### MinIO (File Storage) Backup

```bash
# ติดตั้ง mc (MinIO Client)
docker run --rm -v /opt/backups/minio:/backup \
  --network telepharmacy-erp_telepharmacy \
  minio/mc sh -c "
    mc alias set local http://minio:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY;
    mc mirror local/telepharmacy /backup/telepharmacy;
  "
```

---

## 8. Monitoring & Alerting

### Prometheus

- **URL:** `http://<server-ip>:9090`
- **Scrape targets:**
  - API metrics: `:3000/metrics`
  - PostgreSQL: `:5432`
  - Redis: `:6379`
  - Meilisearch: `:7700/metrics`
  - Traefik: `:8080`

### Grafana

- **URL:** `http://<server-ip>:3002` (เปลี่ยน port ถ้าชนกับ shop)
- **Login:** admin / admin (เปลี่ยนหลัง login ครั้งแรก)
- **Datasource:** Prometheus (pre-configured)

### Health Check Script

สร้าง script สำหรับ monitoring:

```bash
#!/bin/bash
# /opt/telepharmacy-erp/scripts/health-check.sh

API_URL="https://api.re-ya.com/v1/health/ready"
RESPONSE=$(curl -sf -o /dev/null -w "%{http_code}" "$API_URL" --max-time 10)

if [ "$RESPONSE" != "200" ]; then
  echo "[$(date)] ALERT: API health check failed (HTTP $RESPONSE)" >> /var/log/telepharmacy-health.log
  # ส่ง LINE notification หรือ email alert ที่นี่
fi
```

เพิ่มใน crontab:

```cron
*/5 * * * * /opt/telepharmacy-erp/scripts/health-check.sh
```

---

## 9. SSL/TLS Certificate

### Traefik + Let's Encrypt (อัตโนมัติ)

Traefik จัดการ SSL certificate อัตโนมัติผ่าน Let's Encrypt — ไม่ต้องทำอะไรเพิ่ม ถ้า:

1. DNS records ชี้มาที่ server ถูกต้อง
2. Port 80 และ 443 เปิดอยู่
3. Email ตั้งค่าใน Traefik config (`admin@re-ya.com`)

### ตรวจสอบ Certificate

```bash
# ดู certificate
echo | openssl s_client -connect api.re-ya.com:443 -servername api.re-ya.com 2>/dev/null | openssl x509 -noout -dates

# ดู Traefik ACME storage
docker compose exec traefik cat /letsencrypt/acme.json | python -m json.tool
```

### Firewall

```bash
# เปิด port ที่จำเป็น
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

---

## 10. Scaling

### Horizontal Scaling (API)

API (NestJS) รองรับ cluster mode:

**PM2:**
```bash
# ecosystem.config.cjs มี instances: 'max' อยู่แล้ว
pm2 scale telepharmacy-api 4  # ปรับจำนวน instances
```

**Docker:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=3
```

### Database Connection Pooling

สำหรับ production ที่มี traffic สูง ควรใช้ connection pooler:

```bash
# เพิ่ม PgBouncer ใน docker-compose.prod.yml
pgbouncer:
  image: edoburu/pgbouncer
  environment:
    DATABASE_URL: postgresql://user:pass@postgres:5432/telepharmacy
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 200
    DEFAULT_POOL_SIZE: 20
```

---

## 11. Rollback

### Docker Compose Rollback

```bash
# ดู image history
docker images | grep telepharmacy

# Rollback ไป commit ก่อนหน้า
cd /opt/telepharmacy-erp
git log --oneline -5  # ดู commit history
git checkout <previous-commit>
make prod-build
make prod-up
```

### PM2 Rollback

```bash
cd /opt/telepharmacy-erp
git checkout <previous-commit>
pnpm install --frozen-lockfile
pnpm build
pm2 reload all
```

### Database Rollback

```bash
# Restore จาก backup
docker compose exec -T postgres pg_restore -U user -d telepharmacy --clean < /opt/backups/telepharmacy_YYYYMMDD.dump
```

---

## 12. Security Checklist

ก่อน go-live ตรวจสอบรายการนี้:

- [ ] เปลี่ยน `JWT_SECRET` และ `JWT_REFRESH_SECRET` จาก default
- [ ] เปลี่ยน `MEILI_MASTER_KEY` จาก default
- [ ] เปลี่ยน `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` จาก default
- [ ] ตั้ง `POSTGRES_PASSWORD` ที่แข็งแรง
- [ ] ตั้ง `NODE_ENV=production`
- [ ] ปิด Traefik dashboard (`api.insecure=false`) หรือตั้ง auth
- [ ] ปิด Grafana default password (เปลี่ยนหลัง login)
- [ ] ตั้ง firewall — เปิดเฉพาะ port 80, 443, 22
- [ ] ปิด port ที่ไม่จำเป็นจากภายนอก (5432, 6379, 7700, 9000, 9090)
- [ ] ตั้ง automated backup (database + MinIO)
- [ ] ตั้ง health check monitoring
- [ ] ตรวจสอบ PDPA consent flow ทำงานถูกต้อง
- [ ] ตรวจสอบ LINE webhook signature verification
- [ ] ตั้ง rate limiting ที่เหมาะสม
- [ ] ตรวจสอบ CORS settings สำหรับ production domains
- [ ] ไม่มี `.env` file ใน git repository

---

## Quick Reference

| Action | Command |
|--------|---------|
| เริ่ม production | `make prod-up` |
| หยุด production | `make prod-down` |
| ดู logs | `make prod-logs` |
| Restart apps | `make prod-restart` |
| Health check | `make health` |
| DB backup | `docker compose exec postgres pg_dump -U user telepharmacy > backup.sql` |
| DB migrate | `pnpm db:migrate` |
| Update code | `git pull && make prod-build && make prod-up` |
