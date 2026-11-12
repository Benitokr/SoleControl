import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const customerRoutes = Router();
customerRoutes.use(requireAuth);

customerRoutes.get('/', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const { page = '1', pageSize = '50', search, isActive } = req.query as Record<string, string>;
    const pg = Number(page);
    const ps = Number(pageSize);
    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip: (pg - 1) * ps, take: ps }),
      prisma.customer.count({ where }),
    ]);
    res.json({ data: customers, meta: { total, page: pg, pageSize: ps } });
  } catch (err) { next(err); }
});

customerRoutes.post('/', requirePermission('customers.create'), async (req, res, next) => {
  try {
    const { name, phone, email, address, gstin, creditLimit } = req.body as {
      name: string; phone?: string; email?: string; address?: string; gstin?: string; creditLimit?: number;
    };
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const customer = await prisma.customer.create({
      data: { id: randomUUID(), name, phone, email, address, gstin, creditLimit: creditLimit || 0 },
    });
    res.status(201).json({ data: customer });
  } catch (err) { next(err); }
});

customerRoutes.get('/:id', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    const comms = await prisma.customerCommunication.findMany({ where: { customerId: req.params.id }, orderBy: { createdAt: 'desc' } });
    res.json({ data: { ...customer, communications: comms } });
  } catch (err) { next(err); }
});

customerRoutes.put('/:id', requirePermission('customers.edit'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: customer });
  } catch (err) { next(err); }
});

customerRoutes.get('/:id/history', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const sales = await prisma.sale.findMany({ where: { customerId: req.params.id }, orderBy: { createdAt: 'desc' } });
    res.json({ data: sales });
  } catch (err) { next(err); }
});

customerRoutes.post('/:id/communications', requirePermission('customers.create'), async (req, res, next) => {
  try {
    const { type, message } = req.body as { type?: string; message: string };
    if (!message) throw new AppError('message is required', 400, 'VALIDATION_ERROR');
    const comm = await prisma.customerCommunication.create({
      data: { id: randomUUID(), customerId: req.params.id, type: type || 'NOTE', message, createdBy: req.user!.id },
    });
    res.status(201).json({ data: comm });
  } catch (err) { next(err); }
});

