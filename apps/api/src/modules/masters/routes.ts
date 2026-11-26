import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { getPGlite } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';

export const mastersRoutes = Router();
mastersRoutes.use(authenticate);

// Generic list helper
async function paginatedList(model: string, where: any, page: number, limit: number, orderBy = { createdAt: 'desc' }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    (prisma as any)[model].findMany({ where, skip, take: limit, orderBy }),
    (prisma as any)[model].count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── BRANDS ──────────────────────────────────────────────────────────────────
const BrandSchema = z.object({ name: z.string().min(1), code: z.string().min(1), description: z.string().optional() });

mastersRoutes.get('/brands', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query as any;
    const where: any = {};
    if (search) where.name = { contains: search };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const r = await paginatedList('brand', where, +page, +limit, { name: 'asc' } as any);
    return res.json({ data: r.items, meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages } });
  } catch (err) { next(err); }
});

mastersRoutes.get('/brands/:id', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const brand = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!brand) throw new AppError('Brand not found.', 404, 'NOT_FOUND');
    return res.json({ data: brand });
  } catch (err) { next(err); }
});

mastersRoutes.get('/brands/:id/usage', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.article.count({ where: { brandId: req.params.id } });
    return res.json({ data: { articleCount: count } });
  } catch (err) { next(err); }
});

mastersRoutes.post('/brands', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = BrandSchema.parse(req.body);
    const brand = await prisma.brand.create({ data: body });
    return res.status(201).json({ data: brand });
  } catch (err) { next(err); }
});

mastersRoutes.put('/brands/:id', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = BrandSchema.partial().parse(req.body);
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: body } as any);
    return res.json({ data: brand });
  } catch (err) { next(err); }
});

mastersRoutes.post('/brands/:id/deactivate', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.article.count({ where: { brandId: req.params.id } });
    if (count > 0) throw new AppError(`Cannot deactivate: ${count} article(s) use this brand.`, 400, 'IN_USE');
    await prisma.brand.update({ where: { id: req.params.id }, data: { isActive: false } } as any);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
const CategorySchema = z.object({
  name: z.string().min(1), code: z.string().min(1),
  gender: z.enum(['MENS', 'WOMENS', 'KIDS', 'UNISEX']).default('UNISEX'),
  description: z.string().optional(),
});

mastersRoutes.get('/categories', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query as any;
    const where: any = {};
    if (search) where.name = { contains: search };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const r = await paginatedList('category', where, +page, +limit, { name: 'asc' } as any);
    return res.json({ data: r.items, meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages } });
  } catch (err) { next(err); }
});

mastersRoutes.get('/categories/:id', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!cat) throw new AppError('Category not found.', 404, 'NOT_FOUND');
    return res.json({ data: cat });
  } catch (err) { next(err); }
});

mastersRoutes.post('/categories', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CategorySchema.parse(req.body);
    return res.status(201).json({ data: await prisma.category.create({ data: body }) });
  } catch (err) { next(err); }
});

mastersRoutes.put('/categories/:id', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CategorySchema.partial().parse(req.body);
    return res.json({ data: await prisma.category.update({ where: { id: req.params.id }, data: body } as any) });
  } catch (err) { next(err); }
});

mastersRoutes.post('/categories/:id/deactivate', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.article.count({ where: { categoryId: req.params.id } });
    if (count > 0) throw new AppError(`Cannot deactivate: ${count} article(s) use this category.`, 400, 'IN_USE');
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } } as any);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// ─── SIZES ───────────────────────────────────────────────────────────────────
const SizeSchema = z.object({ name: z.string().min(1), code: z.string().min(1), system: z.string().default('UK'), sequence: z.number().default(0) });

mastersRoutes.get('/sizes', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sizes = await prisma.size.findMany({ orderBy: { sequence: 'asc' } });
    return res.json({ data: sizes });
  } catch (err) { next(err); }
});

mastersRoutes.post('/sizes', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = SizeSchema.parse(req.body);
    return res.status(201).json({ data: await prisma.size.create({ data: body }) });
  } catch (err) { next(err); }
});

mastersRoutes.put('/sizes/:id', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = SizeSchema.partial().parse(req.body);
    return res.json({ data: await prisma.size.update({ where: { id: req.params.id }, data: body } as any) });
  } catch (err) { next(err); }
});

// ─── COLOURS ─────────────────────────────────────────────────────────────────
const ColourSchema = z.object({ name: z.string().min(1), code: z.string().min(1), hexCode: z.string().optional() });

mastersRoutes.get('/colours', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const colours = await prisma.colour.findMany({ orderBy: { name: 'asc' } });
    return res.json({ data: colours });
  } catch (err) { next(err); }
});

mastersRoutes.post('/colours', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ColourSchema.parse(req.body);
    return res.status(201).json({ data: await prisma.colour.create({ data: body }) });
  } catch (err) { next(err); }
});

mastersRoutes.put('/colours/:id', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ColourSchema.partial().parse(req.body);
    return res.json({ data: await prisma.colour.update({ where: { id: req.params.id }, data: body } as any) });
  } catch (err) { next(err); }
});

// ─── TAX RATES (DATA-DRIVEN GST SLABS) ──────────────────────────────────────
mastersRoutes.get('/tax-rates', requirePermission('masters.view'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getPGlite();
    const r = await db.query(`SELECT * FROM "tax_rates" WHERE is_active = true ORDER BY rate ASC`);
    return res.json({ data: r.rows });
  } catch (err) { next(err); }
});

mastersRoutes.get('/gst-rate', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hsn = String(req.query.hsn || '6404');
    const db = getPGlite();
    const r = await db.query(
      `SELECT * FROM "tax_rates" WHERE is_active = true AND (hsn_code = $1 OR hsn_code IS NULL) ORDER BY (CASE WHEN hsn_code = $1 THEN 0 ELSE 1 END), rate ASC`,
      [hsn]
    );
    const slabs = r.rows as any[];
    // India GST Notification 21/2021: HSN 6401-6405 footwear unified at 12%; HSN 6406 parts at 18%
    const chosen =
      hsn.startsWith('6406')
        ? slabs.find((s) => Number(s.rate) === 18) || slabs[0]
        : slabs.find((s) => Number(s.rate) === 12) || slabs[0];
    return res.json({
      data: chosen || { id: 'tax-gst-12', name: 'GST 12% Standard Footwear', rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
    });
  } catch (err) { next(err); }
});

// ─── ARTICLES ────────────────────────────────────────────────────────────────
const ArticleSchema = z.object({
  articleNumber: z.string().min(1, 'Article code is required').optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1, 'Article name is required'),
  brandId: z.string().min(1, 'Brand is required').optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  gender: z.enum(['MENS', 'WOMENS', 'KIDS', 'UNISEX']).default('UNISEX'),
  hsnCode: z.string().min(2).default('6404'),
  hsn: z.string().optional(),
  description: z.string().optional(),
  baseCostPrice: z.number().min(0, 'Cost cannot be negative').default(0),
  costPrice: z.number().min(0).optional(),
  baseMrp: z.number().positive('MRP must be greater than 0').default(1),
  mrp: z.number().positive('MRP must be greater than 0').optional(),
  baseSellingPrice: z.number().min(0).default(0),
  isActive: z.boolean().optional(),
});

mastersRoutes.get('/articles', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, brandId, categoryId, isActive } = req.query as any;
    const where: any = {};
    if (search) where.name = { contains: search };
    if (brandId) where.brandId = brandId;
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const skip = (+page - 1) * +limit;
    const [items, total] = await Promise.all([
      prisma.article.findMany({ where, skip, take: +limit, orderBy: { createdAt: 'desc' }, include: { brand: true, category: true, _count: { variants: true } as any } }),
      prisma.article.count({ where }),
    ]);
    return res.json({ data: items, meta: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } });
  } catch (err) { next(err); }
});

mastersRoutes.get('/articles/:id', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id }, include: { brand: true, category: true } });
    if (!article) throw new AppError('Article not found.', 404, 'NOT_FOUND');
    return res.json({ data: article });
  } catch (err) { next(err); }
});

mastersRoutes.get('/variants', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: {
        article: { include: { brand: true, category: true } },
        size: true,
        colour: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ data: variants });
  } catch (err) { next(err); }
});

mastersRoutes.get('/articles/:id/variants', requirePermission('masters.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const variants = await prisma.productVariant.findMany({ where: { articleId: req.params.id }, include: { size: true, colour: true } });
    return res.json({ data: variants });
  } catch (err) { next(err); }
});

mastersRoutes.post('/articles', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = ArticleSchema.parse(req.body);
    const articleNumber = (parsed.articleNumber || parsed.code || parsed.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6) + '-' + Date.now().toString().slice(-4)).toUpperCase();
    const baseMrp = parsed.mrp ?? parsed.baseMrp;
    const baseCostPrice = parsed.costPrice ?? parsed.baseCostPrice;
    if (baseMrp <= 0) throw new AppError('MRP must be greater than 0.', 400, 'INVALID_MRP');
    if (baseCostPrice < 0) throw new AppError('Cost price cannot be negative.', 400, 'INVALID_COST');

    // Enforce unique articleNumber
    const dup = await prisma.article.findFirst({ where: { articleNumber } } as any);
    if (dup) throw new AppError(`Article code ${articleNumber} already exists.`, 409, 'DUPLICATE_ARTICLE_CODE');

    const article = await prisma.article.create({
      data: {
        articleNumber,
        name: parsed.name.trim(),
        brandId: parsed.brandId,
        categoryId: parsed.categoryId,
        gender: parsed.gender,
        hsnCode: parsed.hsn || parsed.hsnCode || '6404',
        description: parsed.description,
        baseCostPrice,
        baseMrp,
        baseSellingPrice: parsed.baseSellingPrice || baseMrp,
      } as any,
      include: { brand: true, category: true },
    });
    return res.status(201).json({ data: article });
  } catch (err) { next(err); }
});

mastersRoutes.put('/articles/:id', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ArticleSchema.partial().parse(req.body);
    const article = await prisma.article.update({ where: { id: req.params.id }, data: body, include: { brand: true, category: true } } as any);
    return res.json({ data: article });
  } catch (err) { next(err); }
});

mastersRoutes.post('/articles/:id/deactivate', requirePermission('masters.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.article.update({ where: { id: req.params.id }, data: { isActive: false } } as any);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// ─── VARIANT GENERATOR ───────────────────────────────────────────────────────
const GenerateVariantsSchema = z.object({
  sizeIds: z.array(z.string()).min(1),
  colourIds: z.array(z.string()).min(1),
});

mastersRoutes.post('/articles/:id/generate-variants', requirePermission('masters.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw new AppError('Article not found.', 404, 'NOT_FOUND');

    const { sizeIds, colourIds } = GenerateVariantsSchema.parse(req.body);
    const sizes = await prisma.size.findMany({ where: { id: { in: sizeIds } } });
    const colours = await prisma.colour.findMany({ where: { id: { in: colourIds } } });

    const created = [];
    for (const size of sizes as any[]) {
      for (const colour of colours as any[]) {
        const sku = `${(article as any).articleNumber}-${size.code}-${colour.code}`.toUpperCase();
        // Check if already exists
        const existing = await prisma.productVariant.findFirst({ where: { sku } } as any);
        if (existing) continue;

        // EAN-13 like barcode starting with 880 (India)
        const barcode = '880' + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const variant = await prisma.productVariant.create({
          data: {
            articleId: req.params.id,
            sizeId: size.id,
            colourId: colour.id,
            sku,
            barcode,
            costPrice: (article as any).baseCostPrice || 0,
            mrp: (article as any).baseMrp || 0,
            sellingPrice: (article as any).baseSellingPrice || 0,
            isActive: true,
          },
          include: { size: true, colour: true },
        });
        created.push(variant);
      }
    }

    return res.status(201).json({ data: { created: created.length, variants: created } });
  } catch (err) { next(err); }
});

