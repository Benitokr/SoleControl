# SoleControl — REST API Specification

All endpoints are prefixed with `/api/v1`. Authentication is via Bearer JWT in the `Authorization` header (`Bearer <access_token>`).

## Standard Envelope Formats
### Success Response
```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "pageSize": 50 }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error message",
    "fields": { "email": "Invalid format" }
  }
}
```

---

## 1. Authentication (`/api/v1/auth`)
- `POST /login` — Authenticate super admin. Body: `{ email, password }`. Returns `{ accessToken, user }` and sets httpOnly refresh cookies.
- `POST /refresh` — Rotate refresh token cookie and issue a new 15-minute access token.
- `POST /logout` — Invalidate session in `user_sessions` and clear cookies.
- `GET /me` — Current authenticated user profile with effective permissions and accessible stores.
- `POST /change-password` — Change password. Body: `{ currentPassword, newPassword }`.

## 2. Organization & Configuration (`/api/v1/company`)
- `GET /profile` — Fetch company profile and retailer branding details.
- `PUT /profile` — Update legal name, address, GSTIN, PAN, and contact information.
- `GET /stores` — List all configured stores.
- `POST /stores` — Create new retail branch/store.
- `PUT /stores/:id` — Update store details or status.
- `GET /settings` — List all system configuration parameters.
- `PUT /settings/:key` — Update setting value (e.g., `sales.admin_entry_enabled`).

## 3. Master Data (`/api/v1/masters`)
- `GET /brands`, `POST /brands`, `PUT /brands/:id` — Brand catalogue management.
- `GET /categories`, `POST /categories`, `PUT /categories/:id` — Hierarchical product categories.
- `GET /sizes`, `POST /sizes`, `PUT /sizes/:id` — Footwear size registry (sort orders).
- `GET /colours`, `POST /colours`, `PUT /colours/:id` — Colour palette with hex codes.
- `GET /articles`, `POST /articles` — Articles with automatic size × colour variant matrix generator.
- `GET /variants` — Filterable SKU and barcode variant catalogue.

## 4. Locations & Warehouse Map (`/api/v1/locations`)
- `GET /tree` — Full hierarchical store warehouse tree (Floor → Dept → Rack → Shelf → Position).
- `POST /` — Create location node.
- `POST /bulk-positions` — Bulk generate shelf positions for a rack.
- `DELETE /:id` — Soft-deactivate location (blocked if non-zero stock balances exist).

## 5. Vendors & Purchasing (`/api/v1/vendors` & `/api/v1/purchases`)
- `GET /vendors`, `POST /vendors`, `PUT /vendors/:id` — Supplier directory and ledger balances.
- `GET /vendors/:id/statement` — Itemized bill and payment transaction history.
- `GET /purchases` — Filterable purchase bills (by Class A/B, status, vendor, date range).
- `POST /purchases` — Create draft purchase bill with size × colour matrix.
- `POST /purchases/:id/finalise` — Atomic transaction: increases stock balances, creates stock movements, creates barcodes, updates vendor payable, and posts balanced journal.
- `POST /purchases/:id/correct` — Controlled correction of finalised bills with reason tracking.
- `POST /purchases/:id/return` — Purchase return reducing stock and vendor payable.

## 6. Inventory & Warehousing (`/api/v1/inventory`, `/api/v1/display`, `/api/v1/transfers`, `/api/v1/damage`, `/api/v1/ageing`)
- `GET /inventory/stock` — Paginated stock balance explorer with cost and MRP valuations.
- `GET /inventory/stock/ledger/:variantId` — Immutable SKU movement audit trail.
- `POST /inventory/adjustments` — Stock quantity adjustments with reason.
- `POST /inventory/audits` — Create 2-month stock audit session snapshot.
- `PUT /inventory/audits/:id/lines/:lineId` — Record physical count for variance calculation.
- `POST /inventory/audits/:id/approve` — Reconcile system balances to physical counts.
- `POST /display/allocate`, `POST /display/:id/return` — Allocate stock between store racks and showroom displays.
- `POST /transfers`, `POST /transfers/:id/dispatch`, `POST /transfers/:id/receive` — Inter/intra-store stock transfer lifecycle.
- `POST /damage`, `POST /damage/:id/inspect`, `POST /damage/:id/write-off` — Defective shoe lifecycle; write-offs post double-entry loss journals.
- `GET /ageing/heatmap` — Category × Age bucket matrix.
- `POST /ageing/compute-recommendations` — Nightly rules execution generating clearance proposals.

## 7. Sales, POS & Offers (`/api/v1/sales`, `/api/v1/customers`, `/api/v1/offers`)
- `GET /sales`, `POST /sales` — Retail invoice creation (gated by `sales.admin_entry_enabled`). Supports split payment methods and automated offer calculations.
- `POST /sales/:id/return` — Invoice returns reversing stock and accounts.
- `POST /sales/:id/void` — Reversal-only cancellation with audit entry.
- `GET /customers`, `POST /customers`, `GET /customers/:id/history` — Customer CRM and credit balances.
- `GET /offers`, `POST /offers`, `POST /offers/simulate` — Promotional rules engine and dry-run discount testing.

## 8. General Ledger, Accounting & GST (`/api/v1/accounting`, `/api/v1/capital`, `/api/v1/bank`)
- `GET /accounting/accounts`, `POST /accounting/accounts` — Chart of Accounts.
- `GET /accounting/trial-balance` — Real-time Trial Balance verifying `DR === CR`.
- `GET /accounting/pl` — Profit & Loss calculation (Revenues vs COGS & Expenses).
- `GET /accounting/balance-sheet` — Balance sheet calculation (Assets vs Liabilities + Equity).
- `GET /accounting/journals`, `POST /accounting/journals` — Manual journal vouchers with balance validation.
- `POST /accounting/journals/:id/approve`, `POST /accounting/journals/:id/reverse` — Append-only reversal workflow.
- `GET /accounting/cashbook` — Account 1000 cash register ledger.
- `GET /capital`, `POST /capital`, `POST /capital/:id/approve` — Owner equity entries and drawings.
- `GET /bank/accounts`, `POST /bank/accounts` — Commercial bank accounts directory.
- `POST /bank/reconcile`, `POST /bank/unreconcile` — Bank statement matching.
- `GET /bank/gst-register`, `GET /bank/gst-summary` — Statutory GST reports isolating Class A purchases.

## 9. Dashboard, Reports & Alerts (`/api/v1/dashboard`, `/api/v1/reports`, `/api/v1/alerts`)
- `GET /dashboard/kpis` — Real-time today's sales, transactions, stock units, and pending bills.
- `GET /dashboard/insights` — Rule-based alerts (e.g., stale stock > 90 days, pending drafts).
- `GET /reports/:category` — Data export engine for Sales, Purchases, Inventory, Ageing, GST, and Trial Balance with CSV generation.
- `GET /alerts`, `POST /alerts/:id/read` — Super Admin notification inbox.
- `GET /alerts/audit-log` — Complete system audit trail with before/after state diffs.
- `GET /alerts/sessions`, `POST /alerts/sessions/:id/revoke` — Active user sessions and remote revocation.

## 10. Integrations & Barcodes (`/api/v1/integrations`, `/api/v1/barcodes`)
- `GET /integrations` — Provider status indicators (WhatsApp, Barcode, Bank, GST, Printer).
- `POST /integrations/:provider/test` — Real connectivity test returning latency and diagnostic status.
- `PUT /integrations/:provider` — Update provider credentials with AES-256-GCM encryption.
- `GET /barcodes/queue`, `POST /barcodes/jobs/:id/mark-printed` — Label generation and print queue management.

