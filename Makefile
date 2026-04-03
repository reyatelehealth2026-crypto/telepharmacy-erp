.PHONY: help install dev dev-api dev-admin dev-shop build clean
.PHONY: infra infra-down infra-logs infra-ps
.PHONY: db-push db-generate db-migrate db-studio
.PHONY: prod-build prod-up prod-down prod-logs prod-restart
.PHONY: copy-shop-static copy-admin-static deploy-shop deploy-admin
.PHONY: health lint type-check test format

help: ## แสดงคำสั่งทั้งหมด
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ──────────────────────────────────────────────

install: ## ติดตั้ง dependencies
	pnpm install

dev: ## เริ่มทุก app ใน dev mode
	pnpm dev

dev-api: ## เริ่มเฉพาะ API
	pnpm dev:api

dev-admin: ## เริ่มเฉพาะ Admin Dashboard
	pnpm dev:admin

dev-shop: ## เริ่มเฉพาะ Customer Shop
	pnpm dev:shop

build: ## Build ทุก app
	pnpm build

clean: ## ลบ build artifacts
	pnpm clean

# ─── Infrastructure (Docker) ─────────────────────────────────

infra: ## เริ่ม infrastructure services (PG, Redis, Meili, MinIO, etc.)
	docker compose up -d

infra-down: ## หยุด infrastructure services
	docker compose down

infra-logs: ## ดู logs ของ infrastructure
	docker compose logs -f

infra-ps: ## ดูสถานะ infrastructure services
	docker compose ps

# ─── Database ─────────────────────────────────────────────────

db-push: ## Push schema ไป DB โดยตรง (dev only)
	pnpm db:push

db-generate: ## สร้าง migration files
	pnpm db:generate

db-migrate: ## รัน pending migrations
	pnpm db:migrate

db-studio: ## เปิด Drizzle Studio
	cd packages/db && pnpm db:studio

# ─── Production (Docker Compose) ─────────────────────────────

prod-build: ## Build production Docker images
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-up: ## เริ่ม production (infra + apps)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down: ## หยุด production
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-logs: ## ดู production logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api admin shop

prod-restart: ## Restart production apps (ไม่รวม infra)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api admin shop

# ─── Quality ──────────────────────────────────────────────────

lint: ## Lint ทุก app
	pnpm lint

type-check: ## TypeScript type checking
	pnpm type-check

test: ## รัน tests
	pnpm test

format: ## Format code ด้วย Prettier
	pnpm format

# ─── Health Check ─────────────────────────────────────────────

health: ## ตรวจสอบ API health
	@curl -sf http://localhost:3000/v1/health | python -m json.tool 2>/dev/null || curl -sf http://localhost:3000/v1/health || echo "API is not running"

health-ready: ## ตรวจสอบ API readiness (DB connection)
	@curl -sf http://localhost:3000/v1/health/ready | python -m json.tool 2>/dev/null || curl -sf http://localhost:3000/v1/health/ready || echo "API is not ready"

# ─── Standalone Static Copy (REQUIRED after every Next.js build) ──────────────
# Next.js standalone mode does NOT auto-copy static assets; must copy manually.
# Run these after `pnpm --filter @telepharmacy/shop build` (or admin build).

copy-shop-static: ## คัดลอก static assets ไปยัง standalone output (shop)
	rm -rf apps/shop/.next/standalone/apps/shop/.next/static
	cp -r apps/shop/.next/static apps/shop/.next/standalone/apps/shop/.next/static
	rm -rf apps/shop/.next/standalone/apps/shop/public
	cp -r apps/shop/public apps/shop/.next/standalone/apps/shop/public
	@echo "✅ Shop static assets copied to standalone"

copy-admin-static: ## คัดลอก static assets ไปยัง standalone output (admin)
	rm -rf apps/admin/.next/standalone/apps/admin/.next/static
	cp -r apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/static
	rm -rf apps/admin/.next/standalone/apps/admin/public
	cp -r apps/admin/public apps/admin/.next/standalone/apps/admin/public
	@echo "✅ Admin static assets copied to standalone"

deploy-shop: ## Build shop + copy static + reload PM2
	pnpm --filter @telepharmacy/shop build
	$(MAKE) copy-shop-static
	npx pm2 reload telepharmacy-shop
	@echo "✅ Shop deployed"

deploy-admin: ## Build admin + copy static + reload PM2
	pnpm --filter @telepharmacy/admin build
	$(MAKE) copy-admin-static
	npx pm2 reload telepharmacy-admin
	@echo "✅ Admin deployed"
