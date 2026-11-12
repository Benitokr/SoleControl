import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { z } from 'zod';

export const companyRoutes = Router();
companyRoutes.use(authenticate);

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateGstin(gstin: string) {
  if (!GSTIN_REGEX.test(gstin)) {
    throw new AppError('Invalid GSTIN format.', 422, 'INVALID_GSTIN');
  }
}

// Company Profile
companyRoutes.get('/profile', requirePermission('company.view'), async (_req, res, next) => {
  try {
    const profile = await prisma.companyProfile.findFirst({});
    return res.json({ data: profile });
  } catch (err) { next(err); }
});

const ProfileSchema = z.object({
  legalName: z.string().min(2).optional(),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
});

companyRoutes.put('/profile', requirePermission('company.edit'), async (req, res, next) => {
  try {
    const body = ProfileSchema.parse(req.body);
    if (body.gstin) validateGstin(body.gstin);
    const existing = await prisma.companyProfile.findFirst({});
    let profile;
    if (existing) {
      profile = await prisma.companyProfile.update({ where: { id: existing.id }, data: body });
    } else {
      profile = await prisma.companyProfile.create({ data: { id: 'default-profile', ...body } });
    }
    return res.json({ data: profile });
  } catch (err) { next(err); }
});

// Stores
companyRoutes.get('/stores', requirePermission('company.view'), async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({ orderBy: { createdAt: 'asc' } });
    return res.json({ data: stores });
  } catch (err) { next(err); }
});

companyRoutes.get('/stores/:id', requirePermission('company.view'), async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) throw new AppError('Store not found.', 404, 'NOT_FOUND');
    return res.json({ data: store });
  } catch (err) { next(err); }
});

const StoreSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  address: z.string().optional(),
  gstin: z.string().optional(),
  isActive: z.boolean().optional(),
});

companyRoutes.post('/stores', requirePermission('company.create'), async (req, res, next) => {
  try {
    const body = StoreSchema.parse(req.body);
    if (body.gstin) validateGstin(body.gstin);
    const store = await prisma.store.create({ data: body });
    return res.status(201).json({ data: store });
  } catch (err) { next(err); }
});

companyRoutes.put('/stores/:id', requirePermission('company.edit'), async (req, res, next) => {
  try {
    const body = StoreSchema.partial().parse(req.body);
    if (body.gstin) validateGstin(body.gstin);
    if (body.isActive === false) {
      const activeCount = await prisma.store.count({ where: { isActive: true } });
      if (activeCount <= 1) throw new AppError('Cannot deactivate the last active store.', 400, 'LAST_ACTIVE_STORE');
    }
    const store = await prisma.store.update({ where: { id: req.params.id }, data: body });
    return res.json({ data: store });
  } catch (err) { next(err); }
});

// Tax Rates
companyRoutes.get('/tax-rates', requirePermission('company.view'), async (_req, res, next) => {
  try { return res.json({ data: await prisma.taxRate.findMany({ orderBy: { rate: 'asc' } }) }); } catch (err) { next(err); }
});

const TaxRateSchema = z.object({
  name: z.string().min(1), rate: z.number(), hsnCode: z.string().optional(),
  cgstRate: z.number().default(0), sgstRate: z.number().default(0), igstRate: z.number().default(0), isActive: z.boolean().default(true),
});

companyRoutes.post('/tax-rates', requirePermission('company.create'), async (req, res, next) => {
  try {
    const body = TaxRateSchema.parse(req.body);
    return res.status(201).json({ data: await prisma.taxRate.create({ data: body }) });
  } catch (err) { next(err); }
});

companyRoutes.put('/tax-rates/:id', requirePermission('company.edit'), async (req, res, next) => {
  try {
    const body = TaxRateSchema.partial().parse(req.body);
    return res.json({ data: await prisma.taxRate.update({ where: { id: req.params.id }, data: body } as any) });
  } catch (err) { next(err); }
});

// Financial Years
companyRoutes.get('/financial-years', requirePermission('company.view'), async (_req, res, next) => {
  try { return res.json({ data: await prisma.financialYear.findMany({ orderBy: { startDate: 'desc' } }) }); } catch (err) { next(err); }
});

const FYSchema = z.object({
  code: z.string().min(2), startDate: z.string(), endDate: z.string(), isCurrent: z.boolean().default(false),
});

companyRoutes.post('/financial-years', requirePermission('company.create'), async (req, res, next) => {
  try {
    const body = FYSchema.parse(req.body);
    if (body.isCurrent) {
      await prisma.financialYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    const fy = await prisma.financialYear.create({ data: { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) } });
    return res.status(201).json({ data: fy });
  } catch (err) { next(err); }
});

companyRoutes.put('/financial-years/:id', requirePermission('company.edit'), async (req, res, next) => {
  try {
    const body = FYSchema.partial().parse(req.body);
    if (body.isCurrent) {
      await prisma.financialYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    const fy = await prisma.financialYear.update({ where: { id: req.params.id }, data: { ...body, startDate: body.startDate ? new Date(body.startDate) : undefined, endDate: body.endDate ? new Date(body.endDate) : undefined } } as any);
    return res.json({ data: fy });
  } catch (err) { next(err); }
});

companyRoutes.post('/financial-years/:id/close', requirePermission('company.edit'), async (req, res, next) => {
  try {
    const fy = await prisma.financialYear.update({ where: { id: req.params.id }, data: { isClosed: true, isCurrent: false } } as any);
    return res.json({ data: fy });
  } catch (err) { next(err); }
});

// Settings
companyRoutes.get('/settings', requirePermission('company.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query as any;
    const where = category ? { category } : {};
    return res.json({ data: await prisma.setting.findMany({ where, orderBy: { key: 'asc' } }) });
  } catch (err) { next(err); }
});

companyRoutes.put('/settings/:key', requirePermission('company.edit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = req.body;
    const setting = await prisma.setting.update({ where: { key: req.params.key }, data: { value } } as any);
    return res.json({ data: setting });
  } catch (err) { next(err); }
});

// Document Series
companyRoutes.get('/document-series', requirePermission('company.view'), async (_req, res, next) => {
  try { return res.json({ data: await prisma.documentSeries.findMany({}) }); } catch (err) { next(err); }
});

