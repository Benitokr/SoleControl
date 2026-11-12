import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { getPGlite } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const bankRoutes = Router();
bankRoutes.use(requireAuth);

bankRoutes.get('/accounts', requirePermission('bank_gst.view'), async (req, res, next) => {
  try {
    const list = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: list });
  } catch (err) { next(err); }
});

bankRoutes.post('/accounts', requirePermission('bank_gst.create'), async (req, res, next) => {
  try {
    const { name, accountNumber, ifsc, bankName, storeId } = req.body;
    if (!name || !accountNumber) throw new AppError('name and accountNumber are required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    const resolvedStore = storeId || (await pglite.query(`SELECT id FROM stores LIMIT 1`)).rows[0] as any;
    const stId = typeof resolvedStore === 'string' ? resolvedStore : resolvedStore?.id;
    const acc = await prisma.bankAccount.create({
      data: { id: randomUUID(), name, accountNumber, ifsc, bankName, storeId: stId }
    });
    res.status(201).json({ data: acc });
  } catch (err) { next(err); }
});

bankRoutes.get('/accounts/:id/statement', requirePermission('bank_gst.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT * FROM bank_statement_lines WHERE bank_account_id=$1 ORDER BY transaction_date DESC LIMIT 200`,
      [req.params.id]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

bankRoutes.post('/reconcile', requirePermission('bank_gst.create'), async (req, res, next) => {
  try {
    const { statementLineId, journalLineId } = req.body;
    if (!statementLineId) throw new AppError('statementLineId is required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    await pglite.query(
      `UPDATE bank_statement_lines SET is_reconciled=true, reconciled_journal_line_id=$1 WHERE id=$2`,
      [journalLineId || null, statementLineId]
    );
    res.json({ data: { reconciled: true } });
  } catch (err) { next(err); }
});

bankRoutes.post('/unreconcile', requirePermission('bank_gst.create'), async (req, res, next) => {
  try {
    const { statementLineId } = req.body;
    if (!statementLineId) throw new AppError('statementLineId is required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    await pglite.query(
      `UPDATE bank_statement_lines SET is_reconciled=false, reconciled_journal_line_id=NULL WHERE id=$1`,
      [statementLineId]
    );
    res.json({ data: { reconciled: false } });
  } catch (err) { next(err); }
});

bankRoutes.get('/gst-register', requirePermission('bank_gst.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT gt.*, p.document_number as purchase_doc, s.document_number as sale_doc
       FROM gst_transactions gt
       LEFT JOIN purchases p ON gt.reference_id=p.id AND gt.reference_type='PURCHASE'
       LEFT JOIN sales s ON gt.reference_id=s.id AND gt.reference_type='SALE'
       WHERE gt.purchase_class != 'CLASS_B' AND gt.purchase_class != 'B' OR gt.purchase_class IS NULL
       ORDER BY gt.transaction_date DESC LIMIT 500`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

bankRoutes.get('/gst-summary', requirePermission('bank_gst.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT DATE_TRUNC('month', transaction_date) as month,
              SUM(CASE WHEN type='OUTPUT' THEN taxable_value ELSE 0 END) as output_taxable,
              SUM(CASE WHEN type='OUTPUT' THEN (cgst + sgst + igst) ELSE 0 END) as output_tax,
              SUM(CASE WHEN type='INPUT' THEN taxable_value ELSE 0 END) as input_taxable,
              SUM(CASE WHEN type='INPUT' THEN (cgst + sgst + igst) ELSE 0 END) as input_tax
       FROM gst_transactions
       WHERE purchase_class!='CLASS_B' AND purchase_class!='B' OR purchase_class IS NULL
       GROUP BY DATE_TRUNC('month', transaction_date)
       ORDER BY month DESC`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

