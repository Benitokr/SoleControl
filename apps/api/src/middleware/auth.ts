import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedUser } from '@solecontrol/shared';

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

interface JwtPayload {
  userId: string;
  roleCode: string;
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing token.', 401, 'UNAUTHENTICATED'));
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'solecontrol_super_secret_access_jwt_key_2026_change_in_production';

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        userLocations: {
          include: {
            store: true
          }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return next(new AppError('User not found or inactive.', 401, 'UNAUTHENTICATED'));
    }

    const permissions = (user.role?.rolePermissions || []).map((rp: any) => rp.permission.key as any);
    let store = user.userLocations?.[0]?.store;
    if (!store) {
      store = await prisma.store.findFirst({ where: { isActive: true } }) as any;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleCode: user.role?.code || '',
      roleName: user.role?.name || '',
      permissions,
      storeId: store?.id || '',
      storeName: store?.name || 'Forty V Flagship',
      accessibleStoreIds: user.userLocations?.length ? (user.userLocations || []).map((ul: any) => ul.storeId) : (store ? [store.id] : [])
    };

    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token.', 401, 'INVALID_TOKEN'));
  }
}

/** Alias for authenticate — used in Phase 4/5 route modules */
export const requireAuth = authenticate;

