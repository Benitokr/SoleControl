import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { loginHandler, registerHandler, refreshHandler, logoutHandler, meHandler, changePasswordHandler } from './controller.js';

export const authRoutes = Router();

authRoutes.post('/register', registerHandler);
authRoutes.post('/login', loginHandler);
authRoutes.post('/refresh', refreshHandler);
authRoutes.post('/logout', authenticate, logoutHandler);
authRoutes.get('/me', authenticate, meHandler);
authRoutes.post('/change-password', authenticate, changePasswordHandler);

