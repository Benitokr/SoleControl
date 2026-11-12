# SoleControl — Forty V Footwear Retail Management System

A production-grade Super Admin web application for managing footwear retail operations.

## Quick Start (10 lines)

```bash
# 1. Clone and install
git clone <repo> && cd fortyV
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set SEED_ADMIN_PASSWORD

# 3. Start database (or skip — PGlite auto-starts)
docker compose up -d   # optional

# 4. Setup and seed
npm run setup          # migrates + seeds system data

# 5. Start dev servers
npm run dev            # API on :4000, Web on :5173

# 6. Login
# URL: http://localhost:5173
# Email: superadmin@fortyv.local
# Password: (value of SEED_ADMIN_PASSWORD in .env, default ChangeMe@123)
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | Node 20, Express, TypeScript, Prisma |
| Database | PostgreSQL 16 (Docker) or PGlite (embedded, auto-fallback) |
| Auth | JWT (15min) + rotating refresh cookie |

## Project Structure

```
fortyV/
├── apps/
│   ├── api/          # Express API (port 4000)
│   └── web/          # React frontend (port 5173)
├── packages/
│   └── shared/       # Zod schemas, enums, permissions
├── prisma/
│   ├── migrations/   # SQL migrations (0_init → 3_phase5)
│   ├── seed.ts       # System seed (roles, permissions, CoA)
│   └── seed-demo.ts  # Demo data (brands, articles, 3 months sales)
└── docs/
    ├── open-questions.md
    └── source/branding/fortyv-logo.png
```

## Environment Variables

See `.env.example` for all variables. Required:
- `DATABASE_URL` — PostgreSQL URL (optional if using PGlite)
- `JWT_SECRET` — secret for access tokens
- `REFRESH_TOKEN_SECRET` — secret for refresh tokens
- `SEED_ADMIN_PASSWORD` — initial super admin password

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + web in development |
| `npm run setup` | Install, migrate, seed |
| `npm run build` | Build both apps for production |
| `npm run test` | Run Vitest unit tests |
| `npm run seed:demo` | Load demo data |

## Modules

| Module | Status |
|--------|--------|
| Auth & Sessions | ✅ Complete |
| Company Config | ✅ Complete |
| Master Data | ✅ Complete |
| Locations & Rack Map | ✅ Complete |
| Vendors | ✅ Complete |
| Purchases (Phase 3) | ✅ Complete |
| Inventory & Adjustments | ✅ Complete |
| Sales & CRM | ✅ Complete |
| Offers & Discounts | ✅ Complete |
| Accounting & Finance | ✅ Complete |
| Capital & Withdrawals | ✅ Complete |
| Bank & GST | ✅ Complete |
| Reports & Analytics | ✅ Complete |
| Notifications & Audit | ✅ Complete |
| Integrations | ✅ Complete |
| Barcodes & Labels | ✅ Complete |

## Known Limitations

- Bill scanning: upload and view only; OCR extraction requires a provider (see open-questions.md #15)
- E-invoice/IRN: not in scope for Release 1
- WhatsApp/Bank/GST integrations: provider credentials required (see open-questions.md)
- Multi-store: schema ready, UI single-store; switcher appears when second store added
- Printer: PDF export only; ESC/POS requires hardware configuration

## Branding

The official Forty V logo is at `docs/source/branding/fortyv-logo.png`. Used as-is in login page, sidebar, and PDF headers. Do not alter.
