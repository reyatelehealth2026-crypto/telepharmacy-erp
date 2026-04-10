# Everything Claude Code (ECC) — Agent Instructions

This file guides **Cursor / Claude agents** working in **telepharmacy-erp** (REYA Pharmacy). It combines harness defaults (agents, skills, workflow) with **project-specific** sources of truth.

**Version:** 1.12.0

---

## Precedence (read in this order)

1. **Root `CLAUDE.md`** — Monorepo layout, API patterns, ports, env vars, compliance context.
2. **`docs/`** — Deploy, developer, product, and architecture docs (see table below).
3. **This file** — Agent roster, workflow, security/testing expectations, `.cursor/` layout.

If anything here disagrees with `CLAUDE.md` or `docs/`, **fix this file** or treat `CLAUDE.md` / `docs/` as authoritative for product and operations.

---

## REYA Telepharmacy ERP — project context

- **Product:** B2C telepharmacy (Thailand), LINE/LIFF shop, NestJS API, PDPA / Thai Pharmacy Act alignment.
- **Brand / URLs (production):** `api.re-ya.com`, `admin.re-ya.com`, `shop.re-ya.com` (see `CLAUDE.md` for health paths and prefixes).
- **Monorepo:** Turborepo + pnpm — `apps/api` (3000), `apps/admin` (3001), `apps/shop` (3002); `packages/db`, `packages/shared`, `packages/ai`; `infra/` metrics configs.
- **Domain-heavy work:** Prefer **`healthcare-reviewer`** (`.cursor/agents/healthcare-reviewer.md`) for clinical safety, PHI, and regulatory-sensitive code paths.

---

## Documentation map (`docs/`)

Use these for runbooks and deep detail; **do not duplicate** long procedures in chat — link or cite paths.

| Document | Purpose |
|----------|---------|
| [`docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) | **Canonical deploy guide** — prerequisites, **production แบบ A (Docker Compose) vs แบบ B (PM2)**, env vars, troubleshooting. |
| [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) | ลิงก์สั้นๆ ชี้ไปที่ `DEPLOYMENT_GUIDE.md` |
| [`docs/DEVELOPER_GUIDE.md`](../docs/DEVELOPER_GUIDE.md) | Local setup, architecture, backend modules, admin/shop libs. |
| [`docs/shop-architecture.md`](../docs/shop-architecture.md) | Shop app structure, LIFF, Zustand, navigation, flows. |
| [`docs/project-integration-map.md`](../docs/project-integration-map.md) | Integration overview across services. |
| [`docs/lineapi.md`](../docs/lineapi.md) | LINE Messaging / LIFF integration notes. |
| [`docs/ROADMAP.md`](../docs/ROADMAP.md) | Product/engineering roadmap. |
| [`docs/CUSTOMER_GUIDE.md`](../docs/CUSTOMER_GUIDE.md) | End-user facing guide. |
| [`docs/ADMIN_USER_GUIDE.md`](../docs/ADMIN_USER_GUIDE.md) | Staff admin usage. |
| [`docs/TELEMEDICINE_STATUS.md`](../docs/TELEMEDICINE_STATUS.md) / [`docs/Telemedicine 2569.md`](../docs/Telemedicine%202569.md) | Telemedicine status and references. |
| [`docs/EXECUTIVE_SUMMARY.md`](../docs/EXECUTIVE_SUMMARY.md) | Executive-level summary. |
| [`docs/PRODUCTION_AUDIT_2026-04-01.md`](../docs/PRODUCTION_AUDIT_2026-04-01.md) | Production audit notes (ops/security follow-ups). |

**Specs (repo root `spec/`):** API design, schema, requirements — see `CLAUDE.md` for the file list.

---

## Production deployment

**Authoritative runbook:** [`docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) — **ขั้นที่ 9** แยก **แบบ A (Docker Compose)** กับ **แบบ B (PM2 บน host)** ชัดเจน

| แบบ | Next.js static / `public` | Makefile ที่เกี่ยวข้อง |
|-----|---------------------------|-------------------------|
| **A** — `make prod-build` / `prod-up` | รวมใน Docker image (`Dockerfile.admin` / `Dockerfile.shop`) — **ไม่ต้อง** `copy-*-static` | `prod-build`, `prod-up`, `prod-restart`, `prod-logs` |
| **B** — build บน host + PM2 | **ต้อง** คัดลอกหลังทุก build ของ admin/shop | `copy-shop-static`, `copy-admin-static`, `deploy-shop`, `deploy-admin` |

`apps/admin` และ `apps/shop` ใช้ **`output: 'standalone'`** — แบบ B เท่านั้นที่ต้องคัดลอก `.next/static` และ `public` เข้า tree ของ standalone ก่อนรัน/reload (ถ้าข้ามจะเกิด **`ChunkLoadError`** / client-side error — ดู [`DEPLOYMENT_GUIDE.md` §4.6](../docs/DEPLOYMENT_GUIDE.md))

ถ้า host **ไม่มี `make`** ให้ใช้ลำดับ `rm`/`cp` ตาม [`Makefile`](../Makefile) เป้าหมาย `copy-shop-static` / `copy-admin-static`

**Frontend:** `NEXT_PUBLIC_*` เป็น **build-time** — เปลี่ยนค่าต้อง **rebuild** (และ build args ของ Docker ถ้าใช้แบบ A)

---

## Operations — ใช้ SSH บนเซิร์ฟเวอร์ production โดยตรง

เมื่อมีงานที่เกี่ยวกับ **deploy, build production, PM2, Docker, log, disk, health check, git pull บนเครื่องจริง** — ให้ **SSH เข้าเซิร์ฟเวอร์แล้วรันคำสั่งที่นั่น** ไม่ใช้เครื่อง local ของผู้ใช้เป็นหลัก (เว้นแต่ผู้ใช้ระบุชัดว่าต้องการรัน local)

| หัวข้อ | นโยบาย |
|--------|--------|
| Build / deploy หลัง merge | `ssh` → `cd ~/telepharmacy-erp` → `git pull` → `pnpm build` / `make deploy-*` / `docker compose ...` ตาม [`DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) |
| ตรวจอาการ production | `pm2 list`, `pm2 logs`, `curl` ไป localhost หรือโดเมน, `docker ps`, `df -h` — บนเซิร์ฟเวอร์ |
| SSH | ใช้ key ที่ทีมกำหนด (เช่น `~/.ssh/reya.pem`) — บน Windows ใช้ `$env:USERPROFILE\.ssh\reya.pem` ใน PowerShell |
| ไม่ทำ | สั่ง `pnpm build` production บน Windows workspace เพื่อ “แทน” deploy จริง โดยไม่จำเป็น (เครื่องอาจเต็ม/ไม่ตรงกับ prod) |

ถ้าไม่มีสิทธิ์ SSH หรือ host ไม่ชัด — ถามผู้ใช้ก่อน อย่าสมมติ credential

---

## Core principles

1. **Agent-first** — Delegate to specialized agents for domain tasks.
2. **Test-driven** — Write tests before implementation; target strong coverage on changed code (project may specify thresholds; `CLAUDE.md` / CI wins).
3. **Security-first** — Never compromise security; validate inputs at boundaries.
4. **Immutability** — Prefer new objects over mutating shared state unless existing code uses a different convention.
5. **Plan before execute** — Plan complex features before large refactors.

---

## Available agents

Full definitions live under **`.cursor/agents/`** (36 agent files). Use the table below for common routing; open the matching `.md` for prompts and constraints.

| Agent | Purpose | When to use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| healthcare-reviewer | Clinical/PHI/regulatory review | EMR, dosing, patient-facing clinical flows |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | Playwright / browser E2E | Critical user flows |
| refactor-cleaner | Dead code cleanup | Maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| database-reviewer | PostgreSQL, schema, queries | DB design and performance |
| docs-lookup | Docs via Context7 | Library/API questions |
| performance-optimizer | Bottlenecks, bundle size | Slow paths, frontend perf |
| cpp-reviewer / cpp-build-resolver | C++ | C++ projects |
| go-reviewer / go-build-resolver | Go | Go projects |
| kotlin-reviewer / kotlin-build-resolver | Kotlin/Android/KMP | Kotlin builds |
| java-reviewer / java-build-resolver | Java/Spring | Java builds |
| python-reviewer | Python | Python projects |
| rust-reviewer / rust-build-resolver | Rust | Rust projects |
| pytorch-build-resolver | PyTorch/CUDA/training | ML training failures |
| typescript-reviewer | TypeScript/JavaScript | TS/JS review |
| flutter-reviewer | Flutter/Dart | Flutter apps |
| gan-planner / gan-generator / gan-evaluator | GAN harness | Spec-driven iterative delivery |
| opensource-forker / opensource-sanitizer / opensource-packager | Open-source pipeline | Forking and release hygiene |
| chief-of-staff | Communication triage | Multi-channel comms workflows |
| loop-operator | Autonomous loop execution | Long-running loops, monitoring |
| harness-optimizer | Harness config | Reliability, cost, throughput |

**Orchestration (typical):** complex feature → **planner**; after edits → **code-reviewer**; bugs/features with tests → **tdd-guide**; architecture → **architect**; secrets/auth/input surfaces → **security-reviewer**; clinical/patient safety → **healthcare-reviewer**. Parallelize independent work.

---

## Security guidelines

**Before commits touching auth, data, or APIs:**

- No hardcoded secrets; env vars or secret manager.
- Validate and sanitize user input; parameterized SQL; XSS/CSRF awareness per stack.
- Rate limiting and safe error messages on APIs (`CLAUDE.md` response/error shape).

**If a security issue is found:** stop → **security-reviewer** → fix critical issues → rotate exposed secrets → scan for similar patterns.

---

## Coding style (summary)

- Prefer small, cohesive modules; match existing project style and naming.
- Handle errors at boundaries; log server-side detail; user-friendly messages in UI.
- Validate at system boundaries (Zod/schemas in this repo where used).

---

## Testing

- Prefer tests for new logic and regressions; follow **tdd-guide** when the task is test-appropriate.
- API/integration/E2E expectations align with `CLAUDE.md` and `package.json` scripts.

---

## Development workflow

1. **Plan** — For large work, use **planner**; note dependencies and risks.
2. **Implement** — Match `CLAUDE.md` API and module patterns.
3. **Test** — **tdd-guide** when tests are in scope.
4. **Review** — **code-reviewer** (and **healthcare-reviewer** / **security-reviewer** when relevant).
5. **Document** — Put durable runbooks in **`docs/`** (e.g. extend `DEPLOYMENT_GUIDE.md` for new ops steps); avoid one-off root markdown unless the team asks.
6. **Commit** — Conventional commits; PR with summary and test plan.

## Workflow surface policy

- **`skills/`** (under `.cursor/skills/`) is the primary workflow surface for skills in this harness.
- **`commands/`** is legacy slash-entry compatibility; change only when needed for migration parity.

---

## Git workflow

**Commit format:** `<type>: <description>` — feat, fix, refactor, docs, test, chore, perf, ci.

**PRs:** Summarize commits, list test evidence, note deploy impact (especially if **Next rebuild + static copy** is required).

---

## Architecture patterns (generic)

- API: consistent success/error envelopes (see `CLAUDE.md` for this repo).
- Repository-style data access where the codebase already uses it.

---

## Performance

- Avoid burning the entire context window on huge refactors; split work.
- Use **build-error-resolver** / **performance-optimizer** as appropriate.

---

## Repository structure

**Telepharmacy monorepo (high level):**

```
apps/api, apps/admin, apps/shop
packages/db, packages/shared, packages/ai
docs/, spec/, infra/
docker-compose.yml, docker-compose.prod.yml
Makefile                    # dev, db, prod-docker, copy-*-static, deploy-*
CLAUDE.md                   # project source of truth for agents
```

**Cursor harness (this repo):**

```
.cursor/AGENTS.md           # this file
.cursor/agents/             # agent definitions
.cursor/skills/             # skills (workflow + domain)
.cursor/commands/           # legacy slash commands
.cursor/hooks/              # automation hooks
.cursor/rules/              # optional always-on rules
.cursor/scripts/, .cursor/mcp-configs/
```

Skills count and command lists change over time — **prefer listing directories** over hardcoded numbers in this file.

---

## Success metrics

- Requirements met; tests and lint/type-check pass for touched areas.
- No new security or clinical-safety regressions in scope.
- Deploy steps respected when shipping **admin/shop** production builds (**standalone static copy**).
