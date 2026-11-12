import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPGlite } from '../../lib/db.js';

export const reportsRoutes = Router();
reportsRoutes.use(requireAuth);

reportsRoutes.get('/sales', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const { startDate, endDate, status } = req.query as Record<string, string>;
    let where = "WHERE s.status != 'VOID'";
    const params: unknown[] = [];
    let idx = 1;
    if (startDate) { where += ` AND s.created_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND s.created_at <= $${idx++}`; params.push(endDate); }
    if (status) { where += ` AND s.status = $${idx++}`; params.push(status); }
    const r = await pglite.query(
      `SELECT s.document_number as doc_number, c.name as customer, s.created_at as sale_date, s.total_amount, s.paid_amount, s.status, s.payment_mode FROM sales s LEFT JOIN customers c ON s.customer_id=c.id ${where} ORDER BY s.created_at DESC LIMIT 500`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

reportsRoutes.get('/purchases', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const { startDate, endDate, purchaseClass } = req.query as Record<string, string>;
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (startDate) { where += ` AND p.bill_date >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND p.bill_date <= $${idx++}`; params.push(endDate); }
    if (purchaseClass) { where += ` AND p.class = $${idx++}`; params.push(purchaseClass); }
    const r = await pglite.query(
      `SELECT p.document_number as doc_number, p.bill_number, v.name as vendor, p.bill_date, p.total_amount, p.class as purchase_class, p.status FROM purchases p LEFT JOIN vendors v ON p.vendor_id=v.id ${where} ORDER BY p.bill_date DESC LIMIT 500`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

reportsRoutes.get('/inventory', requirePermission('reports.view'), async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT pv.sku, pv.barcode, a.name as article, sz.name as size, cl.name as colour, pv.mrp, pv.cost_price as cost, COALESCE(SUM(sb.quantity),0) as qty FROM product_variants pv JOIN articles a ON pv.article_id=a.id JOIN sizes sz ON pv.size_id=sz.id JOIN colours cl ON pv.colour_id=cl.id LEFT JOIN stock_balances sb ON sb.variant_id=pv.id GROUP BY pv.id, pv.sku, pv.barcode, a.name, sz.name, cl.name, pv.mrp, pv.cost_price ORDER BY a.name, sz.name LIMIT 500`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

reportsRoutes.get('/ageing', requirePermission('reports.view'), async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT pv.sku, a.name as article, cat.name as category, COALESCE(SUM(sb.quantity),0) as qty, MIN(sm.created_at) as first_movement FROM product_variants pv JOIN articles a ON pv.article_id=a.id JOIN products pr ON a.product_id=pr.id JOIN categories cat ON pr.category_id=cat.id LEFT JOIN stock_balances sb ON sb.variant_id=pv.id LEFT JOIN stock_movements sm ON sm.variant_id=pv.id AND sm.type='PURCHASE_IN' GROUP BY pv.id, pv.sku, a.name, cat.name HAVING COALESCE(SUM(sb.quantity),0) > 0 ORDER BY first_movement ASC NULLS LAST LIMIT 500`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

reportsRoutes.get('/gst', requirePermission('reports.view'), async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT gt.*, p.doc_number as purchase_doc, s.doc_number as sale_doc FROM gst_transactions gt LEFT JOIN purchases p ON gt.reference_id=p.id AND gt.reference_type='PURCHASE' LEFT JOIN sales s ON gt.reference_id=s.id AND gt.reference_type='SALE' WHERE gt.purchase_class != 'B' OR gt.purchase_class IS NULL ORDER BY gt.transaction_date DESC LIMIT 500`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

reportsRoutes.get('/trial-balance', requirePermission('reports.view'), async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT a.code, a.name, a.type, COALESCE(SUM(CASE WHEN jl.type='DEBIT' THEN jl.amount ELSE 0 END),0) as debit, COALESCE(SUM(CASE WHEN jl.type='CREDIT' THEN jl.amount ELSE 0 END),0) as credit FROM accounts a LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON jl.entry_id=je.id AND je.status='POSTED' GROUP BY a.id,a.code,a.name,a.type ORDER BY a.code`
    );
    const rows = r.rows as any[];
    const totalDebit = rows.reduce((s, x) => s + parseFloat(x.debit || '0'), 0);
    const totalCredit = rows.reduce((s, x) => s + parseFloat(x.credit || '0'), 0);
    res.json({ data: rows, meta: { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 } });
  } catch (err) { next(err); }
});
