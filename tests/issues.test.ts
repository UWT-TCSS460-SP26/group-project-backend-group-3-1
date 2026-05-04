import 'dotenv/config';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { stubRequireAuth, stubOptionalAuth } from './auth';
import { Request, Response, NextFunction } from 'express';

jest.mock('../src/middleware/requireAuth', () => {
  const actual = jest.requireActual('../src/middleware/requireAuth');
  return {
    ...actual,
    requireAuth: (req: Request, res: Response, next: NextFunction) => {
      return stubRequireAuth(req, res, next);
    },
    optionalAuth: (req: Request, res: Response, next: NextFunction) => {
      return stubOptionalAuth(req, res, next);
    },
  };
});

function authHeader(overrides: { sub?: string; role?: string } = {}): Record<string, string> {
  return {
    'x-test-user': JSON.stringify({
      sub: overrides.sub ?? 'test-sub-123',
      email: 'admin@test.local',
      role: overrides.role ?? 'Admin',
    }),
  };
}

describe('Issues (integration)', () => {
  afterAll(async () => {
    await prisma.issue.deleteMany();
  });

  describe('POST /issues', () => {
    it('returns 400 when issueStatus is invalid', async () => {
      const response = await request(app).post('/issues').send({
        issueStatus: 'INVALID',
        issueDesc: 'Something is broken',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/issueStatus must be one of/);
    });

    it('returns 400 when issueDesc is missing', async () => {
      const response = await request(app).post('/issues').send({
        issueStatus: 'OPEN',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('issueDesc is required');
    });

    it('creates an issue on happy path', async () => {
      const response = await request(app).post('/issues').send({
        issueStatus: 'OPEN',
        issueDesc: 'Critical bug',
      });
      expect(response.status).toBe(201);
      expect(response.body.issueDesc).toBe('Critical bug');
      expect(response.body.issueStatus).toBe('OPEN');
    });
  });

  describe('GET /issues (Admin only)', () => {
    it('returns 401 when no user', async () => {
      const response = await request(app).get('/issues');
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-Admin user', async () => {
      const response = await request(app)
        .get('/issues')
        .set(authHeader({ role: 'User' }));
      expect(response.status).toBe(403);
    });

    it('returns 200 for Admin user', async () => {
      const response = await request(app)
        .get('/issues')
        .set(authHeader({ role: 'Admin' }));
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
