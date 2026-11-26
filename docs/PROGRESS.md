# SoleControl UI Redesign Progress

| Area / Module | Status | Pattern Used | Notes |
|---|---|---|---|
| Part 1: Design System (`components/ui/*`, `components/footwear/*`) | done | Shared UI + Footwear primitives | Light `#F7F8FA` / deep navy `#0F172A` / teal `#0D9488`, Inter + tabular-nums, `SearchableCombobox`, `DatePicker`, `MoneyInput`, `QuantityStepper`, `SizeRunGrid`, `DataTable`, `Drawer`, `FullPageForm`, `ConfirmDialog`, `PrintPreview`, `StatusTracker` |
| Part 2: App Shell (`AppShell.tsx`) | done | Grouped deep-navy sidebar + topbar + Ctrl+K | Responsive drawer on tablet/phone, role-aware via `hasPermission`, full-screen POS bypass |
| 1. Dashboard (`/dashboard`) | done | Role-based KPIs + Recharts + Needs Attention | Admin vs Cashier view, store & period filters |
| 2. Company Configuration (`/company`) | done | Tabbed settings + Save bar | Profile, Tax & invoice, Inventory rules, Print settings, Security |
| 3. Master Data (`/masters`, `/masters/articles/new`) | done | Tabs + Full-page Article builder | Card/table toggle, SizeRunGrid SKU preview, duplicate detection |
| 4. Users & Personnel (`/users`) | done | Table + Right-side Drawer | Role description, deactivate ConfirmDialog |
| 5. Roles & Permissions (`/roles`) | done | Split list + Matrix + Compare | Module × action matrix + Compare roles view |
| 6. Locations (`/locations`) | done | DataTable + Right-side Drawer | Floor/Department/Rack/Shelf/Display types |
| 7. Purchasing & Procurement (`/purchases`, `/purchases/new`) | done | List + Full-page PO & Purchase Bill | StatusTracker, SizeRunGrid UK 6–11, sticky summary + bottom bar, duplicate bill warning |
| 8. Vendors & Suppliers (`/vendors`) | done | List + Detail Drawer + Payment tab | Outstanding balance, Record Payment |
| 9. Warehouse Inventory (`/inventory`) | done | Grouped Article + SizeRunGrid + Drawer | Expandable colour SizeRunGrids, flat SKU toggle, adjustment drawer |
| 10. Display Stock (`/display`) | done | Shelf Board + Two-pane Drawer | Move to display / Return to warehouse |
| 11. Barcodes & Labels (`/barcodes`) | done | Picker + Live Preview + PrintPreview | Template size selector, live sticker preview |
| 12. Stock Transfers (`/transfers`) | done | List + Full-page SizeRunGrid Transfer | StatusTracker, source stock limits |
| 13. Ageing & Clearance (`/ageing`) | done | Clickable Bucket Cards + Bulk Offer | 0–30, 31–60, 61–90, 90+ cards + bulk clearance offer |
| 14. Damaged Goods (`/damage`) | done | List + Full-page Batch Entry | Stock impact preview, vendor-claim toggle, write-off/repair |
| 15. Sales & POS (`/sales`, `/sales/pos`) | done | Full-screen 3-zone POS + Sales History | Touch-friendly 44px+ steppers, Hold/Resume, Cash/UPI/Card/Split, EOD close, PrintPreview |
| 16. Customers & CRM (`/customers`) | done | List + Detail Drawer + Quick-Add | Searchable by phone/name, LTV & credit |
| 17. Offers & Discounts (`/offers`) | done | List + Full-page Rule Builder | Plain-language rule preview, DatePicker validity |
| 18. Accounting & Ledgers (`/accounting`) | done | Tabbed Day Book, COA, Full-page Journal | Live Dr/Cr balance check, cannot post unbalanced |
| 19. Capital & Withdrawals (`/capital`) | done | List + Running Balance + Drawer | Capital introduced vs owner drawings |
| 20. Bank & GST (`/bank-gst`) | done | Bank Reconciliation + GST Registers | Class A output/input GST summary |
| 21. Reports & Exports (`/reports`) | done | Categorised Report Library + CSV Export | Sales, Inventory, Purchase, Finance, GST, Customer |
| 22. Notifications & Alerts (`/notifications`) | done | Inbox + Alert Thresholds | Unread filter, mark all read |
| 23. Audit Trail (`/audit`) | done | Expandable Before/After Diff Drawer | Read-only append-only log |
| 24. System Health & DB Explorer (`/system-health`, `/database`) | done | Read-only Status + Table Browser | Clear read-only banner |
