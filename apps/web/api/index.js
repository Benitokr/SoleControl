import crypto from 'crypto';

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

let memoryTransfers = [
  { id: 'tr-001', reference: 'TR-2026-001', from_store_name: 'Forty V Flagship', to_store_name: 'Forty V Flagship', from_location_name: 'Rack R1', to_location_name: 'Rack S1', status: 'RECEIVED', total_pairs: 6, requested_by_name: 'Super Admin', notes: 'Weekend surge replenishment for road running wall', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'tr-002', reference: 'TR-2026-002', from_store_name: 'Forty V Flagship', to_store_name: 'Forty V Flagship', from_location_name: 'Rack R1', to_location_name: 'Rack S1', status: 'DISPATCHED', total_pairs: 6, requested_by_name: 'Super Admin', notes: 'Transfer of UK 8/9 sizes to High-Traffic Sneaker Wall S1', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'tr-003', reference: 'TR-2026-003', from_store_name: 'Forty V Flagship', to_store_name: 'Forty V Flagship', from_location_name: 'Rack R1', to_location_name: 'Rack S1', status: 'REQUESTED', total_pairs: 4, requested_by_name: 'Super Admin', notes: 'Restocking formal leather footwear for corporate season', created_at: new Date(Date.now() - 1 * 86400000).toISOString() }
];

let memoryDisplays = [
  { id: 'disp-001', article_name: 'Air Max Pulse Retro', sku: 'NK-AM-A5-8-BLK', colour_name: 'Midnight Black', size_label: 'UK 8', display_location_id: 'DISP-MAIN', from_location_name: 'Rack R1', quantity: 1, status: 'ACTIVE', notes: 'Right foot shoe sample for front window feature', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'disp-002', article_name: 'Supernova Stride Pro', sku: 'AD-SN-B2-9-WHT', colour_name: 'Cloud White', size_label: 'UK 9', display_location_id: 'DISP-MAIN', from_location_name: 'Rack R1', quantity: 1, status: 'ACTIVE', notes: 'Running wall showcase shoe sample UK 9', created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'disp-003', article_name: 'Suede Classic XXI High', sku: 'PM-SC-C8-7-RED', colour_name: 'Racing Red', size_label: 'UK 7', display_location_id: 'DISP-MAIN', from_location_name: 'Rack R1', quantity: 2, status: 'ACTIVE', notes: 'Center Island Streetwear lifestyle sample', created_at: new Date(Date.now() - 3 * 86400000).toISOString() }
];

let memoryDamages = [
  { id: 'dmg-001', article_name: 'Gel-Kayano 31 Platinum', sku: 'AS-GK-D1-8-GRY', colour_name: 'Slate Grey', size_label: 'UK 8', location_name: 'Rack R1', quantity: 1, status: 'REPORTED', description: 'Outsole delamination observed during shelf unpacking', created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'dmg-002', article_name: 'Air Max Pulse Retro', sku: 'NK-AM-A5-9-BLK', colour_name: 'Midnight Black', size_label: 'UK 9', location_name: 'Rack R1', quantity: 1, status: 'INSPECTION', description: 'Minor shoelace eyelet tear during customer try-on', created_at: new Date(Date.now() - 3 * 86400000).toISOString() }
];

let memoryPurchases = [
  { id: 'pb-001', document_number: 'PB-2026-001', vendor_name: 'Nike India Private Limited', invoice_number: 'INV-NK-9811', invoice_date: new Date(Date.now() - 15 * 86400000).toISOString(), total_amount: 143360.00, subtotal: 128000.00, tax_amount: 15360.00, payment_status: 'PAID', status: 'FINALISED', class: 'CLASS_A', items: [{ article_name: 'Air Max Pulse Retro', quantity: 16, cost_price: 4500, mrp: 8999 }] },
  { id: 'pb-002', document_number: 'PB-2026-002', vendor_name: 'Adidas Technical Footwear', invoice_number: 'INV-AD-4402', invoice_date: new Date(Date.now() - 10 * 86400000).toISOString(), total_amount: 274400.00, subtotal: 245000.00, tax_amount: 29400.00, payment_status: 'PENDING', status: 'FINALISED', class: 'CLASS_A', items: [{ article_name: 'Supernova Stride Pro', quantity: 24, cost_price: 3800, mrp: 7499 }] }
];

let memorySales = [
  { id: 'sl-001', document_number: 'INV-2026-001', customer_name: 'Aditya Raman', customer_phone: '9840112345', total_amount: 8999.00, subtotal: 8034.82, tax_amount: 964.18, payment_mode: 'UPI', status: 'COMPLETED', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'sl-002', document_number: 'INV-2026-002', customer_name: 'Priya Sundaram', customer_phone: '9443298765', total_amount: 7499.00, subtotal: 6695.54, tax_amount: 803.46, payment_mode: 'CARD', status: 'COMPLETED', created_at: new Date(Date.now() - 1 * 86400000).toISOString() }
];

export default async function handler(req, res) {
  // Global CORS
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
      return res.status(200).json({
        data: {
          accessToken,
          user: SUPER_ADMIN_USER
        }
      });
    }
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }

  // 2. Auth Current User
  if (path.endsWith('/auth/me')) {
    return res.status(200).json({ data: SUPER_ADMIN_USER });
  }

  // 3. Auth Refresh
  if (path.endsWith('/auth/refresh')) {
    const accessToken = createToken({ sub: SUPER_ADMIN_USER.id, email: SUPER_ADMIN_USER.email, role: 'SUPER_ADMIN' });
    return res.status(200).json({ data: { accessToken } });
  }

  // 4. Dashboard APIs
  if (path.includes('/dashboard/kpis')) {
    return res.status(200).json({
      data: {
        todaySales: 16498.00,
        todayTransactions: 2,
        totalStock: 642,
        pendingPurchases: 1
      }
    });
  }

  if (path.includes('/dashboard/insights')) {
    return res.status(200).json({
      data: [
        { type: 'ageing', message: '3 clearance recommendations pending review in Running Category', severity: 'warning' },
        { type: 'purchase', message: '1 purchase bill awaiting final review and barcode print', severity: 'info' }
      ]
    });
  }

  if (path.includes('/dashboard/recent-sales')) {
    return res.status(200).json({
      data: memorySales.map(s => ({
        doc_number: s.document_number,
        customer_name: s.customer_name,
        total_amount: s.total_amount,
        sale_date: s.created_at
      }))
    });
  }

  if (path.includes('/dashboard/targets')) {
    return res.status(200).json({
      data: [
        { id: 'tgt-1', name: 'November Diwali Surge Target', period_start: '2026-11-01', period_end: '2026-11-30', target_amount: 500000.00, achieved: 418250.00 }
      ]
    });
  }

  // 5. Stores
  if (path.includes('/company/stores')) {
    return res.status(200).json({
      data: [
        { id: 'addac467-9344-4786-9a92-1b5855402c25', name: 'Forty V Flagship - Coimbatore', code: 'STR-01', active: true, gstin: '33AABCF4050M1Z2', address: '100 Feet Road, Gandhipuram, Coimbatore' }
      ]
    });
  }

  // 6. Stock Transfers
  if (path.includes('/transfers')) {
    if (req.method === 'POST') {
      const newTransfer = {
        id: 'tr-' + Date.now(),
        reference: 'TR-2026-00' + (memoryTransfers.length + 1),
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
      memoryTransfers.unshift(newTransfer);
      return res.status(201).json({ data: newTransfer });
    }
    return res.status(200).json({ data: memoryTransfers });
  }

  // 7. Display Stock
  if (path.includes('/display')) {
    if (req.method === 'POST') {
      const newDisplay = {
        id: 'disp-' + Date.now(),
        article_name: body.article_name || 'Showcase Sample',
        sku: 'SAMPLE-' + Date.now().toString().slice(-4),
        colour_name: 'Featured Black',
        size_label: 'UK 8',
        display_location_id: 'DISP-MAIN',
        from_location_name: 'Rack R1',
        quantity: Number(body.quantity || 1),
        status: 'ACTIVE',
        notes: body.notes || 'Showcase sample allocation',
        created_at: new Date().toISOString()
      };
      memoryDisplays.unshift(newDisplay);
      return res.status(201).json({ data: newDisplay });
    }
    return res.status(200).json({ data: memoryDisplays });
  }

  // 8. Damaged Goods
  if (path.includes('/damage')) {
    if (req.method === 'POST') {
      const newDamage = {
        id: 'dmg-' + Date.now(),
        article_name: body.article_name || 'Inspection Footwear',
        sku: 'DMG-' + Date.now().toString().slice(-4),
        colour_name: 'Default',
        size_label: 'UK 8',
        location_name: 'Rack R1',
        quantity: Number(body.quantity || 1),
        status: 'REPORTED',
        description: body.description || 'Try-on defect',
        created_at: new Date().toISOString()
      };
      memoryDamages.unshift(newDamage);
      return res.status(201).json({ data: newDamage });
    }
    return res.status(200).json({ data: memoryDamages });
  }

  // 9. Ageing Heatmap & Recommendations
  if (path.includes('/ageing/heatmap')) {
    return res.status(200).json({
      data: [
        { category_name: 'Running & Performance', d0_30: 142, d31_60: 84, d61_90: 22, d90_plus: 6, total: 254 },
        { category_name: 'Lifestyle & Sneaker', d0_30: 180, d31_60: 60, d61_90: 14, d90_plus: 2, total: 256 },
        { category_name: 'Formal Leather', d0_30: 45, d31_60: 38, d61_90: 16, d90_plus: 8, total: 107 },
        { category_name: 'Sandals & Slides', d0_30: 65, d31_60: 12, d61_90: 4, d90_plus: 0, total: 81 }
      ]
    });
  }

  if (path.includes('/ageing/recommendations')) {
    return res.status(200).json({
      data: [
        { id: 'rec-01', article_name: 'Air Max Pulse Retro', age_days: 96, current_stock: 6, current_mrp: 8999, suggested_discount: 25, status: 'PENDING' },
        { id: 'rec-02', article_name: 'Formal Derby Oxford', age_days: 108, current_stock: 8, current_mrp: 5499, suggested_discount: 30, status: 'PENDING' }
      ]
    });
  }

  // 10. Purchases
  if (path.includes('/purchases')) {
    if (req.method === 'POST') {
      const newPurchase = {
        id: 'pb-' + Date.now(),
        document_number: 'PB-2026-00' + (memoryPurchases.length + 1),
        vendor_name: body.vendor_name || 'Vendor Partner India',
        invoice_number: body.invoice_number || 'INV-' + Date.now().toString().slice(-4),
        invoice_date: new Date().toISOString(),
        total_amount: Number(body.total_amount || 45000),
        subtotal: Number(body.total_amount || 45000) * 0.8928,
        tax_amount: Number(body.total_amount || 45000) * 0.1072,
        payment_status: 'PENDING',
        status: 'FINALISED',
        class: 'CLASS_A',
        items: []
      };
      memoryPurchases.unshift(newPurchase);
      return res.status(201).json({ data: newPurchase });
    }
    return res.status(200).json({ data: memoryPurchases });
  }

  // 11. Sales
  if (path.includes('/sales')) {
    if (req.method === 'POST') {
      const newSale = {
        id: 'sl-' + Date.now(),
        document_number: 'INV-2026-00' + (memorySales.length + 1),
        customer_name: body.customer_name || 'Walk-in Customer',
        customer_phone: body.customer_phone || '9876543210',
        total_amount: Number(body.total_amount || 8999),
        subtotal: Number(body.total_amount || 8999) * 0.8928,
        tax_amount: Number(body.total_amount || 8999) * 0.1072,
        payment_mode: body.payment_mode || 'UPI',
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };
      memorySales.unshift(newSale);
      return res.status(201).json({ data: newSale });
    }
    return res.status(200).json({ data: memorySales });
  }

  // 12. Inventory Stock
  if (path.includes('/inventory/stock') || path.includes('/inventory/balances')) {
    return res.status(200).json({
      data: [
        { id: 'sb-1', sku: 'NK-AM-A5-8-BLK', article_name: 'Air Max Pulse Retro', size_label: 'UK 8', colour_name: 'Midnight Black', location_name: 'Rack R1', quantity: 12, cost_price: 4500, selling_price: 8999, mrp: 8999 },
        { id: 'sb-2', sku: 'AD-SN-B2-9-WHT', article_name: 'Supernova Stride Pro', size_label: 'UK 9', colour_name: 'Cloud White', location_name: 'Rack R1', quantity: 18, cost_price: 3800, selling_price: 7499, mrp: 7499 },
        { id: 'sb-3', sku: 'PM-SC-C8-7-RED', article_name: 'Suede Classic XXI High', size_label: 'UK 7', colour_name: 'Racing Red', location_name: 'Rack S1', quantity: 14, cost_price: 2900, selling_price: 5999, mrp: 5999 },
        { id: 'sb-4', sku: 'AS-GK-D1-8-GRY', article_name: 'Gel-Kayano 31 Platinum', size_label: 'UK 8', colour_name: 'Slate Grey', location_name: 'Rack S1', quantity: 16, cost_price: 5200, selling_price: 10999, mrp: 10999 }
      ],
      meta: { total: 4, page: 1, pageSize: 50 }
    });
  }

  // 13. Capital & Withdrawals
  if (path.includes('/capital/withdrawals')) {
    return res.status(200).json({
      data: [
        { id: 'w-1', store_id: 'addac467-9344-4786-9a92-1b5855402c25', amount: 25000.00, description: 'Monthly Partner Remuneration Drawings', drawn_by: 'Managing Partner', status: 'APPROVED', created_at: new Date(Date.now() - 5 * 86400000).toISOString() }
      ]
    });
  }

  if (path.includes('/capital')) {
    return res.status(200).json({
      data: [
        { id: 'cap-1', store_id: 'addac467-9344-4786-9a92-1b5855402c25', type: 'CONTRIBUTION', amount: 500000.00, description: 'Initial Retail Working Capital Infusion - Forty V Equity', reference: 'UTR-HDFC-991244', status: 'APPROVED', created_at: new Date(Date.now() - 30 * 86400000).toISOString() }
      ]
    });
  }

  // 14. Bank & GST
  if (path.includes('/bank-gst/accounts') || path.includes('/bank/accounts')) {
    return res.status(200).json({
      data: [
        { id: 'ba-1', name: 'HDFC Bank Corporate Current A/c', account_number: '50200088991122', bank_name: 'HDFC Bank', ifsc: 'HDFC0001234', branch: 'Avinashi Road, Coimbatore', opening_balance: 250000.00, current_balance: 482500.00, is_active: true }
      ]
    });
  }

  if (path.includes('/bank-gst/gst-summary') || path.includes('/bank/gst-summary')) {
    return res.status(200).json({
      data: [
        { month: '2026-11-01T00:00:00.000Z', output_taxable: 68596.00, output_tax: 8231.52, input_taxable: 373000.00, input_tax: 44760.00 }
      ]
    });
  }

  return res.status(200).json({ data: [], meta: { status: 'ok' } });
}
