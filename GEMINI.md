# SoleControl – Forty V Footwear Retail Management System
## Part A – Master Rules & Architecture Specification

### A1. Mission
You are a senior full-stack architect, product designer and React/Node/PostgreSQL engineer. Build a standalone, production-minded Super Admin web application for Forty V's Footwear Retail Management System. Working product name: SoleControl (rename freely). It must look like a premium commercial SaaS product, work like a real business system, and be fully integrated: every screen reads and writes real data through real APIs into PostgreSQL.
This is a new engineer's first project at the company, so correctness, cleanliness and polish matter more than raw feature count.

### A2. Non-negotiables
• Super Admin only. Do not build workspaces for Administrator, Management, Sales Executive, Accounts User or Inventory User, or any mobile app. Those roles exist only as configurable roles inside Roles and Permissions.
• Never fake it. No hardcoded numbers, dummy buttons, static dashboards or placeholder forms. If something cannot be completed, say so and list it; do not simulate it.
• Integrations (WhatsApp, bank, GST, printers) show real status. Nothing appears connected until a real test passes.
• Do not invent accounting, GST or business rules. Make uncertain rules settings, record them in docs/open-questions.md and use the defaults in A9.
• Every phase: write a short plan first, implement, run the app, test it in the browser, fix, run automated tests, then report what works, what does not and what is assumed. Never break earlier phases.
• Clean code: TypeScript strict, consistent naming, small modules, no dead code, no duplicated logic.

### A3. Stack (fixed)
Frontend: React 18, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui (Radix), lucide-react, TanStack Query and Table, React Hook Form + Zod, Recharts, cmdk (command palette), date-fns, Framer Motion (sparingly).
Backend: Node 20, Express, TypeScript, Prisma, PostgreSQL 16, Zod, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, multer, pino, OpenAPI/Swagger, exceljs, bwip-js, pdfkit, node-cron.
Testing and tooling: Vitest, Supertest, Playwright, Docker Compose for Postgres.

### A4. Repository and run
Monorepo: apps/web, apps/api, packages/shared (Zod schemas, enums, permission keys), prisma/ (schema, migrations, seed), docs/ (source, architecture, ER, API, open-questions, setup, deployment, test report).
One-command experience: docker compose up -d; npm run setup (install, migrate, seed); npm run dev (web and api together). Provide .env.example with every variable and a README whose setup fits in ten lines.
API modules follow modules/<name>/{routes, controller, service, repo, schema}. Business rules live only in services.

### A5. Design system and branding
Style: modern SaaS in the spirit of Linear, Stripe Dashboard, Vercel and Shopify Admin. Calm, dense but breathable, strong hierarchy, no clutter, no generic Bootstrap look.
• Type: Inter for UI; JetBrains Mono for SKU, barcode and document numbers; tabular numerals for all money and quantities. Sizes 12, 13, 14, 16, 20, 24, 32; weights 400, 500, 600.
• Colour tokens as CSS variables, light and dark. Light: bg #F7F8FA, surface #FFFFFF, border #E6E8EC, text #0F172A, muted #64748B, primary #4F46E5, primary-soft #EEF2FF, success #059669, warning #D97706, danger #DC2626, info #0284C7. Dark: bg #0B0F17, surface #111827, border #1F2937, text #E5E7EB, muted #94A3B8, primary #818CF8. Colour-blind-safe six-colour chart palette. Text contrast at least 4.5:1.
• Shape: radius 8 controls, 12 cards, 16 dialogs; 1px borders with very soft shadows; 2px primary focus ring.
• Motion: 150–200 ms ease-out; subtle page fade with 8 px slide; skeleton shimmer; KPI count-up once on load; charts draw in; honour prefers-reduced-motion.
• Icons (lucide, 1.5 stroke): Dashboard LayoutDashboard · Company Building2 · Master Data Database · Users Users · Roles ShieldCheck · Purchases ReceiptText · Inventory Boxes · Barcode ScanBarcode · Rack and Location Warehouse · Display Stock Store · Sales Receipt · Stock Transfers ArrowLeftRight · Ageing Hourglass · Damaged Goods PackageX · Vendors Truck · CRM HeartHandshake · Offers BadgePercent · Accounting BookOpen · Capital Wallet · Bank and GST Landmark · Reports BarChart3 · Notifications and Audit ScrollText · Integrations Plug.
Branding rules (strict):
• The only brand asset is the official Forty V logo at docs/source/branding/fortyv-logo.png (transparent PNG). Use it exactly as supplied: do not redraw, recolour, stretch, crop unevenly or recreate it.
• Do NOT take colours, fonts or styling from the Forty V website. The colour tokens above are final.
• Placement: login page (left panel), sidebar header (full logo when expanded; a square crop of the mark only on the 72 px rail), favicon and app icon (generated from the logo), and a small 'Powered by Forty V' line in the footer of generated PDFs.
• Generate an optimised SVG or PNG set (favicon 32/180/512) from the supplied file.
• Check legibility on both themes. If the logo is not clearly readable on the dark surface, place it on a neutral light chip or use the original on a surface-coloured plate. Never alter the logo's own colours to fix this.
• The retailer's own logo is separate: Company Configuration has a logo upload used on invoices, labels and report headers. If Forty V is itself the retailer, upload the same file there.
• Replace the earlier idea of a custom sneaker-sole wordmark with this logo. A tiny decorative sole glyph may be used only inside illustrations and empty states.

### A6. App shell and navigation
• Sidebar 264 px, collapsible to a 72 px icon rail with tooltips, remembers state, drawer on mobile. Groups with small-caps labels:
    ◦ Overview: Dashboard
    ◦ Setup: Company Configuration, Master Data, Rack and Location, Barcode Management, Integrations
    ◦ Access: Users, Roles and Permissions
    ◦ Purchasing and Stock: Purchases, Vendors, Inventory, Display Stock, Stock Transfers, Ageing and Clearance, Damaged Goods
    ◦ Sales and Customers: Sales and POS, Customers and CRM, Offers and Discounts
    ◦ Finance: Accounting and Finance, Capital and Withdrawals, Bank and GST
    ◦ Insight and Control: Reports and Analytics, Notifications and Audit
    ◦ Active-item indicator, live count badges (alerts, drafts, pending approvals), items hidden without view permission.
• Top bar 56 px: breadcrumbs, search trigger (Ctrl/Cmd+K), financial-year chip, store switcher (rendered only when more than one active store exists; with one store show the store name as a plain label), + New quick-create menu, notification bell, theme toggle, avatar menu (profile, my sessions, shortcuts, logout).
• Command palette: search SKUs, barcodes, articles, invoices, vendors, customers, users; jump to any page; run actions (New purchase, Add user, Print labels); recent items; permission-aware.
• Page pattern: header (title, description, primary action), tabs, optional KPI strip, filter bar (search, chips, date range, saved views), table, right-side detail drawer with a deep-linkable URL and an activity timeline. Prefer drawers and tabs over deep page hops.
• Tables: server pagination and sorting, sticky header, column chooser, density toggle, row selection with bulk-action bar, export, saved views, virtualised above 500 rows, card layout under 768 px.
• Keyboard: g then d for dashboard, g then p for purchases and so on, N new, / focus search, ? shortcut sheet.
• Feedback: toasts, inline validation on blur, unsaved-changes guard, confirmation for destructive actions (type-to-confirm for the dangerous ones), undo toast for deactivation.
• Every screen has skeleton, empty (illustration plus call to action), error-with-retry, 403 and 404 states.
• Responsive: full at 1280 and up, icon rail 768–1279, drawer and cards below. WCAG AA, visible focus, focus trap in dialogs.

### A7. Signature features
1. Size × Colour matrix editor (purchases, adjustments, audits, transfers): sizes as columns, colours as rows, arrow/tab/enter navigation, paste from Excel, row and column totals, live cost and MRP totals.
2. Purchase bill split view: bill image or PDF with zoom and pan on the left, form on the right, draft autosave every 10 seconds.
3. Store map: visual Floor → Department → Rack → Shelf → Position explorer coloured by stock density or ageing; click a rack to see its stock.
4. Dashboard 'Today at a glance': greeting, target ring, revenue sparkline against the previous period, alerts, and rule-based insights computed from real data (for example sales below the same-weekday average, or a brand with many units older than 90 days).
5. Ageing heatmap (category × age bucket) with one-click clearance suggestions.
6. Label designer: live WYSIWYG preview, field toggles, copies per SKU, bulk queue, PDF print preview.
7. Audit diff viewer (before and after highlighted) and an activity timeline on every detail drawer.
8. Permission matrix with effective-access preview and a what-will-change confirmation.
9. Offer simulator on a sample bill.
10. Report viewer with filters, grouping, saved views and CSV, XLSX, PDF export.
11. First-run onboarding checklist (company, store, financial year, masters, users).
12. Demo data pack so every screen looks alive.

### A8. Login and access
Login page: split layout. Left panel with brand gradient (built from the design tokens, not from the website), the Forty V logo, tagline and a decorative product illustration. Right panel with email, password (show/hide), remember me, loading state, clear errors and a lockout message. No public signup. Forgot password: the Super Admin resets users from User Management (email delivery is pending).
Seed credentials, development only, read from env: superadmin@fortyv.local with SEED_ADMIN_PASSWORD (example ChangeMe@123), forced change at first login. Demo users for the five other roles (administrator@, management@, sales@, accounts@, inventory@ at fortyv.local) are created only by the demo seed command. The production seed creates the Super Admin only, with no default password.
Auth: 15-minute access JWT held in memory; rotating refresh token in an httpOnly, Secure, SameSite cookie, stored hashed; bcrypt cost 12; lockout after 5 failures; session list with revoke. Every route is guarded by requirePermission('module.action'); permissions returned by /auth/me are for UI gating only. SUPER_ADMIN is a locked system role and the last active Super Admin cannot be deactivated or demoted. Provider credentials are encrypted with AES-256-GCM and masked on read. audit_logs is append-only.

### A9. Data and business rules
Database: PostgreSQL via Prisma migrations. Money numeric(14,2), quantities integer, timestamptz, business dates as date shown in IST. Masters are deactivated, never deleted. Version column on editable documents. Multi-step actions run in one transaction and write an audit row.
Multi-store readiness (one store now, more later):
• A stores table (name, code, address, GSTIN, active) with exactly one store seeded. Each store owns its own location tree (the FLOOR level hangs under a store).
• store_id on every transactional table: stock_balances, stock_movements, purchases, sales, transfers, adjustments, audits, display_allocations, damage_records, document_series, cash/bank registers, targets and offers (offers may be global or store-scoped).
• Every query, report and service takes a store context. With one active store it is resolved automatically and the UI shows no store controls beyond the label. Adding a second store (Company Configuration → Stores) turns on the switcher, per-store filters on reports and inter-store transfers, with no schema change.
• Users are scoped to stores through user_locations. Do not build cross-store comparison dashboards now.
• Catalogue masters (brands, articles, variants, vendors, customers) are shared across stores; SKU and barcode are globally unique.
Core tables: users, roles, permissions, role_permissions, user_locations, user_sessions, login_events; company_profile, stores, settings, financial_years, document_series, tax_rates; brands, categories, products, articles, sizes, colours, product_variants (SKU, barcode, mrp, selling_price, cost; unique on article+size+colour); locations (self-referencing tree FLOOR, DEPARTMENT, RACK, SHELF, POSITION, rooted at a store); stock_movements (append-only), stock_balances (variant+location), stock_adjustments, stock_audits (+lines), stock_transfers (+lines), display_allocations, damage_records (+events), ageing_rules, clearance_recommendations, clearance_movements; vendors, purchases (+items, expenses, attachments, returns), customers, sales (+items, payments, returns), sales_targets, customer_communications; offers (+scopes, campaigns, redemptions); accounts, journal_entries, journal_lines, payment_receipts, capital_entries, withdrawals, bank_accounts, bank_statement_lines, bank_reconciliations, gst_transactions; audit_logs, notifications, alert_rules, integration_settings, integration_logs, files, label_templates, print_jobs. Index every foreign key plus (variant, location), (store, sale date, payment mode), (vendor, due date) and audit (entity, created_at).
Rules:
• Only StockService changes stock; stock_balances must equal the sum of movements (add a consistency check).
• Only PostingService creates journals; entries must balance; posted entries are never edited or deleted, only reversed with a reason.
• Purchase finalise is one transaction: stock movements, barcodes, rack assignment, vendor payable, journal. Finalised purchases change only through a controlled correction with a reason.
• Purchase class A (GST/accountable) and B (non-GST) is stored and reported separately; GST registers use A only [default, accountant to confirm].
• Freight, packaging and transport are allocated by a setting: value (default), quantity or equal, with a preview before finalising.
• Valuation: weighted average (default), setting-driven.
• Default posting map (accountant to confirm): purchase Dr Stock and Input GST, Cr Vendor; sale Dr Cash/Bank/Customer, Cr Sales and Output GST, plus Dr COGS Cr Stock; vendor payment Dr Vendor Cr Cash/Bank; write-off Dr Loss Cr Stock; capital Dr Cash/Bank Cr Capital; withdrawal Dr Drawings Cr Cash/Bank.
• Stock audit cycle every two months (setting). Label price encoding is a pluggable scheme; print the plain price until the rule is supplied.
• Bill scanning in release 1: upload, view, manual entry with review. An extraction provider plugs in later behind one interface.
• Super Admin sales entry is a setting: sales.admin_entry_enabled (default ON). Viewing, reports, returns and voids-by-reversal are always available. When OFF, the New sale, New return and New receipt actions disappear from the UI and the create endpoints return 403. Record this in docs/open-questions.md as 'Should Super Admin create sales invoices or only monitor them? (manager to confirm)'.
API: /api/v1, envelopes {data, meta} and {error:{code,message,fields}}, Zod validation, pagination, sorting, filters, request ids, OpenAPI at /api/docs, idempotency keys on posting endpoints, rate limiting.
Seed: a system seed (roles, permissions, chart of accounts, sizes, document series, the single store) and a separate demo seed (about 6 brands, 40 articles, 600 variants, three months of purchases, sales, payments, returns and damages) with believable Indian footwear data.

