import bcrypt from 'bcrypt';
import { AppError } from '../../middleware/errorHandler.js';
import { prisma } from '../../lib/prisma.js';

const DEFAULT_INCLUDE = {
  role: true,
  userLocations: true,
};

export async function listUsers(query: { page?: number; limit?: number; search?: string; roleId?: string; status?: string }) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.search) where.name = { contains: query.search };
  if (query.roleId) where.roleId = query.roleId;
  if (query.status) where.status = query.status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: DEFAULT_INCLUDE }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: DEFAULT_INCLUDE });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  return user;
}

export async function createUser(data: {
  name: string; email: string; phone?: string; password?: string; roleId?: string; roleName?: string; isActive?: boolean;
}, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Email already in use.', 409, 'DUPLICATE_EMAIL');

  let resolvedRoleId = data.roleId;
  if (!resolvedRoleId && data.roleName) {
    const role = await prisma.role.findFirst({
      where: {
        OR: [
          { code: data.roleName },
          { code: data.roleName.toUpperCase().replace(/\s+/g, '_') },
          { name: data.roleName }
        ]
      }
    });
    if (role) resolvedRoleId = role.id;
  }
  if (!resolvedRoleId) {
    const defaultRole = await prisma.role.findFirst({ where: { code: 'SALES_EXECUTIVE' } }) ||
                        await prisma.role.findFirst();
    resolvedRoleId = defaultRole?.id;
  }

  const passwordHash = await bcrypt.hash(data.password || 'ChangeMe@123', 12);
  const store = await prisma.store.findFirst({ where: { isActive: true } });

  const status = data.isActive === false ? 'INACTIVE' : 'ACTIVE';

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      roleId: resolvedRoleId!,
      status,
      mustChangePassword: true
    },
    include: DEFAULT_INCLUDE,
  });

  if (store) {
    await prisma.userLocation.upsert({
      where: { userId_storeId: { userId: user.id, storeId: store.id } },
      update: {},
      create: { userId: user.id, storeId: store.id },
    });
  }

  await writeAudit({ entity: 'User', entityId: user.id, action: 'CREATE', actorId, afterState: { name: user.name, email: user.email, roleId: user.roleId } });
  return prisma.user.findUnique({ where: { id: user.id }, include: DEFAULT_INCLUDE });
}

export async function updateUser(id: string, data: { name?: string; email?: string; phone?: string; roleId?: string; roleName?: string; isActive?: boolean; status?: string }, actorId: string) {
  const before = await getUser(id);
  if (data.email && data.email !== before.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use.', 409, 'DUPLICATE_EMAIL');
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.status) updateData.status = data.status;
  if (data.isActive !== undefined) updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';

  if (data.roleId) {
    updateData.roleId = data.roleId;
  } else if (data.roleName) {
    const role = await prisma.role.findFirst({
      where: {
        OR: [
          { code: data.roleName },
          { code: data.roleName.toUpperCase().replace(/\s+/g, '_') },
          { name: data.roleName }
        ]
      }
    });
    if (role) updateData.roleId = role.id;
  }

  const user = await prisma.user.update({ where: { id }, data: updateData, include: DEFAULT_INCLUDE });
  await writeAudit({ entity: 'User', entityId: id, action: 'UPDATE', actorId, beforeState: { name: before.name, email: before.email, roleId: before.roleId }, afterState: { name: user.name, email: user.email, roleId: user.roleId } });
  return user;
}

export async function deactivateUser(id: string, actorId: string) {
  const user = await getUser(id);
  if (user.role.code === 'SUPER_ADMIN') {
    const activeSuperAdmins = await prisma.user.count({ where: { roleId: user.roleId, status: 'ACTIVE' } });
    if (activeSuperAdmins <= 1) throw new AppError('Cannot deactivate the last active Super Admin.', 400, 'LAST_SUPER_ADMIN');
  }
  await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
  await writeAudit({ entity: 'User', entityId: id, action: 'DEACTIVATE', actorId, beforeState: { status: 'ACTIVE' }, afterState: { status: 'INACTIVE' } });
  return { success: true };
}

export async function reactivateUser(id: string, actorId: string) {
  await prisma.user.update({ where: { id }, data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null } });
  await writeAudit({ entity: 'User', entityId: id, action: 'REACTIVATE', actorId, afterState: { status: 'ACTIVE' } });
  return { success: true };
}

export async function unlockUser(id: string, actorId: string) {
  await prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null, status: 'ACTIVE' } });
  await writeAudit({ entity: 'User', entityId: id, action: 'UNLOCK', actorId });
  return { success: true };
}

export async function resetUserPassword(id: string, newPassword: string, actorId: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
  await writeAudit({ entity: 'User', entityId: id, action: 'RESET_PASSWORD', actorId });
  return { success: true };
}

async function writeAudit(data: { entity: string; entityId: string; action: string; actorId: string; beforeState?: any; afterState?: any }) {
  try {
    await prisma.auditLog.create({ data: { entity: data.entity, entityId: data.entityId, action: data.action, actorId: data.actorId, beforeState: data.beforeState, afterState: data.afterState } });
  } catch (_e) {}
}

