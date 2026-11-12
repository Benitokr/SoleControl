import { AuditRepository, CreateAuditLogParams } from './repo.js';
import { AuditQueryInput } from '@solecontrol/shared';

export class AuditService {
  constructor(private auditRepo: AuditRepository = new AuditRepository()) {}

  async log(params: CreateAuditLogParams) {
    return this.auditRepo.create(params);
  }

  async getAuditTrail(query: AuditQueryInput) {
    return this.auditRepo.findMany(query);
  }
}

export const auditService = new AuditService();

