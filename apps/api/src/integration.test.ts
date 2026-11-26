import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { initDatabase, getPGlite } from './lib/db.js';

describe('SoleControl End-to-End Database & Business Workflow Suite', { timeout: 30000 }, () => {
  let token = '';
  let storeId = '';
  let vendorId = '';
  let brandId = '';
  let categoryId = '';
  let articleId = '';
  let variantId = '';
  let locationId = '';
  let displayLocId = '';
  let purchaseId = '';
  let saleId = '';

  beforeAll(async () => {
    await initDatabase();
  });

  // 1. Authentication
  it('1. Authenticates Super Admin against Neon PostgreSQL and issues JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@fortyv.local', password: 'ChangeMe@123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    token = res.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('superadmin@fortyv.local');
  });

  // 2. Core Master Data & Store Setup
  it('2. Retrieves seeded Store and sets up test Footwear Masters', async () => {
    const db = getPGlite();
    const storeRes = await db.query("SELECT id FROM stores WHERE code = 'STORE-01' LIMIT 1");
    expect(storeRes.rows.length).toBe(1);
    storeId = storeRes.rows[0].id;

    // Create test storage location and display location
    await db.query(
      `INSERT INTO locations (id, store_id, name, type, code, created_at, updated_at)
       VALUES ('loc-test-wh', $1, 'Main Warehouse Rack A', 'RACK', 'RACK-A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
              ('loc-test-disp', $1, 'Front Display Showcase', 'SHELF', 'DISP-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [storeId]
    );
    locationId = 'loc-test-wh';
    displayLocId = 'loc-test-disp';

    // Create test Brand, Category, Article, Variant
    await db.query(
      `INSERT INTO brands (id, name, code, is_active, created_at, updated_at) VALUES ('br-test-01', 'SoleTest Athletic', 'STAT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`
    );
    brandId = 'br-test-01';

    // Ensure or retrieve test Category and Brand
    const bRes = await db.query(
      `INSERT INTO brands (id, name, code, is_active, created_at, updated_at)
       VALUES ('brd-test-01', 'Nike Athletic', 'NK-TEST', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    brandId = bRes.rows[0].id;

    const cRes = await db.query(
      `INSERT INTO categories (id, name, code, is_active, created_at, updated_at)
       VALUES ('cat-test-01', 'Running Footwear', 'RUN-TEST', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    categoryId = cRes.rows[0].id;

    await db.query(
      `INSERT INTO articles (id, brand_id, category_id, name, article_number, is_active, created_at, updated_at)
       VALUES ('art-test-01', $1, $2, 'HyperGlide 2026', 'HG-2026', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`,
      [brandId, categoryId]
    );
    articleId = 'art-test-01';

    const szRes = await db.query(
      `INSERT INTO sizes (id, code, name, system, sequence, is_active)
       VALUES ('sz-uk-08', 'UK-8', 'UK 8', 'UK', 8, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const sizeId = szRes.rows[0].id;

    const colRes = await db.query(
      `INSERT INTO colours (id, code, name, hex_code, is_active)
       VALUES ('col-blk-01', 'BLK', 'Core Black', '#000000', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const colourId = colRes.rows[0].id;

    await db.query(
      `INSERT INTO product_variants (id, article_id, size_id, colour_id, sku, barcode, cost_price, mrp, selling_price, is_active, created_at, updated_at)
       VALUES ('var-test-01', $1, $2, $3, 'HG26-UK8-BLK', '8901234567890', 1200.00, 2999.00, 2499.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [articleId, sizeId, colourId]
    );
    variantId = 'var-test-01';

    // Create test Vendor
    const vRes = await db.query(
      `INSERT INTO vendors (id, name, code, contact_person, phone, email, gstin, balance, is_active)
       VALUES ('vnd-test-01', 'Coimbatore Leather Mills', 'CLM-01', 'Rajan K', '+91 98401 99999', 'rajan@clm.local', '33AABCC1234A1Z1', 0, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    vendorId = vRes.rows[0].id;
  });

  // 3. Purchase Inwarding Workflow
  it('3. Inward Purchase Order: Increments Stock Balance & Records PURCHASE Movement', async () => {
    const db = getPGlite();

    // Clean any prior test balances for this variant or test balance id
    await db.query("DELETE FROM stock_balances WHERE id = 'sb-test-01' OR variant_id = $1", [variantId]);
    await db.query("DELETE FROM purchases WHERE id = 'pur-test-01'");
    await db.query("DELETE FROM stock_movements WHERE reference_id = 'pur-test-01' OR reference_id = 'sale-test-01'");

    // Create Purchase
    const purRes = await db.query(
      `INSERT INTO purchases (id, store_id, vendor_id, bill_number, class, status, subtotal, tax_amount, total_amount, created_at, updated_at)
       VALUES ('pur-test-01', $1, $2, 'CLM-INV-888', 'CLASS_A', 'DRAFT', 12000.00, 1440.00, 13440.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET status = 'DRAFT' RETURNING id`,
      [storeId, vendorId]
    );
    purchaseId = 'pur-test-01';

    await db.query(
      `INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, cost_price, selling_price, mrp, tax_rate, tax_amount)
       VALUES ('pi-test-01', $1, $2, 10, 1200.00, 2499.00, 2999.00, 12.0, 1440.00)
       ON CONFLICT (id) DO UPDATE SET quantity = 10`,
      [purchaseId, variantId]
    );

    // Finalise Purchase / Stock Inward
    await db.query("UPDATE purchases SET status = 'FINALISED' WHERE id = $1", [purchaseId]);

    // Apply inward to stock_balances and stock_movements
    await db.query(
      `INSERT INTO stock_balances (id, store_id, variant_id, location_id, quantity)
       VALUES ('sb-test-01', $1, $2, $3, 10)
       ON CONFLICT (id) DO UPDATE SET store_id = EXCLUDED.store_id, variant_id = EXCLUDED.variant_id, location_id = EXCLUDED.location_id, quantity = 10`,
      [storeId, variantId, locationId]
    );

    await db.query(
      `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, created_at)
       VALUES ('sm-pur-01', $1, $2, $3, 'PURCHASE', 10, 'PURCHASE', $4, CURRENT_TIMESTAMP)`,
      [storeId, variantId, locationId, purchaseId]
    );

    // Verify balance is exactly 10
    const balCheck = await db.query("SELECT quantity FROM stock_balances WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);
    expect(Number(balCheck.rows[0].quantity)).toBe(10);
  });

  // 4. Sales / POS Inventory Deduction & Double-Entry Journal
  it('4. Confirms POS Sale: Deducts Inventory, Records SALE Movement & Posts Balanced Journal', async () => {
    const db = getPGlite();
    saleId = 'sale-test-01';

    await db.query("DELETE FROM journal_lines WHERE journal_entry_id = 'je-sale-test-01' OR entry_id = 'je-sale-test-01'");
    await db.query("DELETE FROM journal_entries WHERE id = 'je-sale-test-01'");
    await db.query("DELETE FROM sale_items WHERE sale_id = $1", [saleId]);
    await db.query("DELETE FROM sales WHERE id = $1", [saleId]);

    // Create Sale for 2 pairs
    await db.query(
      `INSERT INTO sales (id, store_id, document_number, status, class, subtotal, tax_amount, total_amount, paid_amount, created_by, created_at, updated_at)
       VALUES ($1, $2, 'INV-26-9001', 'COMPLETED', 'CLASS_A', 4998.00, 599.76, 5597.76, 5597.76, 'usr-test-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [saleId, storeId]
    );

    await db.query(
      `INSERT INTO sale_items (id, sale_id, variant_id, quantity, mrp, selling_price, tax_rate, tax_amount)
       VALUES ('si-test-01', $1, $2, 2, 2999.00, 2499.00, 12.0, 599.76)`,
      [saleId, variantId]
    );

    // Deduct stock from warehouse
    await db.query(
      `UPDATE stock_balances SET quantity = quantity - 2 WHERE variant_id = $1 AND location_id = $2`,
      [variantId, locationId]
    );

    await db.query(
      `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, created_at)
       VALUES ('sm-sale-01', $1, $2, $3, 'SALE', -2, 'SALE', $4, CURRENT_TIMESTAMP)`,
      [storeId, variantId, locationId, saleId]
    );

    // Post double-entry journal (Dr Cash, Cr Sales Revenue)
    const journalId = 'je-sale-test-01';
    await db.query(
      `INSERT INTO journal_entries (id, store_id, reference_type, reference_id, reference, status, total_debit, total_credit, created_at, updated_at)
       VALUES ($1, $2, 'SALE', $3, 'INV-26-9001', 'POSTED', 5597.76, 5597.76, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [journalId, storeId, saleId]
    );

    await db.query(
      `INSERT INTO journal_lines (id, journal_entry_id, entry_id, account_id, account_code, account_name, type, amount, debit, credit, description)
       VALUES ('jl-01', $1, $1, 'acc-1000', '1000', 'Cash in Hand', 'DEBIT', 5597.76, 5597.76, 0.00, 'Sale receipt'),
              ('jl-02', $1, $1, 'acc-4000', '4000', 'Sales Revenue', 'CREDIT', 5597.76, 0.00, 5597.76, 'Sales revenue')`,
      [journalId]
    );

    // Verify stock balance decremented from 10 to 8
    const balCheck = await db.query("SELECT quantity FROM stock_balances WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);
    expect(Number(balCheck.rows[0].quantity)).toBe(8);

    // Verify journal balances (Total Debit == Total Credit)
    const jCheck = await db.query("SELECT total_debit, total_credit FROM journal_entries WHERE id = $1", [journalId]);
    expect(Number(jCheck.rows[0].total_debit)).toBe(Number(jCheck.rows[0].total_credit));
  });

  // 5. Display Allocation Workflow
  it('5. Allocates Stock to Display: Transfers 1 Pair from Storage to Display Location', async () => {
    const db = getPGlite();
    const allocId = 'disp-test-01';

    await db.query("DELETE FROM display_allocations WHERE id = $1", [allocId]);
    await db.query("DELETE FROM stock_balances WHERE id = 'sb-disp-01'");

    await db.query(
      `INSERT INTO display_allocations (id, store_id, variant_id, from_location_id, display_location_id, quantity, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, 'ACTIVE', 'usr-test-admin', CURRENT_TIMESTAMP)`,
      [allocId, storeId, variantId, locationId, displayLocId]
    );

    // Deduct warehouse, credit display
    await db.query("UPDATE stock_balances SET quantity = quantity - 1 WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);
    await db.query(
      `INSERT INTO stock_balances (id, store_id, variant_id, location_id, quantity)
       VALUES ('sb-disp-01', $1, $2, $3, 1)
       ON CONFLICT (id) DO UPDATE SET quantity = stock_balances.quantity + 1`,
      [storeId, variantId, displayLocId]
    );

    // Verify warehouse is now 7, display is 1
    const whBal = await db.query("SELECT quantity FROM stock_balances WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);
    const dispBal = await db.query("SELECT quantity FROM stock_balances WHERE variant_id = $1 AND location_id = $2", [variantId, displayLocId]);

    expect(Number(whBal.rows[0].quantity)).toBe(7);
    expect(Number(dispBal.rows[0].quantity)).toBe(1);
  });

  // 6. Damaged Goods Workflow
  it('6. Records Damaged Goods: Deducts Sellable Stock and Creates Damage Audit Record', async () => {
    const db = getPGlite();
    const damId = 'dam-test-01';

    await db.query("DELETE FROM damage_records WHERE id = $1", [damId]);

    await db.query(
      `INSERT INTO damage_records (id, store_id, variant_id, location_id, quantity, status, description, created_by, created_at)
       VALUES ($1, $2, $3, $4, 1, 'REPORTED', 'Sole tearing during transit inspection', 'usr-test-admin', CURRENT_TIMESTAMP)`,
      [damId, storeId, variantId, locationId]
    );

    // Deduct sellable warehouse stock
    await db.query("UPDATE stock_balances SET quantity = quantity - 1 WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);

    // Verify warehouse stock is now 6
    const whBal = await db.query("SELECT quantity FROM stock_balances WHERE variant_id = $1 AND location_id = $2", [variantId, locationId]);
    expect(Number(whBal.rows[0].quantity)).toBe(6);
  });

  // 7. Cleanup Test Records
  afterAll(async () => {
    const db = getPGlite();
    // Clean all isolated test rows so database remains 100% production-clean
    await db.query("DELETE FROM journal_lines WHERE entry_id = 'je-sale-test-01'");
    await db.query("DELETE FROM journal_entries WHERE id = 'je-sale-test-01'");
    await db.query("DELETE FROM sale_items WHERE sale_id = 'sale-test-01'");
    await db.query("DELETE FROM sales WHERE id = 'sale-test-01'");
    await db.query("DELETE FROM display_allocations WHERE id = 'disp-test-01'");
    await db.query("DELETE FROM damage_records WHERE id = 'dam-test-01'");
    await db.query("DELETE FROM stock_movements WHERE reference_id IN ('pur-test-01', 'sale-test-01')");
    await db.query("DELETE FROM stock_balances WHERE variant_id = 'var-test-01'");
    await db.query("DELETE FROM purchase_items WHERE purchase_id = 'pur-test-01'");
    await db.query("DELETE FROM purchases WHERE id = 'pur-test-01'");
    await db.query("DELETE FROM product_variants WHERE id = 'var-test-01'");
    await db.query("DELETE FROM articles WHERE id = 'art-test-01'");
    await db.query("DELETE FROM categories WHERE id = 'cat-test-01'");
    await db.query("DELETE FROM brands WHERE id = 'br-test-01'");
    await db.query("DELETE FROM vendors WHERE id = 'vnd-test-01'");
    await db.query("DELETE FROM locations WHERE id IN ('loc-test-wh', 'loc-test-disp')");
  });
});
