import { z } from 'zod';
import { ACTIONS, MODULES, PermissionKey } from './permissions.js';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetUserPasswordSchema = z.object({
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters'),
  forceChangeOnNextLogin: z.boolean().default(true)
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: z.string().trim().optional().nullable(),
  roleId: z.string().min(1, 'Role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  storeIds: z.array(z.string()).min(1, 'Assign at least one store'),
  mustChangePassword: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
  phone: z.string().trim().optional().nullable(),
  roleId: z.string().min(1, 'Role is required').optional(),
  storeIds: z.array(z.string()).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userQuerySchema = z.object({
  search: z.string().optional(),
  roleId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type UserQueryInput = z.infer<typeof userQuerySchema>;

const permissionKeyRegex = new RegExp(`^(${MODULES.join('|')})\\.(${ACTIONS.join('|')})$`);

export const permissionKeySchema = z.string().regex(permissionKeyRegex, 'Invalid permission key') as z.ZodType<PermissionKey>;

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Code must be at least 2 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must contain uppercase letters, numbers, and underscores only'),
  description: z.string().trim().optional().nullable(),
  permissions: z.array(permissionKeySchema).default([])
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').optional(),
  description: z.string().trim().optional().nullable(),
  permissions: z.array(permissionKeySchema).optional()
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const cloneRoleSchema = z.object({
  sourceRoleId: z.string().min(1, 'Source role ID is required'),
  name: z.string().trim().min(2, 'New role name must be at least 2 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'New role code must be at least 2 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must contain uppercase letters, numbers, and underscores only'),
  description: z.string().trim().optional().nullable()
});

export type CloneRoleInput = z.infer<typeof cloneRoleSchema>;

export const auditQuerySchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

