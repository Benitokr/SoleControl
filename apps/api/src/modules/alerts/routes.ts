import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { getPGlite } from '../../lib/db.js';
import { randomUUID } from 'crypto';

export const alertRoutes = Router();
alertRoutes.use(requireAuth);

// GET / - fetch latest notifications
alertRoutes.get('/', requirePermission('audit.view'), async (_req, res, next) => {
  try {
    const list = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

// POST /:id/read - mark notification as read
alertRoutes.post('/:id/read', requirePermission('audit.edit'), async (req, res, next) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - delete notification
alertRoutes.delete('/:id', requirePermission('audit.delete'), async (req, res, next) => {
  try {
    const deleted = await prisma.notification.delete({
      where: { id: req.params.id },
    });
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
});

// GET /rules - list alert rules
alertRoutes.get('/rules', requirePermission('audit.view'), async (_req, res, next) => {
  try {
    const rules = await prisma.alertRule.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
});

// POST /rules - create alert rule
alertRoutes.post('/rules', requirePermission('audit.create'), async (req, res, next) => {
  try {
    const { code, name, condition, isActive } = req.body;
    const rule = await prisma.alertRule.create({
      data: {
        id: randomUUID(),
        code: code || `RULE-${Date.now()}`,
        name,
        condition: condition ?? {},
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.status(201).json({ data: rule });
  } catch (err) {
    next(err);
  }
});

// GET /audit-log - raw SQL query for audit logs with user names
alertRoutes.get('/audit-log', requirePermission('audit.view'), async (req, res, next) => {
  try {
    const pglite = getPGlite();
    const { entity, action } = req.query as Record<string, string>;
    let query = `
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (entity) {
      query += ` AND al.entity = $${idx++}`;
      params.push(entity);
    }
    if (action) {
      query += ` AND al.action = $${idx++}`;
      params.push(action);
    }
    query += ` ORDER BY al.created_at DESC LIMIT 200`;

    const result = await pglite.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /sessions - active user sessions
alertRoutes.get('/sessions', requirePermission('users.view'), async (_req, res, next) => {
  try {
    const pglite = getPGlite();
    // Query user_sessions joined with users
    const result = await pglite.query(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM user_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/revoke - revoke session
alertRoutes.post('/sessions/:id/revoke', requirePermission('users.edit'), async (req, res, next) => {
  try {
    const updated = await prisma.userSession.update({
      where: { id: req.params.id },
      data: { revokedAt: new Date() },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
