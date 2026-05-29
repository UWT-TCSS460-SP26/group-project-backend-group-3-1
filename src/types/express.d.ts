import type { AuthenticatedUser } from '../middleware/requireAuth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
      user?: AuthenticatedUser;
    }
  }
}

export {};
