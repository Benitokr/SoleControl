import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import * as ctrl from './controller.js';

export const userRoutes = Router();
userRoutes.use(authenticate);

userRoutes.get('/', requirePermission('users.view'), ctrl.listUsers);
userRoutes.get('/:id', requirePermission('users.view'), ctrl.getUser);
userRoutes.post('/', requirePermission('users.create'), ctrl.createUser);
userRoutes.put('/:id', requirePermission('users.edit'), ctrl.updateUser);
userRoutes.post('/:id/deactivate', requirePermission('users.edit'), ctrl.deactivateUser);
userRoutes.post('/:id/reactivate', requirePermission('users.edit'), ctrl.reactivateUser);
userRoutes.post('/:id/unlock', requirePermission('users.edit'), ctrl.unlockUser);
userRoutes.post('/:id/reset-password', requirePermission('users.edit'), ctrl.resetPassword);

