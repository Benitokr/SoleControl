import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export const vendorRoutes = Router();
vendorRoutes.use(authenticate);

const VendorSchema = z.object({
  name: z.string().min(2), code: z.string().min(2),
  contactPerson: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(),
  address: z.string().optional(), gstin: z.string().optional(), panNumber: z.string().optional(),
  bankName: z.string().optional(), bankAccount: z.string().optional(), bankIfsc: z.string().optional(),
  creditDays: z.number().int().default(30), creditLimit: z.number().default(0),
});

vendorRoutes.get('/', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query as any;
    const where: any = {};
    if (search) where.name = { contains: search };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const skip = (+page - 1) * +limit;
    const [items, total] = await Promise.all([
      prisma.vendor.findMany({ where, skip, take: +limit, orderBy: { name: 'asc' } }),
      prisma.vendor.count({ where }),
    ]);
    return res.json({ data: items, meta: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } });
  } catch (err) { next(err); }
});

vendorRoutes.get('/:id', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new AppError('Vendor not found.', 404, 'NOT_FOUND');
    return res.json({ data: vendor });
  } catch (err) { next(err); }
});

vendorRoutes.post('/', requirePermission('vendors.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = VendorSchema.parse(req.body);
    const vendor = await prisma.vendor.create({ data: body });
    await prisma.auditLog.create({ data: { entity: 'Vendor', entityId: vendor.id, action: 'CREATE', actorId: req.user!.id, afterState: { name: (vendor as any).name } } });
    return res.status(201).json({ data: vendor });
  } catch (err) { next(err); }
});

vendorRoutes.put('/:id', requirePermission('vendors.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = VendorSchema.partial().parse(req.body);
    const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data: body } as any);
    return res.json({ data: vendor });
  } catch (err) { next(err); }
});

vendorRoutes.post('/:id/deactivate', requirePermission('vendors.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.vendor.update({ where: { id: req.params.id }, data: { isActive: false } } as any);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Vendor statement — purchases and payments
vendorRoutes.get('/:id/statement', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new AppError('Vendor not found.', 404, 'NOT_FOUND');
    const purchases = await prisma.purchase.findMany({ where: { vendorId: req.params.id }, orderBy: { billDate: 'desc' } });
    return res.json({ data: { vendor, purchases, totalPurchases: purchases.length } });
  } catch (err) { next(err); }
});

