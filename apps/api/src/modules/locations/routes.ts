import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export const locationRoutes = Router();
locationRoutes.use(authenticate);

// Get tree for a store
locationRoutes.get('/tree', requirePermission('locations.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storeId = req.query.storeId as string || req.user!.storeId;
    const all = await prisma.location.findMany({ where: { storeId, isActive: true }, orderBy: { code: 'asc' } });
    // Build tree
    function buildTree(parentId: string | null): any[] {
      return (all as any[])
        .filter(n => n.parentId === parentId || (!n.parentId && parentId === null))
        .map(n => ({ ...n, children: buildTree(n.id) }));
    }
    return res.json({ data: buildTree(null) });
  } catch (err) { next(err); }
});

// Flat list
locationRoutes.get('/', requirePermission('locations.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storeId = req.query.storeId as string || req.user!.storeId;
    const locations = await prisma.location.findMany({ where: { storeId }, orderBy: { code: 'asc' } });
    return res.json({ data: locations });
  } catch (err) { next(err); }
});

const LocationSchema = z.object({
  storeId: z.string(),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['FLOOR', 'DEPARTMENT', 'RACK', 'SHELF', 'POSITION']),
  barcode: z.string().optional(),
});

locationRoutes.post('/', requirePermission('locations.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = LocationSchema.parse(req.body);
    const loc = await prisma.location.create({ data: body });
    return res.status(201).json({ data: loc });
  } catch (err) { next(err); }
});

locationRoutes.put('/:id', requirePermission('locations.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = LocationSchema.partial().parse(req.body);
    const loc = await prisma.location.update({ where: { id: req.params.id }, data: body } as any);
    return res.json({ data: loc });
  } catch (err) { next(err); }
});

locationRoutes.post('/:id/deactivate', requirePermission('locations.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const children = await prisma.location.count({ where: { parentId: req.params.id, isActive: true } });
    if (children > 0) throw new AppError(`Cannot deactivate: ${children} active child location(s) exist.`, 400, 'HAS_CHILDREN');
    await prisma.location.update({ where: { id: req.params.id }, data: { isActive: false } } as any);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Bulk generate positions
const BulkGenerateSchema = z.object({
  parentId: z.string(), type: z.enum(['FLOOR', 'DEPARTMENT', 'RACK', 'SHELF', 'POSITION']),
  count: z.number().int().min(1).max(100), prefix: z.string().min(1),
  storeId: z.string(),
});

locationRoutes.post('/bulk-generate', requirePermission('locations.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = BulkGenerateSchema.parse(req.body);
    const created = [];
    for (let i = 1; i <= body.count; i++) {
      const code = `${body.prefix}-${String(i).padStart(2, '0')}`;
      const loc = await prisma.location.create({
        data: { storeId: body.storeId, parentId: body.parentId, name: code, code, type: body.type },
      });
      created.push(loc);
    }
    return res.status(201).json({ data: { created: created.length, locations: created } });
  } catch (err) { next(err); }
});

