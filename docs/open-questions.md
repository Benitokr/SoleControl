# SoleControl — Open Questions

Last updated: 2026-11-12

## Accounting & Finance
1. **Purchase Class A vs B**: GST registers include Class A only. Class B purchases are non-GST accountable. *[Accountant to confirm — default: Class A only in GST register]*
2. **Freight allocation method**: VALUE (default) or QUANTITY or EQUAL. *[Manager to confirm — default: VALUE]*
3. **Weighted average cost valuation**: Used for COGS and stock value. *[Accountant to confirm — default: weighted average]*
4. **Chart of accounts**: Codes 1000=Cash, 1300=Stock, 2000=Accounts Payable, 3000=Capital, 3100=Drawings, 4000=Sales, 5000=Purchases/COGS, 6000=Freight Expense, 6100=Loss on Write-off, 2100=GST Input, 4100=GST Output. *[Accountant to supply final CoA]*
5. **Posted journal reversal**: Reversals create a new POSTED entry with flipped lines. Original is never modified (append-only). *[Accountant to confirm]*

## Sales & Operations
6. **Super Admin sales entry**: Controlled by `sales.admin_entry_enabled` setting (default ON). When OFF, POST /sales → 403, GET /sales still works. *[Manager to confirm]*
7. **Sales return window**: No time limit enforced currently. *[Manager to confirm if limit needed]*
8. **Credit limit**: No credit limit enforcement on customers currently. *[Manager to confirm]*

## Stock & Inventory  
9. **Stock audit cycle**: Every 2 months (settings-driven). *[Manager to confirm frequency]*
10. **Label price encoding**: Plain price printed until encoding scheme is supplied. *[Manager to supply encoding rule]*
11. **Minimum stock alert threshold**: Not implemented — alert rules can be configured manually. *[Manager to supply thresholds per category]*

## GST & Compliance
12. **GSTIN format**: 15-character Indian GSTIN validated on input. *[Accountant to confirm state codes]*
13. **GST rate mapping**: Not implemented — tax_rate_id on variants not yet wired. *[Accountant to supply rate table]*
14. **E-invoice / IRN**: Not in scope for Release 1. *[Management to confirm timeline]*

## Integrations
15. **WhatsApp provider**: Twilio or Meta direct? API credentials not provided. *[IT to supply]*
16. **Bank statement format**: CSV import implemented. OFX/MT940 not in scope for Release 1. *[Accountant to confirm format]*
17. **GST portal API**: GSTN sandbox credentials not provided. *[Accountant/IT to supply]*
18. **Printer protocol**: ESC/POS over TCP or USB? Currently PDF export only. *[IT to supply printer model]*

## Multi-store (Future)
19. **Inter-store transfer approval**: Currently no approval step. *[Manager to confirm]*
20. **Cross-store stock visibility**: Not in scope for Release 1. *[Management to confirm]*
