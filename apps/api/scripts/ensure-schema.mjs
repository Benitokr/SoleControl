import fs from 'fs';
if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'tax_rates'"
  );
  console.log('tax_rates columns:', cols.rows.map((r) => r.column_name));

  // Ensure tax_rates has footwear GST slabs
  const existingTax = await pool.query('SELECT count(*) as cnt FROM tax_rates');
  if (Number(existingTax.rows[0].cnt) === 0) {
    const colNames = cols.rows.map((r) => r.column_name);
    if (colNames.includes('cgst_rate')) {
      await pool.query(`
        INSERT INTO tax_rates (id, name, rate, cgst_rate, sgst_rate, igst_rate, is_active)
        VALUES
          ('tax-gst-5', 'GST 5% Footwear (Orthopedic/Legacy <=1000)', 5.00, 2.50, 2.50, 5.00, true),
          ('tax-gst-12', 'GST 12% Standard Footwear (HSN 6401-6405)', 12.00, 6.00, 6.00, 12.00, true),
          ('tax-gst-18', 'GST 18% Footwear Parts & Accessories (HSN 6406)', 18.00, 9.00, 9.00, 18.00, true)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('Seeded tax_rates with India GST footwear slabs.');
    }
  }

  // Create additive tables for POs, POS Hold Bills, EOD Cash Close
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL DEFAULT 'default',
      vendor_id TEXT NOT NULL,
      po_number TEXT UNIQUE NOT NULL,
      expected_date DATE,
      status TEXT NOT NULL DEFAULT 'ORDERED',
      subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      actor_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pos_hold_bills (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL DEFAULT 'default',
      label TEXT NOT NULL,
      customer_id TEXT,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      actor_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eod_cash_closes (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL DEFAULT 'default',
      close_date DATE NOT NULL DEFAULT CURRENT_DATE,
      bills_count INTEGER NOT NULL DEFAULT 0,
      expected_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
      actual_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
      variance NUMERIC(14,2) NOT NULL DEFAULT 0,
      notes TEXT,
      actor_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Ensured purchase_orders, pos_hold_bills, eod_cash_closes tables.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
