import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const offerRoutes = Router();
offerRoutes.use(requireAuth);

offerRoutes.get('/', requirePermission('offers.view'), async (req, res, next) => {
  try {
    const { isActive } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const offers = await prisma.offer.findMany({ where, orderBy: { priority: 'desc' } });
    res.json({ data: offers });
  } catch (err) { next(err); }
});

offerRoutes.post('/', requirePermission('offers.create'), async (req, res, next) => {
  try {
    const { name, scopeType, scopeId, discountType, discountValue, buyX, getY, minQty, minAmount, priority, validFrom, validUntil, storeId } = req.body as {
      name: string; scopeType?: string; scopeId?: string; discountType?: string; discountValue: number;
      buyX?: number; getY?: number; minQty?: number; minAmount?: number; priority?: number;
      validFrom: string; validUntil?: string; storeId?: string;
    };
    if (!name || !discountValue || !validFrom) {
      throw new AppError('name, discountValue and validFrom are required', 400, 'VALIDATION_ERROR');
    }
    const offer = await prisma.offer.create({
      data: {
        id: randomUUID(),
        name,
        scopeType: scopeType || 'ALL',
        scopeId,
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        buyX,
        getY,
        minQty: minQty || 1,
        minAmount,
        priority: priority || 0,
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null,
        storeId,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json({ data: offer });
  } catch (err) { next(err); }
});

offerRoutes.put('/:id', requirePermission('offers.edit'), async (req, res, next) => {
  try {
    const offer = await prisma.offer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: offer });
  } catch (err) { next(err); }
});

offerRoutes.post('/:id/deactivate', requirePermission('offers.edit'), async (req, res, next) => {
  try {
    await prisma.offer.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ data: { deactivated: true } });
  } catch (err) { next(err); }
});

// POST /simulate — simulate offer on a sample bill
offerRoutes.post('/simulate', requirePermission('offers.view'), async (req, res, next) => {
  try {
    const { items } = req.body as { items: { variantId: string; quantity: number; mrp: number; sellingPrice: number }[] };
    if (!items?.length) throw new AppError('items array is required', 400, 'VALIDATION_ERROR');

    const now = new Date();
    const allOffers = await prisma.offer.findMany({ where: { isActive: true } });
    const activeOffers = (allOffers as any[]).filter(o => {
      const from = new Date(o.validFrom);
      const until = o.validUntil ? new Date(o.validUntil) : null;
      return from <= now && (!until || until >= now);
    }).sort((a: any, b: any) => b.priority - a.priority);

    const subtotal = items.reduce((s, i) => s + Number(i.sellingPrice) * i.quantity, 0);
    let totalDiscount = 0;
    const appliedOffers: { offerId: string; name: string; discount: number }[] = [];

    for (const offer of activeOffers) {
      if (offer.discountType === 'PERCENTAGE') {
        if (subtotal >= Number(offer.minAmount || 0)) {
          const discount = subtotal * (Number(offer.discountValue) / 100);
          totalDiscount += discount;
          appliedOffers.push({ offerId: offer.id, name: offer.name, discount });
        }
      } else if (offer.discountType === 'FLAT') {
        if (subtotal >= Number(offer.minAmount || 0)) {
          const discount = Math.min(Number(offer.discountValue), subtotal);
          totalDiscount += discount;
          appliedOffers.push({ offerId: offer.id, name: offer.name, discount });
        }
      }
    }

    res.json({ data: { subtotal, totalDiscount, finalAmount: subtotal - totalDiscount, appliedOffers } });
  } catch (err) { next(err); }
});

offerRoutes.get('/redemptions', requirePermission('offers.view'), async (req, res, next) => {
  try {
    const { offerId } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (offerId) where.offerId = offerId;
    const redemptions = await prisma.offerRedemption.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: redemptions });
  } catch (err) { next(err); }
});

