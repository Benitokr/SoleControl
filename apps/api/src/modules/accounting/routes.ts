import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { getPGlite } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const accountingRoutes = Router();
accountingRoutes.use(requireAuth);

// GET /accounts
accountingRoutes.get('/accounts', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
    res.json({ data: accounts });
  } catch (err) { next(err); }
});

// POST /accounts
accountingRoutes.post('/accounts', requirePermission('accounting.create'), async (req, res, next) => {
  try {
    const { code, name, type, parentId } = req.body;
    if (!code || !name || !type) throw new AppError('code, name, type are required', 400, 'VALIDATION_ERROR');
    const account = await prisma.account.create({ data: { id: randomUUID(), code, name, type, parentId } });
    res.status(201).json({ data: account });
  } catch (err) { next(err); }
});

// GET /ledger/:accountId
accountingRoutes.get('/ledger/:accountId', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT jl.*, je.reference, je.posted_at FROM journal_lines jl JOIN journal_entries je ON jl.entry_id=je.id WHERE jl.account_id=$1 AND je.status='POSTED' ORDER BY je.posted_at DESC LIMIT 100`,
      [req.params.accountId]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// GET /trial-balance
accountingRoutes.get('/trial-balance', requirePermission('accounting.view'), async (req, res, next) => {
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

// GET /pl
accountingRoutes.get('/pl', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT a.code, a.name, a.type, COALESCE(SUM(CASE WHEN jl.type='CREDIT' THEN jl.amount ELSE -jl.amount END),0) as net_amount FROM accounts a LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON jl.entry_id=je.id AND je.status='POSTED' WHERE a.type IN ('REVENUE','INCOME','EXPENSE','COGS') GROUP BY a.id,a.code,a.name,a.type ORDER BY a.type, a.code`
    );
    const rows = r.rows as any[];
    const revenue = rows.filter(x => ['REVENUE','INCOME'].includes(x.type));
    const expenses = rows.filter(x => ['EXPENSE','COGS'].includes(x.type));
    const totalRevenue = revenue.reduce((s, x) => s + parseFloat(x.net_amount || '0'), 0);
    const totalExpenses = expenses.reduce((s, x) => s + Math.abs(parseFloat(x.net_amount || '0')), 0);
    res.json({ data: { revenue, expenses, totalRevenue, totalExpenses, grossProfit: totalRevenue - totalExpenses, netProfit: totalRevenue - totalExpenses } });
  } catch (err) { next(err); }
});

// GET /balance-sheet
accountingRoutes.get('/balance-sheet', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT a.code, a.name, a.type, COALESCE(SUM(CASE WHEN jl.type='DEBIT' THEN jl.amount ELSE -jl.amount END),0) as balance FROM accounts a LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON jl.entry_id=je.id AND je.status='POSTED' WHERE a.type IN ('ASSET','LIABILITY','EQUITY','CAPITAL') GROUP BY a.id,a.code,a.name,a.type ORDER BY a.type, a.code`
    );
    const rows = r.rows as any[];
    const assets = rows.filter(x => x.type === 'ASSET');
    const liabilities = rows.filter(x => x.type === 'LIABILITY');
    const equity = rows.filter(x => ['EQUITY','CAPITAL'].includes(x.type));
    const totalAssets = assets.reduce((s, x) => s + parseFloat(x.balance || '0'), 0);
    const totalLiabilities = liabilities.reduce((s, x) => s + parseFloat(x.balance || '0'), 0);
    const totalEquity = equity.reduce((s, x) => s + parseFloat(x.balance || '0'), 0);
    res.json({ data: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity } });
  } catch (err) { next(err); }
});

// POST /journals
accountingRoutes.post('/journals', requirePermission('accounting.create'), async (req, res, next) => {
  try {
    const { reference, type, notes, storeId, lines } = req.body;
    if (!reference || !lines?.length) throw new AppError('reference and lines are required', 400, 'VALIDATION_ERROR');
    const totalDebit = lines.filter((l: any) => l.type === 'DEBIT').reduce((s: number, l: any) => s + Number(l.amount), 0);
    const totalCredit = lines.filter((l: any) => l.type === 'CREDIT').reduce((s: number, l: any) => s + Number(l.amount), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) throw new AppError(`Journal does not balance: DR ${totalDebit} CR ${totalCredit}`, 400, 'UNBALANCED_JOURNAL');
    const pglite = getPGlite();
    const entryId = randomUUID();
    const resolvedStore = storeId || (await pglite.query(`SELECT id FROM stores LIMIT 1`)).rows[0] as any;
    const stId = typeof resolvedStore === 'string' ? resolvedStore : resolvedStore?.id;
    await pglite.query(
      `INSERT INTO journal_entries (id,store_id,reference,type,status,total_debit,total_credit,notes,created_by,created_at,updated_at) VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [entryId, stId, reference, type || 'MANUAL', totalDebit, totalCredit, notes || '', req.user!.id]
    );
    for (const line of lines as any[]) {
      await pglite.query(
        `INSERT INTO journal_lines (id,entry_id,account_id,type,amount,description) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), entryId, line.accountId, line.type, Number(line.amount), line.description || '']
      );
    }
    res.status(201).json({ data: { id: entryId, status: 'DRAFT', reference, totalDebit, totalCredit } });
  } catch (err) { next(err); }
});

// GET /journals
accountingRoutes.get('/journals', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const { status } = req.query as any;
    const where = status ? `WHERE je.status=$1` : '';
    const params = status ? [status] : [];
    const r = await pglite.query(`SELECT je.* FROM journal_entries je ${where} ORDER BY je.created_at DESC LIMIT 100`, params);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// GET /journals/:id
accountingRoutes.get('/journals/:id', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const [entry, lines] = await Promise.all([
      pglite.query(`SELECT * FROM journal_entries WHERE id=$1`, [req.params.id]),
      pglite.query(`SELECT jl.*, a.name as account_name, a.code as account_code FROM journal_lines jl JOIN accounts a ON jl.account_id=a.id WHERE jl.entry_id=$1`, [req.params.id]),
    ]);
    if (!entry.rows.length) throw new AppError('Journal entry not found', 404, 'NOT_FOUND');
    res.json({ data: { ...(entry.rows[0] as any), lines: lines.rows } });
  } catch (err) { next(err); }
});

// POST /journals/:id/approve
accountingRoutes.post('/journals/:id/approve', requirePermission('accounting.approve'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(`SELECT status FROM journal_entries WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) throw new AppError('Journal not found', 404, 'NOT_FOUND');
    if ((r.rows[0] as any).status === 'POSTED') throw new AppError('Journal already posted', 400, 'ALREADY_POSTED');
    await pglite.query(
      `UPDATE journal_entries SET status='POSTED', posted_by=$1, posted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
      [req.user!.id, req.params.id]
    );
    res.json({ data: { status: 'POSTED' } });
  } catch (err) { next(err); }
});

// POST /journals/:id/reverse
accountingRoutes.post('/journals/:id/reverse', requirePermission('accounting.approve'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const [entryRes, linesRes] = await Promise.all([
      pglite.query(`SELECT * FROM journal_entries WHERE id=$1`, [req.params.id]),
      pglite.query(`SELECT * FROM journal_lines WHERE entry_id=$1`, [req.params.id]),
    ]);
    if (!entryRes.rows.length) throw new AppError('Journal not found', 404, 'NOT_FOUND');
    const original = entryRes.rows[0] as any;
    if (original.status !== 'POSTED') throw new AppError('Only POSTED journals can be reversed', 400, 'INVALID_STATE');
    const revId = randomUUID();
    await pglite.query(
      `INSERT INTO journal_entries (id,store_id,reference,type,status,total_debit,total_credit,notes,posted_by,posted_at,created_by,created_at,updated_at) VALUES ($1,$2,$3,$4,'POSTED',$5,$6,$7,$8,CURRENT_TIMESTAMP,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [revId, original.store_id, `REV-${original.reference}`, original.type, original.total_debit, original.total_credit, `Reversal of ${original.id}`, req.user!.id, req.user!.id]
    );
    for (const line of linesRes.rows as any[]) {
      await pglite.query(
        `INSERT INTO journal_lines (id,entry_id,account_id,type,amount,description) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), revId, line.account_id, line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT', line.amount, `Reversal: ${line.description || ''}`]
      );
    }
    res.json({ data: { reversalId: revId, originalId: req.params.id } });
  } catch (err) { next(err); }
});

// GET /cashbook
accountingRoutes.get('/cashbook', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT je.posted_at, je.reference, jl.type, jl.amount, jl.description FROM journal_lines jl JOIN journal_entries je ON jl.entry_id=je.id JOIN accounts a ON jl.account_id=a.id WHERE a.code='1000' AND je.status='POSTED' ORDER BY je.posted_at DESC LIMIT 200`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// GET /payment-register
accountingRoutes.get('/payment-register', requirePermission('accounting.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(
      `SELECT pr.*, v.name as vendor_name FROM payment_receipts pr LEFT JOIN vendors v ON pr.party_id=v.id WHERE pr.party_type='VENDOR' ORDER BY pr.created_at DESC LIMIT 200`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

