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
      email: 'dev@test.local',
      role: overrides.role ?? 'User',
    }),
  };
}

const TMDB_ID = 550;

describe('Ratings (integration)', () => {
  afterAll(async () => {
    await prisma.rating.deleteMany();
  });

  // ... rest of the tests remain the same
  describe('GET /ratings/me', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).get('/ratings/me');
      expect(response.status).toBe(401);
    });

    it('returns 200 with an empty array when the user has no ratings', async () => {
      const u = await prisma.user.findUnique({ where: { subjectId: 'ratings-me-user' } });
      await prisma.rating.deleteMany({ where: { userId: u!.id } });

      const response = await request(app)
        .get('/ratings/me')
        .set(authHeader({ sub: 'ratings-me-user' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 200 with all ratings for the authenticated user (raw rows)', async () => {
      const u = await prisma.user.findUnique({ where: { subjectId: 'ratings-me-user' } });
      await prisma.rating.deleteMany({ where: { userId: u!.id } });

      await request(app)
        .post('/ratings')
        .set(authHeader({ sub: 'ratings-me-user' }))
        .send({ isMovie: true, rating: 7, tmdbIdentifier: TMDB_ID });
      await request(app)
        .post('/ratings')
        .set(authHeader({ sub: 'ratings-me-user' }))
        .send({ isMovie: false, rating: 3, tmdbIdentifier: TMDB_ID + 1 });

      const response = await request(app)
        .get('/ratings/me')
        .set(authHeader({ sub: 'ratings-me-user' }));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      const scores = response.body
        .map((r: { rating: number }) => r.rating)
        .sort((a: number, b: number) => a - b);
      expect(scores).toEqual([3, 7]);

      for (const row of response.body) {
        expect(row).toMatchObject({
          userId: u!.id,
          isMovie: expect.any(Boolean),
          rating: expect.any(Number),
          tmdbIdentifier: expect.any(Number),
        });
        expect(row).toHaveProperty('ratingId');
        expect(typeof row.ratingId).toBe('number');
      }
    });

    it('does not include another user ratings', async () => {
      const other = await prisma.user.findUnique({ where: { subjectId: 'other-user-123' } });
      const mine = await prisma.user.findUnique({ where: { subjectId: 'test-sub-123' } });
      expect(other).toBeTruthy();
      expect(mine).toBeTruthy();

      const createdOther = await request(app)
        .post('/ratings')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({ isMovie: true, rating: 9, tmdbIdentifier: TMDB_ID });
      expect(createdOther.status).toBe(201);

      const response = await request(app).get('/ratings/me').set(authHeader());

      expect(response.status).toBe(200);
      const ids = response.body.map((r: { ratingId: number }) => r.ratingId);
      expect(ids).not.toContain(createdOther.body.ratingId);
      expect(response.body.every((r: { userId: number }) => r.userId === mine!.id)).toBe(true);
    });
  });

  describe('GET /ratings/:ratingId', () => {
    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app).get('/ratings/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 404 when rating does not exist', async () => {
      const response = await request(app).get('/ratings/999999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns transformed rating response', async () => {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: 6, tmdbIdentifier: TMDB_ID });

      const response = await request(app).get(`/ratings/${created.body.ratingId}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        isMovie: true,
        value: 6,
        tmdbIdentifier: TMDB_ID,
      });
    });
  });

  describe('POST /ratings', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .send({ isMovie: true, rating: 7, tmdbIdentifier: TMDB_ID });
      expect(response.status).toBe(401);
    });

    it('returns 400 when rating is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('returns 400 when rating is outside 1..10', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: 11, tmdbIdentifier: TMDB_ID });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/1 to 10/);
    });

    it('returns 400 when isMovie is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ rating: 8, tmdbIdentifier: TMDB_ID });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/isMovie/i);
    });

    it('returns 400 when tmdbIdentifier is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/tmdbIdentifier/i);
    });

    it('returns 400 when tmdbIdentifier is above the maximum stored integer', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: 5, tmdbIdentifier: 5_502_354_264 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/tmdbIdentifier/i);
      expect(response.body.error).toMatch(/2147483647/);
    });

    it('creates a rating from isMovie + rating body', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: false, rating: 4, tmdbIdentifier: TMDB_ID });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        isMovie: false,
        value: 4,
        tmdbIdentifier: TMDB_ID,
      });
      expect(typeof response.body.ratingId).toBe('number');
    });

    it('returns 400 when rating string is not a strict positive integer', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: '7abc', tmdbIdentifier: TMDB_ID });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('accepts rating as a decimal-string-free integer string', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: '7', tmdbIdentifier: TMDB_ID });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        isMovie: true,
        value: 7,
        tmdbIdentifier: TMDB_ID,
      });
    });
  });

  describe('PATCH /ratings/:ratingId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).patch('/ratings/999999').send({ rating: 5 });
      expect(response.status).toBe(401);
    });

    it('returns 404 when authenticated but rating not found for this user', async () => {
      const response = await request(app)
        .patch('/ratings/999999')
        .set(authHeader())
        .send({ rating: 5 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app)
        .patch('/ratings/abc')
        .set(authHeader())
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 400 when rating is missing', async () => {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: 2, tmdbIdentifier: TMDB_ID });

      const response = await request(app)
        .patch(`/ratings/${created.body.ratingId}`)
        .set(authHeader())
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('updates the authenticated user row for that ratingId', async () => {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({ isMovie: true, rating: 3, tmdbIdentifier: TMDB_ID });

      const response = await request(app)
        .patch(`/ratings/${created.body.ratingId}`)
        .set(authHeader({ sub: 'other-user-123' }))
        .send({ rating: 9 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        isMovie: true,
        value: 9,
        tmdbIdentifier: TMDB_ID,
      });
    });
  });

  describe('DELETE /ratings/:ratingId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).delete('/ratings/1');
      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app).delete('/ratings/abc').set(authHeader());

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 404 when authenticated user does not own the row', async () => {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({ isMovie: true, rating: 5, tmdbIdentifier: TMDB_ID });

      const response = await request(app)
        .delete(`/ratings/${created.body.ratingId}`)
        .set(authHeader());

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 200 and deletes the authenticated users row', async () => {
      const created = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: false, rating: 10, tmdbIdentifier: TMDB_ID });

      const response = await request(app)
        .delete(`/ratings/${created.body.ratingId}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Rating deleted successfully' });
    });
  });
});
