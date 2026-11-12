import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import * as service from './service.js';

const CreateRoleSchema = z.object({ name: z.string().min(2), code: z.string().min(2), description: z.string().optional() });
const UpdateRoleSchema = z.object({ name: z.string().optional(), code: z.string().optional(), description: z.string().optional() });
const CloneRoleSchema = z.object({ name: z.string().min(2), code: z.string().min(2) });
const SetPermissionsSchema = z.object({ permissionIds: z.array(z.string()) });

export async function listRoles(req: AuthRequest, res: Response, next: NextFunction) {
  try { return res.json({ data: await service.listRoles() }); } catch (err) { next(err); }
}
export async function getRole(req: AuthRequest, res: Response, next: NextFunction) {
  try { return res.json({ data: await service.getRole(req.params.id) }); } catch (err) { next(err); }
}
export async function createRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = CreateRoleSchema.parse(req.body);
    return res.status(201).json({ data: await service.createRole(body, req.user!.id) });
  } catch (err) { next(err); }
}
export async function updateRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = UpdateRoleSchema.parse(req.body);
    return res.json({ data: await service.updateRole(req.params.id, body, req.user!.id) });
  } catch (err) { next(err); }
}
export async function cloneRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, code } = CloneRoleSchema.parse(req.body);
    return res.status(201).json({ data: await service.cloneRole(req.params.id, name, code, req.user!.id) });
  } catch (err) { next(err); }
}
export async function setPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { permissionIds } = SetPermissionsSchema.parse(req.body);
    return res.json({ data: await service.setRolePermissions(req.params.id, permissionIds, req.user!.id) });
  } catch (err) { next(err); }
}
export async function deleteRole(req: AuthRequest, res: Response, next: NextFunction) {
  try { return res.json({ data: await service.deleteRole(req.params.id, req.user!.id) }); } catch (err) { next(err); }
}
export async function listPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try { return res.json({ data: await service.getAllPermissions() }); } catch (err) { next(err); }
}

