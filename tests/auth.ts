import { Request, Response, NextFunction } from 'express';

/**
 * Stubbed auth middleware for tests.
 * Reads user data from 'x-test-user' header.
 * The header should be a JSON string or just the sub.
 *
 * Example:
 * .set('x-test-user', JSON.stringify({ sub: '123', role: 'Admin', email: 'test@example.com' }))
 */
export const stubAuth = (req: Request, res: Response, next: NextFunction) => {
  const testUser = req.headers['x-test-user'];

  if (testUser) {
    try {
      // Try parsing as JSON first
      const user = JSON.parse(testUser as string);
      req.user = {
        sub: user.sub || 'test-sub-123',
        role: user.role || 'user',
        email: user.email || 'test@example.com',
      };
    } catch {
      // If not JSON, treat as sub string
      req.user = {
        sub: testUser as string,
        role: 'user',
        email: 'test@example.com',
      };
    }
  }
  next();
};

export const stubRequireAuth = (req: Request, res: Response, next: NextFunction) => {
  stubAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    next();
  });
};

export const stubOptionalAuth = (req: Request, res: Response, next: NextFunction) => {
  stubAuth(req, res, next);
};
