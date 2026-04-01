# Production Audit Report — 1 April 2026

> Server: EC2 `100.24.30.221` | Domains: `*.re-ya.com`

## Infrastructure Status

| Service | Container | Status | Version |
|---------|-----------|--------|---------|
| API (NestJS) | telepharmacy-api | ✅ Healthy | port 3000 |
| Admin (Next.js) | telepharmacy-admin | ✅ Healthy | port 3001 |
| Shop (Next.js) | telepharmacy-shop | ✅ Healthy | port 3002 |
| PostgreSQL | telepharmacy-postgres | ✅ Healthy | 16-alpine |
| Redis | telepharmacy-redis | ✅ PONG | 7-alpine |
| Meilisearch | telepharmacy-meilisearch | ✅ Available | v1.11 |
| MinIO | telepharmacy-minio | ✅ Running | latest |
| Traefik | telepharmacy-traefik | ✅ Running | v3.3 |
| Prometheus | telepharmacy-prometheus | ✅ Running | v3.2.1 |
| Grafana | telepharmacy-grafana | ✅ Running | 11.5.2 |

## SSL / Domain Access

| Domain | Protocol | Status |
|--------|----------|--------|
| api.re-ya.com | HTTPS | ✅ 200 |
| admin.re-ya.com | HTTPS | ✅ 307 → login |
| shop.re-ya.com | HTTPS | ✅ 200 |

## Server Resources

| Resource | ค่า | สถานะ |
|----------|-----|-------|
| Instance | EC2 (2 vCPU) | ⚠️ ต่ำสำหรับ production |
| RAM | 3.8 GB total / 1.5 GB used | ⚠️ เหลือน้อย |
| Disk | 50 GB / 34 GB used (67%) | ⚠️ ควรเพิ่ม |
| Swap | 4 GB / 215 MB used | ✅ OK |
| Docker Images | 2.3 GB (cleaned) | ✅ OK |
| Node.js | v20.20.2 | ✅ |
| pnpm | 10.33.0 | ✅ |

## Database

- 45 tables in `public` schema
- DB readiness: ✅ `database: up`
- Connection pool: max 10 (postgres.js)

## Issues Found & Fixed

| # | ปัญหา | ความรุนแรง | สถานะ |
|---|--------|-----------|-------|
| 1 | DB auth error ทุก 1 นาที (password mismatch หลัง container recreate) | 🔴 Critical | ✅ Fixed — ALTER ROLE password |
| 2 | Docker images เก่าสะสม 7.4 GB | 🟡 Medium | ✅ Fixed — docker image prune |

## Issues Remaining

| # | ปัญหา | ความรุนแรง | แผนแก้ไข |
|---|--------|-----------|----------|
| 1 | **Ports เปิดสู่ internet ทั้งหมด** — PostgreSQL (5432), Redis (6379), Meilisearch (7700), MinIO (9000/9001), Prometheus (9090), Grafana (3010), Traefik (8080) | 🔴 Critical | Phase A |
| 2 | **Default passwords** — PostgreSQL `user:pass`, MinIO `minioadmin:minioadmin` | 🔴 Critical | Phase A |
| 3 | **Redis cache ว่าง** (dbsize=0) — ไม่มี caching strategy | 🟠 High | Phase C |
| 4 | **Server spec ต่ำ** — 2 cores / 3.8 GB สำหรับ 11 containers | 🟠 High | Phase C |
| 5 | **ไม่มี automated backup** | 🟠 High | Phase B |
| 6 | **Monitoring ยังไม่ config** — Prometheus/Grafana ไม่มี dashboards/alerts | 🟡 Medium | Phase D |
| 7 | **API version = 0.0.0** — ไม่มี version tracking | 🟡 Low | Phase D |

---

## Upgrade Plan

### Phase A — Security Hardening (ทำทันที ⏰)

**เวลา:** 1-2 ชั่วโมง | **ความเสี่ยงถ้าไม่ทำ:** สูงมาก

1. **AWS Security Group** — ปิด ports ทั้งหมด เปิดแค่:
   - 80, 443 (HTTP/HTTPS) — public
   - 22 (SSH) — เฉพาะ IP ที่กำหนด
   - ปิด 5432, 6379, 7700, 9000, 9001, 8080, 9090, 3010 จาก public

2. **Docker port binding** — เปลี่ยนจาก `0.0.0.0:PORT` เป็น `127.0.0.1:PORT` สำหรับ internal services:
   ```yaml
   # docker-compose.yml
   postgres:
     ports: ["127.0.0.1:5432:5432"]
   redis:
     ports: ["127.0.0.1:6379:6379"]
   meilisearch:
     ports: ["127.0.0.1:7700:7700"]
   ```

3. **เปลี่ยน default passwords:**
   - PostgreSQL: เปลี่ยนจาก `pass` เป็น strong password
   - MinIO: เปลี่ยนจาก `minioadmin` เป็น strong password
   - Grafana: เปลี่ยนจาก `admin:admin`

4. **Traefik dashboard** — ปิด `api.insecure` หรือเพิ่ม basic auth

### Phase B — Reliability (สัปดาห์นี้)

**เวลา:** 2-4 ชั่วโมง

1. **Automated DB backup:**
   ```bash
   # crontab -e
   0 3 * * * docker exec telepharmacy-postgres pg_dump -U user telepharmacy | gzip > /home/ec2-user/backups/db-$(date +\%Y\%m\%d).sql.gz
   0 4 * * * find /home/ec2-user/backups -name "*.sql.gz" -mtime +7 -delete
   ```

2. **Docker log rotation:**
   ```json
   // /etc/docker/daemon.json
   { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
   ```

3. **Health check alerts** — simple script ที่ check API health ทุก 5 นาที

### Phase C — Performance (สัปดาห์หน้า)

**เวลา:** 1-2 วัน

1. **อัพ EC2 instance:**
   - จาก t3.medium (2 vCPU / 4 GB) → t3.large (2 vCPU / 8 GB) หรือ t3.xlarge (4 vCPU / 16 GB)
   - เพิ่ม EBS volume → 100 GB

2. **แยก Database:**
   - ย้าย PostgreSQL ไป Amazon RDS (automated backup, failover, monitoring)
   - ย้าย Redis ไป ElastiCache

3. **Redis caching strategy:**
   - Drug interaction results (TTL 24h)
   - Product catalog (TTL 1h)
   - System config (TTL 1m — DynamicConfigService)

4. **Next.js optimization:**
   - Bundle analysis (`@next/bundle-analyzer`)
   - Image optimization via MinIO CDN
   - Static page generation where possible

### Phase D — Production Readiness (2 สัปดาห์)

**เวลา:** 3-5 วัน

1. **Grafana dashboards:**
   - API latency (p50, p95, p99)
   - Prescription queue SLA
   - Error rate by endpoint
   - DB connection pool usage

2. **CI/CD auto-deploy:**
   ```yaml
   # .github/workflows/deploy.yml
   on:
     push:
       branches: [master]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - SSH → git pull → docker compose build → restart
   ```

3. **Load testing** — k6 หรือ Artillery target 1,000 concurrent users

4. **PDPA compliance audit** — ตรวจสอบ consent flow, data retention, audit trail

5. **Meilisearch Thai tokenizer** — config สำหรับ product search ภาษาไทย

---

## Docs ที่เก็บไว้

| ไฟล์ | เนื้อหา |
|------|---------|
| ROADMAP.md | Development roadmap ทั้งหมด |
| DEPLOYMENT_GUIDE.md | คู่มือ deploy ฉบับสมบูรณ์ |
| DEVELOPER_GUIDE.md | คู่มือ developer |
| ADMIN_USER_GUIDE.md | คู่มือใช้งาน admin dashboard |
| CUSTOMER_GUIDE.md | คู่มือลูกค้า |
| EXECUTIVE_SUMMARY.md | สรุปสำหรับผู้บริหาร |
| TELEMEDICINE_STATUS.md | สถานะ telemedicine module |
| Telemedicine 2569.md | กฎหมาย telemedicine reference |
| project-integration-map.md | แผนที่ API ↔ Frontend connections |
| shop-architecture.md | สถาปัตยกรรม shop app |
| PRODUCTION_AUDIT_2026-04-01.md | รายงานตรวจสอบ + แผนอัพเกรด (ไฟล์นี้) |

## Docs ที่ลบ (27 ไฟล์)

task-*.md (10 ไฟล์), plans/*.md (4 ไฟล์), duplicates (DEPLOYMENT copy, AUDIT copy, EXECUTIVE copy), logs (.log), SESSION_MEMORY, IMPLEMENTATION_COMPLETE, phase-3-completion-summary, telemedicine-infrastructure-setup
