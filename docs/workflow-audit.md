# SoleControl — Business Workflow & Integration Audit
**Date:** 25 November 2026  
**Auditor:** Senior Software Architect & Workflow Analyst  
**Status:** Audit Completed (No Code Changes)

---

## 1. End-to-End Footwear Retail Workflow Matrix

The business process for Forty V footwear retail management demands strict sequential transitions:
`Vendor Inward -> Goods Received Note (GRN) -> Warehouse Inventory -> Barcode Generation -> Store Rack Assignment -> Display Shelf Allocation -> Point of Sale (POS) -> Returns/Disposal -> Double-Entry Accounting -> GST Compliance -> Executive Dashboard`

| Workflow Stage | Intended Business Logic | Actual Current Implementation | Status | Severity |
|---|---|---|---|---|
| **1. Purchase Creation** | Record vendor invoice, line items (article, size, colour, cost, MRP), freight/expenses, and draft approval. | Implemented in `PurchasesPage.tsx`. Saves to `PurchaseStorage` and `DB.purchases`. Computes landed cost. | **Working (Simulated)** | Medium |
| **2. Goods Received (GRN) & Stock Inward** | Finalising purchase creates immutable stock movement (`PURCHASE_INWARD`), increases warehouse balance, creates vendor payable credit note, and posts debit to Stock ledger. | `PurchaseStorage.add()` registers SKUs into `StockStorage`. `api/index.js` creates a mock journal entry in `DB.journals`. No relational DB transactions. | **Partially Integrated** | High |
| **3. Inventory Balances** | Central warehouse tracks variant quantities by SKU, location, weighted average cost, and MRP valuation. | `InventoryPage.tsx` displays balances from `StockStorage.mergeWith()`. Adjustments update `StockStorage` and `AdjustmentStorage`. | **Working (Local Persistence)** | Medium |
| **4. Barcode Printing** | Automatic generation of Code 128 / EAN barcodes for inwarded pairs with size, brand, and selling price. | `BarcodesPage.tsx` renders live barcode previews via SVG/canvas and allows queuing label batches. Reads inwarded SKUs via `StockStorage.mergeWith()`. | **Working** | Low |
| **5. Rack & Location Mapping** | Assign variants to specific Floor -> Department -> Rack -> Shelf -> Position coordinates. | `LocationsPage.tsx` visualizes location hierarchy, but allocations do NOT validate physical rack capacities or update `stock_balances(location_id)`. | **Disconnected** | High |
| **6. Display Stock Allocation** | Move specific sample pairs (e.g., right foot UK 8) from warehouse racks to storefront showcase windows. | `DisplayStockPage.tsx` tracks display pairs via `DisplayStorage` and `DB.displays`. Now allows typing or selecting any SKU. | **Working (Simulated)** | Low |
| **7. Sales & POS Billing** | Scan barcode/SKU, apply discount/offers, calculate 12% footwear GST, tender payment (Cash/UPI/Card), deduct stock balance, print receipt. | `SalesPage.tsx` records sale in `SalesStorage` and `DB.sales`. Creates mock journal entry and GST record. **Critical flaw: Does not deduct quantity from `StockStorage` or `DB.balances`.** | **Broken Transition** | **Critical** |
| **8. Customer Returns & Damage** | Return restocking or damage quarantine. Damaged shoes routed to repair, vendor claim, or write-off loss. | `DamagedGoodsPage.tsx` records damage events via `DamagedGoodsStorage`. Does not formally write off value via journal reversal. | **Partially Integrated** | Medium |
| **9. Accounting & Journals** | Strict double-entry posting: Dr Stock / Cr Vendor on purchase; Dr Cash / Cr Sales + Cr Output GST on sale; Dr COGS / Cr Stock. | `AccountingPage.tsx` displays Trial Balance, Profit & Loss, Balance Sheet, and General Ledger derived from `DB.journals` in serverless memory. | **Volatile** | High |
| **10. GST Compliance** | GSTR-1 (Outward supplies from sales), GSTR-2B (Input tax credit from Class A purchases), GSTR-3B monthly offset. | `BankGSTPage.tsx` computes tax liability from `DB.sales` and `DB.purchases`. Figures disappear if memory resets. | **Working (Volatile)** | High |
| **11. Executive Dashboard** | Real-time aggregate KPIs (Sales, On-hand pairs, Payables, Receivables, Margins, Top Brands). | `DashboardPage.tsx` displays dynamic figures. Now cleaned of hardcoded dummy subtitles. | **Working** | Low |

---

## 2. Forensic Trace of Broken Workflow Transitions

### Defect W1: Sale Does Not Decrement Inventory Stock Balance
- **Trace**:
  1. User records a sale in `/sales` for 2 pairs of `NI-AIR-8-BLK`.
  2. Frontend executes `SalesStorage.add()` and `POST /sales`.
  3. `api/index.js` handles `POST /sales`:
     ```javascript
     const newSale = { id: 'sl-' + Date.now(), total_amount: ..., ... };
     sales.unshift(newSale);
     // Journals and GST are created, but DB.balances is untouched!
     ```
  4. Neither `StockStorage.adjust(sku, -quantity)` nor `DB.balances.find().quantity -= quantity` is invoked!
- **Consequence**: A store can sell 100 pairs, but Warehouse Inventory (`/inventory`) and Stock Explorer still show the exact same quantity. Stock balances never deplete from retail sales.

### Defect W2: Location Allocations Do Not Reconcile Against Warehouse Balances
- **Trace**:
  1. `/locations` lets the user create Floors, Departments, Racks, and Shelves.
  2. Allocating stock to a Rack in `LocationsPage.tsx` creates an isolated allocation record.
  3. This record is not joined with `stock_balances.location_id`.
- **Consequence**: The Store Map shows merchandise on racks that may not exist in warehouse inventory, creating a disconnect between physical locations and book inventory.

### Defect W3: Super Admin Sales Entry Constraint Gating
- **Trace**:
  1. Master specification A9 states: *"Super Admin sales entry is a setting: sales.admin_entry_enabled (default ON). When OFF, New sale and create endpoints return 403."*
  2. Currently, sales entry is permanently hardcoded open with no setting check against company configuration.
