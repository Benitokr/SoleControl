import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { auditController } from './controller.js';

export const auditRoutes = Router();
auditRoutes.use(authenticate);

auditRoutes.get('/', requirePermission('audit.view'), (req, res, next) => auditController.list(req, res, next));

