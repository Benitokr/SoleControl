// Master Rich Footwear Retail Seed Data Pack
// Usage: npx tsx prisma/seed-full-demo.ts

import { initDatabase, getPGlite } from '../apps/api/src/lib/db.js';
import { prisma } from '../apps/api/src/lib/prisma.js';
import { randomUUID } from 'crypto';

async function seedFullDemo() {
  await initDatabase();
  const pglite = getPGlite();
  console.log('👟 Starting Full Demo Footwear Retail Data Pack...');

  // 1. Store
  let store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        id: randomUUID(),
        code: 'STORE-01',
        name: 'Forty V Flagship - Coimbatore',
        address: '155, Balaji Nagar, IOB Colony, BU Post, CBE - 46',
        gstin: '33AAAAA0000A1Z5',
        phone: '+91 98765 43210',
        email: 'store01@fortyv.com',
        isActive: true,
      }
    });
  }
  const storeId = store.id;

  // 2. Warehouse Locations Tree
  console.log('  -> Seeding Warehouse Hierarchy...');
  let floor = await prisma.location.findFirst({ where: { storeId, code: 'FL-01' } });
  let floorId = floor?.id;
  if (!floor) {
    floorId = randomUUID();
    await pglite.query(
      `INSERT INTO locations (id, store_id, name, code, type, is_active, created_at, updated_at) VALUES ($1, $2, 'Ground Sales Floor', 'FL-01', 'FLOOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [floorId, storeId]
    );
  }

  let deptRun = await prisma.location.findFirst({ where: { storeId, code: 'DEPT-RUN' } });
  let deptRunningId = deptRun?.id;
  if (!deptRun) {
    deptRunningId = randomUUID();
    await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
      ($1, $2, $3, 'Performance Running', 'DEPT-RUN', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [deptRunningId, storeId, floorId]
    );
  }

  let deptSnk = await prisma.location.findFirst({ where: { storeId, code: 'DEPT-SNK' } });
  let deptSneakersId = deptSnk?.id;
  if (!deptSnk) {
    deptSneakersId = randomUUID();
    await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
      ($1, $2, $3, 'Streetwear Sneakers', 'DEPT-SNK', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [deptSneakersId, storeId, floorId]
    );
  }

  let deptFor = await prisma.location.findFirst({ where: { storeId, code: 'DEPT-FOR' } });
  let deptFormalId = deptFor?.id;
  if (!deptFor) {
    deptFormalId = randomUUID();
    await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
      ($1, $2, $3, 'Formal & Leather', 'DEPT-FOR', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [deptFormalId, storeId, floorId]
    );
  }

  let rack1 = await prisma.location.findFirst({ where: { storeId, code: 'RCK-R1' } });
  let rack1Id = rack1?.id;
  if (!rack1) {
    rack1Id = randomUUID();
    await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
      ($1, $2, $3, 'Rack R1 (Running Aisle)', 'RCK-R1', 'RACK', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [rack1Id, storeId, deptRunningId]
    );
  }

  let rack2 = await prisma.location.findFirst({ where: { storeId, code: 'RCK-S1' } });
  let rack2Id = rack2?.id;
  if (!rack2) {
    rack2Id = randomUUID();
    await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
      ($1, $2, $3, 'Rack S1 (Sneaker Wall)', 'RCK-S1', 'RACK', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [rack2Id, storeId, deptSneakersId]
    );
  }

  // 3. Brands
  console.log('  -> Seeding Premium Footwear Brands...');
  const brandData = [
    { name: 'Nike', code: 'NIKE' },
    { name: 'Adidas', code: 'ADIDAS' },
    { name: 'Puma', code: 'PUMA' },
    { name: 'Skechers', code: 'SKECH' },
    { name: 'Reebok', code: 'RBK' },
    { name: 'Bata Red Label', code: 'BATA' },
  ];
  const brandIds: Record<string, string> = {};
  for (const b of brandData) {
    const existing = await prisma.brand.findFirst({ where: { code: b.code } });
    if (existing) {
      brandIds[b.code] = existing.id;
    } else {
      const created = await prisma.brand.create({ data: { id: randomUUID(), ...b, isActive: true } });
      brandIds[b.code] = created.id;
    }
  }

  // 4. Categories
  console.log('  -> Seeding Categories...');
  const catData = [
    { name: 'Road Running', code: 'CAT-RUN' },
    { name: 'Lifestyle Sneakers', code: 'CAT-SNK' },
    { name: 'Leather Formals', code: 'CAT-FOR' },
    { name: 'Comfort Walking', code: 'CAT-WLK' },
  ];
  const catIds: Record<string, string> = {};
  for (const c of catData) {
    const existing = await prisma.category.findFirst({ where: { code: c.code } });
    if (existing) {
      catIds[c.code] = existing.id;
    } else {
      const created = await prisma.category.create({ data: { id: randomUUID(), ...c, isActive: true } });
      catIds[c.code] = created.id;
    }
  }

  // 5. Sizes & Colours
  console.log('  -> Seeding Sizes & Colours...');
  const sizesList = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
  const sizeIds: Record<string, string> = {};
  for (let i = 0; i < sizesList.length; i++) {
    const name = sizesList[i];
    const code = name.replace(/\s+/g, '-').toUpperCase();
    const existing = await prisma.size.findFirst({ where: { name } });
    if (existing) {
      sizeIds[name] = existing.id;
    } else {
      const s = await prisma.size.create({ data: { id: randomUUID(), name, code, system: 'UK', sequence: i + 1, isActive: true } });
      sizeIds[name] = s.id;
    }
  }

  const coloursList = [
    { name: 'Triple Black', code: 'BLK', hexCode: '#111827' },
    { name: 'Summit White', code: 'WHT', hexCode: '#F9FAFB' },
    { name: 'Midnight Navy', code: 'NVY', hexCode: '#1E3A8A' },
    { name: 'University Red', code: 'RED', hexCode: '#DC2626' },
    { name: 'Wolf Grey', code: 'GRY', hexCode: '#6B7280' },
  ];
  const colourIds: Record<string, string> = {};
  for (const col of coloursList) {
    const existing = await prisma.colour.findFirst({ where: { code: col.code } });
    if (existing) {
      colourIds[col.code] = existing.id;
    } else {
      const c = await prisma.colour.create({ data: { id: randomUUID(), name: col.name, code: col.code, hexCode: col.hexCode, isActive: true } });
      colourIds[col.code] = c.id;
    }
  }

  // 6. Articles & Variants
  console.log('  -> Generating Footwear Articles & Size × Colour Matrix Variants...');
  const articlesData = [
    { name: 'Nike Air Max Alpha 5', code: 'NK-AM-A5', brand: 'NIKE', cat: 'CAT-RUN', cost: 3200, mrp: 6495, sp: 5899 },
    { name: 'Adidas Ultraboost Light', code: 'AD-UB-LT', brand: 'ADIDAS', cat: 'CAT-RUN', cost: 5800, mrp: 14999, sp: 12999 },
    { name: 'Puma Smash V2 Leather', code: 'PM-SM-V2', brand: 'PUMA', cat: 'CAT-SNK', cost: 1650, mrp: 3999, sp: 3299 },
    { name: 'Skechers D-Lites Resilient', code: 'SK-DL-RS', brand: 'SKECH', cat: 'CAT-WLK', cost: 2400, mrp: 5499, sp: 4899 },
    { name: 'Bata Premium Derby Lace-Up', code: 'BT-DB-LU', brand: 'BATA', cat: 'CAT-FOR', cost: 1450, mrp: 3499, sp: 2999 },
  ];

  const variantList: any[] = [];
  for (const art of articlesData) {
    let article = await prisma.article.findFirst({ where: { articleNumber: art.code } });
    if (!article) {
      article = await prisma.article.create({
        data: {
          id: randomUUID(),
          name: art.name,
          articleNumber: art.code,
          brandId: brandIds[art.brand],
          categoryId: catIds[art.cat],
          baseCostPrice: art.cost,
          baseMrp: art.mrp,
          baseSellingPrice: art.sp,
          gender: 'UNISEX',
          isActive: true
        }
      });
    }

    // Generate variants across 3 key sizes and 2 colours
    const chosenSizes = ['UK 7', 'UK 8', 'UK 9'];
    const chosenColours = ['BLK', 'WHT'];

    for (const sz of chosenSizes) {
      for (const cl of chosenColours) {
        const sku = `${art.code}-${sz.replace('UK ', '')}-${cl}`;
        const barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
        const existingVar = await prisma.productVariant.findFirst({ where: { sku } });
        if (!existingVar) {
          const v = await prisma.productVariant.create({
            data: {
              id: randomUUID(),
              articleId: article.id,
              sizeId: sizeIds[sz],
              colourId: colourIds[cl],
              sku,
              barcode,
              costPrice: art.cost,
              mrp: art.mrp,
              sellingPrice: art.sp,
              isActive: true
            }
          });
          variantList.push(v);
        } else {
          variantList.push(existingVar);
        }
      }
    }
  }
  console.log(`     ✓ Total Variants Created/Active: ${variantList.length}`);

  // 7. Seed Stock Balances & Movements
  console.log('  -> Allocating Stock to Warehouse Racks...');
  for (const v of variantList) {
    const qty = Math.floor(12 + Math.random() * 24);
    const existingBal = await pglite.query(
      `SELECT id FROM stock_balances WHERE store_id = $1 AND variant_id = $2 LIMIT 1`,
      [storeId, v.id]
    );

    if (existingBal.rows.length === 0) {
      await pglite.query(
        `INSERT INTO stock_balances (id, store_id, variant_id, location_id, quantity, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [randomUUID(), storeId, v.id, rack1Id, qty]
      );

      await pglite.query(
        `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, note, created_at)
         VALUES ($1, $2, $3, $4, 'PURCHASE_IN', $5, 'INITIAL_STOCK', 'INIT-2026', 'Initial verified stock consignment', CURRENT_TIMESTAMP)`,
        [randomUUID(), storeId, v.id, rack1Id, qty]
      );
    }
  }

  // 8. Vendors & Purchase Invoices
  console.log('  -> Seeding Vendor Accounts & Purchase Bills...');
  const vendorData = [
    { name: 'Nike India Operations Pvt Ltd', gstin: '33AABCN1234F1Z5', phone: '9840112233', balance: 145000 },
    { name: 'Adidas Wholesale India Ltd', gstin: '33AABCA5678K1Z2', phone: '9840223344', balance: 88500 },
    { name: 'Puma Sports Logistics Hub', gstin: '33AABCP9876M1Z8', phone: '9840334455', balance: 0 },
  ];

  const vendorIds: string[] = [];
  for (const vd of vendorData) {
    let v = await prisma.vendor.findFirst({ where: { name: vd.name } });
    if (!v) {
      v = await prisma.vendor.create({
        data: {
          id: randomUUID(),
          name: vd.name,
          phone: vd.phone,
          gstin: vd.gstin,
          balance: vd.balance,
          isActive: true
        }
      });
    }
    vendorIds.push(v.id);
  }

  // Create 2 finalised purchase bills
  const p1 = await prisma.purchase.findFirst({ where: { billNumber: 'PUR-2026-001' } });
  if (!p1 && variantList.length >= 4) {
    const pId = randomUUID();
    await pglite.query(
      `INSERT INTO purchases (id, store_id, vendor_id, bill_number, document_number, bill_date, class, status, subtotal, tax_amount, total_amount) 
       VALUES ($1, $2, $3, 'PUR-2026-001', 'PB-2026-001', CURRENT_DATE - INTERVAL '5 days', 'A', 'FINALISED', 128000, 15360, 143360)`,
      [pId, storeId, vendorIds[0]]
    );

    // Items
    for (let i = 0; i < 4; i++) {
      await pglite.query(
        `INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, cost_price, mrp, selling_price, tax_rate, tax_amount) 
         VALUES ($1, $2, $3, 10, $4, $5, $6, 12.0, $7)`,
        [randomUUID(), pId, variantList[i].id, variantList[i].costPrice, variantList[i].mrp, variantList[i].sellingPrice, Number(variantList[i].costPrice) * 10 * 0.12]
      );
    }
  }

  // 9. Customers & Sales Invoices
  console.log('  -> Seeding Retail Customers & POS Sales...');
  const customerData = [
    { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.s@gmail.com', ltv: 34500, credit: 0 },
    { name: 'Priya Patel', phone: '9841234567', email: 'priya.patel@outlook.com', ltv: 18900, credit: 0 },
    { name: 'Vikramaditya Seth', phone: '9940123890', email: 'vikram.seth@corp.in', ltv: 45200, credit: 2500 },
    { name: 'Ananya Deshmukh', phone: '9789012345', email: 'ananya.d@gmail.com', ltv: 12400, credit: 0 },
    { name: 'Karthik Raja', phone: '9677012345', email: 'karthik.raja@yahoo.co.in', ltv: 28900, credit: 0 }
  ];

  const custIds: string[] = [];
  for (const c of customerData) {
    let cust = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          id: randomUUID(),
          name: c.name,
          phone: c.phone,
          email: c.email,
          lifetimeValue: c.ltv,
          creditOutstanding: c.credit,
          isActive: true
        }
      });
    }
    custIds.push(cust.id);
  }

  // Seed 4 recent Sales
  const s1 = await prisma.sale.findFirst({ where: { documentNumber: 'INV-2026-001' } });
  if (!s1 && variantList.length >= 3) {
    const admin = await prisma.user.findFirst({ where: { email: 'superadmin@fortyv.local' } });
    const adminId = admin ? admin.id : 'superadmin';

    const saleId = randomUUID();
    await pglite.query(
      `INSERT INTO sales (id, store_id, document_number, customer_id, status, class, subtotal, tax_amount, total_amount, paid_amount, payment_mode, created_by, created_at)
       VALUES ($1, $2, 'INV-2026-001', $3, 'PAID', 'A', 11798, 1415.76, 13213.76, 13213.76, 'UPI', $4, CURRENT_TIMESTAMP - INTERVAL '2 hours')`,
      [saleId, storeId, custIds[0], adminId]
    );

    await pglite.query(
      `INSERT INTO sale_items (id, sale_id, variant_id, quantity, mrp, selling_price, discount_amount, tax_rate, tax_amount)
       VALUES ($1, $2, $3, 2, $4, $5, 0, 12.0, 1415.76)`,
      [randomUUID(), saleId, variantList[0].id, variantList[0].mrp, variantList[0].sellingPrice]
    );

    // Stock movement for sale
    await pglite.query(
      `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, note, created_at)
       VALUES ($1, $2, $3, $4, 'SALE_OUT', -2, 'SALE', $5, 'Invoice INV-2026-001 counter sale', CURRENT_TIMESTAMP)`,
      [randomUUID(), storeId, variantList[0].id, rack1Id, saleId]
    );

    // Second sale (Card)
    const saleId2 = randomUUID();
    await pglite.query(
      `INSERT INTO sales (id, store_id, document_number, customer_id, status, class, subtotal, tax_amount, total_amount, paid_amount, payment_mode, created_by, created_at)
       VALUES ($1, $2, 'INV-2026-002', $3, 'PAID', 'A', 5899, 707.88, 6606.88, 6606.88, 'CARD', $4, CURRENT_TIMESTAMP - INTERVAL '1 day')`,
      [saleId2, storeId, custIds[1], adminId]
    );
  }

  // 10. Offers & Discounts
  console.log('  -> Seeding Promotional Offers...');
  const offersData = [
    { name: 'DIWALI15 - 15% Festive Flat', scopeType: 'ALL', discountType: 'PERCENTAGE', discountValue: 15, priority: 1 },
    { name: 'RUNNER500 - Flat ₹500 on Running', scopeType: 'CATEGORY', discountType: 'FIXED', discountValue: 500, priority: 2 },
    { name: 'SNEAKER-MADNESS - 20% on Streetwear', scopeType: 'CATEGORY', discountType: 'PERCENTAGE', discountValue: 20, priority: 3 },
  ];
  for (const o of offersData) {
    const existing = await pglite.query(`SELECT id FROM offers WHERE name = $1`, [o.name]);
    if (existing.rows.length === 0) {
      await pglite.query(
        `INSERT INTO offers (id, name, scope_type, discount_type, discount_value, priority, valid_from, valid_until, store_id, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, '2026-10-01', '2026-12-31', $7, true, 'superadmin')`,
        [randomUUID(), o.name, o.scopeType, o.discountType, o.discountValue, o.priority, storeId]
      );
    }
  }

  // 11. Sales Targets
  console.log('  -> Seeding Monthly Targets...');
  await pglite.query(
    `INSERT INTO sales_targets (id, store_id, name, period_start, period_end, target_amount) VALUES 
     ('target-nov-2026', $1, 'November 2026 Monthly Target', '2026-11-01', '2026-11-30', 500000.00),
     ('target-q4-2026', $1, 'Q4 2026 Festive Season Target', '2026-10-01', '2026-12-31', 2500000.00)
     ON CONFLICT (id) DO UPDATE SET target_amount = EXCLUDED.target_amount`,
    [storeId]
  );

  // 12. Accounting & Journals
  console.log('  -> Seeding Balanced General Journals...');
  const j1 = await pglite.query(`SELECT id FROM journal_entries WHERE reference_id = 'JV-2026-INIT'`);
  if ((j1.rows as any[]).length === 0) {
    const jId = randomUUID();
    await pglite.query(
      `INSERT INTO journal_entries (id, store_id, reference_type, reference_id, description, is_posted, is_reversed, created_at)
       VALUES ($1, $2, 'MANUAL', 'JV-2026-INIT', 'Initial Stock Valuation Capitalization', true, false, CURRENT_TIMESTAMP)`,
      [jId, storeId]
    );
    await pglite.query(`INSERT INTO journal_lines (id, journal_entry_id, account_code, account_name, debit, credit, description) VALUES 
      ($1, $2, '1300', 'Stock on Hand Inventory Asset', 250000.00, 0.00, 'Initial verified inventory asset'),
      ($3, $2, '3000', 'Owner Initial Capital Contribution', 0.00, 250000.00, 'Capital balance credit')`,
      [randomUUID(), jId, randomUUID()]
    );
  }

  // 13. Notifications & Alert Rules
  console.log('  -> Seeding Operational Alerts & Notifications...');
  const admin = await prisma.user.findFirst({ where: { email: 'superadmin@fortyv.local' } });
  const adminId = admin ? admin.id : randomUUID();

  const alerts = [
    { title: 'Diwali Festive Stock Inwards Complete', message: 'Received 120 pairs from Nike Operations in Coimbatore warehouse.', type: 'INFO' },
    { title: 'Re-order Trigger: Adidas Ultraboost UK 8', message: 'Remaining shelf stock is down to 3 pairs.', type: 'WARNING' },
    { title: 'Daily Cash Settlement Verified', message: 'Cash drawer reconciled with POS register summary.', type: 'INFO' },
  ];
  for (const a of alerts) {
    await pglite.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)`,
      [randomUUID(), adminId, a.title, a.message, a.type]
    );
  }

  console.log('\n✨ FULL FOOTWEAR RETAIL SEED COMPLETED SUCCESSFULLY! ✨\n');
}

seedFullDemo().catch(err => {
  console.error('❌ Demo seed failed:', err);
  process.exit(1);
});
