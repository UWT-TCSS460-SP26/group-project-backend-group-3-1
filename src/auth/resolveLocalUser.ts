import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import type { User } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      localUser?: User;
    }
  }
}

const USERNAME_MAX = 20;

type OidcUserInfo = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
};

function normalizeIssuer(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function truncateUsername(value: string): string {
  const trimmed = value.trim() || 'user';
  return trimmed.length <= USERNAME_MAX ? trimmed : trimmed.slice(0, USERNAME_MAX);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? '', lastName: '' };
  }
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function buildProfileFromUserinfo(
  body: OidcUserInfo,
  tokenSub: string,
  tokenEmail: string
): { email: string; username: string; firstName: string; lastName: string } {
  const sub = body.sub ?? tokenSub;
  const email =
    (typeof body.email === 'string' && body.email.trim()) ||
    tokenEmail.trim() ||
    `${sub.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48)}@placeholder.local`;

  let firstName = typeof body.given_name === 'string' ? body.given_name.trim() : '';
  let lastName = typeof body.family_name === 'string' ? body.family_name.trim() : '';
  if (!firstName && !lastName && typeof body.name === 'string' && body.name.trim()) {
    const split = splitName(body.name);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  const fromPreferred =
    typeof body.preferred_username === 'string' ? body.preferred_username.trim() : '';
  const fromEmailLocal = email.includes('@') ? (email.split('@')[0] ?? '').trim() : '';
  const username = truncateUsername(
    fromPreferred ||
      fromEmailLocal ||
      `u_${sub.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}` ||
      'user'
  );

  return { email, username, firstName, lastName };
}

function buildProfileFromJwt(
  tokenSub: string,
  tokenEmail: string
): {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
} {
  const email =
    tokenEmail.trim() || `${tokenSub.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48)}@jwt.local`;
  const fromEmailLocal = email.includes('@') ? (email.split('@')[0] ?? '').trim() : '';
  const username = truncateUsername(
    fromEmailLocal || `u_${tokenSub.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}` || 'user'
  );
  return { email, username, firstName: '', lastName: '' };
}

async function persistUserFromClaims(
  subjectId: string,
  role: string,
  profile: { email: string; username: string; firstName: string; lastName: string }
): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        subjectId,
        email: profile.email,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existing = await prisma.user.findUnique({ where: { subjectId } });
      if (existing) {
        return existing;
      }
    }
    throw e;
  }
}

/**
 * After `requireAuth`, loads or creates the local `User` row keyed by JWT `sub` (Auth² subject).
 * On cache miss: calls `{AUTH_ISSUER}/v2/oauth/userinfo` when `AUTH_ISSUER` is set; otherwise
 * provisions from JWT claims only (for local/tests). Sets `req.localUser`.
 */
export const ensureLocalUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const subjectId = req.user.sub;

  try {
    const cached = await prisma.user.findUnique({ where: { subjectId } });
    if (cached) {
      req.localUser = cached;
      next();
      return;
    }

    const header = req.headers.authorization;
    const bearer =
      header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';

    const issuerRaw = process.env.AUTH_ISSUER?.trim();
    let profile: { email: string; username: string; firstName: string; lastName: string };

    if (issuerRaw) {
      if (!bearer) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return;
      }
      const issuer = normalizeIssuer(issuerRaw);
      const userinfoUrl = `${issuer}/v2/oauth/userinfo`;
      const response = await fetch(userinfoUrl, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!response.ok) {
        res.status(502).json({ error: 'Failed to load user profile from identity provider' });
        return;
      }
      const body = (await response.json()) as OidcUserInfo;
      profile = buildProfileFromUserinfo(body, subjectId, req.user.email);
    } else {
      profile = buildProfileFromJwt(subjectId, req.user.email);
    }

    req.localUser = await persistUserFromClaims(subjectId, req.user.role, profile);
    next();
  } catch (e) {
    next(e);
  }
};
