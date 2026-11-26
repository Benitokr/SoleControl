# SoleControl UAT Checklist (Per Role)

## 1. Super Admin
- [ ] Sign in at `/login` (forced password change if default password active)
- [ ] Open `/company`, verify GSTIN, invoice prefix, and optional store logo upload
- [ ] Open `/masters`, verify Setup progress row and create a Footwear Article with `UK 6–11` variants
- [ ] Open `/purchases/new`, select Vendor, enter Bill No. & SizeRunGrid quantities, click **Receive Stock**
- [ ] Verify stock increased in `/inventory` and dashboard KPI updated
- [ ] Open `/sales/pos`, ring up a pair, collect UPI/Cash payment, print receipt
- [ ] Refresh browser (F5) on every route and confirm data persists from Neon PostgreSQL

## 2. Cashier (`SALES_EXECUTIVE`)
- [ ] Sign in and verify Dashboard shows Cashier view ("Start Billing" + today's own bills)
- [ ] Complete a POS sale, hold a bill (`F8`), resume a held bill, and close cash drawer (`Day Close`)
- [ ] Verify `/accounting` and `/company` are hidden from sidebar and return `403` if called directly

## 3. Accountant (`ACCOUNTS_USER`)
- [ ] Verify `/accounting` Day Book, Ledgers, Trial Balance (`Debits === Credits`)
- [ ] Post a balanced manual journal and confirm unbalanced journals are blocked
- [ ] Review `/bank-gst` Class A GST registers (12% HSN 6401–6405, 18% HSN 6406)

## 4. Warehouse Staff (`INVENTORY_USER`)
- [ ] Receive Purchase Bills, execute Stock Transfers (`Requested -> Dispatched -> Received`), log Damaged Goods, and adjust stock with a mandatory reason
