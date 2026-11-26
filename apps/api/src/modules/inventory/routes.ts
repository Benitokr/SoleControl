import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { getPGlite } from '../../lib/db.js';

export const inventoryRoutes = Router();
inventoryRoutes.use(requireAuth);

// GET /stock — paginated stock balances with join to variant details
inventoryRoutes.get('/stock', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const { page = '1', pageSize = '50', variantId, locationId } = req.query as Record<string, string>;
    const pg = Number(page);
    const ps = Number(pageSize);
    const skip = (pg - 1) * ps;
    const pglite = getPGlite();

    let where = 'sb.quantity > 0';
    const vals: unknown[] = [];
    let idx = 1;
    if (variantId) { where += ` AND sb.variant_id = $${idx++}`; vals.push(variantId); }
    if (locationId) { where += ` AND sb.location_id = $${idx++}`; vals.push(locationId); }

    const countRes = await pglite.query(`SELECT COUNT(*) as cnt FROM "stock_balances" sb WHERE ${where}`, vals);
    const total = Number((countRes.rows[0] as any)?.cnt || 0);

    const dataRes = await pglite.query(
      `SELECT sb.id, sb.variant_id, sb.location_id, sb.quantity,
              pv.sku, pv.mrp, pv.cost_price, pv.barcode, pv.selling_price,
              a.name as article_name,
              si.name as size_label,
              c.name as colour_name,
              l.name as location_name
         FROM "stock_balances" sb
         JOIN "product_variants" pv ON pv.id = sb.variant_id
         JOIN "articles" a ON a.id = pv.article_id
         JOIN "sizes" si ON si.id = pv.size_id
         JOIN "colours" c ON c.id = pv.colour_id
         LEFT JOIN "locations" l ON l.id = sb.location_id
         WHERE ${where}
         ORDER BY a.name, si.sequence, c.name
         LIMIT $${idx++} OFFSET $${idx}`,
      [...vals, ps, skip]
    );

    let rows = dataRes.rows;
    if (rows.length === 0 && !variantId && !locationId) {
      const allVariantsRes = await pglite.query(
        `SELECT pv.id as variant_id, COALESCE(sb.id, 'bal-' || pv.id) as id,
                COALESCE(sb.location_id, 'loc-wh-01') as location_id,
                COALESCE(sb.quantity, 0) as quantity,
                pv.sku, pv.mrp, pv.cost_price, pv.barcode, pv.selling_price,
                a.name as article_name,
                COALESCE(si.name, 'Free Size') as size_label,
                COALESCE(c.name, 'Standard') as colour_name,
                COALESCE(l.name, 'Main Warehouse') as location_name
           FROM "product_variants" pv
           JOIN "articles" a ON a.id = pv.article_id
           LEFT JOIN "sizes" si ON si.id = pv.size_id
           LEFT JOIN "colours" c ON c.id = pv.colour_id
           LEFT JOIN "stock_balances" sb ON sb.variant_id = pv.id
           LEFT JOIN "locations" l ON l.id = sb.location_id
           ORDER BY a.name, pv.sku
           LIMIT 100`
      );
      rows = allVariantsRes.rows;
    }

    res.json({ data: rows, meta: { total: total || rows.length, page: pg, pageSize: ps } });
  } catch (err) { next(err); }
});

// GET /stock/ledger/:variantId — SKU movement ledger
inventoryRoutes.get('/stock/ledger/:variantId', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { variantId: req.params.variantId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: movements });
  } catch (err) { next(err); }
});

// GET /valuation — total stock value at cost and MRP
inventoryRoutes.get('/valuation', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const result = await pglite.query(
      `SELECT
        COALESCE(SUM(sb.quantity * pv.cost_price),0) as cost_value,
        COALESCE(SUM(sb.quantity * pv.mrp),0) as mrp_value
       FROM "stock_balances" sb
       JOIN "product_variants" pv ON pv.id = sb.variant_id
       WHERE sb.quantity > 0`
    );
    const row = (result.rows[0] as any) || {};
    res.json({ data: { costValue: Number(row.cost_value || 0), mrpValue: Number(row.mrp_value || 0) } });
  } catch (err) { next(err); }
});

// POST /adjustments — create adjustment (approve immediately)
inventoryRoutes.post('/adjustments', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { reason, notes, items, storeId } = req.body as { reason: string; notes?: string; items: { variantId: string; locationId: string; delta: number }[]; storeId?: string };
    if (!reason || !items?.length) throw new AppError('reason and items are required', 400, 'VALIDATION_ERROR');

    const adjId = randomUUID();
    const resolvedStore = storeId || 'default';
    const adjustment = await prisma.stockAdjustment.create({
      data: { id: adjId, storeId: resolvedStore, reason, notes, status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date(), actorId: req.user!.id },
    });

    for (const item of items) {
      const bal = await prisma.stockBalance.findFirst({ where: { variantId: item.variantId, locationId: item.locationId } });
      const beforeQty = Number((bal as any)?.quantity || 0);
      const afterQty = beforeQty + item.delta;

      await prisma.stockAdjustmentItem.create({
        data: { id: randomUUID(), adjustmentId: adjId, variantId: item.variantId, locationId: item.locationId, delta: item.delta, beforeQty, afterQty },
      });

      await prisma.stockMovement.create({
        data: { id: randomUUID(), storeId: resolvedStore, variantId: item.variantId, locationId: item.locationId, type: 'ADJUSTMENT', quantity: item.delta, referenceId: adjId, referenceType: 'ADJUSTMENT', actorId: req.user!.id },
      });

      if (bal) {
        await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: afterQty } });
      } else if (afterQty > 0) {
        await prisma.stockBalance.create({ data: { id: randomUUID(), storeId: resolvedStore, variantId: item.variantId, locationId: item.locationId, quantity: afterQty } });
      }
    }

    await prisma.auditLog.create({
      data: { entity: 'stock_adjustment', entityId: adjId, action: 'CREATE', actorId: req.user!.id, afterState: { reason, itemCount: items.length } },
    });

    res.status(201).json({ data: adjustment });
  } catch (err) { next(err); }
});

// GET /adjustments
inventoryRoutes.get('/adjustments', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: adjustments });
  } catch (err) { next(err); }
});

// POST /audits — start audit session with snapshot
inventoryRoutes.post('/audits', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { storeId, reference } = req.body as { storeId?: string; reference?: string };
    const pglite = getPGlite();

    const session = await prisma.stockAuditSession.create({
      data: { id: randomUUID(), storeId: storeId || 'default', reference, status: 'OPEN', snapshotAt: new Date(), actorId: req.user!.id },
    });

    const balRes = await pglite.query(`SELECT * FROM "stock_balances" WHERE quantity > 0`);
    for (const bal of balRes.rows as any[]) {
      await prisma.stockAuditLine.create({
        data: { id: randomUUID(), sessionId: session.id, variantId: bal.variant_id, locationId: bal.location_id, snapshotQty: bal.quantity },
      });
    }

    res.status(201).json({ data: session });
  } catch (err) { next(err); }
});

// GET /audits
inventoryRoutes.get('/audits', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const sessions = await prisma.stockAuditSession.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: sessions });
  } catch (err) { next(err); }
});

// GET /audits/:id
inventoryRoutes.get('/audits/:id', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const session = await prisma.stockAuditSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new AppError('Audit session not found', 404, 'NOT_FOUND');
    const lines = await prisma.stockAuditLine.findMany({ where: { sessionId: req.params.id } });
    res.json({ data: { ...session, lines } });
  } catch (err) { next(err); }
});

// PUT /audits/:id/lines/:lineId — enter counted quantity
inventoryRoutes.put('/audits/:id/lines/:lineId', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const { countedQty } = req.body as { countedQty: number };
    const line = await prisma.stockAuditLine.findUnique({ where: { id: req.params.lineId } });
    if (!line) throw new AppError('Audit line not found', 404, 'NOT_FOUND');
    const variance = countedQty - Number((line as any).snapshotQty);
    const updated = await prisma.stockAuditLine.update({ where: { id: req.params.lineId }, data: { countedQty, variance } });
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// POST /audits/:id/approve — finalise audit, write variance movements
inventoryRoutes.post('/audits/:id/approve', requirePermission('inventory.approve'), async (req, res, next) => {
  try {
    const session = await prisma.stockAuditSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new AppError('Audit session not found', 404, 'NOT_FOUND');
    if ((session as any).status !== 'OPEN') throw new AppError('Session already closed', 400, 'INVALID_STATE');

    const lines = await prisma.stockAuditLine.findMany({ where: { sessionId: req.params.id } });
    let varianceCount = 0;

    for (const line of lines as any[]) {
      if (line.variance !== null && line.variance !== undefined && line.variance !== 0) {
        varianceCount++;
        await prisma.stockMovement.create({
          data: { id: randomUUID(), storeId: (session as any).storeId, variantId: line.variantId, locationId: line.locationId, type: 'AUDIT_VARIANCE', quantity: line.variance, referenceId: session.id, referenceType: 'AUDIT', actorId: req.user!.id },
        });
        const bal = await prisma.stockBalance.findFirst({ where: { variantId: line.variantId, locationId: line.locationId } });
        if (bal) {
          await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: line.countedQty } });
        }
      }
    }

    await prisma.stockAuditSession.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date() },
    });

    res.json({ data: { approved: true, varianceCount } });
  } catch (err) { next(err); }
});



