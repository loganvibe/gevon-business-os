# Gevon BusinessOS

**The Operating System for African Businesses**

Gevon BusinessOS is a production-grade, enterprise-level SaaS platform built for businesses across Nigeria and Africa. It unifies CRM, inventory, sales, accounting, HR, payments, and AI in one modular, secure, and configurable platform.

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** for file-based routing
- **TanStack Query** for server state management
- **TanStack Start** for SSR and server functions
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives
- **Lucide React** for icons

### Backend
- **Supabase** (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Row Level Security (RLS)** for multi-tenant data isolation
- **Zod** for schema validation
- **Server Functions** for type-safe API endpoints

### Infrastructure
- **Vite** for build tooling
- **Nitro** for server deployment
- **GitHub** for version control
- **CI/CD** ready

## Core Features

### Platform
- Multi-company, multi-branch architecture
- Role-based access control (RBAC)
- Feature flags and module loader
- Audit logs and compliance
- Industry-specific profiles (Retail, Restaurant, Pharmacy, Wholesale, Construction, Manufacturing, Service, Hospitality, Education, Agriculture)
- Smart module recommendations

### Business Modules
- **CRM & Marketing**: Customers, segments, loyalty, promotions, campaigns
- **Inventory**: Multi-warehouse stock, products, categories, suppliers, purchase records
- **Sales**: Quotes, orders, invoices, returns, POS, receipts
- **Commerce**: Storefronts, carts, checkouts, fulfillment
- **Expenses**: Categories, expenses, payments, approvals
- **People**: Employees, attendance, leave, payroll, performance, recruitment
- **Enterprise**: Assets, fleet, maintenance, procurement, vendors, warehouses
- **Finance**: Reports, analytics, KPIs, goals, business health
- **Workflow**: Automation rules, approval requests, reminders, escalations
- **Integrations**: API keys, webhooks, OAuth, import/export, developer apps

### AI & Intelligence
- AI Business Advisor with rule-based recommendations
- Forecasting engine
- KPI monitoring
- Smart alerts

### Communication
- Event-driven notification system
- In-app notifications
- Email queueing
- Communication logs
- Real-time notification bell

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── core/           # Core layout components (DynamicNav, PageHeader)
│   ├── notifications/  # Notification bell
│   └── ui/             # Radix UI component wrappers
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
│   ├── lovable/        # Lovable cloud auth
│   ├── platform/       # Admin middleware
│   └── supabase/       # Supabase clients and auth
├── lib/                # Core utilities and server functions
│   ├── core.functions.ts  # Companies, branches, users, roles, permissions
│   ├── email-templates/   # Email template utilities
│   ├── error-capture.ts   # Error handling
│   └── utils.ts           # Helper functions
├── modules/            # Business modules
│   ├── commerce/       # E-commerce, storefronts, POS, checkout
│   ├── core.ts         # Core module exports
│   ├── enterprise/     # Assets, fleet, maintenance, procurement, vendors, warehouses
│   ├── expenses/       # Expense categories, expenses, payments, summaries
│   ├── integrations/   # API keys, webhooks, OAuth, import/export, developer apps
│   ├── intelligence/   # AI advisor, forecasting, KPI, health
│   ├── inventory/      # Products, categories, suppliers, inventory
│   ├── marketing/      # Customers, loyalty, segments, campaigns
│   ├── people/         # Employees, attendance, leave, payroll, performance, recruitment
│   ├── sales/          # Sales, orders, returns, payments, summaries
│   └── workflow/       # Workflow engine, conditions, executor
├── platform/           # Platform-level services
│   ├── admin.functions.ts        # Platform admin functions
│   ├── admin.health.functions.ts # System health checks
│   ├── admin.integrations.functions.ts # Integration management
│   ├── audit.helpers.ts          # Audit log utilities
│   ├── comms/                    # Communication logs
│   ├── customer.functions.ts     # Customer portal functions
│   ├── email/                    # Email sending
│   ├── events/                   # Event bus, registry, dispatcher
│   ├── flags-evaluator.ts        # Feature flag evaluation
│   ├── industry/                 # Industry profiles, onboarding
│   ├── integrations/             # API keys, crypto, OAuth, webhooks, sync
│   ├── jobs/                     # Job runner and handlers
│   ├── notifications/            # Notification functions
│   ├── production/               # Security, observability, launch mode
│   └── registry.ts               # Module and capability registry
├── routes/             # File-based routes
│   ├── _authenticated/ # Customer portal routes (app/*)
│   ├── _platform/      # Admin and developer portal routes
│   ├── api/            # Public API routes
│   ├── auth.tsx        # Authentication page
│   ├── index.tsx       # Landing page
│   ├── pricing.tsx     # Pricing page
│   ├── store.$slug.tsx # Public storefront
│   └── __root.tsx      # Root layout
├── server.ts           # Server entry point
├── start.ts            # App startup
└── styles.css          # Global styles
```

## Getting Started

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0
- Supabase project

### Installation

```sh
git clone https://github.com/loganvibe/gevon-business-os.git
cd gevon-business-os
npm install
```

### Configuration

Create a `.env` file with your Supabase credentials:

```env
SUPABASE_URL=your-project-url
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SALES_INGEST_SECRET=your-pos-ingest-secret
APP_URL=http://localhost:8080
APP_VERSION=1.0.0
```

### Database Setup

Run Supabase migrations:

```sh
supabase migration up
```

### Development

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```sh
npm run build
```

### Lint

```sh
npm run lint
```

## Architecture

### Multi-Tenancy
- Every data row is scoped to a `company_id`
- RLS policies enforce tenant isolation at the database level
- Platform admins bypass RLS for management operations

### Module System
- Modules are registered in `src/platform/registry.ts`
- Each module defines permissions, AI capabilities, and feature flags
- Modules can be enabled/disabled per company via feature flags
- Industry profiles provide smart module recommendations

### Event-Driven Architecture
- Central event registry in `src/platform/events/registry.ts`
- Event bus with retry, backoff, and dead-lettering
- Subscribers for notifications, emails, jobs, and AI actions
- Workflow engine reacts to events with permission-checked actions

### Security
- Supabase Auth with email/password and OAuth
- RBAC with granular permissions
- RLS on all tables
- Audit logs for all mutations
- Rate limiting on API keys
- Security headers (CSP, HSTS, X-Frame-Options)
- Input validation and sanitization

### Production Features
- Launch modes: trial, beta, production, maintenance
- Feature gating without code changes
- Observability hooks for metrics and alerts
- System health monitoring
- Integration sync tracking

## Deployment

Gevon BusinessOS is designed for deployment on:
- **Cloudflare Workers** via Nitro (preset: `cloudflare-module`)
- **Docker** containers
- Any Node.js 22+ environment

### Environment Variables (Production)

```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SALES_INGEST_SECRET=your-secret-key
APP_URL=https://your-domain.com
APP_VERSION=1.0.0
```

## Contributing

This is a private commercial project. All contributions require review.

## License

Proprietary - Gevon Technologies

## Support

For issues and feature requests, contact the Gevon Technologies engineering team.
