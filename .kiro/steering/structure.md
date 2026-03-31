# Project Structure

## Monorepo Layout

```
telepharmacy-erp/
├── apps/
│   ├── api/          # NestJS backend
│   ├── admin/        # Next.js admin dashboard
│   └── shop/         # Next.js customer LIFF app
├── packages/
│   ├── db/           # Drizzle ORM schemas & migrations
│   ├── shared/       # Common types & Zod validators
│   └── ai/           # Gemini AI integrations
├── infra/            # Prometheus, Grafana, Redis configs
└── docker-compose.yml
```

## Backend API (apps/api/src/)

```
├── main.ts
├── app.module.ts
├── config/              # NestJS config modules (app, db, jwt, line, odoo, meilisearch, telemedicine)
├── database/            # Database connection module
├── common/              # Decorators, filters, interceptors, pipes
└── modules/
    ├── adherence/       # Medication reminders
    ├── adr/             # Adverse drug reactions
    ├── auth/            # JWT auth + Passport
    ├── compliance/      # General compliance
    ├── drug-info/       # Drug information
    ├── drug-safety/     # Drug interaction checks
    ├── health/          # Health check endpoints
    ├── inventory/       # Stock management
    ├── line/            # LINE webhooks & messaging
    ├── loyalty/         # Points system
    ├── notifications/   # Push notifications
    ├── odoo/            # Odoo ERP integration
    ├── orders/          # Order processing
    ├── patient/         # Patient management
    ├── payment/         # Omise/PromptPay
    ├── prescription/    # Prescription workflow
    ├── product/         # Product catalog
    ├── reports/         # Analytics
    └── telemedicine/    # Thai Telemedicine Act 2569
        ├── audit/       # Audit trail
        ├── compliance/  # Compliance monitoring & documentation
        ├── consent/     # Informed consent + PDF generation
        ├── consultation/# Video/chat sessions (Agora)
        ├── kyc/         # Identity verification
        ├── license/     # Pharmacist license verification
        ├── pdpa/        # PDPA data protection
        ├── referral/    # Patient referral system
        └── scope/       # Scope-of-practice validation
```

### NestJS Module Pattern
```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Zod-based DTOs
└── *.spec.ts                  # Jest tests
```

## Admin Dashboard (apps/admin/src/)

```
├── app/
│   ├── (auth)/login/          # Staff login
│   ├── dashboard/             # Protected routes
│   │   ├── pharmacist/        # Prescription queue
│   │   ├── orders/            # Order management
│   │   ├── patients/          # Patient records
│   │   ├── products/          # Product catalog
│   │   ├── inventory/         # Stock management
│   │   ├── reports/           # Analytics
│   │   └── settings/          # System config
│   └── layout.tsx
├── components/                # Reusable UI components
├── lib/                       # API client, auth context, utilities
└── middleware.ts               # Auth middleware
```

## Customer Shop (apps/shop/src/)

```
├── app/(shop)/                # LIFF app routes
│   ├── search/                # Product search
│   ├── product/[id]/          # Product details
│   ├── cart/                  # Shopping cart
│   ├── checkout/              # Payment flow
│   ├── rx/                    # Prescription upload & status
│   ├── orders/                # Order history
│   ├── profile/               # User profile
│   └── consultation/          # Pharmacist chat
├── components/                # UI components (layout, product, ui, providers)
├── lib/                       # API client, LIFF utils, auth, domain helpers
└── store/                     # Zustand stores (auth, cart, address)
```

## Database Package (packages/db/src/)

```
├── schema/
│   ├── enums.ts               # PostgreSQL enums
│   ├── staff.ts, patients.ts  # User tables
│   ├── drugs.ts, products.ts  # Catalog tables
│   ├── inventory.ts           # Stock tracking
│   ├── prescriptions.ts       # Rx workflow
│   ├── orders.ts              # Orders & payments
│   ├── loyalty.ts             # Points system
│   ├── chat.ts                # LINE messages
│   ├── notifications.ts       # Push notifications
│   ├── clinical.ts            # Clinical data
│   ├── campaigns.ts           # Marketing campaigns
│   ├── telemedicine.ts        # Telemedicine tables
│   ├── content.ts, complaints.ts, system.ts
│   └── relations.ts           # Table relationships
├── migrations/                # SQL migration files
└── seed/                      # Seed scripts (drugs, staff, scope rules)
```

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files & dirs | kebab-case | `user-profile.tsx` |
| React components | PascalCase | `UserProfile` |
| Functions/vars | camelCase | `getPatient()` |
| Constants/env | SCREAMING_SNAKE | `JWT_SECRET` |
| DB tables/columns | snake_case | `patient_allergies` |
| Drizzle exports | PascalCase | `PatientAllergies` |
| API routes | kebab-case | `/v1/patient-allergies` |
| Query params | camelCase | `?patientId=123` |

## Import Aliases

- `@telepharmacy/db` — Database package
- `@telepharmacy/shared` — Shared types
- `@telepharmacy/ai` — AI services

Import order: external libs → `@telepharmacy/*` → relative → type-only imports.
