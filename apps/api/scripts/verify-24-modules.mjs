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
  return { status: res.status, json, text: text.slice(0, 200) };
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  // 1. Health
  const health = await fetch(`http://127.0.0.1:${port}/api/health`).then(r => r.json());
  console.log('HEALTH:', JSON.stringify(health));

  // 2. Login
  const loginRes = await req('POST', '/auth/login', {
    email: 'superadmin@fortyv.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123',
  });
  if (loginRes.status !== 200 || !loginRes.json?.data?.accessToken) {
    console.error('LOGIN FAILED:', loginRes);
    process.exit(1);
  }
  const token = loginRes.json.data.accessToken;
  console.log('LOGIN_OK: true');

  // 3. Probe all 24 modules GET endpoints
  const endpoints = [
    ['1. Dashboard KPIs', '/dashboard/kpis'],
    ['1b. Dashboard Insights', '/dashboard/insights'],
    ['2. Company Profile', '/company/profile'],
    ['2b. Company Stores', '/company/stores'],
    ['2c. Company Settings', '/company/settings'],
    ['3. Masters Brands', '/masters/brands'],
    ['3b. Masters Categories', '/masters/categories'],
    ['3c. Masters Articles', '/masters/articles'],
    ['3d. Masters Variants', '/masters/variants'],
    ['3e. Masters Sizes', '/masters/sizes'],
    ['3f. Masters Colours', '/masters/colours'],
    ['3g. Masters Tax Rates', '/masters/tax-rates'],
    ['4. Users', '/users'],
    ['5. Roles', '/roles'],
    ['6. Locations', '/locations'],
    ['7. Purchases', '/purchases'],
    ['7b. Purchase Orders', '/purchases/orders'],
    ['8. Vendors', '/vendors'],
    ['9. Inventory Stock', '/inventory/stock'],
    ['9b. Inventory Valuation', '/inventory/valuation'],
    ['10. Display Stock', '/display'],
    ['11. Barcodes', '/barcodes/queue'],
    ['12. Stock Transfers', '/transfers'],
    ['13. Ageing Rules', '/ageing/rules'],
    ['13b. Ageing Heatmap', '/ageing/heatmap'],
    ['13c. Ageing Recommendations', '/ageing/recommendations'],
    ['14. Damaged Goods', '/damage'],
    ['15. Sales', '/sales'],
    ['15b. Sales Holds', '/sales/holds'],
    ['16. Customers', '/customers'],
    ['17. Offers', '/offers'],
    ['18. Accounting Accounts', '/accounting/accounts'],
    ['18b. Accounting Journals', '/accounting/journals'],
    ['19. Capital Entries', '/capital'],
    ['19b. Capital Withdrawals', '/capital/withdrawals'],
    ['20. Bank Accounts', '/bank/accounts'],
    ['20b. Bank GST Register', '/bank-gst/gst-register'],
    ['20c. Bank GST Summary', '/bank-gst/gst-summary'],
    ['21. Reports Sales', '/reports/sales'],
    ['21b. Reports Purchases', '/reports/purchases'],
    ['21c. Reports Inventory', '/reports/inventory'],
    ['21d. Reports Ageing', '/reports/ageing'],
    ['21e. Reports GST', '/reports/gst'],
    ['21f. Reports Trial Balance', '/reports/trial-balance'],
    ['22. Alerts/Notifications', '/alerts'],
    ['23. Audit Trail', '/audit'],
    ['24. Integrations', '/integrations'],
    ['24b. Database Tables', '/database/tables'],
  ];

  const failures = [];
  for (const [label, path] of endpoints) {
    const r = await req('GET', path, null, token);
    if (r.status >= 400) {
      failures.push({ label, path, status: r.status, error: r.json?.error || r.text });
      console.log(`FAIL ${label} (${path}) -> ${r.status}: ${JSON.stringify(r.json?.error || r.text)}`);
    } else {
      const count = Array.isArray(r.json?.data) ? r.json.data.length : (r.json?.data ? 'obj' : 'null');
      console.log(`OK   ${label} (${path}) -> ${r.status} [data: ${count}]`);
    }
  }

  console.log('\nSUMMARY FAILURES:', failures.length);
  if (failures.length) console.log(JSON.stringify(failures, null, 2));

  // Inspect existing store/location/size/colour/tax_rate IDs
  const stores = await pool.query('SELECT id, name, code FROM stores LIMIT 5');
  const locs = await pool.query('SELECT id, name, type, store_id FROM locations LIMIT 10');
  const sizes = await pool.query('SELECT id, name FROM sizes LIMIT 5');
  const colours = await pool.query('SELECT id, name FROM colours LIMIT 5');
  console.log('\nEXISTING STORES:', stores.rows);
  console.log('EXISTING LOCATIONS:', locs.rows);
  console.log('EXISTING SIZES:', sizes.rows);
  console.log('EXISTING COLOURS:', colours.rows);
} finally {
  await pool.end();
  server.close();
}
