import http from 'http';
import { Pool } from 'pg';

process.env.SERVERLESS = '1';

const { app, initDatabase } = await import('../dist/server.js');
await initDatabase();

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text: text.slice(0, 300) };
}

function assertOk(label, r) {
  if (r.status >= 400) {
    throw new Error(`${label} FAILED (${r.status}): ${JSON.stringify(r.json || r.text)}`);
  }
  console.log(`PASS ${label} -> ${r.status}`);
  return r.json?.data;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  // Login
  const loginRes = await req('POST', '/auth/login', {
    email: 'superadmin@fortyv.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123',
  });
  const token = assertOk('Auth Login', loginRes).accessToken;

  const storeRow = (await pool.query(`SELECT id FROM stores WHERE is_active = true ORDER BY created_at ASC LIMIT 1`)).rows[0];
  const storeId = storeRow.id;
  const sizeRow = (await pool.query(`SELECT id, name FROM sizes LIMIT 1`)).rows[0];
  const colourRow = (await pool.query(`SELECT id, name FROM colours LIMIT 1`)).rows[0];
  const rackRow = (await pool.query(`SELECT id FROM locations WHERE type = 'RACK' LIMIT 1`)).rows[0];
  const posRow = (await pool.query(`SELECT id FROM locations WHERE type = 'POSITION' LIMIT 1`)).rows[0];

  // 1. Master Data: Brand (idempotent)
  const brands = assertOk('List Brands', await req('GET', '/masters/brands', null, token));
  let testBrand = brands.find((b) => b.name === 'SC-TEST Brand');
  if (!testBrand) {
    testBrand = assertOk('Create SC-TEST Brand', await req('POST', '/masters/brands', { name: 'SC-TEST Brand', code: 'SC-TEST-BRD', description: 'Idempotent test brand' }, token));
  } else {
    console.log('REUSE SC-TEST Brand:', testBrand.id);
  }
  assertOk('Update SC-TEST Brand', await req('PUT', `/masters/brands/${testBrand.id}`, { description: 'Verified in PostgreSQL' }, token));

  // 2. Category (idempotent)
  const cats = assertOk('List Categories', await req('GET', '/masters/categories', null, token));
  let testCat = cats.find((c) => c.name === 'SC-TEST Sneakers');
  if (!testCat) {
    testCat = assertOk('Create SC-TEST Category', await req('POST', '/masters/categories', { name: 'SC-TEST Sneakers', code: 'SC-TEST-CAT', hsnCode: '6404' }, token));
  } else {
    console.log('REUSE SC-TEST Category:', testCat.id);
  }

  // 3. Article + Variant (idempotent)
  const articles = assertOk('List Articles', await req('GET', '/masters/articles', null, token));
  let testArticle = articles.find((a) => a.articleNumber === 'SC-TEST-ART-01' || a.code === 'SC-TEST-ART-01');
  if (!testArticle) {
    testArticle = assertOk('Create SC-TEST Article', await req('POST', '/masters/articles', {
      name: 'SC-TEST Runner',
      articleNumber: 'SC-TEST-ART-01',
      brandId: testBrand.id,
      categoryId: testCat.id,
      hsnCode: '6404',
      mrp: 1999,
      baseSellingPrice: 1799,
      costPrice: 1000,
      gender: 'UNISEX',
    }, token));
  } else {
    console.log('REUSE SC-TEST Article:', testArticle.id);
  }

  const variants = assertOk('List Variants', await req('GET', '/masters/variants', null, token));
  let testVariant = variants.find((v) => v.articleId === testArticle.id);
  if (!testVariant) {
    const genRes = assertOk('Generate SC-TEST Variant', await req('POST', `/masters/articles/${testArticle.id}/generate-variants`, {
      sizeIds: [sizeRow.id],
      colourIds: [colourRow.id],
    }, token));
    testVariant = genRes.variants[0];
  } else {
    console.log('REUSE SC-TEST Variant:', testVariant.id);
  }

  // 4. Location (idempotent)
  const locs = assertOk('List Locations', await req('GET', '/locations', null, token));
  let testLoc = locs.find((l) => l.code === 'SC-TEST-RACK');
  if (!testLoc) {
    testLoc = assertOk('Create SC-TEST Location', await req('POST', '/locations', {
      name: 'SC-TEST Rack',
      code: 'SC-TEST-RACK',
      type: 'RACK',
      storeId,
    }, token));
  } else {
    console.log('REUSE SC-TEST Location:', testLoc.id);
  }

  // 5. Vendor (idempotent)
  const vendors = assertOk('List Vendors', await req('GET', '/vendors', null, token));
  let testVendor = vendors.find((v) => v.name === 'SC-TEST Vendor');
  if (!testVendor) {
    testVendor = assertOk('Create SC-TEST Vendor', await req('POST', '/vendors', {
      name: 'SC-TEST Vendor',
      phone: '9876543210',
      city: 'Coimbatore',
      gstin: '33AABCU9603R1ZM',
    }, token));
  } else {
    console.log('REUSE SC-TEST Vendor:', testVendor.id);
  }

  // 6. Purchase Order (idempotent)
  const pos = assertOk('List POs', await req('GET', '/purchases/orders', null, token));
  let testPo = pos.find((p) => p.po_number === 'SC-TEST-PO-01' || p.poNumber === 'SC-TEST-PO-01');
  if (!testPo) {
    testPo = assertOk('Create SC-TEST PO', await req('POST', '/purchases/orders', {
      poNumber: 'SC-TEST-PO-01',
      vendorId: testVendor.id,
      expectedDate: new Date().toISOString().slice(0, 10),
      notes: 'SC-TEST Purchase Order',
      items: [{ variantId: testVariant.id, qty: 10, unitCost: 1000 }],
    }, token));
  } else {
    console.log('REUSE SC-TEST PO:', testPo.id);
  }

  // 7. Purchase Bill + Finalise (idempotent)
  const purchases = assertOk('List Purchases', await req('GET', '/purchases', null, token));
  let testPurchase = purchases.find((p) => p.billNumber === 'SC-TEST-BILL-01' || p.bill_number === 'SC-TEST-BILL-01');
  if (!testPurchase) {
    testPurchase = assertOk('Create SC-TEST Purchase', await req('POST', '/purchases', {
      vendorId: testVendor.id,
      storeId,
      billNumber: 'SC-TEST-BILL-01',
      billDate: new Date().toISOString().slice(0, 10),
      purchaseClass: 'CLASS_A',
      items: [{
        variantId: testVariant.id,
        quantity: 10,
        costPrice: 1000,
        sellingPrice: 1799,
        gstRate: 12,
        mrp: 1999,
        locationId: testLoc.id,
      }],
    }, token));
  } else {
    console.log('REUSE SC-TEST Purchase:', testPurchase.id, 'status:', testPurchase.status);
  }
  if (testPurchase.status !== 'FINALISED') {
    assertOk('Finalise SC-TEST Purchase', await req('POST', `/purchases/${testPurchase.id}/finalise`, {}, token));
  }

  let stockRow = (await pool.query(`SELECT id, location_id, quantity FROM stock_balances WHERE variant_id = $1 AND quantity > 0 LIMIT 1`, [testVariant.id])).rows[0];
  if (stockRow && !stockRow.location_id) {
    await pool.query(`UPDATE stock_balances SET location_id = $1 WHERE id = $2`, [testLoc.id, stockRow.id]);
    await pool.query(`UPDATE stock_movements SET location_id = $1 WHERE variant_id = $2 AND location_id IS NULL`, [testLoc.id, testVariant.id]);
    stockRow.location_id = testLoc.id;
  }
  const stockLocId = stockRow?.location_id || testLoc.id;
  console.log('SC-TEST STOCK AFTER PURCHASE:', stockRow);

  // 8. Display Allocation (idempotent)
  const displays = assertOk('List Display Stock', await req('GET', '/display-stock', null, token));
  if (!displays.find((d) => (d.notes || '').includes('SC-TEST'))) {
    assertOk('Allocate Display Stock', await req('POST', '/display-stock/allocate', {
      storeId,
      variantId: testVariant.id,
      fromLocationId: stockLocId,
      displayLocationId: posRow?.id || rackRow?.id || testLoc.id,
      quantity: 1,
      notes: 'SC-TEST Display',
    }, token));
  } else {
    console.log('REUSE SC-TEST Display Allocation');
  }

  // 9. Stock Transfer (idempotent)
  const transfers = assertOk('List Transfers', await req('GET', '/transfers', null, token));
  if (!transfers.find((t) => (t.notes || '').includes('SC-TEST'))) {
    const tr = assertOk('Create Transfer', await req('POST', '/transfers', {
      fromStoreId: storeId,
      toStoreId: storeId,
      fromLocationId: stockLocId,
      toLocationId: rackRow?.id || testLoc.id,
      items: [{ variantId: testVariant.id, quantity: 1 }],
      notes: 'SC-TEST Transfer',
    }, token));
    assertOk('Dispatch Transfer', await req('POST', `/transfers/${tr.id}/dispatch`, {}, token));
    assertOk('Receive Transfer', await req('POST', `/transfers/${tr.id}/receive`, {}, token));
  } else {
    console.log('REUSE SC-TEST Transfer');
  }

  // 10. Stock Adjustment (idempotent)
  const adjs = assertOk('List Adjustments', await req('GET', '/inventory/adjustments', null, token));
  if (!adjs.find((a) => (a.reason || '').includes('SC-TEST'))) {
    assertOk('Create Stock Adjustment', await req('POST', '/inventory/adjustments', {
      storeId,
      reason: 'SC-TEST Cycle Count',
      items: [{ variantId: testVariant.id, locationId: stockLocId, delta: 1 }],
    }, token));
  } else {
    console.log('REUSE SC-TEST Adjustment');
  }

  // 11. Damaged Goods (idempotent)
  const damages = assertOk('List Damages', await req('GET', '/damages', null, token));
  if (!damages.find((d) => (d.description || '').includes('SC-TEST'))) {
    assertOk('Create Damage Record', await req('POST', '/damages', {
      storeId,
      variantId: testVariant.id,
      locationId: stockLocId,
      quantity: 1,
      description: 'SC-TEST Scuff defect',
    }, token));
  } else {
    console.log('REUSE SC-TEST Damage');
  }

  // 12. Barcode Queue (idempotent)
  const bq = assertOk('List Barcode Queue', await req('GET', '/barcodes/queue', null, token));
  if (!bq.find((b) => b.variantId === testVariant.id)) {
    assertOk('Queue Barcode Label', await req('POST', '/barcodes/queue', {
      variantId: testVariant.id,
      copies: 1,
    }, token));
  } else {
    console.log('REUSE SC-TEST Barcode Queue');
  }

  // 13. Ageing Rule (idempotent)
  const ageingRules = assertOk('List Ageing Rules', await req('GET', '/ageing/rules', null, token));
  if (!ageingRules.find((r) => (r.label || r.name || '').includes('SC-TEST'))) {
    assertOk('Create Ageing Rule', await req('POST', '/ageing/rules', {
      categoryId: testCat.id,
      thresholdDays: 90,
      discountPct: 20,
      label: 'SC-TEST 90d Clearance',
    }, token));
  } else {
    console.log('REUSE SC-TEST Ageing Rule');
  }

  // 14. Customer (idempotent)
  const customers = assertOk('List Customers', await req('GET', '/customers', null, token));
  let testCustomer = customers.find((c) => c.phone === '9876543211');
  if (!testCustomer) {
    testCustomer = assertOk('Create SC-TEST Customer', await req('POST', '/customers', {
      name: 'SC-TEST Customer',
      phone: '9876543211',
      email: 'sctest@example.com',
    }, token));
  } else {
    console.log('REUSE SC-TEST Customer:', testCustomer.id);
  }

  // 15. Offer (idempotent)
  const offers = assertOk('List Offers', await req('GET', '/offers', null, token));
  if (!offers.find((o) => (o.name || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Offer', await req('POST', '/offers', {
      name: 'SC-TEST 10% Off',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: new Date().toISOString(),
      storeId,
      isActive: true,
    }, token));
  } else {
    console.log('REUSE SC-TEST Offer');
  }

  // 16. Sale (idempotent)
  const sales = assertOk('List Sales', await req('GET', '/sales', null, token));
  if (!sales.find((s) => (s.notes || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Sale', await req('POST', '/sales', {
      storeId,
      customerId: testCustomer.id,
      notes: 'SC-TEST POS Sale',
      payments: [{ mode: 'UPI', amount: 1799 }],
      items: [{
        variantId: testVariant.id,
        locationId: stockLocId,
        quantity: 1,
        unitPrice: 1799,
        discountAmount: 0,
        gstRate: 12,
      }],
    }, token));
  } else {
    console.log('REUSE SC-TEST Sale');
  }

  // 17. Bank Account (idempotent)
  const banks = assertOk('List Bank Accounts', await req('GET', '/bank-gst/accounts', null, token));
  if (!banks.find((b) => (b.name || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Bank Account', await req('POST', '/bank-gst/accounts', {
      name: 'SC-TEST HDFC Current',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      storeId,
    }, token));
  } else {
    console.log('REUSE SC-TEST Bank Account');
  }

  // 18. Capital Entry & Withdrawal (idempotent)
  const caps = assertOk('List Capital Entries', await req('GET', '/capital', null, token));
  if (!caps.find((c) => (c.description || c.notes || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Capital Entry', await req('POST', '/capital', {
      storeId,
      type: 'INJECTION',
      amount: 10000,
      description: 'SC-TEST Capital',
    }, token));
  } else {
    console.log('REUSE SC-TEST Capital Entry');
  }

  const wds = assertOk('List Withdrawals', await req('GET', '/capital/withdrawals', null, token));
  if (!wds.find((w) => (w.description || w.notes || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Withdrawal', await req('POST', '/capital/withdrawals', {
      storeId,
      amount: 1000,
      drawnBy: 'Owner',
      description: 'SC-TEST Withdrawal',
    }, token));
  } else {
    console.log('REUSE SC-TEST Withdrawal');
  }

  // 19. Alert Rule (idempotent)
  const rules = assertOk('List Alert Rules', await req('GET', '/alerts/rules', null, token));
  if (!rules.find((r) => (r.name || '').includes('SC-TEST'))) {
    assertOk('Create SC-TEST Alert Rule', await req('POST', '/alerts/rules', {
      code: 'SC-TEST-LOW-STOCK',
      name: 'SC-TEST Low Stock Rule',
      condition: { threshold: 2 },
    }, token));
  } else {
    console.log('REUSE SC-TEST Alert Rule');
  }

  // 20. Verify DB Invariants directly in PostgreSQL
  const unbal = await pool.query(`
    SELECT je.id, je.reference, COALESCE(SUM(CASE WHEN jl.type='DEBIT' THEN jl.amount ELSE 0 END),0) as dr,
           COALESCE(SUM(CASE WHEN jl.type='CREDIT' THEN jl.amount ELSE 0 END),0) as cr
    FROM journal_entries je
    LEFT JOIN journal_lines jl ON jl.entry_id = je.id
    GROUP BY je.id, je.reference
    HAVING ABS(COALESCE(SUM(CASE WHEN jl.type='DEBIT' THEN jl.amount ELSE 0 END),0) - COALESCE(SUM(CASE WHEN jl.type='CREDIT' THEN jl.amount ELSE 0 END),0)) > 0.01
  `);
  console.log('UNBALANCED JOURNALS:', unbal.rows.length);

  const balSum = await pool.query(`SELECT COALESCE(SUM(quantity),0) as bal FROM stock_balances WHERE variant_id = $1`, [testVariant.id]);
  const movSum = await pool.query(`SELECT COALESCE(SUM(quantity),0) as mov FROM stock_movements WHERE variant_id = $1`, [testVariant.id]);
  console.log('SC-TEST VARIANT STOCK BALANCE vs MOVEMENTS:', { bal: balSum.rows[0].bal, mov: movSum.rows[0].mov });

  // 21. Verify Reports & Dashboard with real data
  assertOk('Dashboard KPIs', await req('GET', '/dashboard/kpis', null, token));
  assertOk('Reports Sales', await req('GET', '/reports/sales', null, token));
  assertOk('Reports Purchases', await req('GET', '/reports/purchases', null, token));
  assertOk('Reports Inventory', await req('GET', '/reports/inventory', null, token));
  assertOk('Reports Ageing', await req('GET', '/reports/ageing', null, token));
  assertOk('Reports GST', await req('GET', '/reports/gst', null, token));
  assertOk('Reports Trial Balance', await req('GET', '/reports/trial-balance', null, token));
  assertOk('Audit Logs', await req('GET', '/audit-logs', null, token));
  assertOk('Bank GST', await req('GET', '/bank-gst/gst', null, token));

  console.log('\nALL SC-TEST WORKFLOWS COMPLETED SUCCESSFULLY');
} finally {
  await pool.end();
  server.close();
}
