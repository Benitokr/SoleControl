import { prisma } from '../../lib/prisma.js';

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } }
        }
      },
      userLocations: { include: { store: true } }
    }
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } }
        }
      },
      userLocations: true
    }
  });
}

export async function createSession(data: {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.userSession.create({ data });
}

export async function findSession(sessionId: string) {
  return prisma.userSession.findUnique({ where: { id: sessionId } });
}

export async function deleteSession(sessionId: string) {
  return prisma.userSession.deleteMany({ where: { id: sessionId } });
}

export async function updateUserLogin(userId: string, data: {
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date;
  status?: string;
  mustChangePassword?: boolean;
  passwordHash?: string;
}) {
  return prisma.user.update({ where: { id: userId }, data });
}

export async function logLoginEvent(data: {
  userId: string;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}) {
  return prisma.loginEvent.create({ data });
}

