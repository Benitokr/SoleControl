import fs from 'fs';
if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  process.loadEnvFile();
}
import { initDatabase, getDbMode, getPGlite, getPrisma } from '../apps/api/src/lib/db.js';
import { randomUUID } from 'crypto';

async function main() {
  console.log('--- SoleControl Demo Data Seed Starting ---');
  await initDatabase();
  const dbMode = getDbMode();
  console.log(`Using Database Engine: ${dbMode}`);

  let storeId = 'store-01';
  if (dbMode === 'POSTGRES') {
    const prisma = getPrisma();
    const st = await (prisma as any).store.findFirst();
    if (st) storeId = st.id;
  } else {
    const pglite = getPGlite();
    const res = await pglite.query(`SELECT id FROM stores LIMIT 1`);
    if (res.rows.length > 0) storeId = (res.rows[0] as any).id;
  }

  // 1. Customers
  const customers = [
    { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@example.com', loyaltyTier: 'GOLD', loyaltyPoints: 350 },
    { name: 'Priya Patel', phone: '9123456789', email: 'priya.patel@example.com', loyaltyTier: 'SILVER', loyaltyPoints: 120 },
    { name: 'Mohammad Shaikh', phone: '9988776655', email: 'mohammad.shaikh@example.com', loyaltyTier: 'BRONZE', loyaltyPoints: 45 }
  ];

  for (const c of customers) {
    if (dbMode === 'POSTGRES') {
      const prisma = getPrisma();
      await (prisma as any).customer.upsert({
        where: { phone: c.phone },
        update: {},
        create: { id: randomUUID(), ...c, totalSpend: 0, visitCount: 1 }
      }).catch(() => {});
    } else {
      const pglite = getPGlite();
      await pglite.query(
        `INSERT INTO customers (id, name, phone, email, loyalty_tier, loyalty_points, total_spend, visit_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 1, NOW(), NOW())
         ON CONFLICT (phone) DO NOTHING`,
        [randomUUID(), c.name, c.phone, c.email, c.loyaltyTier, c.loyaltyPoints]
      ).catch(() => {});
    }
  }
  console.log('✓ 3 Demo Customers seeded');

  // 2. Vendors
  const vendors = [
    { name: 'Nike India Private Limited', code: 'VEND-NIKE', phone: '+91 80 4000 1234', email: 'orders@nike.in', gstin: '29AAACN1234F1Z1', address: 'MG Road, Bengaluru, Karnataka' },
    { name: 'Adidas Sports India Pvt Ltd', code: 'VEND-ADIDAS', phone: '+91 124 456 7890', email: 'supply@adidas.co.in', gstin: '06AAACA5678G1Z2', address: 'Cyber City, Gurugram, Haryana' },
    { name: 'Puma Footwear Distribution', code: 'VEND-PUMA', phone: '+91 80 6789 0123', email: 'dispatch@puma.com', gstin: '29AAACP9012H1Z3', address: 'Indiranagar, Bengaluru, Karnataka' }
  ];

  for (const v of vendors) {
    if (dbMode === 'POSTGRES') {
      const prisma = getPrisma();
      await (prisma as any).vendor.upsert({
        where: { code: v.code },
        update: {},
        create: { id: randomUUID(), ...v, isActive: true }
      }).catch(() => {});
    } else {
      const pglite = getPGlite();
      await pglite.query(
        `INSERT INTO vendors (id, name, code, phone, email, gstin, address, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [randomUUID(), v.name, v.code, v.phone, v.email, v.gstin, v.address]
      ).catch(() => {});
    }
  }
  console.log('✓ 3 Demo Vendors seeded');

  // 3. Capital Entries
  const capitalEntries = [
    { type: 'CAPITAL_IN', amount: 500000, description: 'Initial Partner Equity Inflow - Flagship Setup', reference: 'CAP-2026-001', status: 'APPROVED' },
    { type: 'CAPITAL_IN', amount: 200000, description: 'Working Capital Inflow - Seasonal Stock Advance', reference: 'CAP-2026-002', status: 'APPROVED' }
  ];

  for (const cap of capitalEntries) {
    const id = randomUUID();
    if (dbMode === 'POSTGRES') {
      const prisma = getPrisma();
      await (prisma as any).capitalEntry.create({
        data: { id, storeId, ...cap }
      }).catch(() => {});
    } else {
      const pglite = getPGlite();
      await pglite.query(
        `INSERT INTO capital_entries (id, store_id, type, amount, description, reference, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [id, storeId, cap.type, cap.amount, cap.description, cap.reference, cap.status]
      ).catch(() => {});
    }
  }
  console.log('✓ 2 Demo Capital Entries seeded (₹500,000 and ₹200,000)');

  console.log('--- SoleControl Demo Data Seed Completed Successfully ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Demo seed error:', err);
  process.exit(1);
});
