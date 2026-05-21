import type { AuthenticatedUser } from '../middleware/requireAuth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
      user?: AuthenticatedUser;
    }
  }
}

export {};
