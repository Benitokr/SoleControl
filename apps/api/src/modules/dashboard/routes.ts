import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getPGlite } from '../../lib/db.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/kpis', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const [salesRes, stockRes, purchaseRes] = await Promise.all([
      pglite.query(`SELECT COALESCE(SUM(total_amount),0) as today_sales, COUNT(*) as today_txns FROM sales WHERE DATE(created_at)=CURRENT_DATE AND status!='VOID'`),
      pglite.query(`SELECT COALESCE(SUM(quantity),0) as total_stock FROM stock_balances WHERE quantity > 0`),
      pglite.query(`SELECT COUNT(*) as pending FROM purchases WHERE status='DRAFT'`),
    ]);
    res.json({
      data: {
        todaySales: parseFloat((salesRes.rows[0] as any)?.today_sales || '0'),
        todayTransactions: parseInt((salesRes.rows[0] as any)?.today_txns || '0'),
        totalStock: parseInt((stockRes.rows[0] as any)?.total_stock || '0'),
        pendingPurchases: parseInt((purchaseRes.rows[0] as any)?.pending || '0'),
      }
    });
  } catch (err) { next(err); }
});

dashboardRoutes.get('/insights', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const insights: any[] = [];
    const [ageRes, pRes] = await Promise.all([
      pglite.query(`SELECT COUNT(*) as cnt FROM clearance_recommendations WHERE status='PENDING'`),
      pglite.query(`SELECT COUNT(*) as cnt FROM purchases WHERE status='DRAFT'`),
    ]);
    const ageCnt = parseInt((ageRes.rows[0] as any)?.cnt || '0');
    if (ageCnt > 0) {
      insights.push({ type: 'ageing', message: `${ageCnt} clearance recommendations pending review`, severity: 'warning' });
    }
    const pCnt = parseInt((pRes.rows[0] as any)?.cnt || '0');
    if (pCnt > 0) {
      insights.push({ type: 'purchase', message: `${pCnt} draft purchases awaiting finalisation`, severity: 'info' });
    }
    res.json({ data: insights });
  } catch (err) { next(err); }
});

dashboardRoutes.get('/recent-sales', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT s.document_number as doc_number, c.name as customer_name, s.total_amount, s.created_at as sale_date FROM sales s LEFT JOIN customers c ON s.customer_id=c.id WHERE s.status!='VOID' ORDER BY s.created_at DESC LIMIT 5`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

dashboardRoutes.get('/targets', async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT st.*, COALESCE(SUM(s.total_amount),0) as achieved FROM sales_targets st LEFT JOIN sales s ON DATE(s.created_at) BETWEEN st.period_start AND st.period_end AND s.status!='VOID' GROUP BY st.id, st.store_id, st.name, st.period_start, st.period_end, st.target_amount, st.created_at, st.updated_at ORDER BY st.period_start DESC LIMIT 5`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
