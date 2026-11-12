# SoleControl — Architecture Specification

## 1. System Overview
SoleControl is an enterprise-grade footwear retail management system designed exclusively for Super Admin operations at Forty V. It provides full real-time operational control across multi-store inventory, catalogue variants, POS/sales, purchasing, vendor ledgers, accounting, bank reconciliation, GST compliance, and system auditing.

## 2. High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  React 18 + Vite + TypeScript + TailwindCSS + TanStack      │
│  (Port 5173 - Super Admin SPA)                              │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / REST / Bearer JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway & Backend                    │
│  Express 4 + Node 20 + TypeScript + Helmet + RateLimit      │
│  (Port 4000 - Modular REST APIs)                            │
├─────────────────────────────────────────────────────────────┤
│ Modules:                                                    │
│  • auth         • users        • roles        • company     │
│  • masters      • locations    • barcodes     • purchases   │
│  • vendors      • inventory    • display      • transfers   │
│  • damage       • ageing       • customers    • sales       │
│  • offers       • accounting   • capital      • bank_gst    │
│  • dashboard    • reports      • alerts       • integrations│
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma ORM / PGlite Client
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Persistence Layer                      │
│  PostgreSQL 16 (Production) / PGlite (Embedded Dev/Test)    │
│  56 Relational Tables, Append-only Ledgers, Audit Logs      │
└─────────────────────────────────────────────────────────────┘
```

## 3. Core Architectural Principles
1. **Never Fake It**: Every screen reads and writes real data through transactional APIs into relational database tables.
2. **Super Admin Gating**: Locked system role `SUPER_ADMIN` with complete privilege enforcement; last active super admin cannot be deleted or demoted.
3. **Append-Only Ledgers**:
   - `stock_movements`: All adjustments, purchases, transfers, sales, and write-offs write immutable movement records with `actor_id` attribution.
   - `journal_entries` & `journal_lines`: Double-entry accounting system where posted journals are never modified or deleted, only reversed with full audit linkage.
   - `audit_logs`: Every sensitive master or transaction change records before/after diffs.
4. **Multi-Store Readiness**: Every operational table is scoped by `store_id`. In a single-store setup, the context resolves automatically. Adding additional stores activates store-level routing and inter-store stock transfers without schema migrations.
5. **Class A vs Class B Separation**: Purchases are segregated into Class A (taxable/GST accountable) and Class B (non-taxable/composite). Statutory GST reports strictly filter for Class A.
6. **Robust Fallback Engine**: Embedded `@electric-sql/pglite` enables zero-config local testing and autonomous operations without requiring external Docker dependencies.

## 4. Technology Stack
- **Frontend**: React 18, Vite, TypeScript, React Router 6, TanStack Query 5, Tailwind CSS, Lucide React, Zustand.
- **Backend**: Node.js 20, Express, TypeScript, Prisma ORM, JSON Web Tokens, bcrypt, node-cron.
- **Database**: PostgreSQL 16 / PGlite (embedded).
- **Verification**: Vitest, Supertest, Custom Gate Runner.

