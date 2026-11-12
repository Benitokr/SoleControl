import { initDatabase, getPGlite } from '../apps/api/src/lib/db.js';
import { prisma } from '../apps/api/src/lib/prisma.js';
import { randomUUID } from 'crypto';

async function seedRichPack() {
  await initDatabase();
  const pglite = getPGlite();
  console.log('👟 Generating Rich Footwear Retail Demonstration Dataset...');

  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) {
    console.error('No active store found.');
    process.exit(1);
  }
  const storeId = store.id;

  const admin = await prisma.user.findFirst({ where: { email: 'superadmin@fortyv.local' } });
  const adminId = admin ? admin.id : randomUUID();

  // 1. Fetch Master Data
  const variants = await pglite.query(`SELECT id, sku, barcode, cost_price, selling_price, mrp FROM product_variants WHERE is_active = true`);
  const vRows = variants.rows as any[];
  console.log(`  ✓ Found ${vRows.length} active footwear variants`);

  const vendors = await pglite.query(`SELECT id, name FROM vendors`);
  const vendorRows = vendors.rows as any[];

  const customers = await pglite.query(`SELECT id, name FROM customers`);
  const custRows = customers.rows as any[];

  const locations = await pglite.query(`SELECT id, code, name FROM locations WHERE type = 'RACK'`);
  const locRows = locations.rows as any[];
  const rack1 = locRows[0]?.id || 'RCK-R1';
  const rack2 = locRows[1]?.id || 'RCK-S1';

  // 2. Additional Purchase Bills (Past 3 months)
  console.log('  -> Populating Vendor Purchase Consignments...');
  const purchaseBills = [
    { billNum: 'NIKE/BL/2026/041', docNum: 'PB-2026-002', vIdx: 0, daysAgo: 18, cls: 'CLASS_A', sub: 245000, tax: 29400, tot: 274400, stat: 'FINALISED' },
    { billNum: 'ADIDAS/INV/8812', docNum: 'PB-2026-003', vIdx: 1, daysAgo: 12, cls: 'CLASS_A', sub: 180000, tax: 21600, tot: 201600, stat: 'FINALISED' },
    { billNum: 'PUMA/WH/1092', docNum: 'PB-2026-004', vIdx: 2, daysAgo: 6, cls: 'CLASS_A', sub: 95000, tax: 11400, tot: 106400, stat: 'FINALISED' },
    { billNum: 'LOCAL/CASH/772', docNum: 'PB-2026-005', vIdx: 0, daysAgo: 2, cls: 'CLASS_B', sub: 45000, tax: 0, tot: 45000, stat: 'DRAFT' },
  ];

  for (const pb of purchaseBills) {
    const existing = await pglite.query(`SELECT id FROM purchases WHERE document_number = $1`, [pb.docNum]);
    if (existing.rows.length === 0 && vendorRows.length > pb.vIdx) {
      const pId = randomUUID();
      await pglite.query(
        `INSERT INTO purchases (id, store_id, vendor_id, bill_number, document_number, bill_date, class, status, subtotal, tax_amount, total_amount)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - ($6 || ' days')::interval, $7, $8, $9, $10, $11)`,
        [pId, storeId, vendorRows[pb.vIdx].id, pb.billNum, pb.docNum, pb.daysAgo, pb.cls, pb.stat, pb.sub, pb.tax, pb.tot]
      );

      // Insert purchase items
      for (let i = 0; i < 3; i++) {
        const itemIdx = (pb.vIdx * 3 + i) % vRows.length;
        const v = vRows[itemIdx];
        if (v) {
          await pglite.query(
            `INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, cost_price, mrp, selling_price, tax_rate, tax_amount)
             VALUES ($1, $2, $3, 12, $4, $5, $6, 12.0, $7)`,
            [randomUUID(), pId, v.id, v.cost_price, v.mrp, v.selling_price, Number(v.cost_price) * 12 * 0.12]
          );
        }
      }
    }
  }

  // 3. Additional POS Sales Invoices
  console.log('  -> Populating Retail Counter Sales...');
  const salesList = [
    { doc: 'INV-2026-003', cIdx: 0, mode: 'UPI', amount: 5899, tax: 707.88, daysAgo: 4 },
    { doc: 'INV-2026-004', cIdx: 1, mode: 'CARD', amount: 12999, tax: 1559.88, daysAgo: 3 },
    { doc: 'INV-2026-005', cIdx: 2, mode: 'CASH', amount: 3299, tax: 395.88, daysAgo: 2 },
    { doc: 'INV-2026-006', cIdx: 0, mode: 'UPI', amount: 4899, tax: 587.88, daysAgo: 1 },
    { doc: 'INV-2026-007', cIdx: 1, mode: 'UPI', amount: 7498, tax: 899.76, daysAgo: 0 },
    { doc: 'INV-2026-008', cIdx: 2, mode: 'CARD', amount: 15898, tax: 1907.76, daysAgo: 0 },
  ];

  for (const sl of salesList) {
    const existing = await pglite.query(`SELECT id FROM sales WHERE document_number = $1`, [sl.doc]);
    if (existing.rows.length === 0) {
      const saleId = randomUUID();
      const custId = custRows[sl.cIdx]?.id || null;
      await pglite.query(
        `INSERT INTO sales (id, store_id, document_number, customer_id, status, class, subtotal, tax_amount, total_amount, paid_amount, payment_mode, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'COMPLETED', 'CLASS_A', $5, $6, $7, $7, $8, $9, CURRENT_TIMESTAMP - ($10 || ' days')::interval)`,
        [saleId, storeId, sl.doc, custId, sl.amount, sl.tax, sl.amount + sl.tax, sl.mode, adminId, sl.daysAgo]
      );

      const v = vRows[sl.cIdx % vRows.length];
      if (v) {
        await pglite.query(
          `INSERT INTO sale_items (id, sale_id, variant_id, quantity, mrp, selling_price, discount_amount, tax_rate, tax_amount)
           VALUES ($1, $2, $3, 1, $4, $5, 0, 12.0, $6)`,
          [randomUUID(), saleId, v.id, v.mrp, v.selling_price, sl.tax]
        );

        // Movement
        await pglite.query(
          `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, note, created_at)
           VALUES ($1, $2, $3, $4, 'SALE_OUT', -1, 'SALE', $5, 'Counter slip retail bill', CURRENT_TIMESTAMP - ($6 || ' days')::interval)`,
          [randomUUID(), storeId, v.id, rack1, saleId, sl.daysAgo]
        );
      }
    }
  }

  // 4. Stock Transfers
  console.log('  -> Populating Stock Transfers Consignments...');
  const transfers = [
    { notes: 'Weekend surge replenishment for road running wall', status: 'RECEIVED', daysAgo: 5 },
    { notes: 'Transfer of UK 8/9 sizes to High-Traffic Sneaker Wall S1', status: 'DISPATCHED', daysAgo: 2 },
    { notes: 'Restocking formal leather footwear for corporate season', status: 'REQUESTED', daysAgo: 1 },
  ];
  for (const tr of transfers) {
    const tId = randomUUID();
    await pglite.query(
      `INSERT INTO stock_transfers (id, from_store_id, to_store_id, from_location_id, to_location_id, status, requested_by, notes, created_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP - ($8 || ' days')::interval)`,
      [tId, storeId, rack1, rack2, tr.status, adminId, tr.notes, tr.daysAgo]
    );
    if (vRows.length > 0) {
      await pglite.query(
        `INSERT INTO stock_transfer_items (id, transfer_id, variant_id, requested_qty)
         VALUES ($1, $2, $3, 6)`,
        [randomUUID(), tId, vRows[0].id]
      );
    }
  }

  // 5. Display Stock Allocations
  console.log('  -> Populating Showroom Display Stock...');
  const displays = [
    { notes: 'Right foot shoe sample for front window feature', qty: 1, daysAgo: 10 },
    { notes: 'Running wall showcase shoe sample UK 8', qty: 1, daysAgo: 7 },
    { notes: 'Center Island Streetwear lifestyle sample', qty: 2, daysAgo: 3 },
  ];
  for (let i = 0; i < displays.length; i++) {
    const d = displays[i];
    const v = vRows[i % vRows.length];
    if (v) {
      await pglite.query(
        `INSERT INTO display_allocations (id, store_id, variant_id, from_location_id, display_location_id, quantity, status, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'DISP-MAIN', $5, 'ACTIVE', $6, $7, CURRENT_TIMESTAMP - ($8 || ' days')::interval)`,
        [randomUUID(), storeId, v.id, rack1, d.qty, d.notes, adminId, d.daysAgo]
      );
    }
  }

  // 6. Damaged Goods
  console.log('  -> Populating Defect & Damage Registry...');
  const damages = [
    { desc: 'Outsole delamination observed during shelf unpacking', qty: 1, status: 'REPORTED', daysAgo: 6 },
    { desc: 'Minor shoelace eyelet tear during customer try-on', qty: 1, status: 'INSPECTION', daysAgo: 3 },
  ];
  for (let i = 0; i < damages.length; i++) {
    const dm = damages[i];
    const v = vRows[(i + 2) % vRows.length];
    if (v) {
      await pglite.query(
        `INSERT INTO damage_records (id, store_id, variant_id, location_id, quantity, status, description, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP - ($9 || ' days')::interval)`,
        [randomUUID(), storeId, v.id, rack1, dm.qty, dm.status, dm.desc, adminId, dm.daysAgo]
      );
    }
  }

  // 7. Capital Entries & Withdrawals
  console.log('  -> Populating Capital & Owner Equity...');
  const cap = await pglite.query(`SELECT id FROM capital_entries LIMIT 1`);
  if (cap.rows.length === 0) {
    const capId = randomUUID();
    await pglite.query(
      `INSERT INTO capital_entries (id, store_id, type, amount, description, reference, status, approved_by, created_at)
       VALUES ($1, $2, 'CONTRIBUTION', 500000.00, 'Initial Retail Working Capital Infusion - Forty V Equity', 'UTR-HDFC-991244', 'APPROVED', $3, CURRENT_TIMESTAMP - INTERVAL '30 days')`,
      [capId, storeId, adminId]
    );

    await pglite.query(
      `INSERT INTO withdrawals (id, store_id, amount, description, drawn_by, reference, status, created_at)
       VALUES ($1, $2, 25000.00, 'Monthly Partner Remuneration Drawings', 'Managing Partner', 'DRAW-2026-11', 'APPROVED', CURRENT_TIMESTAMP - INTERVAL '5 days')`,
      [randomUUID(), storeId]
    );
  }

  // 8. Bank Accounts & Reconciliations
  console.log('  -> Populating Bank Accounts & GST Transaction Ledger...');
  const bank = await pglite.query(`SELECT id FROM bank_accounts LIMIT 1`);
  if (bank.rows.length === 0) {
    const bankId = randomUUID();
    await pglite.query(
      `INSERT INTO bank_accounts (id, store_id, name, account_number, bank_name, ifsc, branch, opening_balance, current_balance, is_active)
       VALUES ($1, $2, 'HDFC Bank Corporate Current A/c', '50200088991122', 'HDFC Bank', 'HDFC0001234', 'Avinashi Road, Coimbatore', 250000.00, 482500.00, true)`,
      [bankId, storeId]
    );

    // Bank Statement Lines
    const stmts = [
      { date: '2026-11-02', desc: 'POS UPI Settlement batch 1102', debit: 0, credit: 26427.52, balance: 276427.52, ref: 'UPI-SETTLE-001' },
      { date: '2026-11-05', desc: 'NEFT Payment to Nike India Operations', debit: 143360.00, credit: 0, balance: 133067.52, ref: 'NEFT-NIKE-9811' },
      { date: '2026-11-08', desc: 'Card swipe settlement HDFC E-POS', debit: 0, credit: 35890.00, balance: 168957.52, ref: 'POS-CARD-BATCH-08' },
    ];
    for (const s of stmts) {
      await pglite.query(
        `INSERT INTO bank_statement_lines (id, bank_account_id, transaction_date, description, reference, debit, credit, balance, is_reconciled)
         VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7, $8, true)`,
        [randomUUID(), bankId, s.date, s.desc, s.ref, s.debit, s.credit, s.balance]
      );
    }
  }

  // 9. GST Transactions
  const gstCount = await pglite.query(`SELECT count(*) as count FROM gst_transactions`);
  if (Number(gstCount.rows[0].count) === 0) {
    await pglite.query(`
      INSERT INTO gst_transactions (id, store_id, type, purchase_class, reference_type, transaction_date, taxable_value, cgst, sgst, igst, total_value)
      VALUES 
      ($1, $2, 'INPUT', 'CLASS_A', 'PURCHASE', CURRENT_DATE - INTERVAL '15 days', 128000.00, 7680.00, 7680.00, 0.00, 143360.00),
      ($3, $2, 'INPUT', 'CLASS_A', 'PURCHASE', CURRENT_DATE - INTERVAL '10 days', 245000.00, 14700.00, 14700.00, 0.00, 274400.00),
      ($4, $2, 'OUTPUT', 'CLASS_A', 'SALE', CURRENT_DATE - INTERVAL '3 days', 23596.00, 1415.76, 1415.76, 0.00, 26427.52),
      ($5, $2, 'OUTPUT', 'CLASS_A', 'SALE', CURRENT_DATE - INTERVAL '1 day', 45000.00, 2700.00, 2700.00, 0.00, 50400.00)
    `, [randomUUID(), storeId, randomUUID(), randomUUID(), randomUUID()]);
  }

  // 10. Audit Logs
  const auditEntries = [
    { act: 'CREATE_PURCHASE', ent: 'purchase', meta: { doc: 'PB-2026-002', amount: 274400 } },
    { act: 'TRANSFER_STOCK', ent: 'stock_transfer', meta: { from: 'RCK-R1', to: 'RCK-S1', pairs: 6 } },
    { act: 'ALLOCATE_DISPLAY', ent: 'display_allocation', meta: { shelf: 'DISP-MAIN', sku: 'NK-AM-A5-8-BLK' } },
    { act: 'POST_JOURNAL', ent: 'journal_entry', meta: { ref: 'JV-2026-INIT', balanced: true } },
  ];
  for (const ae of auditEntries) {
    await pglite.query(
      `INSERT INTO audit_logs (id, action, entity, user_id, user_name, user_role, metadata, created_at)
       VALUES ($1, $2, $3, $4, 'Super Administrator', 'SUPER_ADMIN', $5, CURRENT_TIMESTAMP)`,
      [randomUUID(), ae.act, ae.ent, adminId, JSON.stringify(ae.meta)]
    );
  }

  console.log('\n✨ COMPLETE RICH DEMO PACK POPULATED INTO DATABASE! ✨\n');
  await pglite.close();
}

seedRichPack().catch(err => {
  console.error('Error seeding rich demo pack:', err);
  process.exit(1);
});
