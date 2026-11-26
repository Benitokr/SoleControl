import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPGlite } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';

export const vendorRoutes = Router();
vendorRoutes.use(authenticate);

const VendorSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  panNumber: z.string().optional(),
  balance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

vendorRoutes.get('/', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getPGlite();
    const { search, isActive } = req.query as any;
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR gstin ILIKE $${params.length})`;
    }
    if (isActive !== undefined) {
      params.push(isActive === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    const vendors = (result.rows || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      code: v.code,
      contactPerson: v.contact_person,
      phone: v.phone,
      email: v.email,
      address: v.address,
      gstin: v.gstin,
      pan: v.pan,
      balance: Number(v.balance || 0),
      isActive: Boolean(v.is_active ?? true),
      createdAt: v.created_at,
    }));
    return res.json({ data: vendors, meta: { total: vendors.length } });
  } catch (err) { next(err); }
});

vendorRoutes.get('/:id', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getPGlite();
    const result = await db.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (!result.rows || result.rows.length === 0) throw new AppError('Vendor not found.', 404, 'NOT_FOUND');
    const v: any = result.rows[0];
    return res.json({
      data: {
        id: v.id,
        name: v.name,
        code: v.code,
        contactPerson: v.contact_person,
        phone: v.phone,
        email: v.email,
        address: v.address,
        gstin: v.gstin,
        pan: v.pan,
        balance: Number(v.balance || 0),
        isActive: Boolean(v.is_active ?? true),
        createdAt: v.created_at,
      }
    });
  } catch (err) { next(err); }
});

vendorRoutes.post('/', requirePermission('vendors.create'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = VendorSchema.parse(req.body);
    const db = getPGlite();
    const id = req.body.id || ('vnd-' + Date.now());
    const code = body.code || ('VND-' + Math.random().toString(36).substring(2, 7).toUpperCase());
    const pan = body.pan || body.panNumber || null;
    const balance = body.balance || 0;
    const isActive = body.isActive !== false;

    await db.query(
      `INSERT INTO vendors (id, name, code, contact_person, phone, email, gstin, pan, address, balance, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         gstin = EXCLUDED.gstin,
         address = EXCLUDED.address,
         contact_person = EXCLUDED.contact_person,
         updated_at = CURRENT_TIMESTAMP`,
      [id, body.name.trim(), code, body.contactPerson || null, body.phone || null, body.email || null, body.gstin || null, pan, body.address || null, balance, isActive]
    );

    const vendor = {
      id,
      name: body.name.trim(),
      code,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      address: body.address,
      gstin: body.gstin,
      pan,
      balance,
      isActive,
      createdAt: new Date().toISOString()
    };
    return res.status(201).json({ data: vendor });
  } catch (err) { next(err); }
});

vendorRoutes.put('/:id', requirePermission('vendors.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = VendorSchema.partial().parse(req.body);
    const db = getPGlite();
    await db.query(
      `UPDATE vendors SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        gstin = COALESCE($3, gstin),
        address = COALESCE($4, address),
        contact_person = COALESCE($5, contact_person),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [body.name, body.phone, body.gstin, body.address, body.contactPerson, body.isActive, req.params.id]
    );
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

vendorRoutes.post('/:id/deactivate', requirePermission('vendors.edit'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getPGlite();
    await db.query('UPDATE vendors SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    return res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// Vendor statement — purchases and payments
vendorRoutes.get('/:id/statement', requirePermission('vendors.view'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getPGlite();
    const vRes = await db.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (!vRes.rows || vRes.rows.length === 0) throw new AppError('Vendor not found.', 404, 'NOT_FOUND');
    const pRes = await db.query('SELECT * FROM purchases WHERE vendor_id = $1 ORDER BY created_at DESC', [req.params.id]);
    return res.json({ data: { vendor: vRes.rows[0], purchases: pRes.rows || [], totalPurchases: (pRes.rows || []).length } });
  } catch (err) { next(err); }
});

