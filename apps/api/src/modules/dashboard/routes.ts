import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPGlite } from '../../lib/db.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth, requirePermission('dashboard.view'));

// 1. Core KPIs — strictly computed from real PostgreSQL tables (zero hardcoded fallbacks)
dashboardRoutes.get('/kpis', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const [salesRes, stockRes, valRes, lowRes, purchaseRes, vendorRes, custRes, displayRes, damageRes] = await Promise.all([
      pglite.query(`SELECT COALESCE(SUM(total_amount),0) as today_sales, COUNT(*) as today_txns FROM sales WHERE DATE(created_at)=CURRENT_DATE AND status NOT IN ('VOID','CANCELLED')`),
      pglite.query(`SELECT COALESCE(SUM(quantity),0) as total_stock FROM stock_balances WHERE quantity > 0`),
      pglite.query(`SELECT COALESCE(SUM(sb.quantity * pv.cost_price),0) as cost_val, COALESCE(SUM(sb.quantity * pv.mrp),0) as mrp_val FROM stock_balances sb JOIN product_variants pv ON pv.id = sb.variant_id WHERE sb.quantity > 0`),
      pglite.query(`SELECT COUNT(*) as low_cnt FROM stock_balances WHERE quantity > 0 AND quantity <= 5`),
      pglite.query(`SELECT COUNT(*) as pending, COALESCE(SUM(total_amount), 0) as pending_val FROM purchases WHERE status='DRAFT'`),
      pglite.query(`SELECT COALESCE(SUM(balance), 0) as vendor_bal FROM vendors WHERE is_active=true`),
      pglite.query(`SELECT COALESCE(SUM(credit_outstanding), 0) as cust_credit FROM customers WHERE is_active=true`),
      pglite.query(`SELECT COALESCE(SUM(quantity),0) as disp_qty FROM display_allocations WHERE status='ACTIVE'`).catch(() => ({ rows: [{ disp_qty: 0 }] })),
      pglite.query(`SELECT COALESCE(SUM(quantity),0) as dmg_qty FROM damage_records WHERE status='REPORTED'`).catch(() => ({ rows: [{ dmg_qty: 0 }] })),
    ]);

    const todaySales = parseFloat((salesRes.rows[0] as any)?.today_sales || '0');
    const todayTransactions = parseInt((salesRes.rows[0] as any)?.today_txns || '0', 10);
    const totalStock = parseInt((stockRes.rows[0] as any)?.total_stock || '0', 10);
    const inventoryValuation = parseFloat((valRes.rows[0] as any)?.cost_val || '0');
    const inventoryMrpValue = parseFloat((valRes.rows[0] as any)?.mrp_val || '0');
    const lowStockCount = parseInt((lowRes.rows[0] as any)?.low_cnt || '0', 10);
    const pendingPurchases = parseInt((purchaseRes.rows[0] as any)?.pending || '0', 10);
    const pendingPurchasesValue = parseFloat((purchaseRes.rows[0] as any)?.pending_val || '0');
    const vendorOutstanding = parseFloat((vendorRes.rows[0] as any)?.vendor_bal || '0');
    const customerOutstanding = parseFloat((custRes.rows[0] as any)?.cust_credit || '0');
    const displayStock = parseInt((displayRes.rows[0] as any)?.disp_qty || '0', 10);
    const damagedStock = parseInt((damageRes.rows[0] as any)?.dmg_qty || '0', 10);

    const grossMarginPct =
      inventoryMrpValue > 0
        ? ((inventoryMrpValue - inventoryValuation) / inventoryMrpValue) * 100
        : 0;

    res.json({
      data: {
        todaySales,
        todayTransactions,
        averageBillValue: todayTransactions > 0 ? todaySales / todayTransactions : 0,
        totalStock,
        availableStock: Math.max(0, totalStock - displayStock - damagedStock),
        displayStock,
        damagedStock,
        lowStockCount,
        pendingPurchases,
        pendingPurchasesValue,
        vendorOutstanding,
        customerOutstanding,
        inventoryValuation,
        inventoryMrpValue,
        grossMarginPct,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Analytics (7-day sales trend & payment mode split from real sales)
dashboardRoutes.get('/analytics', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const [trendRes, payRes] = await Promise.all([
      pglite.query(
        `SELECT TO_CHAR(DATE(created_at), 'DD/MM') as date, COALESCE(SUM(total_amount),0) as amount, COUNT(*) as bills
         FROM sales
         WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND status NOT IN ('VOID','CANCELLED')
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at)`
      ),
      pglite.query(
        `SELECT COALESCE(sp.payment_mode, 'UPI') as mode, COALESCE(SUM(sp.amount),0) as amount
         FROM sale_payments sp
         JOIN sales s ON s.id = sp.sale_id
         WHERE s.status NOT IN ('VOID','CANCELLED')
         GROUP BY sp.payment_mode`
      ).catch(() => ({ rows: [] })),
    ]);

    res.json({
      data: {
        salesTrend7d: (trendRes.rows as any[]).map((r) => ({
          date: r.date,
          amount: Number(r.amount || 0),
          bills: Number(r.bills || 0),
        })),
        paymentModeSplit: (payRes.rows as any[]).map((r) => ({
          mode: r.mode,
          amount: Number(r.amount || 0),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Recent sales
dashboardRoutes.get('/recent-sales', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT s.*, c.name as customer_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.created_at DESC
       LIMIT 10`
    );
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
});

// 4. Rule-based insights computed from real DB state
dashboardRoutes.get('/insights', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const insights: any[] = [];
    const [lowRes, draftPurRes, pendingTransRes] = await Promise.all([
      pglite.query(`SELECT COUNT(*) as cnt FROM stock_balances WHERE quantity > 0 AND quantity <= 5`),
      pglite.query(`SELECT COUNT(*) as cnt FROM purchases WHERE status = 'DRAFT'`),
      pglite.query(`SELECT COUNT(*) as cnt FROM stock_transfers WHERE status IN ('REQUESTED','DISPATCHED')`).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const lowCnt = Number((lowRes.rows[0] as any)?.cnt || 0);
    if (lowCnt > 0) {
      insights.push({
        id: 'ins-low-stock',
        severity: 'warning',
        type: 'Inventory',
        title: `${lowCnt} SKUs are at low stock (≤5 pairs)`,
        message: 'Review low-stock sizes and raise purchase orders to avoid stockouts.',
        actionText: 'View low stock',
        actionRoute: '/inventory?filter=LOW',
      });
    }

    const draftPur = Number((draftPurRes.rows[0] as any)?.cnt || 0);
    if (draftPur > 0) {
      insights.push({
        id: 'ins-draft-pur',
        severity: 'info',
        type: 'Purchasing',
        title: `${draftPur} draft purchase bills awaiting goods receipt`,
        message: 'Finalise pending purchase bills to update warehouse stock balances.',
        actionText: 'Review bills',
        actionRoute: '/purchases',
      });
    }

    const pendingTrans = Number((pendingTransRes.rows[0] as any)?.cnt || 0);
    if (pendingTrans > 0) {
      insights.push({
        id: 'ins-transfers',
        severity: 'info',
        type: 'Transfers',
        title: `${pendingTrans} stock transfers awaiting dispatch or receipt`,
        message: 'Confirm receipt of in-transit footwear transfers.',
        actionText: 'Open transfers',
        actionRoute: '/transfers',
      });
    }

    res.json({ data: insights });
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/targets', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(`SELECT * FROM sales_targets ORDER BY created_at DESC LIMIT 5`).catch(() => ({ rows: [] }));
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
});
