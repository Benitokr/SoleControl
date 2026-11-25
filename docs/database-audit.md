# SoleControl — Forensic Database Audit Report
**Date:** 25 November 2026  
**Auditor:** Senior Software Architect & Forensic Database Engineer  
**Status:** Audit Completed (No Code Changes)

---

## 1. Executive Summary & Ground Truth Findings

| Question | Forensic Finding | Evidence |
|---|---|---|
| **Which database is used locally?** | **PGlite (Embedded in-process PostgreSQL)** | Port 5432 is closed (`TcpTestSucceeded: False`), Docker is not installed. `apps/api/src/lib/db.ts` falls back to PGlite writing to `prisma/pglite-data`. |
| **Which database is used in production?** | **None (In-Memory JS Objects + Browser LocalStorage)** | `vercel.json` rewrites all `/api/*` to `api/index.js`. `api/index.js` imports `mockData.js` and stores state in memory arrays (`DB.purchases`, `DB.balances`, etc.). |
| **Is PostgreSQL actually active in production?** | **NO.** | Zero database connections, zero connection strings, zero Prisma queries are executed in production. |
| **Are production CRUD operations writing to PostgreSQL?** | **NO.** | Writes mutate in-memory JS variables in Vercel Lambdas and client `localStorage`. |
| **Does the application silently switch databases?** | **YES.** | Locally, `apps/api/src/lib/db.ts` silently switches from PostgreSQL to PGlite if port 5432 fails within 400ms. In production, Vercel bypasses `apps/api` entirely and routes to `api/index.js`. |
| **Why does data disappear on refresh/deployment?** | **Stateless Serverless Execution.** | Vercel Lambdas are ephemeral. When a container recycles, all in-memory arrays in `api/index.js` are reset. |

---

## 2. Detailed Database Architecture Comparison

### 2.1 The Intended Architecture (`apps/api` + Prisma)
- **Schema**: `prisma/schema.prisma` contains 426 lines defining 30+ relational PostgreSQL tables:
  - System: `users`, `roles`, `permissions`, `role_permissions`, `user_locations`, `user_sessions`, `audit_logs`
  - Masters: `company_profile`, `stores`, `brands`, `categories`, `products`, `articles`, `sizes`, `colours`, `product_variants`
  - Stock & Locations: `locations`, `stock_balances`, `stock_movements`, `stock_adjustments`, `stock_audits`, `stock_transfers`
  - Commercial: `vendors`, `purchases`, `purchase_items`, `customers`, `sales`, `sale_items`, `offers`
  - Finance: `accounts`, `journal_entries`, `journal_lines`, `bank_accounts`, `gst_transactions`
- **Migrations**: `prisma/migrations/` has standard PostgreSQL migration folders.
- **Local Fallback**: `apps/api/src/lib/db.ts` probes port 5432. When unreachable, it boots `@electric-sql/pglite` and applies SQL migrations to `prisma/pglite-data/`.
- **Reality**: This entire backend application (`apps/api`) is **never invoked in production**.

### 2.2 The Deployed Reality (Vercel + `api/index.js`)
- `vercel.json` configuration:
  ```json
  "buildCommand": "npm run build --workspace=@solecontrol/shared && npm run build --workspace=@solecontrol/web",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index?path=$1" }
  ]
  ```
- All `/api/v1/*` requests are intercepted by `/api/index.js`.
- Inside `/api/index.js`:
  ```javascript
  import crypto from 'crypto';
  import { DB } from './mockData.js';
  
  let transfers = DB.transfers;
  let displays = DB.displays;
  let purchases = DB.purchases;
  let sales = DB.sales;
  let balances = DB.balances;
  ```
- Every "POST /purchases", "POST /sales", or "POST /inventory/adjustments" only runs `DB.collection.unshift(newItem)`.
- When the Vercel function freezes or restarts, the changes vanish from the server.

### 2.3 The Client-Side Patch (`apps/web/src/lib/storage.ts`)
- To prevent screens from becoming blank upon page refresh, client `localStorage` engines were added:
  - `solecontrol_purchases_v2`
  - `solecontrol_sales_v2`
  - `solecontrol_stock_v2`
  - `solecontrol_users_v2`
  - `solecontrol_clearance_rules_v2`
  - `solecontrol_displays_v2`
  - `solecontrol_damaged_goods_v2`
  - `solecontrol_offers_v2`
  - `solecontrol_adjustments_v2`
- **Result**: Data is tied to an individual browser profile. There is zero multi-user persistence, zero ACID guarantees, and zero centralized database integrity.

---

## 3. Database Integrity & Data Loss Forensic Trace

| Entity | UI Creation Flow | Where It Saves | Why It Was Lost Previously |
|---|---|---|---|
| **Footwear Purchase** | `/purchases` -> New Bill | `localStorage.solecontrol_purchases_v2` + RAM `DB.purchases` | Lambda container recycle wiped server RAM; if another browser or incognito was opened, zero purchases existed. |
| **Stock Balance** | `/inventory` -> Adjustment | `localStorage.solecontrol_stock_v2` + RAM `DB.balances` | `POST /inventory/adjustments` previously had field mapping bugs (`sku` vs `variantSku`), failing to write to `DB.balances`. |
| **System Users** | `/users` -> Add User | `localStorage.solecontrol_users_v2` + RAM `DB.users` | Server had duplicate variable declaration (`barcodeQueue`) that threw 500 error; memory was wiped on restart. |
| **Master Data** | `/masters` -> Add Taxonomies | `localStorage.solecontrol_masters_*` + RAM `DB.brands` | Pushed to volatile in-memory arrays only. |
| **Clearance Rules** | `/ageing` -> Configure Rule | `localStorage.solecontrol_clearance_rules_v2` + RAM `ageingRules` | Page lacked a rendered rules table, making saved rules invisible to the user. |

---

## 4. Database Risk Assessment

1. **Risk 1 (Critical): Total Absence of Production Database**: A production retail SaaS cannot operate on in-memory Node objects and browser `localStorage`.
2. **Risk 2 (Critical): Data Siloing Between Users**: If User A records a ₹50,000 purchase on Computer A, User B on Computer B sees ₹0 because data lives in User A's browser cache.
3. **Risk 3 (High): Schema Desynchronization**: While `prisma/schema.prisma` defines 30+ tables with foreign keys and cascade rules, none of these constraints are enforced in `api/index.js`.
4. **Risk 4 (High): Silent Local Database Switch**: A developer running `apps/api` locally might believe they are writing to PostgreSQL, but are actually writing to PGlite SQLite files in `prisma/pglite-data`.
