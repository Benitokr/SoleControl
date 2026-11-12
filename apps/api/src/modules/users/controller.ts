import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import * as service from './service.js';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  roleId: z.string().uuid().optional(),
});

const ResetPasswordSchema = z.object({ newPassword: z.string().min(8) });

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, roleId, status } = req.query as any;
    const result = await service.listUsers({ page: +page || 1, limit: +limit || 20, search, roleId, status });
    return res.json({ data: result.users, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (err) { next(err); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await service.getUser(req.params.id);
    return res.json({ data: user });
  } catch (err) { next(err); }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = CreateUserSchema.parse(req.body);
    const user = await service.createUser(body, req.user!.id);
    return res.status(201).json({ data: user });
  } catch (err) { next(err); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = UpdateUserSchema.parse(req.body);
    const user = await service.updateUser(req.params.id, body, req.user!.id);
    return res.json({ data: user });
  } catch (err) { next(err); }
}

export async function deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.deactivateUser(req.params.id, req.user!.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
}

export async function reactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.reactivateUser(req.params.id, req.user!.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
}

export async function unlockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.unlockUser(req.params.id, req.user!.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { newPassword } = ResetPasswordSchema.parse(req.body);
    const result = await service.resetUserPassword(req.params.id, newPassword, req.user!.id);
    return res.json({ data: result });
  } catch (err) { next(err); }
}

