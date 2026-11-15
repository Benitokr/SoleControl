# SoleControl – Business Workflow & Dependency Matrix

**Date:** 2026-11-15  
**System:** Forty V Footwear Retail Management System (SoleControl)  

---

## 1. End-to-End Retail Flow Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    SOLECONTROL WORKFLOW ENGINE                                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ VENDORS ]                                                                                       |
|      │                                                                                             |
|      ▼                                                                                             |
|  [ PURCHASES ] ─────────────► [ INVENTORY ] ─────────────► [ BARCODE LABELS ]                      |
|  (Bill Scan / Draft)          (Stock Movements)            (WYSIWYG Designer)                      |
|      │                               │                             │                               |
|      │ (Auto-Journal)                ▼                             ▼                               |
|      ▼                        [ STORE MAP ]                [ POS / SALES ]                         |
|  [ ACCOUNTING ]               (Rack Allocation)            (Counter Bill)                          |
|  (Payables / Input GST)              │                             │                               |
|      │                               ▼                             ▼                               |
|      │                        [ DISPLAY STOCK ]            [ CUSTOMERS ]                           |
|      │                        (Showroom Floor)             (Loyalty / CRM)                         |
|      │                                                             │                               |
|      │                                                             ▼                               |
|      │                        [ STOCK TRANSFERS ]          [ OFFERS & PROMOS ]                     |
|      │                        (Dispatch / Receive)         (Simulator & Rules)                     |
|      │                               │                             │                               |
|      ▼                               ▼                             ▼                               |
|  [ BANK & GST ]               [ AGEING & CLEARANCE ] ◄───── [ SALES REPORTS ]                      |
|  (Reconciliation)             (90d+ Deadstock)                     │                               |
|      │                               │                             ▼                               |
|      │                               ▼                     [ DASHBOARD ]                           |
|      └──────────────────────► [ DAMAGED GOODS ] ──────────► (Real-Time KPIs)                       |
|                               (Write-off / Repair)                                                 |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Module Dependencies & State Propagation

| Workflow Step | Source Module | Action / Trigger | Target Modules | State & Data Propagation |
|---|---|---|---|---|
| **1. Procurement** | `Purchases` | Create Draft / Upload Bill | `Vendors`, `Purchases` | Validates vendor GSTIN; stores bill attachment; creates purchase line items with size × colour matrix. |
| **2. Inward GRN** | `Purchases` | Finalize Purchase | `Inventory`, `Barcodes`, `Accounting`, `Bank & GST` | Generates immutable `stock_movements` (IN); updates `stock_balances`; enqueues SKU barcode labels; posts balanced General Journal (Dr Stock, Dr Input GST, Cr Vendor). |
| **3. Barcode Labeling** | `Barcodes` | Queue Labels & Print | `Barcodes`, `Inventory` | Formats custom 50×25mm label with SKU barcode, Brand, Model, Size, and MRP; sets queue job status to `PRINTED`. |
| **4. Rack Placement** | `Locations` | Rack Allocation | `Locations`, `Inventory` | Links variant stock balance to physical `Location` (Floor ➔ Dept ➔ Rack ➔ Shelf); updates store map density gauge. |
| **5. Showroom Display** | `DisplayStock`| Allocate / Return | `DisplayStock`, `Inventory` | Allocates single sample shoe to window/floor display; returns pair to storage racks upon season rotation. |
| **6. POS Counter Sale** | `Sales` | Complete Invoice | `Inventory`, `Customers`, `Accounting`, `Bank & GST` | Decrements `stock_balances` via movement (OUT); updates Customer LTV and points; creates payment lines (Cash/UPI/Card); posts Journal (Dr Cash/Bank, Cr Sales, Cr Output GST, Dr COGS, Cr Stock). |
| **7. Customer Credit** | `Sales` | Credit Sale | `Customers`, `Accounting` | Records customer outstanding balance; generates accounts receivable ledger entry. |
| **8. Inter-Store Transit**| `Transfers` | Dispatch / Receive | `Transfers`, `Inventory` | Step 1 (`Dispatch`): removes stock from source location, status `DISPATCHED`. Step 2 (`Receive`): adds stock to target location, status `RECEIVED`. |
| **9. Deadstock Review** | `Ageing` | Run Heatmap Analysis | `Ageing`, `Offers` | Identifies variants exceeding 90/180 days; triggers clearance markdown recommendations. |
| **10. Damage & Defect** | `DamagedGoods`| Write-Off / Repair | `DamagedGoods`, `Inventory`, `Accounting` | Disposes defect footwear; reduces inventory on hand; posts Loss on Damaged Goods journal entry. |
| **11. Cash & Capital** | `Capital` | Equity Infusion / Drawings | `Capital`, `Accounting`, `Bank & GST` | Updates Partner Equity accounts; creates corresponding bank debit/credit entries. |
| **12. Reconciliation** | `Bank & GST` | Reconcile Line | `Bank & GST`, `Accounting` | Matches bank statement CSV transactions against internal POS receipts and vendor payouts. |
| **13. Real-Time Insight**| `Dashboard` | Real-time computation | `Dashboard`, `Reports` | Pulls live consolidated totals (revenue, transaction count, stock units, pending drafts, target progress) directly from actual operational records. |
| **14. Database Audit** | `Database` | Table / Record Explorer | Real Postgres / PGlite | Live introspection of actual database tables, column schemas, ER foreign-key relationships, and integrity health checks. |

---

## 3. Workflow Completion Status

- [x] Purchase Finalization & Automated Inventory Inward
- [x] Dual Split-View Purchase Bill Reader & Line Editor
- [x] SKU Barcode Label WYSIWYG Designer & Print Queue
- [x] Store Map & Topology Visual Rack Explorer
- [x] Showroom Display Unit Re-shelving Flow
- [x] POS Invoicing with Split Payment & Printable Receipt Voucher
- [x] Multi-Store Transfer Lifecycle (Requested ➔ Dispatched ➔ Received)
- [x] 90d+ Deadstock Clearance & Offer Simulator
- [x] Damaged Goods Write-off & Disposal Accounting
- [x] Double-Entry Ledger Posting & Trial Balance Verification
- [x] Bank Statement CSV Ingestion & Reconciliation
- [x] Real-time Dashboard KPI Aggregations
- [x] Database Explorer, Table Data Grid, ER Diagram & Health Inspector

