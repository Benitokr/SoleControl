# SoleControl Full UI & Button Audit

| Module | Element | Expected | Actual | Fix |
|---|---|---|---|---|
| Global / Branding | Sidebar, Login, Print, Tab title | "SoleControl" text wordmark; client logo only if uploaded; `<Page> · SoleControl` | Previously showed third-party "Forty V" logo | Replaced with "SoleControl" wordmark, optional upload in Company Config, dynamic `document.title` |
| App Shell | Sidebar group order & collapse | Fixed order (Overview → Sales → Inventory → Purchasing → Finance → Reports → Administration); only active group expanded | Previously all groups expanded and Administration mixed | Fixed `NAV_GROUPS` order + `expandedGroup` accordion |
| App Shell | Mobile bottom bar (<768px) | 5 quick tabs (Home, POS, Stock, Sales, More) with 44px+ targets | Missing | Added responsive mobile bottom nav bar |
| App Shell | Command Palette (Ctrl/Cmd+K) & `?` help | Navigate + quick actions + shortcuts dialog | Only basic page filter | Added Quick Actions (`New Sale`, `New Purchase Bill`, `New Article`) and `?` Shortcuts dialog |
| Dashboard | Header & KPI cards | Single "New Sale" button (top bar); uniform KPI structure; clickable Low stock (≤5 pairs) → `/inventory?filter=LOW`; empty state for zero trend | Duplicate "New Sale" button; emoji in greeting; flat zero chart | Removed duplicate button, removed emoji, added `?filter=LOW` deep link, empty state on zero trend |
| Master Data | Catalog hub | Unified setup progress row + left filters + Manage lists + 6-tab Article Detail Drawer + inline quick-add | 6 separate tabs without setup progress or inline list management | Built unified Catalog experience in `MastersPage.tsx` and inline quick-add in `ArticleNewPage.tsx` |
| DataTable | Utility bar (<15 rows) | Hide Comfortable/Columns/Export on small lists (<15 rows) | Shown on all tables | Gated behind `sortedData.length >= 15` |
| Sales & POS | Hub tabs & Print receipt | Hub tabs (`Overview`, `POS`, `Sales History`, `Customers`, `Offers`); no "Forty V" on receipt | No hub tabs; "Forty V" on receipt | Added `HubTabs`, Overview panel, cleaned receipt template |
| Purchasing | Hub tabs & Post-save next steps | Hub tabs (`Overview`, `POs`, `Bills`, `Vendors`); next-step modal (`Print Labels`, `Record Payment`, `View Stock`) | No hub overview or post-save next steps | Added `HubTabs` + Overview + Next Steps modal in `PurchaseNewPage.tsx` |
| Inventory | Hub tabs & `?filter=LOW` | Hub tabs (`Overview`, `Stock`, `Display`, `Transfers`, `Damage`, `Ageing`, `Barcodes`); URL filter sync | No hub overview or URL filter sync | Added `HubTabs` + Overview + `useSearchParams` filter sync |
| Finance | Accounting Hub tabs | Combined tabs for Day Book, Ledgers, Journals, Trial Balance, P&L, Balance Sheet, Capital, Bank & GST | Isolated tabs | Unified via `HubTabs` in `AccountingPage.tsx` |
| All Forms | Native selects / dates / silent catches | Zero native `<select>` or `<input type="date">`, real error toasts | Native store switcher in `AppShell` | Replaced with `SearchableCombobox` and `DatePicker` everywhere |
