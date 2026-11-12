import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { getPGlite } from '../../lib/db.js';

export const saleRoutes = Router();
saleRoutes.use(requireAuth);

/** Check sales.admin_entry_enabled setting — throws 403 if disabled */
async function checkSalesEnabled(): Promise<void> {
  const setting = await prisma.setting.findUnique({ where: { key: 'sales.admin_entry_enabled' } });
  const raw = (setting as any)?.value;
  const enabled = raw === undefined || raw === null || raw === true || raw === 'true' || raw === 1;
  if (!enabled) throw new AppError('Sales entry is disabled for Super Admin.', 403, 'ADMIN_SALE_DISABLED');
}

/** Apply active offers to items, return total discount and list of redemptions */
async function applyOffers(subtotal: number): Promise<{ totalDiscount: number; appliedOffers: { offer: any; discount: number }[] }> {
  const now = new Date();
  const allOffers = await prisma.offer.findMany({ where: { isActive: true } });
  const active = (allOffers as any[])
    .filter(o => {
      const from = new Date(o.validFrom);
      const until = o.validUntil ? new Date(o.validUntil) : null;
      return from <= now && (!until || until >= now) && subtotal >= Number(o.minAmount || 0);
    })
    .sort((a, b) => b.priority - a.priority);

  let totalDiscount = 0;
  const appliedOffers: { offer: any; discount: number }[] = [];

  for (const offer of active) {
    if (offer.discountType === 'PERCENTAGE') {
      const discount = subtotal * (Number(offer.discountValue) / 100);
      totalDiscount += discount;
      appliedOffers.push({ offer, discount });
    } else if (offer.discountType === 'FLAT') {
      const discount = Math.min(Number(offer.discountValue), subtotal - totalDiscount);
      if (discount > 0) { totalDiscount += discount; appliedOffers.push({ offer, discount }); }
    }
  }

  return { totalDiscount, appliedOffers };
}

saleRoutes.get('/', requirePermission('sales.view'), async (req, res, next) => {
  try {
    const { page = '1', pageSize = '50', status, customerId } = req.query as Record<string, string>;
    const pg = Number(page);
    const ps = Number(pageSize);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (pg - 1) * ps, take: ps }),
      prisma.sale.count({ where }),
    ]);
    res.json({ data: sales, meta: { total, page: pg, pageSize: ps } });
  } catch (err) { next(err); }
});

saleRoutes.get('/:id', requirePermission('sales.view'), async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
    if (!sale) throw new AppError('Sale not found', 404, 'NOT_FOUND');
    const [items, payments] = await Promise.all([
      prisma.saleItem.findMany({ where: { saleId: req.params.id } }),
      prisma.salePayment.findMany({ where: { saleId: req.params.id } }),
    ]);
    res.json({ data: { ...sale, items, payments } });
  } catch (err) { next(err); }
});

saleRoutes.post('/', requirePermission('sales.create'), async (req, res, next) => {
  try {
    await checkSalesEnabled();

    const { storeId, customerId, items, payments, notes, class: saleClass } = req.body as {
      storeId?: string;
      customerId?: string;
      items: { variantId: string; quantity: number; mrp: number; sellingPrice: number; discountAmount?: number; taxRate?: number; taxAmount?: number }[];
      payments: { paymentMode: string; amount: number; reference?: string }[];
      notes?: string;
      class?: string;
    };
    if (!items?.length || !payments?.length) {
      throw new AppError('items and payments are required', 400, 'VALIDATION_ERROR');
    }

    const resolvedStore = storeId || 'default';
    const pglite = getPGlite();

    // Validate stock availability
    for (const item of items) {
      const balRes = await pglite.query(`SELECT COALESCE(SUM(quantity),0) as total FROM "stock_balances" WHERE variant_id = $1`, [item.variantId]);
      if (Number((balRes.rows[0] as any)?.total || 0) < item.quantity) {
        throw new AppError(`Insufficient stock for variant ${item.variantId}`, 400, 'INSUFFICIENT_STOCK');
      }
    }

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + Number(i.sellingPrice) * i.quantity, 0);
    const { totalDiscount, appliedOffers } = await applyOffers(subtotal);
    const taxAmount = items.reduce((s, i) => s + Number(i.taxAmount || 0), 0);
    const totalAmount = subtotal - totalDiscount + taxAmount;
    const paidAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
    const creditAmount = Math.max(0, totalAmount - paidAmount);

    // Generate document number
    let docNumber: string | null = null;
    const dsRes = await pglite.query(`SELECT * FROM "document_series" WHERE type = 'SALE' AND store_id = $1 LIMIT 1`, [resolvedStore]);
    if ((dsRes.rows[0] as any)?.id) {
      const ds = dsRes.rows[0] as any;
      const yr = new Date().getFullYear().toString().slice(-2);
      const num = ds.current_number + 1;
      docNumber = `${ds.prefix}-${yr}-${num}`;
      await pglite.query(`UPDATE "document_series" SET current_number = $1 WHERE id = $2`, [num, ds.id]);
    }

    const saleId = randomUUID();
    const sale = await prisma.sale.create({
      data: {
        id: saleId,
        storeId: resolvedStore,
        documentNumber: docNumber,
        customerId,
        status: 'COMPLETED',
        class: saleClass || 'CLASS_A',
        subtotal,
        discountAmount: totalDiscount,
        taxAmount,
        totalAmount,
        paidAmount,
        creditAmount,
        notes,
        actorId: req.user!.id,
      },
    });

    // Create sale items and write stock movements
    for (const item of items) {
      await prisma.saleItem.create({
        data: { id: randomUUID(), saleId, variantId: item.variantId, quantity: item.quantity, mrp: item.mrp, sellingPrice: item.sellingPrice, discountAmount: item.discountAmount || 0, taxRate: item.taxRate || 0, taxAmount: item.taxAmount || 0 },
      });

      // Deduct from first available stocked location
      const balRes = await pglite.query(`SELECT * FROM "stock_balances" WHERE variant_id = $1 AND quantity > 0 ORDER BY quantity DESC LIMIT 1`, [item.variantId]);
      if (balRes.rows[0]) {
        const bal = balRes.rows[0] as any;
        await pglite.query(`UPDATE "stock_balances" SET quantity = quantity - $1 WHERE id = $2`, [item.quantity, bal.id]);
        await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: resolvedStore, variantId: item.variantId, locationId: bal.location_id, type: 'SALE', quantity: -item.quantity, referenceId: saleId, referenceType: 'SALE', actorId: req.user!.id } });
      }
    }

    // Create payment records
    for (const payment of payments) {
      await prisma.salePayment.create({ data: { id: randomUUID(), saleId, paymentMode: payment.paymentMode || 'CASH', amount: payment.amount, reference: payment.reference } });
    }

    // Post journal: Dr Cash/Bank, Cr Sales
    const cashAccRes = await pglite.query(`SELECT id FROM "accounts" WHERE "code" = '1000' LIMIT 1`);
    const salesAccRes = await pglite.query(`SELECT id FROM "accounts" WHERE "code" = '4000' LIMIT 1`);
    if ((cashAccRes.rows[0] as any)?.id && (salesAccRes.rows[0] as any)?.id) {
      const entryId = randomUUID();
      await pglite.query(
        `INSERT INTO "journal_entries" ("id","store_id","reference","type","status","total_debit","total_credit","notes","posted_by","posted_at","created_at","updated_at") VALUES ($1,$2,$3,'SALE','POSTED',$4,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [entryId, resolvedStore, docNumber || saleId, totalAmount, `Sale ${docNumber || saleId}`, req.user!.id]
      );
      await pglite.query(`INSERT INTO "journal_lines" ("id","entry_id","account_id","type","amount","description") VALUES (gen_random_uuid()::text,$1,$2,'DEBIT',$3,'Sale receipt')`, [entryId, (cashAccRes.rows[0] as any).id, totalAmount]);
      await pglite.query(`INSERT INTO "journal_lines" ("id","entry_id","account_id","type","amount","description") VALUES (gen_random_uuid()::text,$1,$2,'CREDIT',$3,'Sales revenue')`, [entryId, (salesAccRes.rows[0] as any).id, totalAmount]);
    }

    // Record offer redemptions
    for (const { offer, discount } of appliedOffers) {
      await prisma.offerRedemption.create({ data: { id: randomUUID(), offerId: offer.id, saleId, discountAmount: discount } });
    }

    // Update customer LTV and credit outstanding
    if (customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: customerId } });
      if (cust) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { lifetimeValue: Number((cust as any).lifetimeValue) + totalAmount, creditOutstanding: Number((cust as any).creditOutstanding) + creditAmount },
        });
      }
    }

    res.status(201).json({ data: { ...sale, appliedOffers: appliedOffers.map(a => ({ name: a.offer.name, discount: a.discount })) } });
  } catch (err) { next(err); }
});

saleRoutes.post('/:id/return', requirePermission('sales.create'), async (req, res, next) => {
  try {
    await checkSalesEnabled();

    const { items, refundMode, notes } = req.body as {
      items: { saleItemId: string; variantId: string; quantity: number; amount: number }[];
      refundMode?: string;
      notes?: string;
    };
    if (!items?.length) throw new AppError('items are required', 400, 'VALIDATION_ERROR');

    const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
    if (!sale) throw new AppError('Sale not found', 404, 'NOT_FOUND');
    if ((sale as any).status === 'VOIDED') throw new AppError('Cannot return a voided sale', 400, 'INVALID_STATE');

    const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0);
    const pglite = getPGlite();

    const saleReturn = await prisma.saleReturn.create({
      data: { id: randomUUID(), saleId: req.params.id, storeId: (sale as any).storeId, totalAmount, refundMode: refundMode || 'CASH', notes, actorId: req.user!.id },
    });

    for (const item of items) {
      await prisma.saleReturnItem.create({
        data: { id: randomUUID(), returnId: saleReturn.id, saleItemId: item.saleItemId || '', variantId: item.variantId, quantity: item.quantity, amount: item.amount },
      });

      // Return stock to first available location for this store
      const locRes = await pglite.query(`SELECT id FROM "locations" WHERE store_id = $1 ORDER BY created_at LIMIT 1`, [(sale as any).storeId]);
      const locationId = (locRes.rows[0] as any)?.id || (sale as any).storeId;
      const balRes = await pglite.query(`SELECT * FROM "stock_balances" WHERE variant_id = $1 AND location_id = $2 LIMIT 1`, [item.variantId, locationId]);
      if (balRes.rows[0]) {
        await pglite.query(`UPDATE "stock_balances" SET quantity = quantity + $1 WHERE id = $2`, [item.quantity, (balRes.rows[0] as any).id]);
      } else {
        await pglite.query(`INSERT INTO "stock_balances" ("id","variant_id","location_id","quantity") VALUES ($1,$2,$3,$4)`, [randomUUID(), item.variantId, locationId, item.quantity]);
      }
      await prisma.stockMovement.create({ data: { id: randomUUID(), storeId: (sale as any).storeId, variantId: item.variantId, locationId, type: 'RETURN_IN', quantity: item.quantity, referenceId: saleReturn.id, referenceType: 'SALE_RETURN', actorId: req.user!.id } });
    }

    // Post reversal journal
    const cashAccRes = await pglite.query(`SELECT id FROM "accounts" WHERE "code" = '1000' LIMIT 1`);
    const salesAccRes = await pglite.query(`SELECT id FROM "accounts" WHERE "code" = '4000' LIMIT 1`);
    if ((cashAccRes.rows[0] as any)?.id && (salesAccRes.rows[0] as any)?.id) {
      const entryId = randomUUID();
      await pglite.query(
        `INSERT INTO "journal_entries" ("id","store_id","reference","type","status","total_debit","total_credit","notes","posted_by","posted_at","created_at","updated_at") VALUES ($1,$2,$3,'SALE_RETURN','POSTED',$4,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [entryId, (sale as any).storeId, `RET-${saleReturn.id.slice(0, 8)}`, totalAmount, `Return for sale ${req.params.id}`, req.user!.id]
      );
      await pglite.query(`INSERT INTO "journal_lines" ("id","entry_id","account_id","type","amount","description") VALUES (gen_random_uuid()::text,$1,$2,'DEBIT',$3,'Return refund')`, [entryId, (salesAccRes.rows[0] as any).id, totalAmount]);
      await pglite.query(`INSERT INTO "journal_lines" ("id","entry_id","account_id","type","amount","description") VALUES (gen_random_uuid()::text,$1,$2,'CREDIT',$3,'Refund paid')`, [entryId, (cashAccRes.rows[0] as any).id, totalAmount]);
    }

    res.status(201).json({ data: saleReturn });
  } catch (err) { next(err); }
});

saleRoutes.post('/:id/void', requirePermission('sales.approve'), async (req, res, next) => {
  try {
    const { reason } = req.body as { reason?: string };
    const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
    if (!sale) throw new AppError('Sale not found', 404, 'NOT_FOUND');
    if ((sale as any).status === 'VOIDED') throw new AppError('Sale is already voided', 400, 'INVALID_STATE');

    await prisma.sale.update({ where: { id: req.params.id }, data: { status: 'VOIDED', voidedAt: new Date(), voidedBy: req.user!.id, voidReason: reason } });
    res.json({ data: { voided: true } });
  } catch (err) { next(err); }
});



