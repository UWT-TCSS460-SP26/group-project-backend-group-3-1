import { Request, Response, NextFunction } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Production Auth² Middleware using RS256 + JWKS
 */
const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri:
      process.env.AUTH0_JWKS_URI || `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as GetVerificationKey,
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_ISSUER || `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

/**
 * Middleware that ensures request.user is populated from request.auth (set by express-jwt)
 * or from custom headers in test environment.
 */
const populateUser = (request: Request, _response: Response, next: NextFunction) => {
  if (request.auth) {
    request.user = {
      sub: request.auth.sub,
      email: request.auth.email || '',
      role: request.auth.role || 'user',
    };
  }
  next();
};

/**
 * Verifies the Auth² JWT and attaches user to request.user.
 */
export const requireAuth = [checkJwt, populateUser];

/**
 * Optional Auth - continues even if no token is present.
 */
export const optionalAuth = [
  expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri:
        process.env.AUTH0_JWKS_URI || `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    }) as GetVerificationKey,
    audience: process.env.AUTH0_AUDIENCE,
    issuer: process.env.AUTH0_ISSUER || `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    credentialsRequired: false,
  }),
  populateUser,
];

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
