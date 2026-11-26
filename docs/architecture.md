# SoleControl Architecture

## 1. Stack & Monorepo Layout
- **Frontend (`apps/web`)**: React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6, Recharts, Sonner, Lucide icons. Route-level `React.lazy` code splitting.
- **Backend (`apps/api`)**: Node.js 22, Express, TypeScript, Prisma ORM, raw `pg` Pool (`withTransaction` for `FOR UPDATE` row locking), Zod, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, pino.
- **Shared (`packages/shared`)**: Permissions matrix (`MODULES x ACTIONS`), shared Zod schemas (`schemas.ts`, `erpSchemas.ts`), and Indian formatting/validation helpers (`formats.ts`).
- **Database**: Neon Cloud PostgreSQL (`neondb`), pooled connection via `DATABASE_URL`.
- **Deployment**: Vercel (`vercel.json` builds shared -> api -> web, bundles `apps/api/dist/**` into `api/index.js`).

## 2. API Modules (`apps/api/src/modules/*`)
- Auth (`/api/v1/auth`), Users (`/api/v1/users`), Roles (`/api/v1/roles`), Audit (`/api/v1/audit`)
- Company & Stores (`/api/v1/company`), Locations (`/api/v1/locations`), Integrations (`/api/v1/integrations`)
- Masters & GST Slabs (`/api/v1/masters`), Vendors (`/api/v1/vendors`), Purchases & POs (`/api/v1/purchases`)
- Inventory (`/api/v1/inventory`), Display Stock (`/api/v1/display`), Transfers (`/api/v1/transfers`), Damaged Goods (`/api/v1/damage`), Ageing (`/api/v1/ageing`), Barcodes (`/api/v1/barcodes`)
- Sales, POS, Hold Bills & EOD Close (`/api/v1/sales`), Customers (`/api/v1/customers`), Offers (`/api/v1/offers`)
- Accounting (`/api/v1/accounting`), Capital (`/api/v1/capital`), Bank & GST (`/api/v1/bank-gst`)
- Dashboard (`/api/v1/dashboard`), Reports (`/api/v1/reports`), Alerts (`/api/v1/alerts`), Database Explorer (`/api/v1/database`), Health (`/api/health`)

## 3. Data Flow & Integrity
- **Database as Single Source of Truth**: Zero in-memory mock arrays (`api/mockData.js` removed) and zero `localStorage` data stores (`apps/web/src/lib/storage.ts` removed).
- **Transactions**: Sales (`FOR UPDATE` row locking), Purchases, Returns, Transfers, and Journals run inside PostgreSQL `BEGIN ... COMMIT` transactions.
- **Health**: `GET /api/health` verifies live `SELECT current_database()`, returning `503` if the DB is unreachable.
