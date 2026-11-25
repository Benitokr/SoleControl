# SoleControl — Master Forensic Engineering Audit
**Application:** SoleControl (Forty V Footwear Retail Management System)  
**Date:** 25 November 2026  
**Status:** Audit Completed (Strictly No Code Changes)  
**Authors:** Senior Software Architect, Forensic Database Engineer & QA Automation Lead  

---

## 1. Overall Application Condition

The application currently presents a **high-fidelity visual facade** over an **architecturally fractured backend**.

- **Frontend (`apps/web`)**: Visually comprehensive, modern Tailwind/Radix UI with responsive tables, drawers, modals, charts, and dark mode. However, many pages have had to incorporate ad-hoc `localStorage` wrappers (`storage.ts`) to avoid losing data because the backend provides no persistence.
- **Backend Architecture Divergence**: There are two completely different backends in the repository:
  1. `apps/api`: A well-structured modular Express + Prisma backend with 30+ relational models and controllers. **It is never deployed to production.**
  2. `api/index.js`: An 1817-line monolithic script that mocks database calls using in-memory JavaScript objects (`api/mockData.js`). **This is what Vercel runs.**
- **Database Status**:
  - Locally: PostgreSQL on port 5432 is down; fallback embedded PGlite is used.
  - Production (Vercel): Zero PostgreSQL connection. All state lives in ephemeral Lambda memory.

---

## 2. Top 10 Most Critical Defects

| Defect ID | Module | Severity | Symptom | Root Cause |
|---|---|---|---|---|
| **CRIT-01** | **Deployment / Database** | **Critical** | Production data resets and disappears on cold starts. | Vercel routes `/api/*` to `api/index.js`, which mutates in-memory JavaScript arrays (`DB`) instead of connecting to a real PostgreSQL database. |
| **CRIT-02** | **Sales / Inventory** | **Critical** | Sales transactions do not deduct inventory pairs. | `POST /sales` in `api/index.js` records the sale and creates journals, but never executes a stock decrement on `DB.balances` or `StockStorage`. |
| **CRIT-03** | **Architecture** | **Critical** | Three conflicting sources of truth. | Application splits state between PostgreSQL (`prisma/schema.prisma`), serverless RAM (`api/index.js`), and browser `localStorage` (`apps/web/src/lib/storage.ts`). |
| **CRIT-04** | **Testing** | **Critical** | 100% test pass rate with zero meaningful coverage. | Entire repository has only 1 test file with 3 basic assertions. Zero database, business logic, or E2E tests exist. |
| **CRIT-05** | **Purchases / Inward** | **High** | Purchase inwarding bypasses database transactions. | Finalising a purchase does not use a PostgreSQL ACID transaction to atomically insert bills, update stock, and post journals. |
| **CRIT-06** | **Rack & Location** | **High** | Store location tree is decoupled from book stock. | Merchandising footwear on racks in `/locations` does not validate or lock physical balances in `stock_balances(location_id)`. |
| **CRIT-07** | **Accounting / Finance** | **High** | Financial statements (Trial Balance, P&L) are volatile. | Statements derive entirely from in-memory arrays. If the serverless container sleeps, statements zero out. |
| **CRIT-08** | **GST Compliance** | **High** | GSTR-1 and GSTR-3B summaries are session-dependent. | GST records are not backed by persistent database tables. |
| **CRIT-09** | **Master Data / Roles** | **Medium** | Masters lack relational integrity and foreign key constraints. | Deleting or editing a brand/size in memory does not validate relational constraints against inwarded variants. |
| **CRIT-10** | **Multi-User Sync** | **Medium** | Actions by one user are invisible to other staff members. | Because persistence relies on browser `localStorage`, User A and User B operate in completely separate, isolated state bubbles. |

---

## 3. Data Consistency Forensic Matrix

| Inconsistency Reported | Forensic Cause Identified | Affected Code / Modules |
|---|---|---|
| **Dashboard vs Modules Disagree** | Dashboard `/dashboard/kpis` reads from serverless memory (`DB.balances`), while Inventory reads from merged `StockStorage` in client `localStorage`. If serverless memory is fresh (0 pairs), Dashboard shows 0 while Inventory shows local pairs. | `DashboardPage.tsx`, `InventoryPage.tsx`, `api/index.js` |
| **Sales Count vs Inventory Decrease** | Sales invoices create entries in `sales` array, but inventory balances are never decremented. | `SalesPage.tsx`, `api/index.js` (Route: `POST /sales`) |
| **Trial Balance vs Ledger Entries** | Trial balance aggregates from in-memory `journals`. When a new session begins without prior journal persistence, reports show blank or unbalanced figures. | `AccountingPage.tsx`, `api/index.js` (Route: `/accounting/*`) |
| **Rack Stock vs Warehouse Inventory** | Floor, Rack, and Shelf coordinates in `LocationsPage` have no relational link to `stock_balances`. | `LocationsPage.tsx`, `api/index.js` |

---

## 4. Code Quality & Architectural Integrity Assessment

1. **Dual Codebase Burden**:
   Having both `apps/api` (modular) and `api/index.js` (monolithic) means bug fixes applied to one are frequently missing from the other.
2. **Fragile State Management**:
   The use of `localStorage` as a substitute for a cloud database creates race conditions, cache desynchronization, and prevents proper multi-store or multi-terminal operations.
3. **Salvageability**:
   **The existing architecture IS salvageable.**
   The frontend UI (`apps/web`) is solid and well-designed. The Prisma schema (`prisma/schema.prisma`) is well-specified. What is missing is the bridge: **provisioning a real managed PostgreSQL database (e.g. Neon, Supabase, or AWS RDS), connecting Prisma to it, and retiring the mock in-memory serverless file.**
