import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import * as ctrl from './controller.js';

export const roleRoutes = Router();
roleRoutes.use(authenticate);

roleRoutes.get('/permissions', ctrl.listPermissions);
roleRoutes.get('/', requirePermission('roles.view'), ctrl.listRoles);
roleRoutes.get('/:id', requirePermission('roles.view'), ctrl.getRole);
roleRoutes.post('/', requirePermission('roles.create'), ctrl.createRole);
roleRoutes.put('/:id', requirePermission('roles.edit'), ctrl.updateRole);
roleRoutes.post('/:id/clone', requirePermission('roles.create'), ctrl.cloneRole);
roleRoutes.put('/:id/permissions', requirePermission('roles.edit'), ctrl.setPermissions);
roleRoutes.delete('/:id', requirePermission('roles.delete'), ctrl.deleteRole);

