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
      const { stubRequireAuth } = require('./auth');
      return stubRequireAuth(req, res, next);
    },
    optionalAuth: (req: Response, res: Response, next: NextFunction) => {
      const { stubOptionalAuth } = require('./auth');
      return stubOptionalAuth(req, res, next);
    },
  };
});

const DEV_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const OTHER_USER_ID = '6f1ed002-ab65-4c86-a994-7cfa0f55df0f';
const TMDB_ID = 550;

const describeIfDb = describe;

function authHeader(overrides: { sub?: string } = {}): Record<string, string> {
  return {
    'x-test-user': JSON.stringify({
      sub: overrides.sub ?? DEV_USER_ID,
      email: 'dev@test.local',
      role: 'user',
    }),
  };
}

describeIfDb('Ratings2 (integration, current behavior)', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set in .env to run ratings2 integration tests');
    }

    await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      create: {
        id: DEV_USER_ID,
        username: 'rating2-test-user',
        email: 'rating2-dev@test.local',
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: OTHER_USER_ID },
      create: {
        id: OTHER_USER_ID,
        username: 'rating2-other-user',
        email: 'rating2-other@test.local',
      },
      update: {},
    });
  });

  beforeEach(async () => {
    await prisma.rating.deleteMany({ where: { userId: { in: [DEV_USER_ID, OTHER_USER_ID] } } });
  });

  afterAll(async () => {
    await prisma.rating.deleteMany({ where: { userId: { in: [DEV_USER_ID, OTHER_USER_ID] } } });
    await prisma.$disconnect();
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
      const row = await prisma.rating.create({
        data: {
          userId: DEV_USER_ID,
          isMovie: true,
          rating: 6,
          tmdbIdentifier: TMDB_ID,
        },
      });

      const response = await request(app).get(`/ratings/${row.ratingId}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ratingId: row.ratingId,
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

    it('accepts parseable rating strings because middleware/controller use parseInt', async () => {
      const response = await request(app)
        .post('/ratings')
        .set(authHeader())
        .send({ isMovie: true, rating: '7abc', tmdbIdentifier: TMDB_ID });

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
      const created = await prisma.rating.create({
        data: { userId: DEV_USER_ID, isMovie: true, rating: 2, tmdbIdentifier: TMDB_ID },
      });

      const response = await request(app)
        .patch(`/ratings/${created.ratingId}`)
        .set(authHeader())
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('updates the authenticated user row for that ratingId', async () => {
      const created = await prisma.rating.create({
        data: { userId: OTHER_USER_ID, isMovie: true, rating: 3, tmdbIdentifier: TMDB_ID },
      });

      const response = await request(app)
        .patch(`/ratings/${created.ratingId}`)
        .set(authHeader({ sub: OTHER_USER_ID }))
        .send({ rating: 9 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ratingId: created.ratingId,
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
      const created = await prisma.rating.create({
        data: { userId: OTHER_USER_ID, isMovie: true, rating: 5, tmdbIdentifier: TMDB_ID },
      });

      const response = await request(app).delete(`/ratings/${created.ratingId}`).set(authHeader());

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 200 and deletes the authenticated users row', async () => {
      const created = await prisma.rating.create({
        data: { userId: DEV_USER_ID, isMovie: false, rating: 10, tmdbIdentifier: TMDB_ID },
      });

      const response = await request(app).delete(`/ratings/${created.ratingId}`).set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Rating deleted successfully' });

      const deleted = await prisma.rating.findUnique({
        where: {
          ratingId_userId: {
            ratingId: created.ratingId,
            userId: DEV_USER_ID,
          },
        },
      });
      expect(deleted).toBeNull();
    });
  });
});
