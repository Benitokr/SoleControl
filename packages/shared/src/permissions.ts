export const MODULES = [
  'dashboard',
  'company',
  'masters',
  'locations',
  'barcodes',
  'integrations',
  'users',
  'roles',
  'purchases',
  'vendors',
  'inventory',
  'display_stock',
  'stock_transfers',
  'ageing',
  'damaged_goods',
  'sales',
  'customers',
  'offers',
  'accounting',
  'capital',
  'bank_gst',
  'reports',
  'audit'
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export'
] as const;

export type ActionKey = (typeof ACTIONS)[number];

export type PermissionKey = `${ModuleKey}.${ActionKey}`;

/**
 * Generate all valid permissions in the system.
 */
export function getAllPermissionKeys(): PermissionKey[] {
  const keys: PermissionKey[] = [];
  for (const m of MODULES) {
    for (const a of ACTIONS) {
      keys.push(`${m}.${a}` as PermissionKey);
    }
  }
  return keys;
}

export const MODULE_METADATA: Record<ModuleKey, { label: string; group: string; description: string }> = {
  dashboard: { label: 'Dashboard', group: 'Overview', description: 'Real-time metrics, KPI strip, today at a glance' },
  company: { label: 'Company Configuration', group: 'Setup', description: 'Store profiles, tax rules, document series' },
  masters: { label: 'Master Data', group: 'Setup', description: 'Brands, categories, products, articles, sizes, colours' },
  locations: { label: 'Rack & Location', group: 'Setup', description: 'Floor, department, rack, shelf, position layout' },
  barcodes: { label: 'Barcode Management', group: 'Setup', description: 'Barcode generation, label design, print queue' },
  integrations: { label: 'Integrations', group: 'Setup', description: 'WhatsApp, bank statement, GSTN, receipt printers' },
  users: { label: 'Users', group: 'Access', description: 'User accounts, credential reset, store assignments' },
  roles: { label: 'Roles & Permissions', group: 'Access', description: 'Role definitions, granular matrix access' },
  purchases: { label: 'Purchases', group: 'Purchasing & Stock', description: 'Vendor invoices, bill scanning, landed cost allocation' },
  vendors: { label: 'Vendors', group: 'Purchasing & Stock', description: 'Supplier ledgers, credit terms, payables' },
  inventory: { label: 'Inventory', group: 'Purchasing & Stock', description: 'Stock balances, movements, physical audits' },
  display_stock: { label: 'Display Stock', group: 'Purchasing & Stock', description: 'Floor samples, display-to-stock reconciliation' },
  stock_transfers: { label: 'Stock Transfers', group: 'Purchasing & Stock', description: 'Inter-rack, inter-shelf, and inter-store movements' },
  ageing: { label: 'Ageing & Clearance', group: 'Purchasing & Stock', description: 'Category ageing buckets, clearance discount cascades' },
  damaged_goods: { label: 'Damaged Goods', group: 'Purchasing & Stock', description: 'Defect intake, repair workflow, write-offs' },
  sales: { label: 'Sales & POS', group: 'Sales & Customers', description: 'POS billing, split payments, invoices, returns' },
  customers: { label: 'Customers & CRM', group: 'Sales & Customers', description: 'Customer profiles, loyalty, purchase history' },
  offers: { label: 'Offers & Discounts', group: 'Sales & Customers', description: 'Promotion engine, bundle rules, campaign simulations' },
  accounting: { label: 'Accounting & Finance', group: 'Finance', description: 'Double-entry journal, chart of accounts, P&L' },
  capital: { label: 'Capital & Withdrawals', group: 'Finance', description: 'Partner capital injection and drawings tracking' },
  bank_gst: { label: 'Bank & GST', group: 'Finance', description: 'Bank reconciliation, GSTR-1, GSTR-3B filings' },
  reports: { label: 'Reports & Analytics', group: 'Insight & Control', description: 'Custom data exports, financial and stock insights' },
  audit: { label: 'Notifications & Audit', group: 'Insight & Control', description: 'Append-only audit trail, system event alerts' }
};

