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
let capitalEntries = [...DB.capitalEntries];
let withdrawals = [...DB.withdrawals];
let ageingRules = [
  { id: 'ar-1', category_name: 'Running & Performance', threshold_days: 90, discount_pct: 25, label: 'Running Clearance 90d+', is_active: true },
  { id: 'ar-2', category_name: 'Formal Leather', threshold_days: 100, discount_pct: 30, label: 'Formal Off-Season Clearance', is_active: true }
];
let barcodeQueue = [
  { id: 'bq-1', sku: 'NK-AM-A5-8-BLK', article_name: 'Air Max Pulse Retro', size: 'UK 8', colour: 'Midnight Black', mrp: 8999, copies: 12, status: 'QUEUED', created_at: new Date().toISOString() },
  { id: 'bq-2', sku: 'AD-SN-B2-9-WHT', article_name: 'Supernova Stride Pro', size: 'UK 9', colour: 'Cloud White', mrp: 7499, copies: 18, status: 'PRINTED', created_at: new Date(Date.now() - 86400000).toISOString() }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const path = url.split('?')[0];

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // 1. Auth Login
  if (path.endsWith('/auth/login') && req.method === 'POST') {
    const { email, password } = body;
    if (email === 'superadmin@fortyv.local' && (password === 'ChangeMe@123' || password === 'admin')) {
      const accessToken = createToken({ sub: SUPER_ADMIN_USER.id, email, role: 'SUPER_ADMIN' });
      return res.status(200).json({ data: { accessToken, user: SUPER_ADMIN_USER } });
    }
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }

  if (path.endsWith('/auth/me')) return res.status(200).json({ data: SUPER_ADMIN_USER });
  if (path.endsWith('/auth/refresh')) {
    const accessToken = createToken({ sub: SUPER_ADMIN_USER.id, email: SUPER_ADMIN_USER.email, role: 'SUPER_ADMIN' });
    return res.status(200).json({ data: { accessToken } });
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
    return res.status(200).json({ data: sales.slice(0, 5).map(s => ({ doc_number: s.document_number, customer_name: s.customer_name || 'Counter Customer', total_amount: s.total_amount, sale_date: s.created_at })) });
  }
  if (path.includes('/dashboard/targets')) {
    return res.status(200).json({ data: [
      { id: 'tgt-1', name: 'November Diwali Surge Target', period_start: '2026-11-01', period_end: '2026-11-30', target_amount: 500000.00, achieved: 418250.00 }
    ]});
  }

  // 3. Masters
  if (path.includes('/masters/brands')) return res.status(200).json({ data: DB.brands });
  if (path.includes('/masters/categories')) return res.status(200).json({ data: DB.categories });
  if (path.includes('/masters/sizes')) return res.status(200).json({ data: DB.sizes });
  if (path.includes('/masters/colours')) return res.status(200).json({ data: DB.colours });
  if (path.includes('/masters/articles')) return res.status(200).json({ data: DB.articles });
  if (path.includes('/masters/variants')) return res.status(200).json({ data: DB.variants });

  // 4. Vendors & Customers
  if (path.includes('/vendors')) return res.status(200).json({ data: DB.vendors });
  if (path.includes('/customers')) return res.status(200).json({ data: DB.customers });

  // 5. Offers
  if (path.includes('/offers')) {
    if (req.method === 'POST') {
      return res.status(200).json({ data: { success: true } });
    }
    return res.status(200).json({ data: DB.offers });
  }

  // 6. Company & Locations
  if (path.includes('/company/profile')) {
    return res.status(200).json({ data: {
      name: 'Forty V Footwear Retail Private Limited',
      legal_name: 'Forty V Footwear Retail Pvt Ltd',
      gstin: '33AABCF4050M1Z2',
      pan: 'AABCF4050M',
      address_line1: '100 Feet Road, Gandhipuram',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641012',
      email: 'operations@fortyv.local',
      phone: '+91 98401 99880'
    }});
  }
  if (path.includes('/company/stores')) return res.status(200).json({ data: DB.stores });
  if (path.includes('/company/settings')) {
    return res.status(200).json({ data: [
      { key: 'valuation_method', value: 'WEIGHTED_AVERAGE', description: 'Inventory valuation methodology' },
      { key: 'freight_allocation', value: 'VALUE', description: 'Freight allocation across bill items' },
      { key: 'audit_cycle_days', value: '60', description: 'Stock physical audit cycle interval' },
      { key: 'admin_sales_entry', value: 'true', description: 'Enable direct sales invoicing by Super Admin' }
    ]});
  }
  if (path.includes('/locations/tree')) {
    return res.status(200).json({ data: [
      { id: 'loc-fl', name: 'Ground Floor Showroom', type: 'FLOOR', children: [
        { id: 'loc-dept-m', name: 'Mens Performance Footwear', type: 'DEPARTMENT', children: [
          { id: 'loc-rck-1', name: 'Rack R1 (Running Wall)', type: 'RACK', stock_count: 320 },
          { id: 'loc-rck-2', name: 'Rack R2 (Trail & Outdoor)', type: 'RACK', stock_count: 145 }
        ]},
        { id: 'loc-dept-w', name: 'Lifestyle & Streetwear', type: 'DEPARTMENT', children: [
          { id: 'loc-rck-s1', name: 'Rack S1 (Retro Sneakers)', type: 'RACK', stock_count: 177 }
        ]}
      ]}
    ]});
  }

  // 7. Barcodes
  if (path.includes('/barcodes/queue')) return res.status(200).json({ data: barcodeQueue });

  // 8. Users & Roles
  if (path.includes('/roles')) return res.status(200).json({ data: DB.roles });
  if (path.includes('/users')) return res.status(200).json({ data: DB.users });

  // 9. Inventory Stock, Adjustments, Audits
  if (path.includes('/inventory/stock') || path.includes('/inventory/balances')) {
    return res.status(200).json({ data: DB.balances, meta: { total: DB.balances.length, page: 1, pageSize: 50 } });
  }
  if (path.includes('/inventory/adjustments')) {
    return res.status(200).json({ data: [
      { id: 'adj-01', reference: 'ADJ-2026-001', variant_sku: 'NK-AM-A5-8-BLK', article_name: 'Air Max Pulse Retro', quantity_change: 2, reason: 'Physical cycle discrepancy audit correction', created_at: new Date(Date.now() - 4 * 86400000).toISOString() }
    ]});
  }
  if (path.includes('/inventory/audits')) {
    return res.status(200).json({ data: [
      { id: 'aud-01', audit_number: 'AUD-NOV-2026', store_name: 'Forty V Flagship', status: 'COMPLETED', total_scanned: 640, matched_count: 638, discrepancy_count: 2, started_at: new Date(Date.now() - 10 * 86400000).toISOString() }
    ]});
  }

  // 10. Transfers
  if (path.includes('/transfers')) {
    if (req.method === 'POST') {
      const newTransfer = {
        id: 'tr-' + Date.now(),
        reference: 'TR-2026-00' + (transfers.length + 1),
        from_store_name: 'Forty V Flagship',
        to_store_name: 'Forty V Flagship',
        from_location_name: 'Rack R1',
        to_location_name: 'Rack S1',
        status: 'REQUESTED',
        total_pairs: body.quantity || 4,
        requested_by_name: 'Super Admin',
        notes: body.notes || 'Inter-rack movement',
        created_at: new Date().toISOString()
      };
      transfers.unshift(newTransfer);
      return res.status(201).json({ data: newTransfer });
    }
    return res.status(200).json({ data: transfers });
  }

  // 11. Display Stock
  if (path.includes('/display')) {
    if (req.method === 'POST') {
      const newDisplay = {
        id: 'disp-' + Date.now(),
        article_name: body.article_name || 'Air Max Pulse Retro',
        sku: 'NK-AM-A5-8-BLK',
        colour_name: 'Midnight Black',
        size_label: 'UK 8',
        display_location_id: 'DISP-MAIN',
        from_location_name: 'Rack R1',
        quantity: Number(body.quantity || 1),
        status: 'ACTIVE',
        notes: body.notes || 'Showcase sample allocation',
        created_at: new Date().toISOString()
      };
      displays.unshift(newDisplay);
      return res.status(201).json({ data: newDisplay });
    }
    return res.status(200).json({ data: displays });
  }

  // 12. Damaged Goods
  if (path.includes('/damage')) {
    if (req.method === 'POST') {
      const newDamage = {
        id: 'dmg-' + Date.now(),
        article_name: body.article_name || 'Air Max Pulse Retro',
        sku: 'NK-AM-A5-8-BLK',
        colour_name: 'Midnight Black',
        size_label: 'UK 8',
        location_name: 'Rack R1',
        quantity: Number(body.quantity || 1),
        status: 'REPORTED',
        description: body.description || 'Try-on defect',
        created_at: new Date().toISOString()
      };
      damages.unshift(newDamage);
      return res.status(201).json({ data: newDamage });
    }
    return res.status(200).json({ data: damages });
  }

  // 13. Ageing
  if (path.includes('/ageing/heatmap')) {
    return res.status(200).json({ data: [
      { category_name: 'Running & Performance', d0_30: 142, d31_60: 84, d61_90: 22, d90_plus: 6, total: 254 },
      { category_name: 'Lifestyle & Sneaker', d0_30: 180, d31_60: 60, d61_90: 14, d90_plus: 2, total: 256 },
      { category_name: 'Formal Leather', d0_30: 45, d31_60: 38, d61_90: 16, d90_plus: 8, total: 107 },
      { category_name: 'Sandals & Slides', d0_30: 65, d31_60: 12, d61_90: 4, d90_plus: 0, total: 81 }
    ]});
  }
  if (path.includes('/ageing/rules')) return res.status(200).json({ data: ageingRules });
  if (path.includes('/ageing/recommendations')) {
    return res.status(200).json({ data: [
      { id: 'rec-01', article_name: 'Air Max Pulse Retro', age_days: 96, current_stock: 6, current_mrp: 8999, suggested_discount: 25, status: 'PENDING' },
      { id: 'rec-02', article_name: 'Formal Derby Oxford', age_days: 108, current_stock: 8, current_mrp: 5499, suggested_discount: 30, status: 'PENDING' }
    ]});
  }

  // 14. Purchases
  if (path.includes('/purchases')) {
    if (req.method === 'POST') {
      const newPurchase = {
        id: 'pb-' + Date.now(),
        document_number: 'PB-2026-00' + (purchases.length + 1),
        vendor_name: body.vendor_name || 'Nike India Private Limited',
        invoice_number: body.invoice_number || 'INV-' + Date.now().toString().slice(-4),
        bill_number: body.invoice_number || 'INV-' + Date.now().toString().slice(-4),
        bill_date: new Date().toISOString(),
        total_amount: Number(body.total_amount || 45000),
        subtotal: Number(body.total_amount || 45000) * 0.8928,
        tax_amount: Number(body.total_amount || 45000) * 0.1072,
        payment_status: 'PENDING',
        status: 'FINALISED',
        class: 'CLASS_A',
        items: []
      };
      purchases.unshift(newPurchase);
      return res.status(201).json({ data: newPurchase });
    }
    return res.status(200).json({ data: purchases });
  }

  // 15. Sales
  if (path.includes('/sales')) {
    if (req.method === 'POST') {
      const newSale = {
        id: 'sl-' + Date.now(),
        document_number: 'INV-2026-00' + (sales.length + 1),
        customer_name: body.customer_name || 'Walk-in Retail Shopper',
        customer_phone: body.customer_phone || '9876543210',
        total_amount: Number(body.total_amount || 8999),
        subtotal: Number(body.total_amount || 8999) * 0.8928,
        tax_amount: Number(body.total_amount || 8999) * 0.1072,
        payment_mode: body.payment_mode || 'UPI',
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };
      sales.unshift(newSale);
      return res.status(201).json({ data: newSale });
    }
    return res.status(200).json({ data: sales });
  }

  // 16. Accounting
  if (path.includes('/accounting/accounts')) {
    if (req.method === 'POST') {
      const newAcc = { id: 'acc-' + Date.now(), ...body, is_active: true };
      accounts.push(newAcc);
      return res.status(201).json({ data: newAcc });
    }
    return res.status(200).json({ data: accounts });
  }
  if (path.includes('/accounting/journals')) return res.status(200).json({ data: journals });
  if (path.includes('/accounting/trial-balance')) {
    return res.status(200).json({ data: [
      { code: '1110', name: 'HDFC Corporate Current A/c', type: 'ASSET', debit: 482500.00, credit: 0 },
      { code: '1300', name: 'Footwear Merchandise Inventory', type: 'ASSET', debit: 373000.00, credit: 0 },
      { code: '2100', name: 'Trade Payables - Footwear Vendors', type: 'LIABILITY', debit: 0, credit: 274400.00 },
      { code: '2210', name: 'Input CGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
      { code: '2220', name: 'Input SGST 6%', type: 'ASSET', debit: 22380.00, credit: 0 },
      { code: '3000', name: 'Partner Equity Capital', type: 'EQUITY', debit: 0, credit: 500000.00 },
      { code: '3100', name: 'Partner Remuneration Drawings', type: 'EQUITY', debit: 25000.00, credit: 0 },
      { code: '4000', name: 'Gross Footwear Retail Sales', type: 'INCOME', debit: 0, credit: 150860.00 }
    ]});
  }
  if (path.includes('/accounting/pl')) {
    return res.status(200).json({ data: {
      revenue: 150860.00,
      cogs: 82400.00,
      grossProfit: 68460.00,
      operatingExpenses: 18200.00,
      netProfit: 50260.00,
      marginPct: 33.31
    }});
  }
  if (path.includes('/accounting/balance-sheet')) {
    return res.status(200).json({ data: {
      totalAssets: 900260.00,
      currentAssets: 900260.00,
      totalLiabilities: 274400.00,
      totalEquity: 525860.00,
      balanced: true
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
      const newW = { id: 'w-' + Date.now(), store_id: 'addac467-9344-4786-9a92-1b5855402c25', amount: Number(body.amount), description: body.description || 'Drawings', drawn_by: 'Managing Partner', status: 'APPROVED', created_at: new Date().toISOString() };
      withdrawals.unshift(newW);
      return res.status(201).json({ data: newW });
    }
    return res.status(200).json({ data: withdrawals });
  }
  if (path.includes('/capital')) {
    if (req.method === 'POST') {
      const newC = { id: 'cap-' + Date.now(), store_id: 'addac467-9344-4786-9a92-1b5855402c25', type: body.type || 'CONTRIBUTION', amount: Number(body.amount), description: body.description || 'Capital', reference: body.reference || 'UTR-LOCAL', status: 'APPROVED', created_at: new Date().toISOString() };
      capitalEntries.unshift(newC);
      return res.status(201).json({ data: newC });
    }
    return res.status(200).json({ data: capitalEntries });
  }

  // 18. Bank & GST
  if (path.includes('/bank/accounts') || path.includes('/bank-gst/accounts')) {
    return res.status(200).json({ data: bankAccounts });
  }
  if (path.includes('/bank/gst-summary') || path.includes('/bank-gst/gst-summary')) {
    return res.status(200).json({ data: [
      { month: '2026-11-01T00:00:00.000Z', output_taxable: 68596.00, output_tax: 8231.52, input_taxable: 373000.00, input_tax: 44760.00 }
    ]});
  }
  if (path.includes('/bank/gst-register') || path.includes('/bank-gst/gst-register')) {
    return res.status(200).json({ data: [
      { id: 'gst-1', type: 'INPUT', purchase_class: 'CLASS_A', reference_type: 'PURCHASE', purchase_doc: 'PB-2026-001', taxable_value: 128000.00, cgst: 7680.00, sgst: 7680.00, igst: 0.00, total_value: 143360.00, transaction_date: new Date(Date.now() - 15 * 86400000).toISOString() },
      { id: 'gst-2', type: 'OUTPUT', purchase_class: 'CLASS_A', reference_type: 'SALE', sale_doc: 'INV-2026-001', taxable_value: 8034.82, cgst: 482.09, sgst: 482.09, igst: 0.00, total_value: 8999.00, transaction_date: new Date(Date.now() - 3 * 86400000).toISOString() }
    ]});
  }
  if (path.includes('/statement')) return res.status(200).json({ data: bankLines });

  // 19. Audit, Alerts, Sessions
  if (path.includes('/alerts/rules')) return res.status(200).json({ data: DB.alertRules });
  if (path.includes('/alerts/sessions')) {
    return res.status(200).json({ data: [
      { id: 'ses-1', user_name: 'Super Administrator', ip_address: '127.0.0.1', user_agent: 'Chrome / Windows', active: true, created_at: new Date().toISOString() }
    ]});
  }
  if (path.includes('/alerts')) {
    return res.status(200).json({ data: [
      { id: 'alt-1', title: 'Low Stock Alert', message: 'Size UK 7 for Suede Classic XXI High is below safety threshold (2 pairs left)', severity: 'warning', created_at: new Date().toISOString() },
      { id: 'alt-2', title: 'GST Filing Reminder', message: 'GSTR-3B return filing window for October period is open', severity: 'info', created_at: new Date(Date.now() - 86400000).toISOString() }
    ]});
  }
  if (path.includes('/audit/logs')) return res.status(200).json({ data: DB.auditLogs });

  // 20. Integrations
  if (path.includes('/integrations')) {
    return res.status(200).json({ data: [
      { provider: 'WHATSAPP', name: 'WhatsApp Business Cloud API', status: 'CONFIGURED', is_active: true, last_tested_at: new Date().toISOString() },
      { provider: 'GST_PORTAL', name: 'GST e-Way & e-Invoice Sandbox', status: 'CONNECTED', is_active: true, last_tested_at: new Date().toISOString() },
      { provider: 'HDFC_BANK', name: 'HDFC Corporate Direct Banking Feed', status: 'ACTIVE', is_active: true, last_tested_at: new Date().toISOString() },
      { provider: 'THERMAL_PRINTER', name: 'TSC Barcode & TSC Label Printer', status: 'READY', is_active: true, last_tested_at: new Date().toISOString() }
    ]});
  }

  // 21. Reports
  if (path.includes('/reports')) {
    return res.status(200).json({ data: {
      salesSummary: { totalGross: 168490.00, totalDiscount: 6200.00, totalNet: 162290.00, unitsSold: 28 },
      topArticles: [
        { name: 'Air Max Pulse Retro', units: 14, revenue: 125986.00 },
        { name: 'Supernova Stride Pro', units: 8, revenue: 59992.00 },
        { name: 'Suede Classic XXI High', units: 6, revenue: 35994.00 }
      ]
    }});
  }

  return res.status(200).json({ data: [], meta: { status: 'ok' } });
}
