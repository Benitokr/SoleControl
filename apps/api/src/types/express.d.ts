import { AuthenticatedUser } from '@solecontrol/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

