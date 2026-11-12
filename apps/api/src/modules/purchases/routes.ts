import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

export const purchaseRoutes = Router();
purchaseRoutes.use(authenticate);

// ─── StockService ─────────────────────────────────────────────────────────────
async function adjustStock(params: {
  storeId: string; variantId: string; locationId?: string;
  delta: number; type: string; referenceType: string; referenceId: string;
  note?: string; actorId?: string;
}) {
  // Create movement (append-only)
  await prisma.stockMovement.create({
    data: {
      storeId: params.storeId, variantId: params.variantId, locationId: params.locationId,
      type: params.type, quantity: params.delta,
      referenceType: params.referenceType, referenceId: params.referenceId,
      note: params.note, actorId: params.actorId,
    },
  });
  // Upsert balance
  const existing = await prisma.stockBalance.findFirst({
    where: { storeId: params.storeId, variantId: params.variantId, locationId: params.locationId || null },
  } as any);
  if (existing) {
    await prisma.stockBalance.update({
      where: { id: (existing as any).id },
      data: { quantity: (existing as any).quantity + params.delta },
    } as any);
  } else {
    await prisma.stockBalance.create({
      data: { storeId: params.storeId, variantId: params.variantId, locationId: params.locationId, quantity: params.delta },
    });
  }
}

// ─── PostingService ───────────────────────────────────────────────────────────
async function postPurchaseJournal(purchase: any, storeId: string) {
  const entry = await prisma.journalEntry.create({
    data: { storeId, referenceType: 'PURCHASE', referenceId: purchase.id, description: `Purchase ${purchase.documentNumber || purchase.billNumber}`, isPosted: true },
  });
  const total = Number(purchase.totalAmount);
  const taxAmt = Number(purchase.taxAmount);
  const netCost = total - taxAmt;
  // Dr: Stock (net cost), Dr: Input GST (tax), Cr: Vendor (total)
  await prisma.journalLine.create({ data: { journalEntryId: (entry as any).id, accountCode: '1300', accountName: 'Stock / Inventory', debit: netCost, credit: 0 } });
  if (taxAmt > 0) {
    await prisma.journalLine.create({ data: { journalEntryId: (entry as any).id, accountCode: '2110', accountName: 'Input GST', debit: taxAmt, credit: 0 } });
  }
  await prisma.journalLine.create({ data: { journalEntryId: (entry as any).id, accountCode: '2010', accountName: 'Vendor Payable', debit: 0, credit: total } });
}

// ─── PURCHASE ROUTES ─────────────────────────────────────────────────────────
const PurchaseItemSchema = z.object({
  variantId: z.string(), quantity: z.number().int().min(0),
  costPrice: z.number().min(0), mrp: z.number().min(0), sellingPrice: z.number().min(0),
  taxRate: z.number().default(0), discountAmount: z.number().default(0),
  rackLocationId: z.string().optional(),
});

const CreatePurchaseSchema = z.object({
  vendorId: z.string(), billDate: z.string(),
  billNumber: z.string().optional(), class: z.enum(['CLASS_A', 'CLASS_B']).default('CLASS_A'),
  freight: z.number().default(0), packaging: z.number().default(0), otherExpenses: z.number().default(0),
  discountAmount: z.number().default(0), landedCostMethod: z.enum(['VALUE', 'QUANTITY', 'EQUAL']).default('VALUE'),
  notes: z.string().optional(),
  items: z.array(PurchaseItemSchema).default([]),
});

// List purchases
purchaseRoutes.get('/', requirePermission('purchases.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status, vendorId, class: cls, fromDate, toDate } = req.query as any;
    const where: any = { storeId: req.user!.storeId };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (cls) where.class = cls;
    const skip = (+page - 1) * +limit;
    const [items, total] = await Promise.all([
      prisma.purchase.findMany({ where, skip, take: +limit, orderBy: { createdAt: 'desc' } }),
      prisma.purchase.count({ where }),
    ]);
    return res.json({ data: items, meta: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } });
  } catch (err) { next(err); }
});

// Get purchase detail
purchaseRoutes.get('/:id', requirePermission('purchases.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase) throw new AppError('Purchase not found.', 404, 'NOT_FOUND');
    const items = await prisma.purchaseItem.findMany({ where: { purchaseId: req.params.id } });
    // Enrich items with variant info
    for (const item of items as any[]) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId }, include: { size: true, colour: true, article: true } });
      item.variant = variant;
    }
    return res.json({ data: { ...purchase, items } });
  } catch (err) { next(err); }
});

// Create draft purchase
purchaseRoutes.post('/', requirePermission('purchases.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CreatePurchaseSchema.parse(req.body);
    const store = await prisma.store.findFirst({ where: { isActive: true } });
    if (!store) throw new AppError('No active store found.', 400, 'NO_STORE');

    // Calculate totals
    let subtotal = 0, taxAmount = 0;
    const itemsWithTax = body.items.map(item => {
      const lineSubtotal = item.quantity * item.costPrice;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      const lineTaxAmt = Math.round(lineTax * 100) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTaxAmt;
      return { ...item, taxAmount: lineTaxAmt };
    });

    const expenses = body.freight + body.packaging + body.otherExpenses;
    const totalAmount = subtotal + taxAmount + expenses - body.discountAmount;

    const purchase = await prisma.purchase.create({
      data: {
        storeId: (store as any).id, vendorId: body.vendorId,
        billDate: new Date(body.billDate), billNumber: body.billNumber,
        class: body.class, status: 'DRAFT',
        subtotal, taxAmount, freight: body.freight, packaging: body.packaging,
        otherExpenses: body.otherExpenses, discountAmount: body.discountAmount,
        totalAmount, landedCostMethod: body.landedCostMethod, notes: body.notes,
      },
    });

    // Create items
    for (const item of itemsWithTax) {
      await prisma.purchaseItem.create({
        data: {
          purchaseId: (purchase as any).id,
          variantId: item.variantId, quantity: item.quantity,
          costPrice: item.costPrice, mrp: item.mrp, sellingPrice: item.sellingPrice,
          taxRate: item.taxRate, taxAmount: item.taxAmount, discountAmount: item.discountAmount,
          rackLocationId: item.rackLocationId,
        },
      });
    }

    await prisma.auditLog.create({ data: { entity: 'Purchase', entityId: (purchase as any).id, action: 'CREATE_DRAFT', actorId: req.user!.id, afterState: { total: totalAmount } } });
    return res.status(201).json({ data: purchase });
  } catch (err) { next(err); }
});

// Update draft purchase
purchaseRoutes.put('/:id', requirePermission('purchases.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Purchase not found.', 404, 'NOT_FOUND');
    if ((existing as any).status !== 'DRAFT') throw new AppError('Only DRAFT purchases can be edited.', 400, 'NOT_DRAFT');

    const body = CreatePurchaseSchema.partial().parse(req.body);

    if (body.items !== undefined) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: req.params.id } });
      let subtotal = 0, taxAmount = 0;
      for (const item of body.items) {
        const lineTaxAmt = Math.round(item.quantity * item.costPrice * (item.taxRate / 100) * 100) / 100;
        subtotal += item.quantity * item.costPrice;
        taxAmount += lineTaxAmt;
        await prisma.purchaseItem.create({
          data: { purchaseId: req.params.id, variantId: item.variantId, quantity: item.quantity, costPrice: item.costPrice, mrp: item.mrp, sellingPrice: item.sellingPrice, taxRate: item.taxRate, taxAmount: lineTaxAmt, discountAmount: item.discountAmount, rackLocationId: item.rackLocationId },
        });
      }
      const expenses = (body.freight || 0) + (body.packaging || 0) + (body.otherExpenses || 0);
      const totalAmount = subtotal + taxAmount + expenses - (body.discountAmount || 0);
      await prisma.purchase.update({ where: { id: req.params.id }, data: { subtotal, taxAmount, totalAmount } } as any);
    }

    const updated = await prisma.purchase.update({ where: { id: req.params.id }, data: { billNumber: body.billNumber, notes: body.notes, freight: body.freight, packaging: body.packaging, otherExpenses: body.otherExpenses, discountAmount: body.discountAmount } } as any);
    return res.json({ data: updated });
  } catch (err) { next(err); }
});

// Finalise purchase (transaction: stock, barcodes, vendor payable, journal)
purchaseRoutes.post('/:id/finalise', requirePermission('purchases.approve'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase) throw new AppError('Purchase not found.', 404, 'NOT_FOUND');
    if ((purchase as any).status !== 'DRAFT') throw new AppError('Purchase is not in DRAFT status.', 400, 'NOT_DRAFT');

    const items = await prisma.purchaseItem.findMany({ where: { purchaseId: req.params.id } });

    // Generate doc number
    const docSeries = await prisma.documentSeries.findFirst({ where: { type: 'PURCHASE_BILL', storeId: (purchase as any).storeId } } as any);
    const docNumber = docSeries ? `${(docSeries as any).prefix}${(docSeries as any).currentNumber}` : `PUR-${Date.now()}`;
    if (docSeries) {
      await prisma.documentSeries.update({ where: { id: (docSeries as any).id }, data: { currentNumber: (docSeries as any).currentNumber + 1 } } as any);
    }

    // 1. Move stock
    for (const item of items as any[]) {
      if (item.quantity > 0) {
        await adjustStock({
          storeId: (purchase as any).storeId, variantId: item.variantId,
          locationId: item.rackLocationId || undefined, delta: item.quantity,
          type: 'PURCHASE', referenceType: 'Purchase', referenceId: (purchase as any).id,
          actorId: req.user!.id,
        });
      }
    }

    // 2. Vendor payable (update outstanding balance)
    const total = Number((purchase as any).totalAmount);
    const vendor = await prisma.vendor.findUnique({ where: { id: (purchase as any).vendorId } });
    if (vendor) {
      const newBalance = Number((vendor as any).outstandingBalance) + total;
      await prisma.vendor.update({ where: { id: (purchase as any).vendorId }, data: { outstandingBalance: newBalance } } as any);
    }

    // 3. Post journal
    const updatedPurchase = await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: 'FINALISED', documentNumber: docNumber, finalisedAt: new Date(), finalisedBy: req.user!.id },
    } as any);
    await postPurchaseJournal(updatedPurchase, (purchase as any).storeId);

    // 4. Queue barcode labels
    for (const item of items as any[]) {
      if (item.quantity > 0) {
        await prisma.barcodeLabel.create({
          data: { variantId: item.variantId, storeId: (purchase as any).storeId, quantity: item.quantity, status: 'PENDING', referenceType: 'Purchase', referenceId: (purchase as any).id },
        });
      }
    }

    await prisma.auditLog.create({ data: { entity: 'Purchase', entityId: req.params.id, action: 'FINALISE', actorId: req.user!.id, afterState: { documentNumber: docNumber, total } } });
    return res.json({ data: { ...updatedPurchase, message: 'Purchase finalised successfully.' } });
  } catch (err) { next(err); }
});

// Purchase return
purchaseRoutes.post('/:id/return', requirePermission('purchases.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const original = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!original) throw new AppError('Purchase not found.', 404, 'NOT_FOUND');
    if ((original as any).status !== 'FINALISED') throw new AppError('Can only return FINALISED purchases.', 400, 'NOT_FINALISED');

    const { items, reason } = req.body;
    // Create return purchase
    const returnPurchase = await prisma.purchase.create({
      data: { storeId: (original as any).storeId, vendorId: (original as any).vendorId, billDate: new Date(), class: (original as any).class, status: 'RETURNED', notes: `Return of ${(original as any).documentNumber}. Reason: ${reason}`, totalAmount: 0 },
    });

    let returnTotal = 0;
    for (const ri of (items || [])) {
      const qty = ri.quantity || 0;
      if (qty <= 0) continue;
      const origItem = await prisma.purchaseItem.findFirst({ where: { purchaseId: req.params.id, variantId: ri.variantId } } as any);
      if (!origItem) continue;
      const lineTotal = qty * Number((origItem as any).costPrice);
      returnTotal += lineTotal;
      await prisma.purchaseItem.create({ data: { purchaseId: (returnPurchase as any).id, variantId: ri.variantId, quantity: qty, costPrice: (origItem as any).costPrice, mrp: (origItem as any).mrp, sellingPrice: (origItem as any).sellingPrice } });
      // Reverse stock
      await adjustStock({ storeId: (original as any).storeId, variantId: ri.variantId, delta: -qty, type: 'RETURN_OUT', referenceType: 'PurchaseReturn', referenceId: (returnPurchase as any).id, actorId: req.user!.id });
    }
    // Update totals and vendor balance
    await prisma.purchase.update({ where: { id: (returnPurchase as any).id }, data: { totalAmount: returnTotal } } as any);
    const vendor = await prisma.vendor.findUnique({ where: { id: (original as any).vendorId } });
    if (vendor) {
      await prisma.vendor.update({ where: { id: (original as any).vendorId }, data: { outstandingBalance: Math.max(0, Number((vendor as any).outstandingBalance) - returnTotal) } } as any);
    }

    await prisma.auditLog.create({ data: { entity: 'Purchase', entityId: (returnPurchase as any).id, action: 'RETURN', actorId: req.user!.id, afterState: { originalId: req.params.id, total: returnTotal } } });
    const finalReturn = await prisma.purchase.findUnique({ where: { id: (returnPurchase as any).id } });
    return res.status(201).json({ data: finalReturn });
  } catch (err) { next(err); }
});

// Stock balance check
purchaseRoutes.get('/stock/check', requirePermission('inventory.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user!.storeId;
    const balances = await prisma.stockBalance.findMany({ where: { storeId } });
    // Consistency check: sum of movements should equal balance
    const issues = [];
    for (const bal of balances as any[]) {
      const movements = await prisma.stockMovement.findMany({ where: { storeId, variantId: bal.variantId, locationId: bal.locationId || null } } as any);
      const sumMvt = (movements as any[]).reduce((s, m) => s + Number(m.quantity), 0);
      if (Math.abs(sumMvt - bal.quantity) > 0.001) {
        issues.push({ variantId: bal.variantId, balance: bal.quantity, sumMovements: sumMvt });
      }
    }
    return res.json({ data: { consistent: issues.length === 0, issues } });
  } catch (err) { next(err); }
});

