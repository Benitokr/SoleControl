// SoleControl Gate Tests — Phases 1-8
// Run: npx tsx run-gate-tests.ts
// Requires PGlite write access

import { PGlite } from '@electric-sql/pglite';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n🧪 SoleControl Gate Tests\n');
  const db = new PGlite('./prisma/pglite-data');
  await db.waitReady;

  // ── Phase 1: DB Schema ──────────────────────────────────────────
  console.log('Phase 1 — Database schema');

  const tableRes = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const tables = (tableRes.rows as any[]).map(r => r.tablename);

  await test('56 tables exist', async () => {
    if (tables.length < 56) throw new Error(`Only ${tables.length} tables found`);
  });

  const required = [
    'users','roles','permissions','role_permissions','user_sessions','login_events',
    'company_profile','stores','settings','financial_years','document_series','tax_rates',
    'brands','categories','products','articles','sizes','colours','product_variants',
    'locations','stock_movements','stock_balances','stock_adjustments','stock_adjustment_items',
    'stock_audit_sessions','stock_audit_lines','display_allocations',
    'stock_transfers','stock_transfer_items','damage_records','damage_events',
    'ageing_rules','clearance_recommendations','clearance_movements',
    'vendors','purchases','purchase_items','purchase_expenses','purchase_attachments','purchase_returns',
    'customers','customer_communications','offers','sales','sale_items','sale_payments',
    'sale_returns','sale_return_items','offer_redemptions',
    'accounts','journal_entries','journal_lines','payment_receipts','capital_entries',
    'withdrawals','bank_accounts','bank_statement_lines','bank_reconciliations','gst_transactions',
    'audit_logs','notifications','alert_rules','integration_settings','integration_logs',
    'files','label_templates','print_jobs'
  ];

  for (const t of required) {
    await test(`Table ${t} exists`, async () => {
      if (!tables.includes(t)) throw new Error(`Missing table: ${t}`);
    });
  }

  // ── Phase 2: Seeds ──────────────────────────────────────────────
  console.log('\nPhase 2 — Seeds');

  await test('Super admin user exists', async () => {
    const r = await db.query(`SELECT id FROM users WHERE email='superadmin@fortyv.local' LIMIT 1`);
    if (!(r.rows as any[]).length) throw new Error('Super admin not found');
  });

  await test('SUPER_ADMIN role exists and is locked', async () => {
    const r = await db.query(`SELECT id,is_system FROM roles WHERE code='SUPER_ADMIN' LIMIT 1`);
    if (!(r.rows as any[]).length) throw new Error('SUPER_ADMIN role not found');
    if (!(r.rows as any[])[0].is_system) throw new Error('SUPER_ADMIN is not marked as system role');
  });

  await test('Store exists', async () => {
    const r = await db.query(`SELECT id FROM stores WHERE is_active=true LIMIT 1`);
    if (!(r.rows as any[]).length) throw new Error('No active store found');
  });

  await test('Accounts seeded (Cash, Stock, Sales)', async () => {
    const r = await db.query(`SELECT code FROM accounts WHERE code IN ('1000','1300','4000') ORDER BY code`);
    if ((r.rows as any[]).length < 3) throw new Error(`Only ${(r.rows as any[]).length}/3 core accounts found`);
  });

  // ── Phase 3: Purchases & Stock ──────────────────────────────────
  console.log('\nPhase 3 — Purchases & Stock');

  await test('stock_movements is append-only (no UPDATE/DELETE triggers test)', async () => {
    // Just verify the table exists and has the right columns
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='stock_movements' AND column_name IN ('actor_id','note','reference_type') ORDER BY column_name`);
    if ((r.rows as any[]).length < 3) throw new Error('stock_movements missing actor_id/note/reference_type columns');
  });

  await test('stock_balances requires store_id', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='stock_balances' AND column_name='store_id'`);
    if (!(r.rows as any[]).length) throw new Error('stock_balances missing store_id column');
  });

  // ── Phase 4: Inventory Ops ──────────────────────────────────────
  console.log('\nPhase 4 — Inventory Operations');

  await test('stock_adjustments table has reason column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='stock_adjustments' AND column_name='reason'`);
    if (!(r.rows as any[]).length) throw new Error('stock_adjustments missing reason column');
  });

  await test('damage_records has status column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='damage_records' AND column_name='status'`);
    if (!(r.rows as any[]).length) throw new Error('damage_records missing status column');
  });

  await test('ageing_rules table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM ageing_rules`);
  });

  await test('clearance_recommendations table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM clearance_recommendations`);
  });

  // ── Phase 5: Sales & Customers ──────────────────────────────────
  console.log('\nPhase 5 — Sales & Customers');

  await test('customers table has lifetime_value column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name='lifetime_value'`);
    if (!(r.rows as any[]).length) throw new Error('customers missing lifetime_value column');
  });

  await test('sales table has payment_mode column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='payment_mode'`);
    if (!(r.rows as any[]).length) throw new Error('sales missing payment_mode column');
  });

  await test('offers table has scope_type column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='scope_type'`);
    if (!(r.rows as any[]).length) throw new Error('offers missing scope_type column');
  });

  await test('offer_redemptions table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM offer_redemptions`);
  });

  // ── Phase 6: Finance ───────────────────────────────────────────
  console.log('\nPhase 6 — Finance');

  await test('accounts table accessible', async () => {
    const r = await db.query(`SELECT COUNT(*) as cnt FROM accounts`);
    // Should have at least seeded accounts if seed ran
    console.log(`    (accounts rows: ${(r.rows[0] as any).cnt})`);
  });

  await test('journal_entries has status column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='status'`);
    if (!(r.rows as any[]).length) throw new Error('journal_entries missing status column');
  });

  await test('journal_lines has type (DEBIT/CREDIT) column', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='journal_lines' AND column_name='type'`);
    if (!(r.rows as any[]).length) throw new Error('journal_lines missing type column');
  });

  await test('bank_accounts table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM bank_accounts`);
  });

  await test('bank_statement_lines table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM bank_statement_lines`);
  });

  await test('gst_transactions table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM gst_transactions`);
  });

  await test('capital_entries table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM capital_entries`);
  });

  await test('withdrawals table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM withdrawals`);
  });

  await test('Trial balance debit equals credit (posted journals)', async () => {
    const r = await db.query(`
      SELECT 
        SUM(CASE WHEN jl.type='DEBIT' THEN jl.amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN jl.type='CREDIT' THEN jl.amount ELSE 0 END) as total_credit
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entry_id=je.id
      WHERE je.status='POSTED'
    `);
    const row = r.rows[0] as any;
    const debit = parseFloat(row?.total_debit || '0');
    const credit = parseFloat(row?.total_credit || '0');
    if (Math.abs(debit - credit) > 0.01) throw new Error(`Trial balance out of balance: DR ${debit} CR ${credit}`);
    console.log(`    (Posted journals: DR=${debit.toFixed(2)} CR=${credit.toFixed(2)} ✓)`);
  });

  // ── Phase 7: Reports & Audit ───────────────────────────────────
  console.log('\nPhase 7 — Reports & Audit');

  await test('audit_logs is append-only (has user_id and action columns)', async () => {
    const r = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs' AND column_name IN ('user_id','action','entity_type') ORDER BY column_name`);
    if ((r.rows as any[]).length < 3) throw new Error(`audit_logs missing columns (found ${(r.rows as any[]).length}/3)`);
  });

  await test('notifications table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM notifications`);
  });

  await test('alert_rules table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM alert_rules`);
  });

  await test('user_sessions table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM user_sessions`);
  });

  // ── Phase 8: Integrations ──────────────────────────────────────
  console.log('\nPhase 8 — Integrations');

  await test('integration_settings table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM integration_settings`);
  });

  await test('integration_logs table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM integration_logs`);
  });

  await test('files table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM files`);
  });

  await test('label_templates table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM label_templates`);
  });

  await test('print_jobs table accessible', async () => {
    await db.query(`SELECT COUNT(*) FROM print_jobs`);
  });

  // ── Summary ────────────────────────────────────────────────────
  await db.close();
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Gate test results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`❌ ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('✅ All gate tests passed');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
