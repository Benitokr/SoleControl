import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const displayRoutes = Router();
displayRoutes.use(requireAuth);

// GET / — list display allocations
displayRoutes.get('/', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const allocations = await prisma.displayAllocation.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: allocations });
  } catch (err) { next(err); }
});

// POST /allocate — move stock from storage to display
displayRoutes.post('/allocate', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { storeId, variantId, fromLocationId, displayLocationId, quantity, notes } = req.body as {
      storeId?: string; variantId: string; fromLocationId: string; displayLocationId: string; quantity: number; notes?: string;
    };
    if (!variantId || !fromLocationId || !displayLocationId || !quantity) {
      throw new AppError('variantId, fromLocationId, displayLocationId, quantity are required', 400, 'VALIDATION_ERROR');
    }

    const bal = await prisma.stockBalance.findFirst({ where: { variantId, locationId: fromLocationId } });
    if (!bal || Number((bal as any).quantity) < quantity) {
      throw new AppError('Insufficient stock at source location', 400, 'INSUFFICIENT_STOCK');
    }

    const resolvedStore = storeId || 'default';
    const allocation = await prisma.displayAllocation.create({
      data: { id: randomUUID(), storeId: resolvedStore, variantId, fromLocationId, displayLocationId, quantity, status: 'ACTIVE', notes, actorId: req.user!.id },
    });

    // Deduct from storage
    await prisma.stockBalance.update({ where: { id: (bal as any).id }, data: { quantity: Number((bal as any).quantity) - quantity } });
    await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: resolvedStore, variantId, locationId: fromLocationId, type: 'DISPLAY_OUT', quantity: -quantity, referenceId: allocation.id, referenceType: 'DISPLAY', actorId: req.user!.id } });

    // Add to display location
    const dispBal = await prisma.stockBalance.findFirst({ where: { variantId, locationId: displayLocationId } });
    if (dispBal) {
      await prisma.stockBalance.update({ where: { id: (dispBal as any).id }, data: { quantity: Number((dispBal as any).quantity) + quantity } });
    } else {
      await prisma.stockBalance.create({ data: { id: randomUUID(), variantId, locationId: displayLocationId, quantity } });
    }
    await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: resolvedStore, variantId, locationId: displayLocationId, type: 'DISPLAY_IN', quantity, referenceId: allocation.id, referenceType: 'DISPLAY', actorId: req.user!.id } });

    res.status(201).json({ data: allocation });
  } catch (err) { next(err); }
});

// POST /:id/return — return display stock back to storage
displayRoutes.post('/:id/return', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const { quantity } = req.body as { quantity?: number };
    const allocation = await prisma.displayAllocation.findUnique({ where: { id: req.params.id } });
    if (!allocation) throw new AppError('Allocation not found', 404, 'NOT_FOUND');
    if ((allocation as any).status !== 'ACTIVE') throw new AppError('Allocation is not active', 400, 'INVALID_STATE');

    const returnQty = quantity || Number((allocation as any).quantity);

    // Return from display to storage
    const dispBal = await prisma.stockBalance.findFirst({ where: { variantId: (allocation as any).variantId, locationId: (allocation as any).displayLocationId } });
    if (dispBal) {
      await prisma.stockBalance.update({ where: { id: (dispBal as any).id }, data: { quantity: Math.max(0, Number((dispBal as any).quantity) - returnQty) } });
    }

    const storBal = await prisma.stockBalance.findFirst({ where: { variantId: (allocation as any).variantId, locationId: (allocation as any).fromLocationId } });
    if (storBal) {
      await prisma.stockBalance.update({ where: { id: (storBal as any).id }, data: { quantity: Number((storBal as any).quantity) + returnQty } });
    } else {
      await prisma.stockBalance.create({ data: { id: randomUUID(), storeId: (allocation as any).storeId, variantId: (allocation as any).variantId, locationId: (allocation as any).fromLocationId, quantity: returnQty } });
    }

    await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: (allocation as any).storeId, variantId: (allocation as any).variantId, locationId: (allocation as any).displayLocationId, type: 'DISPLAY_RETURN', quantity: -returnQty, referenceId: allocation.id, referenceType: 'DISPLAY', actorId: req.user!.id } });
    await prisma.displayAllocation.update({ where: { id: req.params.id }, data: { status: 'RETURNED', returnedQty: returnQty } });

    res.json({ data: { returned: true, quantity: returnQty } });
  } catch (err) { next(err); }
});



