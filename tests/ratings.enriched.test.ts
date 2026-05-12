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

/** Dedicated auth subject so this file does not share ratings with `ratings.test.ts` (same default `test-sub-123`). */
const ENRICHED_ME_SUB = '99999999-9999-4999-a999-999999999999';

describe('GET /ratings/me/enriched', () => {
  beforeEach(async () => {
    await prisma.rating.deleteMany({
      where: { user: { subjectId: ENRICHED_ME_SUB } },
    });
  });

  afterAll(async () => {
    await prisma.rating.deleteMany({
      where: { user: { subjectId: ENRICHED_ME_SUB } },
    });
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
      .set(authHeader({ sub: ENRICHED_ME_SUB }))
      .send({ isMovie: true, rating: 8, tmdbIdentifier: TMDB_ID });

    expect(created.status).toBe(201);

    // mock global fetch to return TMDB metadata
    const fakeMetadata = { id: TMDB_ID, title: 'Test Movie', overview: 'desc' };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeMetadata,
    }) as unknown as typeof globalThis.fetch;

    const res = await request(app)
      .get('/ratings/me/enriched')
      .set(authHeader({ sub: ENRICHED_ME_SUB }));

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

  it('applies limit and offset pagination', async () => {
    process.env.TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN ?? 'test-token';

    for (const [i, score] of [6, 7, 8].entries()) {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader({ sub: ENRICHED_ME_SUB }))
        .send({ isMovie: true, rating: score, tmdbIdentifier: TMDB_ID + i });
      expect(created.status).toBe(201);
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: TMDB_ID, title: 'Paged Movie' }),
    }) as unknown as typeof globalThis.fetch;

    const paged = await request(app)
      .get('/ratings/me/enriched?limit=2&offset=1')
      .set(authHeader({ sub: ENRICHED_ME_SUB }));

    globalThis.fetch = originalFetch;

    expect(paged.status).toBe(200);
    expect(paged.body.count).toBe(2);
    expect(paged.body.results).toHaveLength(2);
  });

  it('falls back to safe defaults for invalid limit/offset values', async () => {
    process.env.TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN ?? 'test-token';

    for (const [i, score] of [5, 6, 7].entries()) {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader({ sub: ENRICHED_ME_SUB }))
        .send({ isMovie: true, rating: score, tmdbIdentifier: TMDB_ID + i });
      expect(created.status).toBe(201);
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: TMDB_ID, title: 'Fallback Movie' }),
    }) as unknown as typeof globalThis.fetch;

    const res = await request(app)
      .get('/ratings/me/enriched?limit=-3&offset=-9')
      .set(authHeader({ sub: ENRICHED_ME_SUB }));

    globalThis.fetch = originalFetch;

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.results).toHaveLength(3);
  });
});
