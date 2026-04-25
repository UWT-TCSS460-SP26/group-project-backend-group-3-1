import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the Authorization: Bearer <token> header using JWT_SECRET and
 * attaches the decoded payload to request.user. Responds 401 when the
 * header is missing, malformed, or the token is invalid/expired.
 */
export const requireAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    response.status(500).json({ error: 'JWT_SECRET is not configured' });
    return;
  }

  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, secret) as unknown as AuthenticatedUser & {
      userId?: string;
      id?: string;
    };
    const sub = decoded.sub || decoded.userId || decoded.id;
    if (!sub) {
      response.status(401).json({
        error: 'Token must include user id: set "sub", or "userId", or "id" to your User UUID',
      });
      return;
    }
    request.user = {
      sub,
      email: decoded.email ?? '',
      role: decoded.role ?? 'user',
    };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Role gate. Use after requireAuth:
 *
 *   router.delete('/reviews/:id', requireAuth, requireRole('admin'), handler);
 */
export const requireRole = (role: string) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (request.user.role !== role) {
      response.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
