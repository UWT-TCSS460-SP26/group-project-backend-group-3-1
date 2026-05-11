import 'dotenv/config';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { stubRequireAuth, stubOptionalAuth } from './auth';

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
      email: 'dev@test.local',
      role: overrides.role ?? 'User',
    }),
  };
}

const TMDB_ID = 550;

describe('GET /ratings/me/enriched', () => {
  afterAll(async () => {
    await prisma.rating.deleteMany();
  });

  it('returns 401 when Authorization is missing', async () => {
    const res = await request(app).get('/ratings/me/enriched');
    expect(res.status).toBe(401);
  });

  it('returns enriched rating results for the authenticated user', async () => {
    // ensure TMDB token is present for the route middleware
    process.env.TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN ?? 'test-token';

    // create a rating for the test user
    const created = await request(app)
      .post('/ratings')
      .set(authHeader())
      .send({ isMovie: true, rating: 8, tmdbIdentifier: TMDB_ID });

    expect(created.status).toBe(201);

    // mock global fetch to return TMDB metadata
    const fakeMetadata = { id: TMDB_ID, title: 'Test Movie', overview: 'desc' };
    const originalFetch = globalThis.fetch;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeMetadata,
    }) as unknown as typeof fetch;
    globalThis.fetch = mockFetch;

    const res = await request(app).get('/ratings/me/enriched').set(authHeader());

    // restore fetch
    globalThis.fetch = originalFetch;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count', 1);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results[0]).toMatchObject({
      ratingId: expect.any(Number),
      isMovie: true,
      value: 8,
      tmdbIdentifier: TMDB_ID,
      author: { userId: expect.any(Number), username: expect.any(String) },
      missing: false,
    });
    expect(res.body.results[0].metadata).toMatchObject(fakeMetadata);
  });
});
