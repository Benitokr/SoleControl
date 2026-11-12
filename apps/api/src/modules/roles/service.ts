import { AppError } from '../../middleware/errorHandler.js';
import { prisma } from '../../lib/prisma.js';

export async function listRoles() {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: true },
  });
  // Add permission counts
  for (const role of roles as any[]) {
    const permCount = await prisma.rolePermission.count({ where: { roleId: role.id } });
    role.permissionCount = permCount;
  }
  return roles;
}

export async function getRole(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: true,
    },
  });
  if (!role) throw new AppError('Role not found.', 404, 'NOT_FOUND');
  return role;
}

export async function createRole(data: { name: string; code: string; description?: string }, actorId: string) {
  const existing = await prisma.role.findUnique({ where: { code: data.code } } as any);
  if (existing) throw new AppError('Role code already in use.', 409, 'DUPLICATE_CODE');
  const role = await prisma.role.create({ data: { ...data, isSystem: false } });
  await prisma.auditLog.create({ data: { entity: 'Role', entityId: role.id, action: 'CREATE', actorId, afterState: { name: role.name, code: role.code } } });
  return role;
}

export async function updateRole(id: string, data: { name?: string; code?: string; description?: string }, actorId: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role not found.', 404, 'NOT_FOUND');
  if ((role as any).isSystem && (data.name || data.code)) {
    throw new AppError('Cannot rename or recode a system role.', 400, 'SYSTEM_ROLE');
  }
  const updated = await prisma.role.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { entity: 'Role', entityId: id, action: 'UPDATE', actorId, afterState: data } });
  return updated;
}

export async function cloneRole(id: string, newName: string, newCode: string, actorId: string) {
  const existing = await getRole(id);
  const newRole = await prisma.role.create({ data: { name: newName, code: newCode, description: `Cloned from ${(existing as any).name}`, isSystem: false } });
  const perms = (existing as any).rolePermissions || [];
  for (const rp of perms) {
    await prisma.rolePermission.create({ data: { roleId: newRole.id, permissionId: rp.permissionId } });
  }
  await prisma.auditLog.create({ data: { entity: 'Role', entityId: newRole.id, action: 'CLONE', actorId, afterState: { clonedFrom: id, name: newName, code: newCode } } });
  return getRole(newRole.id);
}

export async function setRolePermissions(roleId: string, permissionIds: string[], actorId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('Role not found.', 404, 'NOT_FOUND');
  if ((role as any).code === 'SUPER_ADMIN') throw new AppError('Cannot modify Super Admin permissions.', 400, 'SYSTEM_ROLE');

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.create({ data: { roleId, permissionId } });
  }
  await prisma.auditLog.create({ data: { entity: 'Role', entityId: roleId, action: 'SET_PERMISSIONS', actorId, afterState: { count: permissionIds.length } } });
  return getRole(roleId);
}

export async function deleteRole(id: string, actorId: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role not found.', 404, 'NOT_FOUND');
  if ((role as any).isSystem) throw new AppError('Cannot delete a system role.', 400, 'SYSTEM_ROLE');
  const userCount = await prisma.user.count({ where: { roleId: id } });
  if (userCount > 0) throw new AppError(`Cannot delete role: ${userCount} user(s) assigned.`, 400, 'ROLE_IN_USE');
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.auditLog.create({ data: { entity: 'Role', entityId: id, action: 'DELETE', actorId, beforeState: { name: (role as any).name } } });
  return { success: true };
}

export async function getAllPermissions() {
  return prisma.permission.findMany({ orderBy: { key: 'asc' } });
}

