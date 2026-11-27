import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';
import { getPGlite, withTransaction, resolveStoreId } from '../../lib/db.js';

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

saleRoutes.get('/holds', requirePermission('sales.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const r = await pglite.query(`SELECT * FROM "pos_hold_bills" ORDER BY created_at DESC LIMIT 25`);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

saleRoutes.post('/holds', requirePermission('sales.create'), async (req, res, next) => {
  try {
    const { label, customerId, items } = req.body as { label?: string; customerId?: string; items: any[] };
    if (!Array.isArray(items) || items.length === 0) throw new AppError('Hold bill items are required', 400, 'VALIDATION_ERROR');
    const pglite = getPGlite();
    const id = randomUUID();
    const r = await pglite.query(
      `INSERT INTO "pos_hold_bills" ("id","store_id","label","customer_id","items","actor_id") VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
      [id, req.user!.storeId || 'default', label || `Hold ${new Date().toLocaleTimeString('en-IN')}`, customerId || null, JSON.stringify(items), req.user!.id]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (err) { next(err); }
});

saleRoutes.delete('/holds/:id', requirePermission('sales.create'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    await pglite.query(`DELETE FROM "pos_hold_bills" WHERE id = $1`, [req.params.id]);
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

saleRoutes.post('/eod-close', requirePermission('sales.create'), async (req, res, next) => {
  try {
    const { actualCash, notes } = req.body as { actualCash: number; notes?: string };
    const pglite = getPGlite();
    const statsRes = await pglite.query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(sp.amount),0) as expected_cash
       FROM "sales" s
       LEFT JOIN "sale_payments" sp ON sp.sale_id = s.id AND sp.payment_mode = 'CASH'
       WHERE DATE(s.created_at) = CURRENT_DATE AND s.status NOT IN ('VOID','VOIDED','CANCELLED')`
    );
    const billsCount = Number((statsRes.rows[0] as any)?.cnt || 0);
    const expectedCash = Number((statsRes.rows[0] as any)?.expected_cash || 0);
    const actual = Number(actualCash || 0);
    const variance = actual - expectedCash;
    const id = randomUUID();
    const r = await pglite.query(
      `INSERT INTO "eod_cash_closes" ("id","store_id","bills_count","expected_cash","actual_cash","variance","notes","actor_id")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, req.user!.storeId || 'default', billsCount, expectedCash, actual, variance, notes || null, req.user!.id]
    );
    res.status(201).json({ data: r.rows[0] });
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

    const resolvedStore = await resolveStoreId(storeId);
    const pglite = getPGlite();
    const negSetting = await prisma.setting.findUnique({ where: { key: 'stock.allow_negative' } }).catch(() => null);
    const allowNegative = (negSetting as any)?.value === true || (negSetting as any)?.value === 'true';

    // Validate stock availability
    for (const item of items) {
      const balRes = await pglite.query(`SELECT COALESCE(SUM(quantity),0) as total FROM "stock_balances" WHERE variant_id = $1`, [item.variantId]);
      if (!allowNegative && Number((balRes.rows[0] as any)?.total || 0) < item.quantity) {
        throw new AppError(`Insufficient stock for variant ${item.variantId}`, 400, 'INSUFFICIENT_STOCK');
      }
    }

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + Number(i.sellingPrice ?? (i as any).unitPrice ?? i.mrp ?? 0) * i.quantity, 0);
    const { totalDiscount, appliedOffers } = await applyOffers(subtotal);
    const taxAmount = items.reduce((s, i) => s + Number(i.taxAmount || 0), 0);
    const totalAmount = subtotal - totalDiscount + taxAmount;
    const paidAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
    const creditAmount = Math.max(0, totalAmount - paidAmount);

    const saleResult = await withTransaction(async (tx) => {
      // Lock stock rows with FOR UPDATE so concurrent cashiers cannot oversell the last pair
      const lockedBalances: { item: any; bal: any }[] = [];
      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new AppError('Sale quantity must be a positive whole number', 400, 'INVALID_QUANTITY');
        }
        const balRes = await tx.query(
          `SELECT * FROM "stock_balances" WHERE variant_id = $1 ORDER BY quantity DESC LIMIT 1 FOR UPDATE`,
          [item.variantId]
        );
        const bal = balRes.rows[0] as any;
        const available = Number(bal?.quantity || 0);
        if (!allowNegative && available < item.quantity) {
          throw new AppError(`Insufficient stock for variant ${item.variantId} (available: ${available})`, 400, 'INSUFFICIENT_STOCK');
        }
        lockedBalances.push({ item, bal });
      }

      // Generate invoice number
      let docNumber: string | null = null;
      const dsRes = await tx.query(`SELECT * FROM "document_series" WHERE type = 'SALE' AND store_id = $1 LIMIT 1 FOR UPDATE`, [resolvedStore]);
      if ((dsRes.rows[0] as any)?.id) {
        const ds = dsRes.rows[0] as any;
        const yr = new Date().getFullYear().toString().slice(-2);
        const num = Number(ds.current_number) + 1;
        docNumber = `${ds.prefix}-${yr}-${num}`;
        await tx.query(`UPDATE "document_series" SET current_number = $1 WHERE id = $2`, [num, ds.id]);
      } else {
        docNumber = `INV-${new Date().getFullYear().toString().slice(-2)}-${Date.now().toString().slice(-5)}`;
      }

      const saleId = randomUUID();
      await tx.query(
        `INSERT INTO "sales" ("id","store_id","document_number","customer_id","status","class","subtotal","discount_amount","tax_amount","total_amount","paid_amount","credit_amount","notes","created_by","created_at","updated_at")
         VALUES ($1,$2,$3,$4,'COMPLETED',$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [saleId, resolvedStore, docNumber, customerId || null, saleClass || 'CLASS_A', subtotal, totalDiscount, taxAmount, totalAmount, paidAmount, creditAmount, notes || null, req.user!.id]
      );

      for (const { item, bal } of lockedBalances) {
        const sellingPrice = Number(item.sellingPrice ?? item.unitPrice ?? item.mrp ?? 0);
        const mrp = Number(item.mrp ?? sellingPrice);
        await tx.query(
          `INSERT INTO "sale_items" ("id","sale_id","variant_id","quantity","mrp","selling_price","discount_amount","tax_rate","tax_amount")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [randomUUID(), saleId, item.variantId, item.quantity, mrp, sellingPrice, item.discountAmount || 0, item.taxRate || 0, item.taxAmount || 0]
        );

        if (bal) {
          await tx.query(`UPDATE "stock_balances" SET quantity = quantity - $1 WHERE id = $2`, [item.quantity, bal.id]);
          await tx.query(
            `INSERT INTO "stock_movements" ("id","store_id","variant_id","location_id","type","quantity","reference_id","reference_type","actor_id","created_at")
             VALUES ($1,$2,$3,$4,'SALE',$5,$6,'SALE',$7,CURRENT_TIMESTAMP)`,
            [randomUUID(), resolvedStore, item.variantId, bal.location_id, -item.quantity, saleId, req.user!.id]
          );
        }
      }

      for (const payment of payments) {
        await tx.query(
          `INSERT INTO "sale_payments" ("id","sale_id","payment_mode","amount","reference")
           VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), saleId, payment.paymentMode || (payment as any).mode || 'CASH', payment.amount, payment.reference || null]
        );
      }

      // Post balanced journal: Dr Cash/Bank, Cr Sales Revenue
      const cashAccRes = await tx.query(`SELECT id, code, name FROM "accounts" WHERE "code" = '1000' LIMIT 1`);
      const salesAccRes = await tx.query(`SELECT id, code, name FROM "accounts" WHERE "code" = '4000' LIMIT 1`);
      const cashAcc = cashAccRes.rows[0] as any;
      const salesAcc = salesAccRes.rows[0] as any;
      if (cashAcc?.id && salesAcc?.id) {
        const entryId = randomUUID();
        await tx.query(
          `INSERT INTO "journal_entries" ("id","store_id","reference","reference_type","reference_id","type","status","total_debit","total_credit","notes","posted_by","posted_at","created_at","updated_at")
           VALUES ($1,$2,$3,'SALE',$4,'SALE','POSTED',$5,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [entryId, resolvedStore, docNumber, saleId, totalAmount, `Sale ${docNumber}`, req.user!.id]
        );
        await tx.query(`INSERT INTO "journal_lines" ("id","journal_entry_id","entry_id","account_id","account_code","account_name","type","amount","debit","credit","description") VALUES ($1,$2,$2,$3,$4,$5,'DEBIT',$6,$6,0,'Sale receipt')`, [randomUUID(), entryId, cashAcc.id, cashAcc.code || '1000', cashAcc.name || 'Cash', totalAmount]);
        await tx.query(`INSERT INTO "journal_lines" ("id","journal_entry_id","entry_id","account_id","account_code","account_name","type","amount","debit","credit","description") VALUES ($1,$2,$2,$3,$4,$5,'CREDIT',$6,0,$6,'Sales revenue')`, [randomUUID(), entryId, salesAcc.id, salesAcc.code || '4000', salesAcc.name || 'Sales Revenue', totalAmount]);
      }

      // Audit log
      await tx.query(
        `INSERT INTO "audit_logs" ("id","entity","entity_id","action","user_id","after_state","created_at")
         VALUES ($1,'Sale',$2,'CREATE',$3,$4::jsonb,CURRENT_TIMESTAMP)`,
        [randomUUID(), saleId, req.user!.id, JSON.stringify({ documentNumber: docNumber, totalAmount })]
      );

      // Record offer redemptions
      for (const { offer, discount } of appliedOffers) {
        await tx.query(
          `INSERT INTO "offer_redemptions" ("id","offer_id","sale_id","discount_amount","created_at")
           VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)`,
          [randomUUID(), offer.id, saleId, discount]
        );
      }

      return { id: saleId, document_number: docNumber, documentNumber: docNumber, totalAmount, status: 'COMPLETED' };
    });

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

    res.status(201).json({ data: { ...saleResult, appliedOffers: appliedOffers.map(a => ({ name: a.offer.name, discount: a.discount })) } });
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



