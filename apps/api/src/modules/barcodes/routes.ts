import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export const barcodeRoutes = Router();
barcodeRoutes.use(authenticate);

// List barcode labels queue
barcodeRoutes.get('/queue', requirePermission('barcodes.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, storeId } = req.query as any;
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    const labels = await prisma.barcodeLabel.findMany({ where, orderBy: { createdAt: 'desc' } });
    // Enrich with variant data
    for (const lbl of labels as any[]) {
      const variant = await prisma.productVariant.findUnique({ where: { id: lbl.variantId }, include: { size: true, colour: true, article: true } });
      lbl.variant = variant;
    }
    return res.json({ data: labels });
  } catch (err) { next(err); }
});

// Mark labels as printed
barcodeRoutes.post('/queue/mark-printed', requirePermission('barcodes.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
    for (const id of ids) {
      await prisma.barcodeLabel.update({ where: { id }, data: { status: 'PRINTED' } } as any);
    }
    return res.json({ data: { updated: ids.length } });
  } catch (err) { next(err); }
});

// Search by barcode
barcodeRoutes.get('/scan/:barcode', requirePermission('barcodes.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const variant = await prisma.productVariant.findFirst({ where: { barcode: req.params.barcode }, include: { size: true, colour: true, article: true } } as any);
    if (!variant) throw new AppError('Barcode not found.', 404, 'NOT_FOUND');
    // Check stock
    const stock = await prisma.stockBalance.findMany({ where: { variantId: (variant as any).id, storeId: req.user!.storeId } } as any);
    const totalQty = (stock as any[]).reduce((s, b) => s + b.quantity, 0);
    return res.json({ data: { variant, stockQty: totalQty, stockBalances: stock } });
  } catch (err) { next(err); }
});

// Label templates
barcodeRoutes.get('/templates', requirePermission('barcodes.view'), async (_req, res, next) => {
  try {
    return res.json({ data: await prisma.labelTemplate.findMany({}) });
  } catch (err) { next(err); }
});

const TemplateSchema = z.object({
  name: z.string().min(1), widthMm: z.number().default(50), heightMm: z.number().default(25),
  fields: z.array(z.object({ key: z.string(), label: z.string(), visible: z.boolean().default(true), x: z.number().default(0), y: z.number().default(0), fontSize: z.number().default(10) })).default([]),
  isDefault: z.boolean().default(false),
});

barcodeRoutes.post('/templates', requirePermission('barcodes.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = TemplateSchema.parse(req.body);
    if (body.isDefault) {
      await prisma.labelTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } } as any);
    }
    const template = await prisma.labelTemplate.create({ data: { name: body.name, widthMm: body.widthMm, heightMm: body.heightMm, fields: body.fields, isDefault: body.isDefault } });
    return res.status(201).json({ data: template });
  } catch (err) { next(err); }
});

barcodeRoutes.put('/templates/:id', requirePermission('barcodes.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = TemplateSchema.partial().parse(req.body);
    if (body.isDefault) {
      await prisma.labelTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } } as any);
    }
    const template = await prisma.labelTemplate.update({ where: { id: req.params.id }, data: body } as any);
    return res.json({ data: template });
  } catch (err) { next(err); }
});

// Generate print PDF preview (list of barcodes as JSON for frontend to render)
barcodeRoutes.post('/print', requirePermission('barcodes.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { labelIds, templateId } = z.object({ labelIds: z.array(z.string()), templateId: z.string().optional() }).parse(req.body);
    const template = templateId
      ? await prisma.labelTemplate.findUnique({ where: { id: templateId } })
      : await prisma.labelTemplate.findFirst({ where: { isDefault: true } } as any);

    const labels = [];
    for (const id of labelIds) {
      const lbl = await prisma.barcodeLabel.findUnique({ where: { id } });
      if (!lbl) continue;
      const variant = await prisma.productVariant.findUnique({ where: { id: (lbl as any).variantId }, include: { size: true, colour: true, article: true } });
      labels.push({ label: lbl, variant, quantity: (lbl as any).quantity });
    }

    // Mark as printed
    await Promise.all(labelIds.map(id => prisma.barcodeLabel.update({ where: { id }, data: { status: 'PRINTED' } } as any)));

    return res.json({ data: { template, labels, printJobId: `PJ-${Date.now()}` } });
  } catch (err) { next(err); }
});

