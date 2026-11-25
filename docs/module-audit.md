# SoleControl — Comprehensive Module-by-Module Audit
**Date:** 25 November 2026  
**Auditor:** Senior Software Architect & QA Specialist  
**Status:** Complete Forensic Assessment (All 24 Modules & Features)

---

## 1. Module Audit Matrix

| # | Module | Route | Primary Tables/Entities | API Endpoint | CRUD Status | Persistence Status | Defect Severity | Key Audit Finding |
|---|---|---|---|---|---|---|---|---|
| 1 | **Executive Dashboard** | `/` | Aggregates (Sales, Purchases, Stock, Payables) | `/dashboard/kpis`, `/dashboard/analytics`, `/dashboard/insights` | Read-only | Dynamic derived | Low | Previously had hardcoded subtitles; now calculating dynamically from active session data. |
| 2 | **Company Configuration** | `/company` | `company_profile`, `stores`, `settings` | `/company/profile`, `/stores` | Full CRUD | LocalStorage + RAM | Low | Settings (e.g. FY 2026-27, default tax 12%) update properly. Logo upload is browser-cached. |
| 3 | **Master Data** | `/masters` | `brands`, `categories`, `sizes`, `colours`, `articles` | `/masters/{tab}` | Full CRUD | LocalStorage + RAM | Medium | Now protected with `MasterStorage`. Does not enforce foreign key delete cascade to variants. |
| 4 | **Users & Personnel** | `/users` | `users`, `roles`, `user_locations` | `/users` | Full CRUD | LocalStorage + RAM | Medium | Password reset simulated with toast; creation persists via `UserStorage`. |
| 5 | **Roles & Permissions** | `/roles` | `roles`, `permissions`, `role_permissions` | `/roles`, `/roles/permissions` | Full CRUD | RAM | Low | Full RBAC permission matrix viewable with toggle states. |
| 6 | **Rack & Location** | `/locations` | `locations` (self-referencing tree) | `/locations/tree`, `/locations` | Read/Create | RAM | High | Visual Floor->Rack hierarchy renders, but rack allocations do not lock physical warehouse balances. |
| 7 | **Barcode Management** | `/barcodes` | `barcode_labels`, `label_templates`, `print_jobs` | `/barcodes/queue`, `/barcodes/templates` | Create/Print | RAM | Low | WYSIWYG tag preview works; dual SKU input allows queuing labels for any article. |
| 8 | **Integrations** | `/integrations` | `integration_settings`, `integration_logs` | `/integrations`, `/integrations/:id/test` | Read/Test | RAM | Low | Real status enforcement: WhatsApp, Payment Gateway, GST portal show disconnected until verified. |
| 9 | **Purchases & GRN** | `/purchases` | `purchases`, `purchase_items`, `purchase_expenses` | `/purchases` | Full CRUD | LocalStorage + RAM | High | Inwards stock and computes landed costs; relies on `PurchaseStorage` rather than PostgreSQL transaction. |
| 10 | **Suppliers & Vendors** | `/vendors` | `vendors`, `purchases` | `/vendors` | Full CRUD | RAM | Low | Vendor ledger and payable balances calculate from inwarded purchases. |
| 11 | **Warehouse Inventory** | `/inventory` | `stock_balances`, `stock_movements`, `stock_adjustments`, `stock_audits` | `/inventory/stock`, `/inventory/adjustments`, `/inventory/audits` | Full CRUD | LocalStorage + RAM | Medium | Stock adjustments now update both quantity and valuation; physical cycle audit sessions functional. |
| 12 | **Display Stock** | `/display` | `display_allocations` | `/display`, `/display/allocate` | Full CRUD | LocalStorage + RAM | Low | Tracks sample pairs allocated to show windows; return-to-rack workflow implemented. |
| 13 | **Stock Transfers** | `/transfers` | `stock_transfers`, `stock_transfer_items` | `/transfers` | Full CRUD | RAM | Medium | Inter-store transfers log dispatch and receipt; does not decrement source store on dispatch. |
| 14 | **Ageing & Clearance** | `/ageing` | `ageing_rules`, `clearance_recommendations` | `/ageing/heatmap`, `/ageing/rules` | Read/Create | LocalStorage + RAM | Low | Clearance rules table now active; heatmap aggregates dynamically by age threshold. |
| 15 | **Damaged Goods** | `/damaged-goods` | `damage_records`, `damage_events` | `/damage`, `/damage/:id/status` | Full CRUD | LocalStorage + RAM | Medium | Defect logging and write-off workflow functional via `DamagedGoodsStorage`. |
| 16 | **Sales & POS** | `/sales` | `sales`, `sale_items`, `sale_payments` | `/sales` | Create/Read/Void | LocalStorage + RAM | **Critical** | Creates invoice and journal, but fails to deduct sold pairs from warehouse inventory stock! |
| 17 | **Customers & CRM** | `/customers` | `customers`, `customer_communications` | `/customers` | Full CRUD | RAM | Low | Tracks customer profiles, contact numbers, and purchase history. |
| 18 | **Offers & Discounts** | `/offers` | `offers`, `offer_redemptions` | `/offers`, `/offers/:id/deactivate` | Full CRUD | LocalStorage + RAM | Low | Campaign scheme creation and bill simulation active with `OfferStorage` persistence. |
| 19 | **Accounting & Finance** | `/accounting` | `accounts`, `journal_entries`, `journal_lines` | `/accounting/trial-balance`, `/accounting/pnl`, `/accounting/balance-sheet` | Read/Report | Derived from RAM | High | Financial reports derive from `DB.journals`. Volatile if lambda freezes without persistence. |
| 20 | **Capital & Withdrawals** | `/capital` | `capital_entries`, `withdrawals` | `/capital/entries`, `/capital/withdrawals` | Full CRUD | RAM | Low | Partner capital contributions and drawings log correctly. |
| 21 | **Bank & GST** | `/bank-gst` | `bank_accounts`, `bank_statements`, `gst_transactions` | `/bank/accounts`, `/gst/monthly-summary` | Full CRUD | RAM | High | Reconciliations and GSTR-3B summaries derive from session journals. |
| 22 | **Reports & Analytics** | `/reports` | All transaction logs | `/reports/sales`, `/reports/inventory`, etc. | Read/Export | Derived | Low | CSV, XLSX, and print exports functional across all major domains. |
| 23 | **Notifications & Audit** | `/audit` | `audit_logs`, `notifications`, `user_sessions` | `/audit/logs`, `/notifications` | Full CRUD | LocalStorage + RAM | Low | Mark as read, dismiss, and audit trail logging functional with persistent storage. |
| 24 | **Database Explorer** | `/database` | Dynamic Schema Discovery | `/database/tables`, `/database/schema` | Read/Explore | Dynamic | Low | Discovers all 30+ tables with live schema definitions and column specifications. |

---

## 2. Root Cause Analysis for Module Deficiencies

1. **Disconnected Persistence**:
   - Each module's persistence was patched independently using separate `localStorage` keys (`solecontrol_purchases_v2`, `solecontrol_stock_v2`, `solecontrol_users_v2`, etc.).
   - While this prevents UI errors for a single user, it creates data isolation between browser sessions and prevents true multi-user retail concurrency.
2. **Missing Transactional Invariants**:
   - In a production SQL database, creating a Sale must run in a transaction: `INSERT INTO sales`, `INSERT INTO sale_items`, `UPDATE stock_balances SET quantity = quantity - sold`, `INSERT INTO stock_movements`, `INSERT INTO journal_entries`.
   - In `api/index.js`, these steps are loosely decoupled or omitted entirely (e.g. stock balance deduction was omitted in the sales route).
