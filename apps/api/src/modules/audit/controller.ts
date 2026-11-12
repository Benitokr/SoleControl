import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { auditService } from './service.js';
import { auditQuerySchema } from '@solecontrol/shared';

export class AuditController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = auditQuerySchema.parse(req.query);
      const { items, total } = await auditService.getAuditTrail(query);

      res.json({
        data: items,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();

