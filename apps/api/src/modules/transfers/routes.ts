import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const transferRoutes = Router();
transferRoutes.use(requireAuth);

transferRoutes.get('/', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const transfers = await prisma.stockTransfer.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: transfers });
  } catch (err) { next(err); }
});

transferRoutes.post('/', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { fromStoreId, toStoreId, fromLocationId, toLocationId, items, notes } = req.body as {
      fromStoreId: string; toStoreId: string; fromLocationId?: string; toLocationId?: string;
      items: { variantId: string; quantity: number }[]; notes?: string;
    };
    if (!fromStoreId || !toStoreId || !items?.length) {
      throw new AppError('fromStoreId, toStoreId and items are required', 400, 'VALIDATION_ERROR');
    }

    const transfer = await prisma.stockTransfer.create({
      data: { id: randomUUID(), fromStoreId, toStoreId, fromLocationId, toLocationId, status: 'REQUESTED', requestedBy: req.user!.id, notes },
    });

    for (const item of items) {
      await prisma.stockTransferItem.create({ data: { id: randomUUID(), transferId: transfer.id, variantId: item.variantId, requestedQty: item.quantity } });
    }

    res.status(201).json({ data: transfer });
  } catch (err) { next(err); }
});

transferRoutes.get('/:id', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    const items = await prisma.stockTransferItem.findMany({ where: { transferId: req.params.id } });
    res.json({ data: { ...transfer, items } });
  } catch (err) { next(err); }
});

transferRoutes.post('/:id/dispatch', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    if ((transfer as any).status !== 'REQUESTED') throw new AppError('Transfer is not in REQUESTED state', 400, 'INVALID_STATE');

    const items = await prisma.stockTransferItem.findMany({ where: { transferId: req.params.id } });

    for (const item of items as any[]) {
      const qty = item.requestedQty;
      if ((transfer as any).fromLocationId) {
        const bal = await prisma.stockBalance.findFirst({ where: { variantId: item.variantId, locationId: (transfer as any).fromLocationId } });
        if (bal) {
          await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: Math.max(0, Number((bal as any).quantity) - qty) } });
        }
      }
      await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: (transfer as any).fromStoreId, variantId: item.variantId, locationId: (transfer as any).fromLocationId || (transfer as any).fromStoreId, type: 'TRANSFER_OUT', quantity: -qty, referenceId: transfer.id, referenceType: 'TRANSFER', actorId: req.user!.id } });
      await prisma.stockTransferItem.update({ where: { id: item.id }, data: { dispatchedQty: qty } });
    }

    await prisma.stockTransfer.update({ where: { id: req.params.id }, data: { status: 'IN_TRANSIT', dispatchedBy: req.user!.id, dispatchedAt: new Date() } });
    res.json({ data: { dispatched: true } });
  } catch (err) { next(err); }
});

transferRoutes.post('/:id/receive', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    if ((transfer as any).status !== 'IN_TRANSIT') throw new AppError('Transfer is not IN_TRANSIT', 400, 'INVALID_STATE');

    const items = await prisma.stockTransferItem.findMany({ where: { transferId: req.params.id } });
    const targetLocation = (transfer as any).toLocationId || (transfer as any).toStoreId;

    for (const item of items as any[]) {
      const qty = item.dispatchedQty || item.requestedQty;
      const bal = await prisma.stockBalance.findFirst({ where: { variantId: item.variantId, locationId: targetLocation } });
      if (bal) {
        await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: Number((bal as any).quantity) + qty } });
      } else {
        await prisma.stockBalance.create({ data: { id: randomUUID(), storeId: (transfer as any).toStoreId, variantId: item.variantId, locationId: targetLocation, quantity: qty } });
      }
      await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: (transfer as any).toStoreId, variantId: item.variantId, locationId: targetLocation, type: 'TRANSFER_IN', quantity: qty, referenceId: transfer.id, referenceType: 'TRANSFER', actorId: req.user!.id } });
      await prisma.stockTransferItem.update({ where: { id: item.id }, data: { receivedQty: qty } });
    }

    await prisma.stockTransfer.update({ where: { id: req.params.id }, data: { status: 'RECEIVED', receivedBy: req.user!.id, receivedAt: new Date() } });
    res.json({ data: { received: true } });
  } catch (err) { next(err); }
});



