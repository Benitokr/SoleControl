# SoleControl API Gaps (UI Redesign Phase)

| Module | Endpoint / Field Needed | Status / Workaround |
|---|---|---|
| Sales & POS | `GET/POST /api/v1/sales/holds` (Hold/Resume bills), `POST /api/v1/sales/eod-close` (End-of-day cash close) | Logged for backend phase; POS UI supports tab-based hold bills in session state until backend endpoint is added. |
| Purchasing | `GET /api/v1/purchase-orders`, `POST /api/v1/purchase-orders` (PO workflow separate from Purchase Bills) | Logged for backend phase; Purchase Orders tab/page checks `/purchases?type=PO` or `/purchase-orders` and shows empty/error state cleanly if unavailable. |
| Master Data | `GET /api/v1/masters/variants` with full article, size, colour, HSN, GST%, cost, MRP, barcode | `apps/api` exposes variants; `api/index.js` fallback has `/masters/variants`. |
| Role Enforcement | Backend `requirePermission` enforcement on every route & `/auth/me` accurate permission list | UI hides/disables menus and actions via `hasPermission()`; full backend audit in next phase. |
| Dashboard | Role-specific summary fields (`averageBillValue`, `lowStockCount`, `ageingStockValue`, `topBrands`, `topSizes`, `needsAttention`) | UI computes derived metrics from real `/dashboard/kpis`, `/dashboard/analytics`, `/inventory/stock` responses without inventing fake data. |
