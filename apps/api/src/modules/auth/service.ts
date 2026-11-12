import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { AppError } from '../../middleware/errorHandler.js';
import * as repo from './repo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'solecontrol_super_secret_access_jwt_key_2026_change_in_production';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 min

function signAccessToken(payload: { sub: string; roleId: string; email: string; sessionId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export async function login(email: string, password: string, ip?: string, ua?: string) {
  const user = await repo.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'INACTIVE') {
    throw new AppError('Your account has been deactivated. Contact your administrator.', 403, 'ACCOUNT_INACTIVE');
  }

  // Check lockout
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    throw new AppError(`Account locked. Try again in ${remaining} minute(s).`, 423, 'ACCOUNT_LOCKED');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const newFailures = (user.failedLoginAttempts || 0) + 1;
    const updateData: any = { failedLoginAttempts: newFailures };
    if (newFailures >= MAX_FAILURES) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      updateData.status = 'LOCKED';
    }
    await repo.updateUserLogin(user.id, updateData);
    await repo.logLoginEvent({ userId: user.id, email, success: false, ipAddress: ip, userAgent: ua, failureReason: 'INVALID_PASSWORD' });
    if (newFailures >= MAX_FAILURES) {
      throw new AppError('Too many failed attempts. Account locked for 30 minutes.', 423, 'ACCOUNT_LOCKED');
    }
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Success
  await repo.updateUserLogin(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    status: 'ACTIVE',
  });

  // Create refresh token
  const rawRefreshToken = randomBytes(48).toString('hex');
  const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  const session = await repo.createSession({ userId: user.id, refreshTokenHash: tokenHash, expiresAt, ipAddress: ip, userAgent: ua });

  const accessToken = signAccessToken({ sub: user.id, roleId: user.role.id, email: user.email, sessionId: session.id });

  await repo.logLoginEvent({ userId: user.id, email, success: true, ipAddress: ip, userAgent: ua });

  const permissions = user.role.rolePermissions.map((rp: any) => rp.permission.key);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId: session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function refresh(sessionId: string, rawToken: string) {
  const session = await repo.findSession(sessionId);
  if (!session) throw new AppError('Session not found or expired.', 401, 'INVALID_SESSION');

  if (new Date(session.expiresAt) < new Date()) {
    await repo.deleteSession(sessionId);
    throw new AppError('Refresh token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  const valid = await bcrypt.compare(rawToken, session.refreshTokenHash);
  if (!valid) throw new AppError('Invalid refresh token.', 401, 'INVALID_TOKEN');

  // Rotate: delete old, create new
  await repo.deleteSession(sessionId);
  const user = await repo.findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') throw new AppError('User not active.', 401, 'UNAUTHENTICATED');

  const rawRefreshToken = randomBytes(48).toString('hex');
  const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  const newSession = await repo.createSession({ userId: user.id, refreshTokenHash: tokenHash, expiresAt });

  const accessToken = signAccessToken({ sub: user.id, roleId: user.role.id, email: user.email, sessionId: newSession.id });
  return { accessToken, refreshToken: rawRefreshToken, sessionId: newSession.id };
}

export async function logout(sessionId: string) {
  await repo.deleteSession(sessionId);
}

export async function me(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  const permissions = user.role.rolePermissions.map((rp: any) => rp.permission.key);
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    roleCode: user.role.code, roleName: user.role.name, permissions,
    mustChangePassword: user.mustChangePassword,
    storeId: user.userLocations[0]?.storeId,
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await repo.updateUserLogin(userId, { passwordHash, mustChangePassword: false });
  return { success: true };
}

