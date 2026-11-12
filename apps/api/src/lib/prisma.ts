import { getDbMode, getPrisma, getPGlite } from './db.js';
import { randomUUID } from 'crypto';

/**
 * Universal Database Client:
 * Dispatches to standard PrismaClient when connected to external PostgreSQL,
 * or directly to persistent PostgreSQL (PGlite) when running embedded.
 */
export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === '$disconnect') {
        return async () => {
          if (getDbMode() === 'POSTGRES') {
            await getPrisma().$disconnect();
          }
        };
      }

      return new Proxy(
        {},
        {
          get(_mTarget, method: string) {
            return async (...args: any[]) => {
              if (getDbMode() === 'POSTGRES') {
                return (getPrisma() as any)[prop][method](...args);
              }

              // Embedded PostgreSQL (PGlite) operations
              const pglite = getPGlite();
              return handlePgliteOperation(pglite, prop, method, args[0]);
            };
          }
        }
      );
    }
  }
);

// Map table names
const TABLE_MAP: Record<string, string> = {
  store: 'stores',
  user: 'users',
  role: 'roles',
  permission: 'permissions',
  rolePermission: 'role_permissions',
  userLocation: 'user_locations',
  userSession: 'user_sessions',
  loginEvent: 'login_events',
  companyProfile: 'company_profile',
  setting: 'settings',
  financialYear: 'financial_years',
  documentSeries: 'document_series',
  auditLog: 'audit_logs',
  notification: 'notifications',
  alertRule: 'alert_rules',
  integrationSetting: 'integration_settings',
  integrationLog: 'integration_logs',
  brand: 'brands',
  category: 'categories',
  size: 'sizes',
  colour: 'colours',
  article: 'articles',
  productVariant: 'product_variants',
  location: 'locations',
  taxRate: 'tax_rates',
  paymentMode: 'payment_modes',
  // Phase 3
  vendor: 'vendors',
  purchase: 'purchases',
  purchaseItem: 'purchase_items',
  stockBalance: 'stock_balances',
  stockMovement: 'stock_movements',
  barcodeLabel: 'barcode_labels',
  labelTemplate: 'label_templates',
  account: 'accounts',
  journalEntry: 'journal_entries',
  journalLine: 'journal_lines',
  // Phase 4
  stockAdjustment: 'stock_adjustments',
  stockAdjustmentItem: 'stock_adjustment_items',
  stockAuditSession: 'stock_audit_sessions',
  stockAuditLine: 'stock_audit_lines',
  displayAllocation: 'display_allocations',
  stockTransfer: 'stock_transfers',
  stockTransferItem: 'stock_transfer_items',
  damageRecord: 'damage_records',
  damageEvent: 'damage_events',
  ageingRule: 'ageing_rules',
  clearanceRecommendation: 'clearance_recommendations',
  clearanceMovement: 'clearance_movements',
  // Phase 5
  customer: 'customers',
  customerCommunication: 'customer_communications',
  offer: 'offers',
  sale: 'sales',
  saleItem: 'sale_items',
  salePayment: 'sale_payments',
  saleReturn: 'sale_returns',
  saleReturnItem: 'sale_return_items',
  offerRedemption: 'offer_redemptions',
  // Phase 6-7
  capitalEntry: 'capital_entries',
  withdrawal: 'withdrawals',
  bankAccount: 'bank_accounts',
  bankStatementLine: 'bank_statement_lines',
  bankReconciliation: 'bank_reconciliations',
  gstTransaction: 'gst_transactions',
};

async function handlePgliteOperation(pglite: any, model: string, method: string, params: any = {}) {
  const table = TABLE_MAP[model] || model;

  switch (method) {
    case 'findUnique':
    case 'findFirst': {
      let whereClause = '1=1';
      const values: any[] = [];
      let idx = 1;

      if (params.where) {
        const conditions: string[] = [];
        for (const [key, val] of Object.entries(params.where)) {
          if (val === undefined) continue;
          if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
            for (const [subKey, subVal] of Object.entries(val)) {
              if (subVal === undefined) continue;
              const col = snakeCase(subKey);
              conditions.push(`"${col}" = $${idx++}`);
              values.push(subVal);
            }
          } else {
            const col = snakeCase(key);
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }
        if (conditions.length > 0) {
          whereClause = conditions.join(' AND ');
        }
      }

      const query = `SELECT * FROM "${table}" WHERE ${whereClause} LIMIT 1`;
      const res = await pglite.query(query, values);
      const row = res.rows[0];
      if (!row) return null;

      const mapped = camelCaseObject(row);
      await populateRelations(pglite, model, mapped, params.include);
      return mapped;
    }

    case 'findMany': {
      let whereClause = '1=1';
      const values: any[] = [];
      let idx = 1;

      if (params.where) {
        const conditions: string[] = [];
        for (const [key, val] of Object.entries(params.where)) {
          if (val === undefined) continue;
          const col = snakeCase(key);
          if (typeof val === 'object' && val !== null) {
            if ('contains' in (val as any)) {
              conditions.push(`"${col}" ILIKE $${idx++}`);
              values.push(`%${(val as any).contains}%`);
            } else if ('gte' in (val as any) || 'lte' in (val as any)) {
              if ((val as any).gte) {
                conditions.push(`"${col}" >= $${idx++}`);
                values.push((val as any).gte);
              }
              if ((val as any).lte) {
                conditions.push(`"${col}" <= $${idx++}`);
                values.push((val as any).lte);
              }
            } else if ('in' in (val as any)) {
              const inVals = (val as any).in as any[];
              if (inVals.length > 0) {
                const placeholders = inVals.map(() => `$${idx++}`).join(', ');
                conditions.push(`"${col}" IN (${placeholders})`);
                values.push(...inVals);
              } else {
                conditions.push('1=0');
              }
            }
          } else {
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }
        if (conditions.length > 0) {
          whereClause = conditions.join(' AND ');
        }
      }

      let orderByClause = '';
      if (params.orderBy) {
        const orders: string[] = [];
        for (const [key, dir] of Object.entries(params.orderBy)) {
          const col = snakeCase(key);
          orders.push(`"${col}" ${(dir as string).toUpperCase()}`);
        }
        if (orders.length > 0) {
          orderByClause = `ORDER BY ${orders.join(', ')}`;
        }
      }

      let paginationClause = '';
      if (params.take !== undefined) {
        paginationClause += ` LIMIT ${params.take}`;
      }
      if (params.skip !== undefined) {
        paginationClause += ` OFFSET ${params.skip}`;
      }

      const query = `SELECT * FROM "${table}" WHERE ${whereClause} ${orderByClause} ${paginationClause}`;
      const res = await pglite.query(query, values);
      const rows = res.rows.map(camelCaseObject);

      if (params.include) {
        for (const r of rows) {
          await populateRelations(pglite, model, r, params.include);
        }
      }

      return rows;
    }

    case 'count': {
      let whereClause = '1=1';
      const values: any[] = [];
      let idx = 1;

      if (params.where) {
        const conditions: string[] = [];
        for (const [key, val] of Object.entries(params.where)) {
          if (val === undefined) continue;
          if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
            for (const [subKey, subVal] of Object.entries(val)) {
              if (subVal === undefined) continue;
              const col = snakeCase(subKey);
              conditions.push(`"${col}" = $${idx++}`);
              values.push(subVal);
            }
          } else {
            const col = snakeCase(key);
            conditions.push(`"${col}" = $${idx++}`);
            values.push(val);
          }
        }
        if (conditions.length > 0) {
          whereClause = conditions.join(' AND ');
        }
      }

      const query = `SELECT COUNT(*) AS count FROM "${table}" WHERE ${whereClause}`;
      const res = await pglite.query(query, values);
      return Number(res.rows[0]?.count || 0);
    }

    case 'create': {
      const data = { ...params.data };
      if (!data.id && (table !== 'role_permissions' && table !== 'user_locations' && table !== 'settings')) {
        data.id = randomUUID();
      }
      if (table === 'audit_logs' && data.actorId) {
        if (!data.userId) data.userId = data.actorId;
        delete data.actorId;
      }

      const tablesWithCreatedAt = ['stores', 'users', 'roles', 'permissions', 'user_sessions', 'login_events', 'company_profile', 'audit_logs', 'notifications', 'integration_logs', 'brands', 'categories', 'articles', 'product_variants', 'locations', 'vendors', 'purchases', 'stock_movements', 'barcode_labels', 'label_templates', 'journal_entries', 'stock_adjustments', 'stock_audit_sessions', 'display_allocations', 'stock_transfers', 'damage_records', 'damage_events', 'ageing_rules', 'clearance_recommendations', 'clearance_movements', 'customers', 'customer_communications', 'offers', 'sales', 'sale_returns', 'offer_redemptions'];
      const tablesWithUpdatedAt = ['stores', 'users', 'roles', 'user_sessions', 'company_profile', 'settings', 'brands', 'categories', 'articles', 'product_variants', 'locations', 'vendors', 'purchases', 'stock_balances', 'label_templates', 'stock_adjustments', 'stock_audit_sessions', 'display_allocations', 'stock_transfers', 'damage_records', 'customers', 'offers', 'sales'];

      if (tablesWithCreatedAt.includes(table) && !data.createdAt) {
        data.createdAt = new Date();
      }
      if (tablesWithUpdatedAt.includes(table) && !data.updatedAt) {
        data.updatedAt = new Date();
      }

      const cols: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        const col = snakeCase(key);
        cols.push(`"${col}"`);
        placeholders.push(`$${idx++}`);
        if (col === 'value' || col === 'condition' || col === 'before_state' || col === 'after_state' || col === 'metadata' || col === 'payload' || col === 'response') {
          values.push(JSON.stringify(val));
        } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(val);
        }
      }

      const query = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const res = await pglite.query(query, values);
      const row = camelCaseObject(res.rows[0]);
      await populateRelations(pglite, model, row, params.include);
      return row;
    }

    case 'update': {
      const data = { ...params.data };
      const tablesWithUpdatedAt = ['stores', 'users', 'roles', 'user_sessions', 'company_profile', 'settings', 'brands', 'categories', 'articles', 'product_variants', 'locations', 'vendors', 'purchases', 'stock_balances', 'label_templates', 'stock_adjustments', 'stock_audit_sessions', 'display_allocations', 'stock_transfers', 'damage_records', 'customers', 'offers', 'sales'];
      if (tablesWithUpdatedAt.includes(table)) {
        data.updatedAt = new Date();
      }

      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        const col = snakeCase(key);
        sets.push(`"${col}" = $${idx++}`);
        if (col === 'value' || col === 'condition' || col === 'before_state' || col === 'after_state' || col === 'metadata' || col === 'payload' || col === 'response') {
          values.push(JSON.stringify(val));
        } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(val);
        }
      }

      if (sets.length === 0) {
        return handlePgliteOperation(pglite, model, 'findUnique', { where: params.where, include: params.include });
      }

      const whereConditions: string[] = [];
      for (const [key, val] of Object.entries(params.where)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
          for (const [subKey, subVal] of Object.entries(val)) {
            whereConditions.push(`"${snakeCase(subKey)}" = $${idx++}`);
            values.push(subVal);
          }
        } else {
          whereConditions.push(`"${snakeCase(key)}" = $${idx++}`);
          values.push(val);
        }
      }

      const query = `UPDATE "${table}" SET ${sets.join(', ')} WHERE ${whereConditions.join(' AND ')} RETURNING *`;
      const res = await pglite.query(query, values);
      const row = camelCaseObject(res.rows[0]);
      await populateRelations(pglite, model, row, params.include);
      return row;
    }

    case 'updateMany': {
      const data = { ...params.data };
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        const col = snakeCase(key);
        sets.push(`"${col}" = $${idx++}`);
        if (col === 'value' || col === 'condition' || col === 'before_state' || col === 'after_state' || col === 'metadata' || col === 'payload' || col === 'response') {
          values.push(JSON.stringify(val));
        } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(val);
        }
      }

      const whereConditions: string[] = [];
      for (const [key, val] of Object.entries(params.where || {})) {
        whereConditions.push(`"${snakeCase(key)}" = $${idx++}`);
        values.push(val);
      }

      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';
      const query = `UPDATE "${table}" SET ${sets.join(', ')} WHERE ${whereClause}`;
      await pglite.query(query, values);
      return { count: 1 };
    }

    case 'deleteMany': {
      const whereConditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(params.where || {})) {
        whereConditions.push(`"${snakeCase(key)}" = $${idx++}`);
        values.push(val);
      }

      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';
      const query = `DELETE FROM "${table}" WHERE ${whereClause}`;
      await pglite.query(query, values);
      return { count: 1 };
    }

    case 'upsert': {
      const existing = await handlePgliteOperation(pglite, model, 'findUnique', { where: params.where });
      if (existing) {
        return handlePgliteOperation(pglite, model, 'update', { where: params.where, data: params.update });
      } else {
        return handlePgliteOperation(pglite, model, 'create', { data: params.create });
      }
    }

    default:
      throw new Error(`Unsupported method ${method} on model ${model}`);
  }
}

async function populateRelations(pglite: any, model: string, record: any, include: any) {
  if (!record || !include) return;

  if (model === 'user') {
    if (include.role) {
      const role = await handlePgliteOperation(pglite, 'role', 'findUnique', {
        where: { id: record.roleId },
        include: include.role.include
      });
      record.role = role;
    }
    if (include.userLocations) {
      const locs = await handlePgliteOperation(pglite, 'userLocation', 'findMany', {
        where: { userId: record.id },
        include: include.userLocations.include
      });
      record.userLocations = locs;
    }
  } else if (model === 'role') {
    if (include.rolePermissions) {
      const rps = await handlePgliteOperation(pglite, 'rolePermission', 'findMany', {
        where: { roleId: record.id },
        include: include.rolePermissions.include
      });
      record.rolePermissions = rps;
    }
    if (include._count) {
      const userCount = await handlePgliteOperation(pglite, 'user', 'count', {
        where: { roleId: record.id }
      });
      record._count = { users: userCount };
    }
  } else if (model === 'rolePermission') {
    if (include.permission) {
      const perm = await handlePgliteOperation(pglite, 'permission', 'findUnique', {
        where: { id: record.permissionId }
      });
      record.permission = perm;
    }
  } else if (model === 'article') {
    if (include.brand) {
      record.brand = await handlePgliteOperation(pglite, 'brand', 'findUnique', { where: { id: record.brandId } });
    }
    if (include.category) {
      record.category = await handlePgliteOperation(pglite, 'category', 'findUnique', { where: { id: record.categoryId } });
    }
    if (include.variants) {
      record.variants = await handlePgliteOperation(pglite, 'productVariant', 'findMany', {
        where: { articleId: record.id },
        include: include.variants.include
      });
    }
    if (include._count?.variants) {
      const vCount = await handlePgliteOperation(pglite, 'productVariant', 'count', { where: { articleId: record.id } });
      record._count = { ...record._count, variants: vCount };
    }
  } else if (model === 'productVariant') {
    if (include.article) {
      record.article = await handlePgliteOperation(pglite, 'article', 'findUnique', { where: { id: record.articleId } });
    }
    if (include.size) {
      record.size = await handlePgliteOperation(pglite, 'size', 'findUnique', { where: { id: record.sizeId } });
    }
    if (include.colour) {
      record.colour = await handlePgliteOperation(pglite, 'colour', 'findUnique', { where: { id: record.colourId } });
    }
  } else if (model === 'location') {
    if (include.store) {
      record.store = await handlePgliteOperation(pglite, 'store', 'findUnique', { where: { id: record.storeId } });
    }
    if (include.children) {
      record.children = await handlePgliteOperation(pglite, 'location', 'findMany', {
        where: { parentId: record.id },
        include: include.children.include
      });
    }
  }
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function camelCaseObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(camelCaseObject);

  const newObj: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
    newObj[camelKey] = val;
  }
  return newObj;
}
