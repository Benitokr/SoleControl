import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import * as service from './service.js';
import { LoginSchema, ChangePasswordSchema } from './schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required.', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400, 'VALIDATION_ERROR');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const superAdminRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
    const roleId = superAdminRole ? superAdminRole.id : undefined;

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        passwordHash,
        roleId,
        status: 'ACTIVE'
      }
    });

    // Link to default store
    const store = await prisma.store.findFirst({ where: { isActive: true } });
    if (store) {
      try {
        await prisma.userLocation.create({
          data: {
            id: randomUUID(),
            userId,
            storeId: store.id
          }
        });
      } catch {}
    }

    const ip = req.ip;
    const ua = req.headers['user-agent'];
    const result = await service.login(email, password, ip, ua);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return res.status(201).json({
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  } catch (err) { next(err); }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = LoginSchema.parse(req.body);
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    const result = await service.login(body.email, body.password, ip, ua);
    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
    return res.json({ data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.sessionId;
    const rawToken = req.cookies?.refreshToken;
    if (!sessionId || !rawToken) throw new AppError('No session. Please log in.', 401, 'NO_SESSION');
    const result = await service.refresh(sessionId, rawToken);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth',
    });
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth',
    });
    return res.json({ data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
}

export async function logoutHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) await service.logout(sessionId);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.clearCookie('sessionId', { path: '/api/v1/auth' });
    return res.json({ data: { message: 'Logged out successfully.' } });
  } catch (err) { next(err); }
}

export async function meHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await service.me(req.user!.id);
    return res.json({ data: user });
  } catch (err) { next(err); }
}

export async function changePasswordHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = ChangePasswordSchema.parse(req.body);
    const result = await service.changePassword(req.user!.id, body.currentPassword, body.newPassword);
    return res.json({ data: result });
  } catch (err) { next(err); }
}

