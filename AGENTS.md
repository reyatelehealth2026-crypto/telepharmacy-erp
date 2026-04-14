# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

See `CLAUDE.md` for full project overview. This is a Turborepo + pnpm monorepo with three apps (`apps/api`, `apps/admin`, `apps/shop`) and three packages (`packages/db`, `packages/shared`, `packages/ai`).

### Infrastructure

Docker is required. Start PostgreSQL and Redis (minimum required):

```bash
sudo dockerd &>/dev/null &  # if Docker daemon not running
sudo docker compose up -d postgres redis
```

### Environment variables

The root `.env` file is created from `.env.example`. The NestJS API reads `process.env` directly — turbo's `globalEnv` in `turbo.json` only lists `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, so other env vars (e.g. `JWT_SECRET`) do **not** pass through `pnpm dev:api` (which uses turbo). To work around this:

- **API**: Run directly from `apps/api` with env vars prefixed, e.g.:
  ```bash
  cd apps/api && JWT_SECRET=... JWT_REFRESH_SECRET=... DATABASE_URL=... npx nest start --watch
  ```
- **Admin/Shop**: Run with `NEXT_PUBLIC_*` vars:
  ```bash
  cd apps/admin && NEXT_PUBLIC_API_URL=http://localhost:3000 npx next dev -p 3001
  cd apps/shop && NEXT_PUBLIC_API_URL=http://localhost:3000 NEXT_PUBLIC_LIFF_ID=dummy npx next dev -p 3002
  ```

Required env vars for the API to boot: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`. All others have defaults or are optional for local dev.

### Database

After starting PostgreSQL, push the schema and seed:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/telepharmacy pnpm db:push
DATABASE_URL=postgresql://user:pass@localhost:5432/telepharmacy pnpm db:seed
```

Default DB credentials (from `docker-compose.yml`): `user` / `pass` / `telepharmacy`.

Seed creates three staff accounts:
- `admin@re-ya.com` / `Admin@reya2024!` (super_admin)
- `pharmacist@re-ya.com` / `Pharm@reya2024!` (pharmacist)
- `staff@re-ya.com` / `Staff@reya2024!` (customer_service)

### Running tests

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/telepharmacy REDIS_URL=redis://localhost:6379 pnpm test
```

Tests are only in `apps/api` (Jest). Packages have no tests.

### Lint & type-check

- `pnpm lint` — requires eslint (not installed as a dependency in some packages; expect failures in `@telepharmacy/shared`, `@telepharmacy/ai`, `@telepharmacy/db`). The admin and shop apps use `next lint` and work fine.
- `pnpm type-check` — pre-existing type errors exist in `apps/api` (telemedicine module primarily). Packages and frontend apps type-check clean.

### Known issues (pre-existing)

- Orders page in admin dashboard has a runtime error (`meta.total` undefined) — pre-existing bug in `apps/admin/src/app/dashboard/orders/page.tsx`.
- ESLint is not installed as a dependency in `packages/shared`, `packages/ai`, and `packages/db` but lint scripts reference it.
- Several TypeScript strict-mode errors in `apps/api/src/modules/telemedicine/` — pre-existing.
