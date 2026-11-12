import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import { PermissionKey } from '@solecontrol/shared';

export function requirePermission(permission: PermissionKey) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    // SUPER_ADMIN has full bypass for all operations
    if (req.user.roleCode === 'SUPER_ADMIN') {
      return next();
    }

    const hasPermission = req.user.permissions.includes(permission);
    if (!hasPermission) {
      return next(
        new AppError(
          `Access forbidden. Required permission: '${permission}' is not granted to your role.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

