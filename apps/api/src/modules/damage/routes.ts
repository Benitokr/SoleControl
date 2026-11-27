import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { getPGlite, resolveStoreId } from '../../lib/db.js';

export const damageRoutes = Router();
damageRoutes.use(requireAuth);

damageRoutes.get('/', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const records = await prisma.damageRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: records });
  } catch (err) { next(err); }
});

damageRoutes.post('/', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { storeId, variantId, locationId, quantity, description, photoUrl } = req.body as {
      storeId?: string; variantId: string; locationId: string; quantity?: number; description?: string; photoUrl?: string;
    };
    if (!variantId || !locationId) throw new AppError('variantId and locationId are required', 400, 'VALIDATION_ERROR');

    const qty = quantity || 1;
    const resolvedStore = await resolveStoreId(storeId);

    const record = await prisma.damageRecord.create({
      data: { id: randomUUID(), storeId: resolvedStore, variantId, locationId, quantity: qty, status: 'REPORTED', description, photoUrl, createdBy: req.user!.id },
    });

    // Reduce stock
    const bal = await prisma.stockBalance.findFirst({ where: { variantId, locationId } });
    if (bal) {
      await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: Math.max(0, Number((bal as any).quantity) - qty) } });
    }
    await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: resolvedStore, variantId, locationId, type: 'DAMAGE', quantity: -qty, referenceId: record.id, referenceType: 'DAMAGE', actorId: req.user!.id } });
    await prisma.damageEvent.create({ data: { id: randomUUID(), damageId: record.id, toStatus: 'REPORTED', createdBy: req.user!.id } });

    res.status(201).json({ data: record });
  } catch (err) { next(err); }
});

async function transitionDamage(req: any, res: any, next: any, toStatus: string) {
  try {
    const { notes, repairDueDate } = req.body as { notes?: string; repairDueDate?: string };
    const record = await prisma.damageRecord.findUnique({ where: { id: req.params.id } });
    if (!record) throw new AppError('Damage record not found', 404, 'NOT_FOUND');

    const updateData: Record<string, unknown> = { status: toStatus };
    if (repairDueDate) updateData.repairDueDate = new Date(repairDueDate);

    await prisma.damageRecord.update({ where: { id: req.params.id }, data: updateData });
    await prisma.damageEvent.create({ data: { id: randomUUID(), damageId: req.params.id, fromStatus: (record as any).status, toStatus, notes, createdBy: req.user!.id } });

    res.json({ data: { status: toStatus } });
  } catch (err) { next(err); }
}

damageRoutes.post('/:id/inspect', requirePermission('inventory.edit'), (req, res, next) => transitionDamage(req, res, next, 'INSPECTED'));
damageRoutes.post('/:id/repair', requirePermission('inventory.edit'), (req, res, next) => transitionDamage(req, res, next, 'REPAIRED'));
damageRoutes.post('/:id/dispose', requirePermission('inventory.edit'), (req, res, next) => transitionDamage(req, res, next, 'DISPOSED'));

damageRoutes.post('/:id/write-off', requirePermission('damaged_goods.approve'), async (req, res, next) => {
  try {
    const { notes, writeOffValue } = req.body as { notes?: string; writeOffValue?: number };
    const record = await prisma.damageRecord.findUnique({ where: { id: req.params.id } });
    if (!record) throw new AppError('Damage record not found', 404, 'NOT_FOUND');

    let journalPosted = false;
    if (writeOffValue) {
      const pglite = getPGlite();
      const lossRes = await pglite.query(`SELECT id, code, name FROM "accounts" WHERE "code" = '6100' LIMIT 1`);
      const stockRes = await pglite.query(`SELECT id, code, name FROM "accounts" WHERE "code" = '1300' LIMIT 1`);
      const lossAcc = lossRes.rows[0] as any;
      const stockAcc = stockRes.rows[0] as any;

      if (lossAcc?.id && stockAcc?.id) {
        const entryId = randomUUID();
        const lv = Number(writeOffValue);
        await pglite.query(
          `INSERT INTO "journal_entries" ("id","store_id","reference","reference_type","reference_id","type","status","total_debit","total_credit","notes","posted_by","posted_at","created_at","updated_at") VALUES ($1,$2,$3,'DAMAGE',$4,'WRITE_OFF','POSTED',$5,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [entryId, (record as any).storeId, `WO-${req.params.id.slice(0, 8)}`, req.params.id, lv, notes || `Write-off: damage ${req.params.id}`, req.user!.id]
        );
        await pglite.query(`INSERT INTO "journal_lines" ("id","journal_entry_id","entry_id","account_id","account_code","account_name","type","amount","debit","credit","description") VALUES (gen_random_uuid()::text,$1,$1,$2,$3,$4,'DEBIT',$5,$5,0,'Write-off loss')`, [entryId, lossAcc.id, lossAcc.code || '6100', lossAcc.name || 'Loss', lv]);
        await pglite.query(`INSERT INTO "journal_lines" ("id","journal_entry_id","entry_id","account_id","account_code","account_name","type","amount","debit","credit","description") VALUES (gen_random_uuid()::text,$1,$1,$2,$3,$4,'CREDIT',$5,0,$5,'Stock written off')`, [entryId, stockAcc.id, stockAcc.code || '1300', stockAcc.name || 'Inventory', lv]);
        journalPosted = true;
      }
    }

    await prisma.damageRecord.update({ where: { id: req.params.id }, data: { status: 'WRITTEN_OFF', writtenOffValue: writeOffValue, approvedBy: req.user!.id } });
    await prisma.damageEvent.create({ data: { id: randomUUID(), damageId: req.params.id, fromStatus: (record as any).status, toStatus: 'WRITTEN_OFF', notes, createdBy: req.user!.id } });

    res.json({ data: { status: 'WRITTEN_OFF', journalPosted } });
  } catch (err) { next(err); }
});

damageRoutes.get('/:id/events', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const events = await prisma.damageEvent.findMany({ where: { damageId: req.params.id }, orderBy: { createdAt: 'asc' } });
    res.json({ data: events });
  } catch (err) { next(err); }
});



