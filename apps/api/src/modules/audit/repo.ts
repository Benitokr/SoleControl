import { prisma } from '../../lib/prisma.js';
import { AuditQueryInput } from '@solecontrol/shared';

export interface CreateAuditLogParams {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditRepository {
  async create(data: CreateAuditLogParams) {
    return prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        beforeState: data.beforeState as any,
        afterState: data.afterState as any,
        metadata: data.metadata as any
      }
    });
  }

  async findMany(query: AuditQueryInput) {
    const where: any = {};
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return { items, total };
  }
}

