import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { loginHandler, registerHandler, refreshHandler, logoutHandler, meHandler, changePasswordHandler } from './controller.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait 15 minutes.' } },
});

export const authRoutes = Router();

authRoutes.post('/register', registerHandler);
authRoutes.post('/login', loginLimiter, loginHandler);
authRoutes.post('/refresh', refreshHandler);
authRoutes.post('/logout', authenticate, logoutHandler);
authRoutes.get('/me', authenticate, meHandler);
authRoutes.post('/change-password', authenticate, changePasswordHandler);

