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

    it('returns 400 when status filter is invalid', async () => {
      const response = await request(app)
        .get('/issues?status=NOT_A_STATUS')
        .set(authHeader({ role: 'Admin' }));

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/issueStatus must be one of/);
    });

    it('filters issues by status', async () => {
      await prisma.issue.deleteMany();
      await prisma.issue.createMany({
        data: [
          {
            issueStatus: 'OPEN',
            issueDesc: 'Open issue',
            issueReportDate: new Date(),
          },
          {
            issueStatus: 'RESOLVED',
            issueDesc: 'Resolved issue',
            issueReportDate: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/issues?status=RESOLVED')
        .set(authHeader({ role: 'Admin' }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].issueStatus).toBe('RESOLVED');
      expect(response.body[0].issueDesc).toBe('Resolved issue');
    });
  });

  describe('PATCH /issues/:issueID (Admin only)', () => {
    it('returns 401 when no user', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to update',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app).patch(`/issues/${issue.issueID}`).send({
        issueStatus: 'IN_PROGRESS',
      });

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-Admin role', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to update',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/issues/${issue.issueID}`)
        .set(authHeader({ role: 'User' }))
        .send({ issueStatus: 'IN_PROGRESS' });

      expect(response.status).toBe(403);
    });

    it('returns 400 when issueStatus is invalid', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to update',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/issues/${issue.issueID}`)
        .set(authHeader({ role: 'Admin' }))
        .send({ issueStatus: 'NOT_A_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/issueStatus must be one of/);
    });

    it('returns 404 when issue does not exist', async () => {
      const response = await request(app)
        .patch('/issues/999999')
        .set(authHeader({ role: 'Admin' }))
        .send({ issueStatus: 'RESOLVED' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });

    it('updates issue status on happy path', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to update',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/issues/${issue.issueID}`)
        .set(authHeader({ role: 'Admin' }))
        .send({ issueStatus: 'RESOLVED' });

      expect(response.status).toBe(200);
      expect(response.body.issueID).toBe(issue.issueID);
      expect(response.body.issueStatus).toBe('RESOLVED');
    });
  });

  describe('DELETE /issues/:issueID (Admin only)', () => {
    it('returns 401 when no user', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to delete',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app).delete(`/issues/${issue.issueID}`);

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-Admin role', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to delete',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/issues/${issue.issueID}`)
        .set(authHeader({ role: 'User' }));

      expect(response.status).toBe(403);
    });

    it('returns 404 when issue does not exist', async () => {
      const response = await request(app)
        .delete('/issues/999999')
        .set(authHeader({ role: 'Admin' }));

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });

    it('deletes issue on happy path', async () => {
      const issue = await prisma.issue.create({
        data: {
          issueStatus: 'OPEN',
          issueDesc: 'Issue to delete',
          issueReportDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/issues/${issue.issueID}`)
        .set(authHeader({ role: 'Admin' }));

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Issue deleted successfully');

      const deleted = await prisma.issue.findUnique({ where: { issueID: issue.issueID } });
      expect(deleted).toBeNull();
    });
  });
});
