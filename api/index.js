import crypto from 'crypto';
import { DB } from './mockData.js';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', 'solecontrol_secret_2026').update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const SUPER_ADMIN_USER = {
  id: '04ba54c1-bb94-4a81-8757-bb0fcdebd06c',
  name: 'Super Administrator',
  email: 'superadmin@fortyv.local',
  roleCode: 'SUPER_ADMIN',
  roleName: 'Super Admin',
  permissions: [
    'dashboard.view', 'dashboard.create', 'dashboard.edit', 'dashboard.delete', 'dashboard.approve', 'dashboard.export',
    'company.view', 'company.create', 'company.edit', 'company.delete', 'company.approve', 'company.export',
    'masters.view', 'masters.create', 'masters.edit', 'masters.delete', 'masters.approve', 'masters.export',
    'locations.view', 'locations.create', 'locations.edit', 'locations.delete', 'locations.approve', 'locations.export',
    'barcodes.view', 'barcodes.create', 'barcodes.edit', 'barcodes.delete', 'barcodes.approve', 'barcodes.export',
    'integrations.view', 'integrations.create', 'integrations.edit', 'integrations.delete', 'integrations.approve', 'integrations.export',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.approve', 'users.export',
    'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.approve', 'roles.export',
    'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete', 'purchases.approve', 'purchases.export',
    'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.approve', 'vendors.export',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.approve', 'inventory.export',
    'display_stock.view', 'display_stock.create', 'display_stock.edit', 'display_stock.delete', 'display_stock.approve', 'display_stock.export',
    'stock_transfers.view', 'stock_transfers.create', 'stock_transfers.edit', 'stock_transfers.delete', 'stock_transfers.approve', 'stock_transfers.export',
    'ageing.view', 'ageing.create', 'ageing.edit', 'ageing.delete', 'ageing.approve', 'ageing.export',
    'damaged_goods.view', 'damaged_goods.create', 'damaged_goods.edit', 'damaged_goods.delete', 'damaged_goods.approve', 'damaged_goods.export',
    'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.approve', 'sales.export',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.approve', 'customers.export',
    'offers.view', 'offers.create', 'offers.edit', 'offers.delete', 'offers.approve', 'offers.export',
    'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'accounting.approve', 'accounting.export',
    'capital.view', 'capital.create', 'capital.edit', 'capital.delete', 'capital.approve', 'capital.export',
    'bank_gst.view', 'bank_gst.create', 'bank_gst.edit', 'bank_gst.delete', 'bank_gst.approve', 'bank_gst.export',
    'reports.view', 'reports.create', 'reports.edit', 'reports.delete', 'reports.approve', 'reports.export',
    'audit.view', 'audit.create', 'audit.edit', 'audit.delete', 'audit.approve', 'audit.export'
  ],
  mustChangePassword: false
};

// Mutable copies for runtime additions on Vercel
let transfers = [...DB.transfers];
let displays = [...DB.displays];
let damages = [...DB.damages];
let purchases = [...DB.purchases];
let sales = [...DB.sales];
let accounts = [...DB.accounts];
let journals = [
  { id: 'jv-1', reference: 'JV-2026-001', type: 'PURCHASE', status: 'POSTED', total_debit: 143360.00, total_credit: 143360.00, notes: 'Purchase invoice entry PB-2026-001 Nike India', posted_at: new Date(Date.now() - 15 * 86400000).toISOString(), lines: [{ code: '1300', name: 'Inventory Asset', type: 'DEBIT', amount: 128000 }, { code: '2210', name: 'Input CGST 6%', type: 'DEBIT', amount: 7680 }, { code: '2220', name: 'Input SGST 6%', type: 'DEBIT', amount: 7680 }, { code: '2100', name: 'Trade Payables - Nike India', type: 'CREDIT', amount: 143360 }] },
  { id: 'jv-2', reference: 'JV-2026-002', type: 'CAPITAL', status: 'POSTED', total_debit: 500000.00, total_credit: 500000.00, notes: 'Initial Retail Working Capital Infusion Forty V', posted_at: new Date(Date.now() - 30 * 86400000).toISOString(), lines: [{ code: '1110', name: 'HDFC Corporate Current A/c', type: 'DEBIT', amount: 500000 }, { code: '3000', name: 'Partner Equity Capital', type: 'CREDIT', amount: 500000 }] }
];
let bankAccounts = [...DB.bankAccounts];
let bankLines = [...DB.bankLines];
let capitalEntries = [
  {
    id: 'cap-01',
    storeId: 'addac467-9344-4786-9a92-1b5855402c25',
    type: 'CAPITAL_IN',
    amount: 500000.00,
    description: 'Initial Working Capital & Equity Infusion - Forty V Flagship',
    reference: 'UTR-HDFC-991244',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  }
];
let withdrawals = [
  {
    id: 'w-01',
    storeId: 'addac467-9344-4786-9a92-1b5855402c25',
    amount: 25000.00,
    description: 'Partner Drawings - Monthly Remuneration Advance',
    drawn_by: 'Managing Partner',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString()
  }
];
let adjustments = [
  { id: 'adj-01', docNumber: 'ADJ-2026-001', reference: 'ADJ-2026-001', variant_sku: 'NK-AM-A5-8-BLK', article_name: 'Air Max Pulse Retro', quantity_change: 2, reason: 'Physical cycle discrepancy audit correction', status: 'POSTED', createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'adj-02', docNumber: 'ADJ-2026-002', reference: 'ADJ-2026-002', variant_sku: 'AD-SN-B2-9-WHT', article_name: 'Supernova Stride Pro', quantity_change: -1, reason: 'Damaged in display shelf transfer', status: 'POSTED', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), created_at: new Date(Date.now() - 2 * 86400000).toISOString() }
];
let audits = [
  { id: 'aud-01', sessionNumber: 'AUD-NOV-2026', audit_number: 'AUD-NOV-2026', store_name: 'Forty V Flagship', status: 'COMPLETED', total_scanned: 640, matched_count: 638, discrepancy_count: 2, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), started_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'aud-02', sessionNumber: 'AUD-OCT-2026', audit_number: 'AUD-OCT-2026', store_name: 'Forty V Flagship', status: 'COMPLETED', total_scanned: 590, matched_count: 590, discrepancy_count: 0, createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), started_at: new Date(Date.now() - 40 * 86400000).toISOString() }
];
let ageingRules = [
  { id: 'ar-1', category_name: 'Running & Performance', threshold_days: 90, discount_pct: 25, label: 'Running Clearance 90d+', is_active: true },
  { id: 'ar-2', category_name: 'Formal Leather', threshold_days: 100, discount_pct: 30, label: 'Formal Off-Season Clearance', is_active: true }
];
let barcodeQueue = [
  { id: 'bq-1', sku: 'NK-AM-A5-8-BLK', article_name: 'Air Max Pulse Retro', size: 'UK 8', colour: 'Midnight Black', mrp: 8999, copies: 12, quantity: 12, status: 'PENDING', createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'bq-2', sku: 'AD-SN-B2-9-WHT', article_name: 'Supernova Stride Pro', size: 'UK 9', colour: 'Cloud White', mrp: 7499, copies: 18, quantity: 18, status: 'PRINTED', createdAt: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() }
];

let alertRules = [
  { id: 'ar-1', name: 'Low Stock Velocity Threshold', condition: 'STOCK_QTY < 5 AND 30D_SALES > 10', threshold: '5 units', severity: 'WARNING', isActive: true, is_active: true },
  { id: 'ar-2', name: 'Dead Stock 90+ Days Aging', condition: 'DAYS_SINCE_RECEIPT > 90', threshold: '90 days', severity: 'DANGER', isActive: true, is_active: true },
  { id: 'ar-3', name: 'Unreconciled Bank Deposit Discrepancy', condition: 'BANK_DISCREPANCY > 1000', threshold: '₹1,000.00', severity: 'DANGER', isActive: true, is_active: true },
  { id: 'ar-4', name: 'GSTR-3B Tax Filing Due Date Warning', condition: 'CURRENT_DAY > 15 OF_MONTH', threshold: 'Day 15', severity: 'INFO', isActive: true, is_active: true },
  { id: 'ar-5', name: 'Damaged Goods Ratio Breach', condition: 'DEFECT_RATE > 0.03', threshold: '3.0%', severity: 'WARNING', isActive: true, is_active: true }
];

let integrationConfigs = {
  whatsapp: { phone_number_id: '10982348572', from_phone: '+919876543210', api_url: 'https://graph.facebook.com/v18.0' },
  barcode_service: { base_url: 'https://solecontrol.fortyv.local/api/v1/barcodes' },
  bank_gateway: { client_id: 'HDFC_CORP_40V', api_url: 'https://api.hdfcbank.com/corp/v1' },
  gst_portal: { gstin: '33AABCF4050M1Z2', username: 'fortyv_tax_mgr', api_url: 'https://api.gst.gov.in' }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract path robustly from any Vercel forwarding mechanism
  const rawUrl = req.url || '';
  let searchParamsPath = '';
  if (rawUrl.includes('path=')) {
    try {
      const u = new URL(rawUrl, 'http://localhost');
      searchParamsPath = u.searchParams.get('path') ? '/' + u.searchParams.get('path') : '';
    } catch {}
  }
  const queryPath = (req.query && req.query.path) ? '/' + req.query.path : '';
  const matchedPath = req.headers['x-matched-path'] 
    || req.headers['x-vercel-matched-path'] 
    || req.headers['x-forwarded-uri'] 
    || req.headers['x-original-uri'] 
    || '';
  const urlPath = rawUrl.split('?')[0];
  const candidate = searchParamsPath || queryPath || matchedPath || (urlPath !== '/api/index' && urlPath !== '/api' ? urlPath : '');
  const path = (candidate || rawUrl).toLowerCase();

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // 1. Auth Login
  if ((path.includes('/auth/login') || path.endsWith('login')) && req.method === 'POST') {
    const { email, password } = body;
    if (email === 'superadmin@fortyv.local' && (password === 'ChangeMe@123' || password === 'admin')) {
      const accessToken = createToken({ sub: SUPER_ADMIN_USER.id, email, role: 'SUPER_ADMIN' });
      return res.status(200).json({ data: { accessToken, user: SUPER_ADMIN_USER } });
    }
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }

  if (path.includes('/auth/me')) return res.status(200).json({ data: SUPER_ADMIN_USER });
  if (path.includes('/auth/refresh')) {
    const accessToken = createToken({ sub: SUPER_ADMIN_USER.id, email: SUPER_ADMIN_USER.email, role: 'SUPER_ADMIN' });
    return res.status(200).json({ data: { accessToken } });
  }
  if (path.includes('/auth/logout')) {
    return res.status(200).json({ data: { success: true } });
  }

  // 2. Dashboard
  if (path.includes('/dashboard/kpis')) {
    return res.status(200).json({ data: { todaySales: 24997.00, todayTransactions: 3, totalStock: 642, pendingPurchases: 1 } });
  }
  if (path.includes('/dashboard/insights')) {
    return res.status(200).json({ data: [
      { type: 'ageing', message: '3 clearance recommendations pending review in Running Category', severity: 'warning' },
      { type: 'purchase', message: '1 purchase bill awaiting final review and barcode print', severity: 'info' }
    ]});
  }
  if (path.includes('/dashboard/recent-sales')) {
    return res.status(200).json({ data: [
      { id: 'sl-1', doc_number: 'INV-2026-001', docNumber: 'INV-2026-001', customer_name: 'Rahul Sharma', customerName: 'Rahul Sharma', total_amount: 8999.00, totalAmount: 8999.00, payment_mode: 'UPI', paymentMode: 'UPI', sale_date: new Date().toISOString(), createdAt: new Date().toISOString() },
      { id: 'sl-2', doc_number: 'INV-2026-002', docNumber: 'INV-2026-002', customer_name: 'Priya Sundaram', customerName: 'Priya Sundaram', total_amount: 14998.00, totalAmount: 14998.00, payment_mode: 'CARD', paymentMode: 'CARD', sale_date: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'sl-3', doc_number: 'INV-2026-003', docNumber: 'INV-2026-003', customer_name: 'Karthik Raja', customerName: 'Karthik Raja', total_amount: 999.00, totalAmount: 999.00, payment_mode: 'CASH', paymentMode: 'CASH', sale_date: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString() }
    ]});
  }
  if (path.includes('/dashboard/targets')) {
    return res.status(200).json({ data: [
      { id: 'tgt-1', name: 'November Store Revenue Goal', target_amount: 250000.00, targetAmount: 250000.00, achieved: 168490.00, currentSales: 168490.00, percentage: 67.4, period_start: '2026-11-01T00:00:00.000Z', period_end: '2026-11-30T23:59:59.000Z' },
      { id: 'tgt-2', name: 'Athletic Running Category Target', target_amount: 80000.00, targetAmount: 80000.00, achieved: 65990.00, currentSales: 65990.00, percentage: 82.5, period_start: '2026-11-01T00:00:00.000Z', period_end: '2026-11-30T23:59:59.000Z' }
    ]});
  }

  // 3. Masters
  if (path.includes('/masters/brands')) {
    if (req.method === 'POST') {
      const newB = { id: 'br-' + Date.now(), name: body.name || 'New Brand', code: (body.code || body.name?.slice(0, 3) || 'BR').toUpperCase(), isActive: true, is_active: true };
      DB.brands.push(newB);
      return res.status(201).json({ data: newB });
    }
    return res.status(200).json({ data: DB.brands });
  }
  if (path.includes('/masters/categories')) {
    if (req.method === 'POST') {
      const newC = { id: 'cat-' + Date.now(), name: body.name || 'New Category', code: (body.code || body.name?.slice(0, 3) || 'CAT').toUpperCase(), hsn: body.hsn || '6404', isActive: true, is_active: true };
      DB.categories.push(newC);
      return res.status(201).json({ data: newC });
    }
    return res.status(200).json({ data: DB.categories });
  }
  if (path.includes('/masters/sizes')) {
    if (req.method === 'POST') {
      const newS = { id: 'sz-' + Date.now(), size_system: body.size_system || 'UK', label: body.label || 'UK 10', sort_order: Number(body.sort_order || 10), isActive: true, is_active: true };
      DB.sizes.push(newS);
      return res.status(201).json({ data: newS });
    }
    return res.status(200).json({ data: DB.sizes });
  }
  if (path.includes('/masters/colours')) {
    if (req.method === 'POST') {
      const newCol = { id: 'col-' + Date.now(), name: body.name || 'Custom Colour', hex_code: body.hex_code || '#4F46E5', isActive: true, is_active: true };
      DB.colours.push(newCol);
      return res.status(201).json({ data: newCol });
    }
    return res.status(200).json({ data: DB.colours });
  }
  if (path.includes('/masters/articles')) {
    if (req.method === 'POST') {
      const newArt = { id: 'art-' + Date.now(), name: body.name || 'New Article Model', brand_name: body.brand_name || 'Forty V Pro', category_name: body.category_name || 'Footwear', hsn_code: '6404', is_active: true, isActive: true };
      DB.articles.push(newArt);
      return res.status(201).json({ data: newArt });
    }
    return res.status(200).json({ data: DB.articles });
  }
  if (path.includes('/masters/variants')) return res.status(200).json({ data: DB.variants });

  // 4. Vendors & Customers
  if (path.includes('/vendors')) {
    if (req.method === 'POST') {
      const newV = {
        id: 'vnd-' + Date.now(),
        name: body.name || 'New Supplier',
        phone: body.phone || '+91 98401 00000',
        gstin: body.gstin || '33AABCV1234F1Z1',
        balance: 0,
        isActive: true,
        is_active: true
      };
      DB.vendors.unshift(newV);
      return res.status(201).json({ data: newV });
    }
    const formatted = DB.vendors.map(v => ({
      ...v,
      isActive: v.isActive ?? v.is_active ?? true,
      balance: Number(v.balance ?? 0)
    }));
    return res.status(200).json({ data: formatted });
  }
  if (path.includes('/customers')) {
    if (req.method === 'POST') {
      const newC = {
        id: 'cust-' + Date.now(),
        name: body.name || 'New Customer',
        phone: body.phone || '+91 98401 00000',
        email: body.email || 'customer@example.com',
        lifetimeValue: 0,
        creditOutstanding: 0,
        isActive: true,
        is_active: true
      };
      DB.customers.unshift(newC);
      return res.status(201).json({ data: newC });
    }
    const formatted = DB.customers.map(c => ({
      ...c,
      isActive: c.isActive ?? c.is_active ?? true,
      lifetimeValue: Number(c.lifetimeValue ?? c.lifetime_value ?? 0),
      creditOutstanding: Number(c.creditOutstanding ?? c.credit_outstanding ?? 0)
    }));
    return res.status(200).json({ data: formatted });
  }

  // 5. Offers
  if (path.includes('/offers')) {
    if (path.includes('/deactivate')) {
      const id = path.split('/offers/')[1]?.split('/')[0];
      const o = DB.offers.find(x => x.id === id);
      if (o) o.isActive = false;
      return res.status(200).json({ data: { success: true } });
    }
    if (req.method === 'POST') {
      const newO = {
        id: 'off-' + Date.now(),
        name: body.name || 'Promotional Offer',
        scopeType: body.scopeType || 'ALL',
        discountType: body.discountType || 'PERCENTAGE',
        discountValue: Number(body.discountValue || 15),
        validFrom: body.validFrom || new Date().toISOString(),
        validTo: body.validTo || null,
        isActive: true,
        priority: Number(body.priority || 1)
      };
      DB.offers.unshift(newO);
      return res.status(201).json({ data: newO });
    }
    if (req.method === 'PUT') {
      const id = path.split('/offers/')[1]?.split('?')[0];
      const o = DB.offers.find(x => x.id === id);
      if (o && body.isActive !== undefined) o.isActive = body.isActive;
      return res.status(200).json({ data: { success: true } });
    }
    const formatted = DB.offers.map(o => ({
      ...o,
      scopeType: o.scopeType || o.scope_type || 'ALL',
      discountType: o.discountType || o.discount_type || 'PERCENTAGE',
      discountValue: Number(o.discountValue ?? o.discount_value ?? 0),
      validFrom: o.validFrom || o.valid_from || new Date().toISOString(),
      validTo: o.validTo || o.valid_until || null,
      isActive: o.isActive ?? o.is_active ?? true,
      priority: o.priority ?? 1
    }));
    return res.status(200).json({ data: formatted });
  }

  // 6. Company & Locations
  if (path.includes('/company/profile')) {
    if (req.method === 'PUT') {
      return res.status(200).json({ data: {
        name: body.name || 'Forty V Footwear Retail Private Limited',
        legalName: body.legalName || 'Forty V Footwear Retail Pvt Ltd',
        gstin: body.gstin || '33AABCF4050M1Z2',
        pan: body.pan || 'AABCF4050M',
        email: body.email || 'contact@fortyv.local',
        phone: body.phone || '+91 98401 23456',
        address: body.address || '104, Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu - 641004'
      }});
    }
    return res.status(200).json({ data: {
      name: 'Forty V Footwear Retail Private Limited',
      legalName: 'Forty V Footwear Retail Pvt Ltd',
      legal_name: 'Forty V Footwear Retail Pvt Ltd',
      gstin: '33AABCF4050M1Z2',
      pan: 'AABCF4050M',
      email: 'contact@fortyv.local',
      phone: '+91 98401 23456',
      address: '104, Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu - 641004'
    }});
  }
  if (path.includes('/company/stores')) {
    if (req.method === 'POST') {
      const newStore = {
        id: 'store-' + Date.now(),
        name: body.name || 'Forty V Express',
        code: body.code || 'STR-02',
        address: body.address || 'Cross Cut Road, Gandhipuram, Coimbatore',
        gstin: body.gstin || '33AABCF4050M1Z2',
        isActive: true,
        is_active: true
      };
      DB.stores.push(newStore);
      return res.status(201).json({ data: newStore });
    }
    const formatted = DB.stores.map(s => ({
      ...s,
      isActive: s.isActive ?? s.is_active ?? true
    }));
    return res.status(200).json({ data: formatted });
  }
  if (path.includes('/company/settings')) {
    return res.status(200).json({ data: [
      { id: 'set-1', key: 'valuation_method', value: 'WEIGHTED_AVERAGE', description: 'Inventory valuation methodology' },
      { id: 'set-2', key: 'freight_allocation', value: 'VALUE', description: 'Freight allocation across bill items' },
      { id: 'set-3', key: 'audit_cycle_days', value: '60', description: 'Stock physical audit cycle interval' },
      { id: 'set-4', key: 'admin_sales_entry', value: 'true', description: 'Enable direct sales invoicing by Super Admin' }
    ]});
  }
  if (path.includes('/locations/tree')) {
    return res.status(200).json({ data: [
      { id: 'loc-fl', name: 'Ground Floor Showroom', code: 'FL-01', type: 'FLOOR', children: [
        { id: 'loc-dept-m', name: 'Mens Performance Footwear', code: 'DEPT-M', type: 'DEPARTMENT', children: [
          { id: 'loc-rck-1', name: 'Rack R1 (Running Wall)', code: 'RCK-01', type: 'RACK', stock_count: 320 },
          { id: 'loc-rck-2', name: 'Rack R2 (Trail & Outdoor)', code: 'RCK-02', type: 'RACK', stock_count: 145 }
        ]},
        { id: 'loc-dept-w', name: 'Lifestyle & Streetwear', code: 'DEPT-W', type: 'DEPARTMENT', children: [
          { id: 'loc-rck-s1', name: 'Rack S1 (Retro Sneakers)', code: 'RCK-S1', type: 'RACK', stock_count: 177 }
        ]}
      ]}
    ]});
  }

  // 7. Barcodes
  if (path.includes('/barcodes/jobs/') && path.includes('/mark-printed')) {
    const id = path.split('/barcodes/jobs/')[1]?.split('/')[0];
    const job = barcodeQueue.find(j => j.id === id);
    if (job) job.status = 'PRINTED';
    return res.status(200).json({ data: { success: true } });
  }
  if (path.includes('/barcodes/queue')) {
    if (req.method === 'POST') {
      const newJob = {
        id: 'bq-' + Date.now(),
        sku: body.sku || 'NK-AM-A5-8-BLK',
        article_name: body.article_name || 'Air Max Pulse Retro',
        size: body.size || 'UK 8',
        colour: body.colour || 'Midnight Black',
        mrp: Number(body.mrp || 8999),
        copies: Number(body.copies || 12),
        quantity: Number(body.copies || 12),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      barcodeQueue.unshift(newJob);
      return res.status(201).json({ data: newJob });
    }
    return res.status(200).json({ data: barcodeQueue });
  }
  if (path.includes('/barcodes/jobs')) {
    return res.status(200).json({ data: { success: true } });
  }

  // 8. Users & Roles
  if (path.includes('/roles')) {
    const formatted = DB.roles.map(r => ({
      ...r,
      isSystem: r.isSystem ?? r.is_system ?? true,
      _count: r._count || {
        users: r.code === 'SUPER_ADMIN' ? 1 : r.code === 'ADMINISTRATOR' ? 2 : 1,
        rolePermissions: r.code === 'SUPER_ADMIN' ? 52 : 38
      }
    }));
    return res.status(200).json({ data: formatted });
  }
  if (path.includes('/users')) {
    if (req.method === 'POST') {
      const newU = {
        id: 'usr-' + Date.now(),
        name: body.name || 'New Staff Member',
        email: body.email || 'user@fortyv.local',
        role: { name: body.roleName || 'Store Manager' },
        role_name: body.roleName || 'Store Manager',
        isActive: true,
        is_active: true,
        status: 'ACTIVE',
        lastLoginAt: new Date().toISOString()
      };
      DB.users.unshift(newU);
      return res.status(201).json({ data: newU });
    }
    if (req.method === 'PUT') {
      return res.status(200).json({ data: { success: true } });
    }
    const formatted = DB.users.map(u => ({
      ...u,
      isActive: u.isActive ?? (u.status === 'ACTIVE' || u.is_active === true),
      role: u.role || { name: u.role_name || 'Super Admin' },
      lastLoginAt: u.lastLoginAt || u.last_login_at || new Date(Date.now() - 3600000).toISOString()
    }));
    return res.status(200).json({ data: formatted });
  }

  // 9. Inventory Stock, Adjustments, Audits
  if (path.includes('/inventory/stock') || path.includes('/inventory/balances')) {
    return res.status(200).json({ data: DB.balances, meta: { total: DB.balances.length, page: 1, pageSize: 50 } });
  }
  if (path.includes('/inventory/adjustments')) {
    if (req.method === 'POST') {
      const newAdj = {
        id: 'adj-' + Date.now(),
        docNumber: 'ADJ-2026-00' + (adjustments.length + 1),
        reference: 'ADJ-2026-00' + (adjustments.length + 1),
        variant_sku: body.sku || 'NK-AM-A5-8-BLK',
        article_name: body.article_name || 'Air Max Pulse Retro',
        quantity_change: Number(body.quantity || 1),
        reason: body.reason || 'Manual cycle discrepancy adjustment',
        status: 'POSTED',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      adjustments.unshift(newAdj);
      return res.status(201).json({ data: newAdj });
    }
    return res.status(200).json({ data: adjustments });
  }
  if (path.includes('/inventory/audits')) {
    if (req.method === 'POST') {
      const newAudit = {
        id: 'aud-' + Date.now(),
        sessionNumber: 'AUD-SESS-' + Date.now().toString().slice(-4),
        audit_number: 'AUD-SESS-' + Date.now().toString().slice(-4),
        store_name: body.store_name || 'Forty V Flagship',
        status: 'IN_PROGRESS',
        total_scanned: 0,
        matched_count: 0,
        discrepancy_count: 0,
        createdAt: new Date().toISOString(),
        started_at: new Date().toISOString()
      };
      audits.unshift(newAudit);
      return res.status(201).json({ data: newAudit });
    }
    return res.status(200).json({ data: audits });
  }

  // 10. Transfers
  if (path.includes('/transfers/') && path.includes('/dispatch')) {
    const id = path.split('/transfers/')[1]?.split('/')[0];
    const tr = transfers.find(t => t.id === id);
    if (tr) tr.status = 'DISPATCHED';
    return res.status(200).json({ data: { success: true, status: 'DISPATCHED' } });
  }
  if (path.includes('/transfers/') && path.includes('/receive')) {
    const id = path.split('/transfers/')[1]?.split('/')[0];
    const tr = transfers.find(t => t.id === id);
    if (tr) tr.status = 'RECEIVED';
    return res.status(200).json({ data: { success: true, status: 'RECEIVED' } });
  }
  if (path.includes('/transfers')) {
    if (req.method === 'POST') {
      const newTransfer = {
        id: 'tr-' + Date.now(),
        reference: 'TR-2026-00' + (transfers.length + 1),
        from_store_name: 'Forty V Flagship',
        to_store_name: 'Forty V Flagship',
        from_location_name: body.from_location_name || 'Rack R1',
        to_location_name: body.to_location_name || 'Rack S1',
        total_items: Number(body.items?.length || 1),
        status: 'REQUESTED',
        created_at: new Date().toISOString()
      };
      transfers.unshift(newTransfer);
      return res.status(201).json({ data: newTransfer });
    }
    return res.status(200).json({ data: transfers, meta: { total: transfers.length } });
  }

  // 11. Display Stock
  if (path.includes('/display/') && path.includes('/return')) {
    const id = path.split('/display/')[1]?.split('/')[0];
    const idx = displays.findIndex(d => d.id === id);
    if (idx !== -1) displays.splice(idx, 1);
    return res.status(200).json({ data: { success: true } });
  }
  if (path.includes('/display/allocate')) {
    const newDisplay = {
      id: 'disp-' + Date.now(),
      display_location_name: body.displayLocationName || 'Window Shelf Display',
      sku: body.sku || 'NK-AM-A5-8-BLK',
      article_name: body.articleName || 'Air Max Pulse Retro',
      size_label: 'UK 8',
      colour_name: 'Midnight Black',
      allocated_at: new Date().toISOString()
    };
    displays.unshift(newDisplay);
    return res.status(201).json({ data: newDisplay });
  }
  if (path.includes('/display')) return res.status(200).json({ data: displays });

  // 12. Damaged Goods
  if (path.includes('/damage/') && path.includes('/write-off')) {
    const id = path.split('/damage/')[1]?.split('/')[0];
    const dmg = damages.find(d => d.id === id);
    if (dmg) {
      dmg.status = 'WRITTEN_OFF';
      dmg.action = 'WRITTEN_OFF';
    }
    return res.status(200).json({ data: { success: true } });
  }
  if (path.includes('/damage/') && path.includes('/repair')) {
    const id = path.split('/damage/')[1]?.split('/')[0];
    const dmg = damages.find(d => d.id === id);
    if (dmg) {
      dmg.status = 'REPAIRED';
      dmg.action = 'REPAIRED';
    }
    return res.status(200).json({ data: { success: true } });
  }
  if (path.includes('/damage')) {
    if (req.method === 'POST') {
      const newDamage = {
        id: 'dmg-' + Date.now(),
        sku: body.sku || 'NK-AM-A5-8-BLK',
        article_name: body.articleName || 'Air Max Pulse Retro',
        size_label: 'UK 8',
        colour_name: 'Midnight Black',
        quantity: Number(body.quantity || 1),
        reason: body.reason || 'Transit Scratch',
        action: 'PENDING_REVIEW',
        status: 'REPORTED',
        reported_at: new Date().toISOString()
      };
      damages.unshift(newDamage);
      return res.status(201).json({ data: newDamage });
    }
    return res.status(200).json({ data: damages });
  }

  // 13. Ageing & Clearance (Combines SKU table format for AgeingPage and category bucket format for InventoryPage)
  if (path.includes('/ageing/heatmap')) {
    return res.status(200).json({ data: [
      { sku: 'NK-AM-A5-8-BLK', article: 'Air Max Alpha 5', category: 'Running & Performance Footwear', category_name: 'Running & Performance Footwear', quantity: 24, age_days: 14, d30: 24, d60: 0, d90: 0, d180: 0, d180plus: 0 },
      { sku: 'AD-SN-B2-9-WHT', article: 'Supernova Stride Pro', category: 'Running & Performance Footwear', category_name: 'Running & Performance Footwear', quantity: 18, age_days: 28, d30: 18, d60: 0, d90: 0, d180: 0, d180plus: 0 },
      { sku: 'PM-SD-C1-8-RED', article: 'Suede Classic XXI High', category: 'Lifestyle & Streetwear Sneakers', category_name: 'Lifestyle & Streetwear Sneakers', quantity: 12, age_days: 42, d30: 0, d60: 12, d90: 0, d180: 0, d180plus: 0 },
      { sku: 'RB-CL-L1-7-WHT', article: 'Club C 85 Vintage Court', category: 'Lifestyle & Streetwear Sneakers', category_name: 'Lifestyle & Streetwear Sneakers', quantity: 15, age_days: 56, d30: 0, d60: 15, d90: 0, d180: 0, d180plus: 0 },
      { sku: 'NB-57-D4-9-GRY', article: '574 Core Heritage Grey', category: 'Lifestyle & Streetwear Sneakers', category_name: 'Lifestyle & Streetwear Sneakers', quantity: 10, age_days: 72, d30: 0, d60: 0, d90: 10, d180: 0, d180plus: 0 },
      { sku: 'AS-GT-K2-8-BLU', article: 'GT-2000 12 Trail Runner', category: 'Running & Performance Footwear', category_name: 'Running & Performance Footwear', quantity: 8, age_days: 85, d30: 0, d60: 0, d90: 8, d180: 0, d180plus: 0 },
      { sku: 'CK-OX-L3-9-BRN', article: 'Derby Oxford Brogue Leather', category: 'Formal Leather & Boots', category_name: 'Formal Leather & Boots', quantity: 14, age_days: 105, d30: 0, d60: 0, d90: 0, d180: 14, d180plus: 0 },
      { sku: 'RD-LO-M1-8-TAN', article: 'Classic Handcrafted Loafer', category: 'Formal Leather & Boots', category_name: 'Formal Leather & Boots', quantity: 6, age_days: 120, d30: 0, d60: 0, d90: 0, d180: 6, d180plus: 0 }
    ]});
  }
  if (path.includes('/ageing/rules')) {
    if (req.method === 'POST') {
      const newRule = {
        id: 'ar-' + Date.now(),
        category_name: body.category_name || 'All Categories',
        threshold_days: Number(body.thresholdDays || 90),
        discount_pct: Number(body.discountPct || 20),
        label: body.label || 'Clearance Sale',
        is_active: true
      };
      ageingRules.push(newRule);
      return res.status(201).json({ data: newRule });
    }
    return res.status(200).json({ data: ageingRules });
  }

  // 14. Purchases
  if (path.includes('/purchases')) {
    if (req.method === 'POST') {
      if (path.includes('/finalise')) {
        const id = path.split('/purchases/')[1]?.split('/')[0];
        const p = purchases.find(item => item.id === id);
        if (p) p.status = 'FINALISED';
        return res.status(200).json({ data: p || { id, status: 'FINALISED' } });
      }
      const newP = {
        id: 'pb-' + Date.now(),
        doc_number: 'PB-2026-00' + (purchases.length + 1),
        bill_number: body.billNumber || 'BILL-' + Date.now().toString().slice(-6),
        vendor_id: body.vendorId,
        vendor: { name: 'Nike India Operations Pvt Ltd' },
        vendor_name: 'Nike India Operations Pvt Ltd',
        total_amount: Number(body.totalAmount || 74990.00),
        tax_amount: Number(body.taxAmount || 8998.80),
        status: 'DRAFT',
        class: body.purchaseClass || 'CLASS_A',
        purchase_class: body.purchaseClass || 'CLASS_A',
        bill_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        items: []
      };
      purchases.unshift(newP);
      return res.status(201).json({ data: newP });
    }
    return res.status(200).json({ data: purchases, meta: { total: purchases.length } });
  }

  // 15. Sales
  if (path.includes('/sales')) {
    if (req.method === 'POST') {
      const newSale = {
        id: 'inv-' + Date.now(),
        doc_number: 'INV-2026-00' + (sales.length + 1),
        customer_name: body.customerName || 'Walk-in Customer',
        total_amount: Number(body.totalAmount || 8999.00),
        paid_amount: Number(body.paidAmount || body.totalAmount || 8999.00),
        status: 'COMPLETED',
        payment_mode: body.paymentMode || 'UPI',
        sale_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      sales.unshift(newSale);
      return res.status(201).json({ data: newSale });
    }
    return res.status(200).json({ data: sales, meta: { total: sales.length } });
  }

  // 16. Accounting
  if (path.includes('/accounting/accounts')) return res.status(200).json({ data: accounts });
  if (path.includes('/accounting/journals')) {
    if (req.method === 'POST') {
      if (path.includes('/approve')) {
        return res.status(200).json({ data: { success: true } });
      }
      if (path.includes('/reverse')) {
        return res.status(200).json({ data: { success: true } });
      }
      const newJ = {
        id: 'jv-' + Date.now(),
        reference: body.reference || 'JV-2026-MANUAL',
        type: body.type || 'MANUAL',
        status: 'POSTED',
        total_debit: 5000,
        total_credit: 5000,
        notes: body.notes || 'Adjustment journal',
        posted_at: new Date().toISOString(),
        lines: body.lines || []
      };
      journals.unshift(newJ);
      return res.status(201).json({ data: newJ });
    }
    return res.status(200).json({ data: journals });
  }
  if (path.includes('/accounting/trial-balance')) {
    return res.status(200).json({
      data: [
        { code: '1110', name: 'HDFC Corporate Current A/c', type: 'ASSET', debit: 482500.00, credit: 0 },
        { code: '1300', name: 'Footwear Merchandise Inventory', type: 'ASSET', debit: 373000.00, credit: 0 },
        { code: '2100', name: 'Trade Payables - Footwear Vendors', type: 'LIABILITY', debit: 0, credit: 274400.00 },
        { code: '2210', name: 'Input CGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
        { code: '2220', name: 'Input SGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
        { code: '3000', name: 'Partner Equity Capital', type: 'EQUITY', debit: 0, credit: 500000.00 },
        { code: '3100', name: 'Partner Remuneration Drawings', type: 'EQUITY', debit: 25000.00, credit: 0 },
        { code: '4000', name: 'Retail Footwear Sales Revenue', type: 'REVENUE', debit: 0, credit: 168490.00 },
        { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', debit: 68000.00, credit: 0 },
        { code: '5100', name: 'Freight & Cartage Inwards', type: 'EXPENSE', debit: 10200.00, credit: 0 }
      ],
      meta: {
        totalDebit: 983460.00,
        totalCredit: 983460.00,
        balanced: true
      }
    });
  }
  if (path.includes('/accounting/pl')) {
    return res.status(200).json({ data: {
      totalRevenue: 168490.00,
      totalExpenses: 78200.00,
      grossProfit: 100490.00,
      operatingExpenses: 10200.00,
      netProfit: 90290.00,
      marginPct: 53.59,
      revenue: [
        { name: 'Retail Footwear Counter Sales (Sneakers & Lifestyle)', net_amount: 114500.00 },
        { name: 'Athletic Running & Performance Footwear Sales', net_amount: 53990.00 }
      ],
      expenses: [
        { name: 'Cost of Goods Sold (Footwear Inventory)', net_amount: 68000.00 },
        { name: 'Inward Freight & Logistics Transport', net_amount: 6200.00 },
        { name: 'Store Operations & Packaging Materials', net_amount: 4000.00 }
      ]
    }});
  }
  if (path.includes('/accounting/balance-sheet')) {
    return res.status(200).json({ data: {
      totalAssets: 877880.00,
      currentAssets: 877880.00,
      totalLiabilities: 274400.00,
      totalEquity: 603480.00,
      balanced: true,
      assets: [
        { name: 'HDFC Corporate Current A/c (Avinashi Rd)', balance: 482500.00 },
        { name: 'Footwear Merchandise Inventory (Racks & Display)', balance: 373000.00 },
        { name: 'Input CGST 6% Asset', balance: 11190.00 },
        { name: 'Input SGST 6% Asset', balance: 11190.00 }
      ],
      liabilities: [
        { name: 'Trade Payables - Footwear Vendors (Nike, Puma, Adidas)', balance: 265000.00 },
        { name: 'Output GST Payable (Net Central & State)', balance: 9400.00 }
      ],
      equity: [
        { name: 'Partner Equity Capital Infusion', balance: 500000.00 },
        { name: 'Retained Net Earnings (Current Financial Period)', balance: 128480.00 },
        { name: 'Less: Partner Drawings & Remuneration', balance: -25000.00 }
      ]
    }});
  }
  if (path.includes('/accounting/cashbook')) {
    return res.status(200).json({ data: [
      { id: 'cb-1', transaction_date: new Date().toISOString(), type: 'RECEIPT', amount: 8999.00, description: 'Counter POS receipt INV-2026-001', payment_mode: 'CASH', balance: 48999.00 },
      { id: 'cb-2', transaction_date: new Date(Date.now() - 86400000).toISOString(), type: 'PAYMENT', amount: 1500.00, description: 'Store cleaning and packaging supplies', payment_mode: 'CASH', balance: 40000.00 }
    ]});
  }

  // 17. Capital & Withdrawals
  if (path.includes('/capital/withdrawals')) {
    if (req.method === 'POST') {
      const newW = {
        id: 'w-' + Date.now(),
        storeId: 'addac467-9344-4786-9a92-1b5855402c25',
        amount: Number(body.amount),
        description: body.description || 'Partner Drawings',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      withdrawals.unshift(newW);
      return res.status(201).json({ data: newW });
    }
    const formatted = withdrawals.map(w => ({
      ...w,
      createdAt: w.createdAt || w.created_at || new Date().toISOString(),
      amount: Number(w.amount || 0)
    }));
    return res.status(200).json({ data: formatted });
  }
  if (path.includes('/capital')) {
    if (req.method === 'POST') {
      const newC = {
        id: 'cap-' + Date.now(),
        storeId: 'addac467-9344-4786-9a92-1b5855402c25',
        type: 'CAPITAL_IN',
        amount: Number(body.amount),
        description: body.description || 'Capital Infusion',
        reference: body.reference || 'UTR-LOCAL',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      capitalEntries.unshift(newC);
      return res.status(201).json({ data: newC });
    }
    const formatted = capitalEntries.map(c => ({
      ...c,
      type: 'CAPITAL_IN',
      createdAt: c.createdAt || c.created_at || new Date().toISOString(),
      amount: Number(c.amount || 0)
    }));
    return res.status(200).json({ data: formatted });
  }

  // 18. Bank & GST
  if (path.includes('/bank/accounts') || path.includes('/bank-gst/accounts')) {
    const formatted = bankAccounts.map(b => ({
      ...b,
      accountNumber: b.accountNumber || b.account_number || '50200088991122',
      account_number: b.account_number || b.accountNumber || '50200088991122',
      bankName: b.bankName || b.bank_name || 'HDFC Bank',
      bank_name: b.bank_name || b.bankName || 'HDFC Bank',
      balance: Number(b.balance ?? b.current_balance ?? b.opening_balance ?? 482500),
      current_balance: Number(b.current_balance ?? b.balance ?? 482500)
    }));
    return res.status(200).json({ data: formatted });
  }
  if (path.includes('/bank/reconcile') || path.includes('/bank/unreconcile')) {
    return res.status(200).json({ data: { success: true } });
  }
  if (path.includes('/bank/gst-summary') || path.includes('/bank-gst/gst-summary')) {
    return res.status(200).json({ data: [
      { month: '2026-11-01T00:00:00.000Z', output_taxable: 68596.00, output_tax: 8231.52, input_taxable: 373000.00, input_tax: 44760.00 }
    ]});
  }
  if (path.includes('/bank/gst-register') || path.includes('/bank-gst/gst-register')) {
    return res.status(200).json({ data: [
      { id: 'gst-1', type: 'INPUT', purchase_class: 'CLASS_A', reference_type: 'PURCHASE', purchase_doc: 'PB-2026-001', taxable_amount: 128000.00, taxable_value: 128000.00, cgst: 7680.00, sgst: 7680.00, igst: 0.00, tax_amount: 15360.00, total_value: 143360.00, transaction_date: new Date(Date.now() - 15 * 86400000).toISOString() },
      { id: 'gst-2', type: 'OUTPUT', purchase_class: 'CLASS_A', reference_type: 'SALE', sale_doc: 'INV-2026-001', taxable_amount: 8034.82, taxable_value: 8034.82, cgst: 482.09, sgst: 482.09, igst: 0.00, tax_amount: 964.18, total_value: 8999.00, transaction_date: new Date(Date.now() - 3 * 86400000).toISOString() }
    ]});
  }
  if (path.includes('/statement')) return res.status(200).json({ data: bankLines });

  // 19. Audit, Alerts, Sessions (Specific paths before general /alerts)
  if (path.includes('/alerts/audit-log') || path.includes('/audit/logs')) {
    return res.status(200).json({ data: DB.auditLogs });
  }
  if (path.includes('/alerts/rules')) return res.status(200).json({ data: alertRules });
  if (path.includes('/alerts/sessions')) {
    if (req.method === 'POST') return res.status(200).json({ data: { success: true } });
    return res.status(200).json({ data: [
      { id: 'ses-1', user_name: 'Super Administrator', ip_address: '127.0.0.1', user_agent: 'Chrome / Windows', active: true, created_at: new Date().toISOString() }
    ]});
  }
  if (path.includes('/alerts')) {
    if (req.method === 'POST' || req.method === 'DELETE') {
      return res.status(200).json({ data: { success: true } });
    }
    return res.status(200).json({ data: [
      { id: 'alt-1', title: 'Low Stock Velocity Alert', message: 'Size UK 7 for Suede Classic XXI High is below safety threshold (2 pairs left)', severity: 'warning', isRead: false, is_read: false, createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 'alt-2', title: 'GST Filing Reminder', message: 'GSTR-3B return filing window for October period is open', severity: 'info', isRead: false, is_read: false, createdAt: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() }
    ]});
  }

  // 20. Integrations
  if (path.includes('/integrations/printer/test')) {
    return res.status(200).json({ data: { connected: true, latencyMs: 14 } });
  }
  if (path.includes('/integrations/') && path.includes('/test')) {
    return res.status(200).json({ data: { connected: true, latencyMs: 42 } });
  }
  if (path.includes('/integrations/') && path.includes('/logs')) {
    return res.status(200).json({ data: [
      { id: 'log-1', action: 'HEARTBEAT_CHECK', status: 'SUCCESS', details: 'Provider endpoint handshake successful (HTTP 200)', created_at: new Date().toISOString() },
      { id: 'log-2', action: 'TOKEN_VALIDATION', status: 'SUCCESS', details: 'OAuth/API Bearer token valid for 24h', created_at: new Date(Date.now() - 3600000).toISOString() }
    ]});
  }
  if (path.includes('/integrations')) {
    if (req.method === 'PUT') {
      const provider = path.split('/integrations/')[1]?.split('?')[0];
      if (provider && body.config) {
        integrationConfigs[provider] = body.config;
      }
      return res.status(200).json({ data: { success: true } });
    }
    return res.status(200).json({ data: [
      { id: 'int-1', provider: 'whatsapp', name: 'WhatsApp Business Cloud API', isActive: true, lastStatus: 'CONNECTED', config: integrationConfigs.whatsapp, lastTestedAt: new Date().toISOString() },
      { id: 'int-2', provider: 'barcode_service', name: 'Barcode Generation & Label Service', isActive: true, lastStatus: 'CONNECTED', config: integrationConfigs.barcode_service, lastTestedAt: new Date().toISOString() },
      { id: 'int-3', provider: 'bank_gateway', name: 'HDFC Corporate Direct Banking Feed', isActive: true, lastStatus: 'CONNECTED', config: integrationConfigs.bank_gateway, lastTestedAt: new Date().toISOString() },
      { id: 'int-4', provider: 'gst_portal', name: 'GSTN Portal & E-Way / GSTR API', isActive: true, lastStatus: 'CONNECTED', config: integrationConfigs.gst_portal, lastTestedAt: new Date().toISOString() }
    ]});
  }

  // 21. Reports
  if (path.includes('/reports/sales')) {
    const rows = sales.map(s => ({
      doc_number: s.doc_number || s.docNumber,
      customer: s.customer_name || 'Walk-in Customer',
      sale_date: s.created_at || s.sale_date,
      payment_mode: s.payment_mode || 'UPI',
      total_amount: Number(s.total_amount || 0),
      paid_amount: Number(s.paid_amount || s.total_amount || 0),
      status: s.status || 'COMPLETED'
    }));
    return res.status(200).json({ data: rows });
  }
  if (path.includes('/reports/purchases')) {
    const rows = purchases.map(p => ({
      doc_number: p.bill_number || p.doc_number || p.docNumber,
      vendor: p.vendor_name || 'Nike India Operations Pvt Ltd',
      bill_date: p.bill_date || p.created_at,
      purchase_class: (p.class === 'CLASS_A' || p.purchase_class === 'CLASS_A') ? 'A' : 'B',
      total_amount: Number(p.total_amount || 0),
      status: p.status || 'FINALISED'
    }));
    return res.status(200).json({ data: rows });
  }
  if (path.includes('/reports/inventory')) {
    const rows = DB.balances.map(b => ({
      sku: b.sku,
      barcode: b.barcode || `BC-${b.sku}`,
      article: b.article_name,
      size: b.size_label,
      colour: b.colour_name,
      qty: b.quantity,
      cost: Number(b.cost_price || 0),
      mrp: Number(b.selling_price || 0)
    }));
    return res.status(200).json({ data: rows });
  }
  if (path.includes('/reports/ageing')) {
    const rows = DB.balances.map(b => ({
      sku: b.sku,
      article: b.article_name,
      category: 'Running & Performance Footwear',
      qty: b.quantity,
      first_movement: b.updated_at
    }));
    return res.status(200).json({ data: rows });
  }
  if (path.includes('/reports/gst')) {
    const rows = [
      { doc_number: 'PB-2026-001', party_name: 'Nike India Operations Pvt Ltd', party_gstin: '33AABCN1234F1Z5', doc_date: new Date(Date.now() - 15 * 86400000).toISOString(), taxable_value: 128000.00, cgst: 7680.00, sgst: 7680.00, igst: 0.00, total_invoice_value: 143360.00 },
      { doc_number: 'INV-2026-001', party_name: 'Rahul Sharma', party_gstin: 'URP', doc_date: new Date(Date.now() - 3 * 86400000).toISOString(), taxable_value: 8034.82, cgst: 482.09, sgst: 482.09, igst: 0.00, total_invoice_value: 8999.00 },
      { doc_number: 'INV-2026-002', party_name: 'Priya Sundaram', party_gstin: 'URP', doc_date: new Date(Date.now() - 2 * 86400000).toISOString(), taxable_value: 13391.07, cgst: 803.46, sgst: 803.46, igst: 0.00, total_invoice_value: 14998.00 }
    ];
    return res.status(200).json({ data: rows });
  }
  if (path.includes('/reports/trial-balance')) {
    return res.status(200).json({ data: [
      { code: '1110', name: 'HDFC Corporate Current A/c', type: 'ASSET', debit: 482500.00, credit: 0 },
      { code: '1300', name: 'Footwear Merchandise Inventory', type: 'ASSET', debit: 373000.00, credit: 0 },
      { code: '2100', name: 'Trade Payables - Footwear Vendors', type: 'LIABILITY', debit: 0, credit: 274400.00 },
      { code: '2210', name: 'Input CGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
      { code: '2220', name: 'Input SGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
      { code: '3000', name: 'Partner Equity Capital', type: 'EQUITY', debit: 0, credit: 500000.00 },
      { code: '3100', name: 'Partner Remuneration Drawings', type: 'EQUITY', debit: 25000.00, credit: 0 },
      { code: '4000', name: 'Retail Footwear Sales Revenue', type: 'REVENUE', debit: 0, credit: 168490.00 },
      { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', debit: 68000.00, credit: 0 },
      { code: '5100', name: 'Freight & Cartage Inwards', type: 'EXPENSE', debit: 10200.00, credit: 0 }
    ]});
  }
  if (path.includes('/reports')) {
    return res.status(200).json({ data: [] });
  }

  return res.status(200).json({ data: [], meta: { status: 'ok' } });
}
