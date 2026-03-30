# Project Structure & Organization

## Monorepo Layout

```
telepharmacy-erp/
├── apps/                    # Application packages
│   ├── api/                 # NestJS backend API
│   ├── admin/               # Next.js admin dashboard
│   └── shop/                # Next.js customer LIFF app
├── packages/                # Shared libraries
│   ├── db/                  # Database schemas & migrations
│   ├── shared/              # Common types & validators
│   └── ai/                  # AI service integrations
├── infra/                   # Infrastructure configuration
└── docker-compose.yml       # Development services
```

## Application Structure

### Backend API (apps/api)
```
apps/api/src/
├── main.ts                  # Application entry point
├── app.module.ts            # Root NestJS module
├── config/                  # Configuration modules
│   ├── app.config.ts        # App settings
│   ├── database.config.ts   # DB connection
│   ├── jwt.config.ts        # JWT settings
│   ├── line.config.ts       # LINE API config
│   └── odoo.config.ts       # ERP integration
├── database/                # Database connection module
├── common/                  # Shared utilities
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Exception filters
│   ├── interceptors/        # Request/response interceptors
│   └── pipes/               # Validation pipes
└── modules/                 # Feature modules
    ├── auth/                # Authentication & authorization
    ├── health/              # Health check endpoints
    ├── line/                # LINE webhook & messaging
    └── patient/             # Patient management
```

### Frontend Applications

#### Admin Dashboard (apps/admin)
```
apps/admin/src/
├── app/                     # Next.js 15 app router
│   ├── (auth)/             # Authentication routes
│   │   └── login/          # Staff login
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── pharmacist/     # Prescription queue
│   │   ├── orders/         # Order management
│   │   ├── patients/       # Patient records
│   │   ├── products/       # Product catalog
│   │   ├── inventory/      # Stock management
│   │   ├── reports/        # Analytics & reports
│   │   └── settings/       # System configuration
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
├── components/             # Reusable UI components
│   ├── header.tsx          # Navigation header
│   ├── sidebar.tsx         # Dashboard sidebar
│   ├── stat-card.tsx       # Statistics display
│   └── products/           # Product-specific components
└── lib/                    # Utility functions
```

#### Customer Shop (apps/shop)
```
apps/shop/src/
├── app/                    # Next.js 15 app router
│   └── (shop)/            # LIFF app routes
│       ├── page.tsx       # Product catalog home
│       ├── search/        # Product search
│       ├── product/[id]/  # Product details
│       ├── cart/          # Shopping cart
│       ├── checkout/      # Payment flow
│       ├── rx/            # Prescription management
│       │   ├── upload/    # Upload prescription
│       │   └── status/    # Prescription status
│       ├── orders/        # Order history
│       ├── profile/       # User profile
│       └── consultation/  # Pharmacist chat
├── components/            # UI components
└── lib/                   # LIFF utilities
```

## Shared Packages

### Database Package (packages/db)
```
packages/db/src/
├── schema/                 # Drizzle ORM schemas
│   ├── enums.ts           # PostgreSQL enums
│   ├── staff.ts           # Staff accounts
│   ├── patients.ts        # Patient records
│   ├── drugs.ts           # Drug database
│   ├── products.ts        # Product catalog
│   ├── inventory.ts       # Stock tracking
│   ├── prescriptions.ts   # Prescription workflow
│   ├── orders.ts          # Order & payment
│   ├── loyalty.ts         # Points system
│   ├── chat.ts            # LINE messages
│   ├── notifications.ts   # Push notifications
│   ├── content.ts         # CMS content
│   ├── complaints.ts      # Customer feedback
│   ├── system.ts          # Audit & settings
│   └── relations.ts       # Table relationships
├── migrations/            # Database migrations
└── seed/                  # Sample data
```

### Shared Types (packages/shared)
```
packages/shared/src/
├── types/                 # TypeScript interfaces
├── validators/            # Zod validation schemas
├── constants/             # Shared constants
└── utils/                 # Common utilities
```

### AI Services (packages/ai)
```
packages/ai/src/
├── chatbot.ts            # Gemini chatbot
├── ocr.ts                # Prescription OCR
├── drug-checker.ts       # Drug interactions
└── config.ts             # AI configuration
```

## Naming Conventions

### Files & Directories
- **kebab-case**: File and directory names (`user-profile.tsx`)
- **PascalCase**: React components (`UserProfile.tsx`)
- **camelCase**: Functions and variables
- **SCREAMING_SNAKE_CASE**: Constants and environment variables

### Database
- **snake_case**: Table and column names (`patient_allergies`)
- **PascalCase**: Drizzle schema exports (`PatientAllergies`)
- **camelCase**: TypeScript field names in schemas

### API Routes
- **kebab-case**: URL segments (`/api/v1/patient-allergies`)
- **camelCase**: Query parameters (`?patientId=123`)

## Module Organization

### NestJS Modules
Each feature module follows this structure:
```
module-name/
├── module-name.module.ts     # Module definition
├── module-name.controller.ts # HTTP endpoints
├── module-name.service.ts    # Business logic
├── dto/                      # Data transfer objects
├── guards/                   # Route guards
├── decorators/               # Custom decorators
└── interfaces/               # TypeScript interfaces
```

### Next.js Pages
- Use app router with route groups for organization
- Co-locate components with their pages when specific to that route
- Shared components go in `/components` directory

## Import Conventions

### Path Aliases
- `@telepharmacy/db` - Database package
- `@telepharmacy/shared` - Shared types package  
- `@telepharmacy/ai` - AI services package

### Import Order
1. External libraries (React, Next.js, etc.)
2. Internal packages (`@telepharmacy/*`)
3. Relative imports (`./`, `../`)
4. Type-only imports (with `type` keyword)

## Configuration Management

### Environment Variables
- `.env.example` - Template with all required variables
- `.env` - Local development (gitignored)
- Separate configs per environment (dev/staging/prod)

### Feature Flags
- Use environment variables for feature toggles
- Document all flags in `.env.example`