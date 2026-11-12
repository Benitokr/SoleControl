import { PermissionKey } from './permissions.js';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  role: RoleSummary;
  storeIds: string[];
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionCount?: number;
  permissions?: PermissionKey[];
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSummary {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  permissions: PermissionKey[];
  storeId: string;
  storeName: string;
  accessibleStoreIds: string[];
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  mustChangePassword: boolean;
}

export interface AuditLogEntry {
  id: string;
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
  createdAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    requestId?: string;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    requestId?: string;
  };
}

