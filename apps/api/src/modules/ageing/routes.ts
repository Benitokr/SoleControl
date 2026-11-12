import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { getPGlite } from '../../lib/db.js';

export const ageingRoutes = Router();
ageingRoutes.use(requireAuth);

ageingRoutes.get('/rules', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const rules = await prisma.ageingRule.findMany({ orderBy: { thresholdDays: 'asc' } });
    res.json({ data: rules });
  } catch (err) { next(err); }
});

ageingRoutes.post('/rules', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const { categoryId, thresholdDays, discountPct, label } = req.body as {
      categoryId?: string; thresholdDays: number; discountPct?: number; label?: string;
    };
    if (!thresholdDays) throw new AppError('thresholdDays is required', 400, 'VALIDATION_ERROR');
    const rule = await prisma.ageingRule.create({ data: { id: randomUUID(), categoryId, thresholdDays, discountPct: discountPct || 0, label } });
    res.status(201).json({ data: rule });
  } catch (err) { next(err); }
});

ageingRoutes.put('/rules/:id', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const rule = await prisma.ageingRule.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: rule });
  } catch (err) { next(err); }
});

// GET /heatmap — computed ageing heatmap grouped by category and age bucket
ageingRoutes.get('/heatmap', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const result = await pglite.query(`
      SELECT
        c.name as category_name,
        c.id as category_id,
        pv.id as variant_id,
        pv.sku,
        sb.quantity,
        COALESCE(EXTRACT(DAY FROM NOW() - MIN(sm.created_at))::integer, 0) as age_days
      FROM "stock_balances" sb
      JOIN "product_variants" pv ON pv.id = sb.variant_id
      JOIN "articles" a ON a.id = pv.article_id
      JOIN "categories" c ON c.id = a.category_id
      LEFT JOIN "stock_movements" sm ON sm.variant_id = pv.id AND sm.type = 'PURCHASE'
      WHERE sb.quantity > 0
      GROUP BY c.name, c.id, pv.id, pv.sku, sb.quantity
      ORDER BY c.name
    `);

    const buckets = ['0-30', '31-60', '61-90', '91-120', '120+'];
    const heatmap: Record<string, Record<string, number>> = {};

    for (const row of result.rows as any[]) {
      const ageDays = Number(row.age_days || 0);
      const bucket = ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : ageDays <= 120 ? '91-120' : '120+';
      const cat = row.category_name || 'Uncategorized';
      if (!heatmap[cat]) heatmap[cat] = {};
      heatmap[cat][bucket] = (heatmap[cat][bucket] || 0) + Number(row.quantity);
    }

    const data = Object.entries(heatmap).map(([category, bucketData]) => ({
      category,
      ...Object.fromEntries(buckets.map(b => [b, bucketData[b] || 0])),
    }));

    res.json({ data, buckets });
  } catch (err) { next(err); }
});

// POST /compute-recommendations — run ageing recommendation logic
ageingRoutes.post('/compute-recommendations', requirePermission('inventory.create'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const rules = await prisma.ageingRule.findMany({ where: { isActive: true }, orderBy: { thresholdDays: 'desc' } });

    if (!rules.length) {
      return res.json({ data: { computed: 0, message: 'No ageing rules defined — create rules first' } });
    }

    // Clear old pending recommendations
    await pglite.query(`DELETE FROM "clearance_recommendations" WHERE status = 'PENDING'`);

    const result = await pglite.query(`
      SELECT pv.id as variant_id, sb.location_id, sb.quantity, a.category_id,
        COALESCE(EXTRACT(DAY FROM NOW() - MIN(sm.created_at))::integer, 0) as age_days
      FROM "stock_balances" sb
      JOIN "product_variants" pv ON pv.id = sb.variant_id
      JOIN "articles" a ON a.id = pv.article_id
      LEFT JOIN "stock_movements" sm ON sm.variant_id = pv.id AND sm.type = 'PURCHASE'
      WHERE sb.quantity > 0
      GROUP BY pv.id, sb.location_id, sb.quantity, a.category_id
      HAVING COALESCE(EXTRACT(DAY FROM NOW() - MIN(sm.created_at))::integer, 0) > 30
    `);

    const storeRes = await pglite.query(`SELECT id FROM "stores" LIMIT 1`);
    const storeId = (storeRes.rows[0] as any)?.id || 'default';

    let computed = 0;
    for (const row of result.rows as any[]) {
      const ageDays = Number(row.age_days || 0);
      const matchingRule = (rules as any[]).find(r =>
        (!r.categoryId || r.categoryId === row.category_id) && r.thresholdDays <= ageDays
      );

      if (matchingRule) {
        await pglite.query(
          `INSERT INTO "clearance_recommendations" ("id","store_id","variant_id","location_id","age_days","current_qty","suggested_discount_pct","rationale","status","computed_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',CURRENT_TIMESTAMP)`,
          [randomUUID(), storeId, row.variant_id, row.location_id, ageDays, row.quantity, matchingRule.discountPct, `${ageDays} days old — recommend ${matchingRule.discountPct}% clearance discount`]
        );
        computed++;
      }
    }

    res.json({ data: { computed } });
  } catch (err) { next(err); }
});

ageingRoutes.get('/recommendations', requirePermission('inventory.view'), async (req, res, next) => {
  try {
    const recs = await prisma.clearanceRecommendation.findMany({ orderBy: { ageDays: 'desc' } });
    res.json({ data: recs });
  } catch (err) { next(err); }
});

ageingRoutes.post('/recommendations/:id/accept', requirePermission('inventory.edit'), async (req, res, next) => {
  try {
    const rec = await prisma.clearanceRecommendation.findUnique({ where: { id: req.params.id } });
    if (!rec) throw new AppError('Recommendation not found', 404, 'NOT_FOUND');
    if ((rec as any).status !== 'PENDING') throw new AppError('Recommendation already processed', 400, 'INVALID_STATE');

    await prisma.clearanceMovement.create({
      data: {
        id: randomUUID(),
        recommendationId: rec.id,
        variantId: (rec as any).variantId,
        locationId: (rec as any).locationId,
        quantity: (rec as any).currentQty,
        discountPct: (rec as any).suggestedDiscountPct || 0,
        createdBy: req.user!.id,
      },
    });

    await prisma.clearanceRecommendation.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } });
    res.json({ data: { accepted: true } });
  } catch (err) { next(err); }
});

