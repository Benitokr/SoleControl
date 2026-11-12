import { initDatabase, getPGlite } from '../apps/api/src/lib/db.js';
import { prisma } from '../apps/api/src/lib/prisma.js';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { getAllPermissionKeys, MODULE_METADATA } from '../packages/shared/src/permissions.js';

async function seedComplete() {
  await initDatabase();
  const pglite = getPGlite();
  console.log('🚀 Running Complete SoleControl Database Seed...');

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
        isActive: true,
      }
    });
  }
  const storeId = store.id;
  console.log(`  ✓ Store active: ${store.name}`);

  // 2. Permissions
  const allPermissionKeys = getAllPermissionKeys();
  const permissions: any[] = [];
  for (const key of allPermissionKeys) {
    const [module, action] = key.split('.');
    const modMeta = (MODULE_METADATA as any)[module];
    let p = await prisma.permission.findUnique({ where: { key } });
    if (!p) {
      p = await prisma.permission.create({
        data: {
          id: randomUUID(),
          key,
          module,
          action,
          description: `Can ${action} ${modMeta?.label || module}`
        }
      });
    }
    permissions.push(p);
  }
  console.log(`  ✓ Permissions verified: ${permissions.length}`);

  // 3. Roles
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Unrestricted system owner' },
    { code: 'ADMINISTRATOR', name: 'Administrator', description: 'Store operations administrator' },
    { code: 'MANAGEMENT', name: 'Management', description: 'Executive oversight & approvals' },
    { code: 'SALES_EXECUTIVE', name: 'Sales Executive', description: 'Counter billing & POS' },
    { code: 'ACCOUNTS_USER', name: 'Accounts User', description: 'Bookkeeping & GST' },
    { code: 'INVENTORY_USER', name: 'Inventory User', description: 'Stock & warehouse management' }
  ];

  const roleMap: Record<string, any> = {};
  for (const r of rolesData) {
    let role = await prisma.role.findFirst({ where: { code: r.code } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          id: randomUUID(),
          code: r.code,
          name: r.name,
          description: r.description,
          isSystem: true
        }
      });
    }
    roleMap[r.code] = role;
  }

  // Assign all permissions to SUPER_ADMIN
  for (const p of permissions) {
    await pglite.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleMap['SUPER_ADMIN'].id, p.id]
    );
  }
  console.log('  ✓ System roles & permissions mapped');

  // 4. Super Admin User
  const adminEmail = 'superadmin@fortyv.local';
  let admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  const passwordHash = await bcrypt.hash('ChangeMe@123', 12);
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Super Administrator',
        email: adminEmail,
        phone: '+91 98765 00000',
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        roleId: roleMap['SUPER_ADMIN'].id
      }
    });
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash, status: 'ACTIVE', mustChangePassword: false }
    });
  }

  // Link admin to store
  await pglite.query(
    `INSERT INTO user_locations (user_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [admin.id, storeId]
  );
  console.log(`  ✓ Super Admin ready: ${admin.email}`);

  // 5. Chart of Accounts
  const initialAccounts = [
    { id: 'acc-1000', code: '1000', name: 'Cash in Hand', type: 'ASSET' },
    { id: 'acc-1100', code: '1100', name: 'HDFC Bank Current A/c', type: 'ASSET' },
    { id: 'acc-1300', code: '1300', name: 'Stock Inventory', type: 'ASSET' },
    { id: 'acc-2000', code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { id: 'acc-2110', code: '2110', name: 'Input GST ITC', type: 'ASSET' },
    { id: 'acc-2120', code: '2120', name: 'Output GST Payable', type: 'LIABILITY' },
    { id: 'acc-3000', code: '3000', name: 'Capital Account', type: 'CAPITAL' },
    { id: 'acc-4000', code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
    { id: 'acc-5000', code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' }
  ];
  for (const a of initialAccounts) {
    await pglite.query(
      `INSERT INTO accounts (id, code, name, type, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (code) DO NOTHING`,
      [a.id, a.code, a.name, a.type]
    );
  }
  console.log('  ✓ Chart of accounts verified');

  // 6. Settings
  const defaultSettings = [
    { key: 'sales.admin_entry_enabled', value: 'true', category: 'sales', description: 'Enable Super Admin to record new sales invoices and receipts directly' },
    { key: 'accounting.gst_include_class_b', value: 'false', category: 'accounting', description: 'Include Class B (non-GST) purchases in official GST compliance registers' },
    { key: 'purchases.landed_cost_allocation_method', value: 'VALUE', category: 'purchases', description: 'Landed cost allocation method' },
    { key: 'inventory.valuation_method', value: 'WEIGHTED_AVERAGE', category: 'inventory', description: 'Inventory valuation formula' },
    { key: 'inventory.audit_cycle_days', value: '60', category: 'inventory', description: 'Mandatory rack audit cycle in days' },
    { key: 'barcode.label_price_encoding', value: 'PLAIN', category: 'barcodes', description: 'Cost cipher scheme' }
  ];
  for (const s of defaultSettings) {
    await pglite.query(
      `INSERT INTO settings (key, value, category, description, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [s.key, JSON.stringify(s.value), s.category, s.description]
    );
  }

  // 7. Warehouse Hierarchy
  let floor = await prisma.location.findFirst({ where: { storeId, code: 'FL-01' } });
  let floorId = floor?.id || randomUUID();
  if (!floor) {
    await pglite.query(
      `INSERT INTO locations (id, store_id, name, code, type, is_active, created_at, updated_at) VALUES ($1, $2, 'Ground Sales Floor', 'FL-01', 'FLOOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
      [floorId, storeId]
    );
  }

  const deptRunningId = randomUUID();
  const deptSneakersId = randomUUID();
  await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
    ($1, $2, $3, 'Performance Running', 'DEPT-RUN', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ($4, $2, $3, 'Streetwear Sneakers', 'DEPT-SNK', 'DEPARTMENT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
    [deptRunningId, storeId, floorId, deptSneakersId]
  );

  const rack1Id = randomUUID();
  const rack2Id = randomUUID();
  await pglite.query(`INSERT INTO locations (id, store_id, parent_id, name, code, type, is_active, created_at, updated_at) VALUES 
    ($1, $2, $3, 'Rack R1 (Running Aisle)', 'RCK-R1', 'RACK', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ($4, $2, $5, 'Rack S1 (Sneaker Wall)', 'RCK-S1', 'RACK', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (store_id, code) DO NOTHING`,
    [rack1Id, storeId, deptRunningId, rack2Id, deptSneakersId]
  );
  console.log('  ✓ Warehouse floor & rack layout initialized');

  // 8. Brands & Categories
  const brands = [
    { name: 'Nike', code: 'NIKE' },
    { name: 'Adidas', code: 'ADIDAS' },
    { name: 'Puma', code: 'PUMA' },
    { name: 'Skechers', code: 'SKECH' },
    { name: 'Reebok', code: 'RBK' },
    { name: 'Bata Red Label', code: 'BATA' }
  ];
  const brandIds: Record<string, string> = {};
  for (const b of brands) {
    let brand = await prisma.brand.findFirst({ where: { code: b.code } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { id: randomUUID(), ...b, isActive: true } });
    }
    brandIds[b.code] = brand.id;
  }

  const categories = [
    { name: 'Road Running', code: 'CAT-RUN' },
    { name: 'Lifestyle Sneakers', code: 'CAT-SNK' },
    { name: 'Leather Formals', code: 'CAT-FOR' },
    { name: 'Comfort Walking', code: 'CAT-WLK' }
  ];
  const catIds: Record<string, string> = {};
  for (const c of categories) {
    let cat = await prisma.category.findFirst({ where: { code: c.code } });
    if (!cat) {
      cat = await prisma.category.create({ data: { id: randomUUID(), ...c, isActive: true } });
    }
    catIds[c.code] = cat.id;
  }

  // 9. Sizes & Colours
  const sizes = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
  const sizeIds: Record<string, string> = {};
  for (let i = 0; i < sizes.length; i++) {
    const name = sizes[i];
    const code = name.replace(/\s+/g, '-').toUpperCase();
    let s = await prisma.size.findFirst({ where: { name } });
    if (!s) {
      s = await prisma.size.create({ data: { id: randomUUID(), name, code, system: 'UK', sequence: i + 1, isActive: true } });
    }
    sizeIds[name] = s.id;
  }

  const colours = [
    { name: 'Triple Black', code: 'BLK', hexCode: '#111827' },
    { name: 'Summit White', code: 'WHT', hexCode: '#F9FAFB' },
    { name: 'Midnight Navy', code: 'NVY', hexCode: '#1E3A8A' },
    { name: 'University Red', code: 'RED', hexCode: '#DC2626' },
  ];
  const colourIds: Record<string, string> = {};
  for (const col of colours) {
    let c = await prisma.colour.findFirst({ where: { code: col.code } });
    if (!c) {
      c = await prisma.colour.create({ data: { id: randomUUID(), name: col.name, code: col.code, hexCode: col.hexCode, isActive: true } });
    }
    colourIds[col.code] = c.id;
  }

  // 10. Articles & Matrix Variants
  const articlesData = [
    { name: 'Nike Air Max Alpha 5', code: 'NK-AM-A5', brand: 'NIKE', cat: 'CAT-RUN', cost: 3200, mrp: 6495, sp: 5899 },
    { name: 'Adidas Ultraboost Light', code: 'AD-UB-LT', brand: 'ADIDAS', cat: 'CAT-RUN', cost: 5800, mrp: 14999, sp: 12999 },
    { name: 'Puma Smash V2 Leather', code: 'PM-SM-V2', brand: 'PUMA', cat: 'CAT-SNK', cost: 1650, mrp: 3999, sp: 3299 },
    { name: 'Skechers D-Lites Resilient', code: 'SK-DL-RS', brand: 'SKECH', cat: 'CAT-WLK', cost: 2400, mrp: 5499, sp: 4899 },
    { name: 'Bata Premium Derby Lace-Up', code: 'BT-DB-LU', brand: 'BATA', cat: 'CAT-FOR', cost: 1450, mrp: 3499, sp: 2999 },
  ];

  const variantsList: any[] = [];
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

    const testSizes = ['UK 7', 'UK 8', 'UK 9'];
    const testColours = ['BLK', 'WHT'];
    for (const sz of testSizes) {
      for (const cl of testColours) {
        const sku = `${art.code}-${sz.replace('UK ', '')}-${cl}`;
        const barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
        let v = await prisma.productVariant.findFirst({ where: { sku } });
        if (!v) {
          v = await prisma.productVariant.create({
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
        }
        variantsList.push(v);
      }
    }
  }
  console.log(`  ✓ Total Active Footwear SKUs: ${variantsList.length}`);

  // 11. Stock Allocation
  for (const v of variantsList) {
    const qty = Math.floor(15 + Math.random() * 20);
    await pglite.query(
      `INSERT INTO stock_balances (id, store_id, variant_id, location_id, quantity, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [randomUUID(), storeId, v.id, rack1Id, qty]
    );
    await pglite.query(
      `INSERT INTO stock_movements (id, store_id, variant_id, location_id, type, quantity, reference_type, reference_id, note, created_at)
       VALUES ($1, $2, $3, $4, 'PURCHASE_IN', $5, 'INITIAL_STOCK', 'INIT-2026', 'Verified stock intake', CURRENT_TIMESTAMP)`,
      [randomUUID(), storeId, v.id, rack1Id, qty]
    );
  }
  console.log('  ✓ Warehouse stock inventory balances established');

  // 12. Vendors & Purchases
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

  // Create purchase bill
  const pId = randomUUID();
  await pglite.query(
    `INSERT INTO purchases (id, store_id, vendor_id, bill_number, document_number, bill_date, class, status, subtotal, tax_amount, total_amount) 
     VALUES ($1, $2, $3, 'PUR-2026-001', 'PB-2026-001', CURRENT_DATE - INTERVAL '3 days', 'CLASS_A', 'FINALISED', 128000, 15360, 143360)`,
    [pId, storeId, vendorIds[0]]
  );
  for (let i = 0; i < 4; i++) {
    await pglite.query(
      `INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, cost_price, mrp, selling_price, tax_rate, tax_amount) 
       VALUES ($1, $2, $3, 10, $4, $5, $6, 12.0, $7)`,
      [randomUUID(), pId, variantsList[i].id, variantsList[i].costPrice, variantsList[i].mrp, variantsList[i].sellingPrice, Number(variantsList[i].costPrice) * 10 * 0.12]
    );
  }

  // 13. Customers & POS Sales
  const customerData = [
    { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.s@gmail.com', ltv: 34500, credit: 0 },
    { name: 'Priya Patel', phone: '9841234567', email: 'priya.patel@outlook.com', ltv: 18900, credit: 0 },
    { name: 'Vikramaditya Seth', phone: '9940123890', email: 'vikram.seth@corp.in', ltv: 45200, credit: 2500 },
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

  const saleId = randomUUID();
  await pglite.query(
    `INSERT INTO sales (id, store_id, document_number, customer_id, status, class, subtotal, tax_amount, total_amount, paid_amount, payment_mode, created_by, created_at)
     VALUES ($1, $2, 'INV-2026-001', $3, 'COMPLETED', 'CLASS_A', 11798, 1415.76, 13213.76, 13213.76, 'UPI', $4, CURRENT_TIMESTAMP - INTERVAL '2 hours')`,
    [saleId, storeId, custIds[0], admin.id]
  );
  await pglite.query(
    `INSERT INTO sale_items (id, sale_id, variant_id, quantity, mrp, selling_price, discount_amount, tax_rate, tax_amount)
     VALUES ($1, $2, $3, 2, $4, $5, 0, 12.0, 1415.76)`,
    [randomUUID(), saleId, variantsList[0].id, variantsList[0].mrp, variantsList[0].sellingPrice]
  );

  // 14. Promotional Offers
  await pglite.query(
    `INSERT INTO offers (id, name, scope_type, discount_type, discount_value, priority, valid_from, valid_until, store_id, is_active, created_by)
     VALUES ($1, 'DIWALI15 - 15% Festive Flat', 'ALL', 'PERCENTAGE', 15.00, 1, '2026-10-01', '2026-12-31', $2, true, $3)`,
    [randomUUID(), storeId, admin.id]
  );
  await pglite.query(
    `INSERT INTO offers (id, name, scope_type, discount_type, discount_value, priority, valid_from, valid_until, store_id, is_active, created_by)
     VALUES ($1, 'RUNNER500 - Flat ₹500 on Running', 'CATEGORY', 'FIXED', 500.00, 2, '2026-10-01', '2026-12-31', $2, true, $3)`,
    [randomUUID(), storeId, admin.id]
  );

  // 15. Monthly Sales Target
  await pglite.query(
    `INSERT INTO sales_targets (id, store_id, name, period_start, period_end, target_amount) VALUES 
     ('target-nov-2026', $1, 'November 2026 Monthly Target', '2026-11-01', '2026-11-30', 500000.00)
     ON CONFLICT (id) DO UPDATE SET target_amount = EXCLUDED.target_amount`,
    [storeId]
  );

  // 16. Operational Notifications
  const alerts = [
    { title: 'Diwali Festive Stock Inwards Complete', message: 'Received 120 pairs from Nike Operations in Coimbatore warehouse.', type: 'INFO' },
    { title: 'Re-order Trigger: Adidas Ultraboost UK 8', message: 'Remaining shelf stock is down to 3 pairs.', type: 'WARNING' },
    { title: 'Daily Cash Settlement Verified', message: 'Cash drawer reconciled with POS register summary.', type: 'INFO' }
  ];
  for (const a of alerts) {
    await pglite.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)`,
      [randomUUID(), admin.id, a.title, a.message, a.type]
    );
  }

  // 17. Hardware & Integrations
  const integrations = [
    { provider: 'WHATSAPP', status: 'DISCONNECTED', configEncrypted: '{"phone":"+919876543210"}' },
    { provider: 'BARCODE', status: 'DISCONNECTED', configEncrypted: '{"dpi":203,"port":9100}' },
    { provider: 'BANK', status: 'DISCONNECTED', configEncrypted: '{"corporateId":"HDFC40V"}' },
    { provider: 'GST', status: 'DISCONNECTED', configEncrypted: '{"gstin":"33AAAAA0000A1Z5"}' },
    { provider: 'PRINTER', status: 'DISCONNECTED', configEncrypted: '{"width":80}' }
  ];
  for (const ig of integrations) {
    await pglite.query(
      `INSERT INTO integration_settings (id, provider, config_encrypted, is_active, status)
       VALUES ($1, $2, $3, false, $4)
       ON CONFLICT (id) DO NOTHING`,
      [randomUUID(), ig.provider, ig.configEncrypted, ig.status]
    );
  }

  console.log('\n🌟 SOLECONTROL COMPLETE DATABASE SEED SUCCEEDED! 🌟\n');
  await pglite.close();
}

seedComplete().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
