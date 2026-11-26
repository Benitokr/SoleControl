# SoleControl Module Contract Matrix

| # | Module | C | R | U | D/Cancel | Persists (Neon) | Connections | RBAC Enforced | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dashboard / Today | — | Yes | — | — | Yes (`neondb`) | Sales, Stock, Payables, Receivables | `dashboard.view` | Verified |
| 2 | Company Configuration | — | Yes | Yes | — | Yes | Stores, Tax, Security settings | `company.view/edit` | Verified |
| 3 | Master Data (Catalog + Lists) | Yes | Yes | Yes | Deactivate | Yes | Articles -> Variants -> Stock/POS | `masters.*` | Verified |
| 4 | Users & Personnel | Yes | Yes | Yes | Deactivate | Yes | Roles, Audit, Auth | `users.*` | Verified |
| 5 | Roles & Permissions | Yes | Yes | Yes | — | Yes | Matrix enforced by `requirePermission` | `roles.*` | Verified |
| 6 | Locations | Yes | Yes | Yes | Deactivate | Yes | Stock balances, Transfers, Display | `locations.*` | Verified |
| 7 | Purchasing (PO, Bill/GRN) | Yes | Yes | Draft | Cancel | Yes | Stock, Movements, Vendor Payable, GST, Journal | `purchases.*` | Verified |
| 8 | Vendors & Suppliers | Yes | Yes | Yes | Deactivate | Yes | Purchases, Payments, Ledger | `vendors.*` | Verified |
| 9 | Warehouse Inventory | Yes | Yes | Yes | — | Yes | Movements, Valuation, Dashboard | `inventory.*` | Verified |
| 10 | Display Stock | Yes | Yes | — | Return | Yes | Warehouse stock balances | `display_stock.*` | Verified |
| 11 | Barcodes & Labels | Yes | Yes | — | — | Yes | Variants, Purchase queue, Print | `barcodes.*` | Verified |
| 12 | Stock Transfers | Yes | Yes | Dispatch | Receive | Yes | Source/Dest stock balances | `stock_transfers.*` | Verified |
| 13 | Ageing & Clearance | Yes | Yes | — | — | Yes | Stock age -> Clearance Offers | `ageing.*` | Verified |
| 14 | Damaged Goods | Yes | Yes | Write-off | Repair | Yes | Stock deduction, Loss journal | `damaged_goods.*` | Verified |
| 15 | Sales & POS (+ Holds, EOD, Returns) | Yes | Yes | — | Return/Void | Yes | `FOR UPDATE` Stock, Invoice series, GST, Journal | `sales.*` | Verified |
| 16 | Customers & CRM | Yes | Yes | Yes | Deactivate | Yes | POS lookup, LTV, Credit due | `customers.*` | Verified |
| 17 | Offers & Discounts | Yes | Yes | Yes | Deactivate | Yes | Applied in POS billing | `offers.*` | Verified |
| 18 | Accounting & Ledgers | Yes | Yes | — | Reversal | Yes | Balanced Dr=Cr journals (`0` unbalanced) | `accounting.*` | Verified |
| 19 | Capital & Withdrawals | Yes | Yes | — | — | Yes | Capital/Drawings journals | `capital.*` | Verified |
| 20 | Bank & GST | Yes | Yes | Reconcile | — | Yes | `tax_rates`, Class A GST registers | `bank_gst.*` | Verified |
| 21 | Reports & Exports | — | Yes | — | — | Yes | Reads same ledgers/movements | `reports.view` | Verified |
| 22 | Notifications & Alerts | — | Yes | Mark Read | — | Yes | Low stock, Pending GRN | `audit.view` | Verified |
| 23 | Audit Trail | — | Yes | — | — | Yes | Append-only before/after diffs | `audit.view` | Verified |
| 24 | System Health & DB Explorer | — | Yes | — | — | Yes | `/api/health`, read-only schema counts | `audit.view` | Verified |
