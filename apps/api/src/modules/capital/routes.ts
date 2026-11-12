import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { getPGlite } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const capitalRoutes = Router();
capitalRoutes.use(requireAuth);

capitalRoutes.get('/', requirePermission('capital.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const resEntries = await pglite.query(`SELECT * FROM capital_entries ORDER BY created_at DESC`);
    res.json({ data: resEntries.rows });
  } catch (err) { next(err); }
});

capitalRoutes.post('/', requirePermission('capital.create'), async (req, res, next) => {
  try {
    const { storeId, type, amount, description, reference } = req.body;
    if (!type || !amount) throw new AppError('type and amount are required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    const resolvedStore = storeId || (await pglite.query(`SELECT id FROM stores LIMIT 1`)).rows[0] as any;
    const stId = typeof resolvedStore === 'string' ? resolvedStore : resolvedStore?.id;
    const id = randomUUID();
    await pglite.query(
      `INSERT INTO capital_entries (id, store_id, type, amount, description, reference, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, stId, type, Number(amount), description || null, reference || null]
    );
    res.status(201).json({ data: { id, storeId: stId, type, amount: Number(amount), description, reference, status: 'PENDING' } });
  } catch (err) { next(err); }
});

capitalRoutes.post('/:id/approve', requirePermission('capital.approve'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const entryRes = await pglite.query(`SELECT * FROM capital_entries WHERE id=$1`, [req.params.id]);
    const entry = entryRes.rows[0] as any;
    if (!entry) throw new AppError('Capital entry not found', 404, 'NOT_FOUND');
    if (entry.status === 'APPROVED') throw new AppError('Already approved', 400, 'ALREADY_APPROVED');
    
    const isCapIn = entry.type === 'CAPITAL_IN' || entry.type === 'CONTRIBUTION';
    const drCode = isCapIn ? '1000' : '3100'; // Cash or Drawings
    const crCode = isCapIn ? '3000' : '1000'; // Capital or Cash
    const [drAcc, crAcc] = await Promise.all([
      pglite.query(`SELECT id FROM accounts WHERE code=$1`, [drCode]),
      pglite.query(`SELECT id FROM accounts WHERE code=$1`, [crCode]),
    ]);
    if (drAcc.rows.length && crAcc.rows.length) {
      const jeId = randomUUID();
      const amt = Number(entry.amount);
      await pglite.query(
        `INSERT INTO journal_entries (id,store_id,reference,type,status,total_debit,total_credit,notes,posted_by,posted_at,created_by,created_at,updated_at) VALUES ($1,$2,$3,'CAPITAL','POSTED',$4,$4,$5,$6,CURRENT_TIMESTAMP,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [jeId, entry.store_id, `CAP-${entry.id.slice(0,8)}`, amt, entry.description || `Capital entry: ${entry.type}`, req.user!.id]
      );
      await pglite.query(`INSERT INTO journal_lines (id,entry_id,account_id,type,amount,description) VALUES ($1,$2,$3,'DEBIT',$4,$5)`, [randomUUID(), jeId, (drAcc.rows[0] as any).id, amt, `${entry.type} Debit`]);
      await pglite.query(`INSERT INTO journal_lines (id,entry_id,account_id,type,amount,description) VALUES ($1,$2,$3,'CREDIT',$4,$5)`, [randomUUID(), jeId, (crAcc.rows[0] as any).id, amt, `${entry.type} Credit`]);
    }
    await pglite.query(`UPDATE capital_entries SET status='APPROVED', approved_by=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [req.user!.id, req.params.id]);
    res.json({ data: { ...entry, status: 'APPROVED', approved_by: req.user!.id } });
  } catch (err) { next(err); }
});

capitalRoutes.get('/withdrawals', requirePermission('capital.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const resWithdrawals = await pglite.query(`SELECT * FROM withdrawals ORDER BY created_at DESC`);
    res.json({ data: resWithdrawals.rows });
  } catch (err) { next(err); }
});

capitalRoutes.post('/withdrawals', requirePermission('capital.create'), async (req, res, next) => {
  try {
    const { storeId, amount, description, reference, drawnBy } = req.body;
    if (!amount) throw new AppError('amount is required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    const resolvedStore = storeId || (await pglite.query(`SELECT id FROM stores LIMIT 1`)).rows[0] as any;
    const stId = typeof resolvedStore === 'string' ? resolvedStore : resolvedStore?.id;
    const id = randomUUID();
    await pglite.query(
      `INSERT INTO withdrawals (id, store_id, amount, description, drawn_by, reference, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, stId, Number(amount), description || null, drawnBy || null, reference || null]
    );
    res.status(201).json({ data: { id, storeId: stId, amount: Number(amount), description, status: 'PENDING' } });
  } catch (err) { next(err); }
});

