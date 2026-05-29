import 'dotenv/config';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { stubRequireAuth, stubOptionalAuth } from './auth';
import { Request, Response, NextFunction } from 'express';

// Test
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

const TEST_SUBJECT_IDS = [
  'test-sub-123',
  'other-user-123',
  'reviews-me-user',
  'admin-user-123',
] as const;

async function clearReviewsForSubjects(subjects: readonly string[]): Promise<void> {
  const users = await prisma.user.findMany({
    where: { subjectId: { in: [...subjects] } },
    select: { id: true },
  });
  if (users.length > 0) {
    await prisma.review.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
  }
}

describe('Reviews (integration)', () => {
  beforeEach(async () => {
    await clearReviewsForSubjects(TEST_SUBJECT_IDS);
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
  });

  describe('POST /reviews', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).post('/reviews').send({
        reviewContent: 'hello',
        isMovie: true,
        dateOfReview: '2026-01-10',
        tmdbIdentifier: TMDB_ID,
      });

      expect(response.status).toBe(401);
    });

    it('returns 401 for invalid header', async () => {
      const response = await request(app).post('/reviews').set('x-test-user', '').send({
        reviewContent: 'hello',
        isMovie: true,
        dateOfReview: '2026-01-10',
        tmdbIdentifier: TMDB_ID,
      });

      expect(response.status).toBe(401);
    });

    it('returns 400 when dateOfReview is missing', async () => {
      const response = await request(app)
        .post('/reviews')
        .set(authHeader())
        .send({ reviewContent: 'hello', isMovie: true });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Field "dateOfReview" is required');
    });

    it('creates a review and returns persisted content/date', async () => {
      const response = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'Great film',
        isMovie: true,
        dateOfReview: '2026-01-10',
        tmdbIdentifier: TMDB_ID,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        isMovie: true,
        reviewContent: 'Great film',
        dateOfReview: '2026-01-10',
        tmdbIdentifier: TMDB_ID,
      });
      expect(typeof response.body.reviewId).toBe('number');
    });

    it('accepts isMovie=false for TV show reviews', async () => {
      const response = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'type two',
        isMovie: false,
        dateOfReview: '2026-03-01',
        tmdbIdentifier: TMDB_ID,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        reviewContent: 'type two',
        isMovie: false,
        tmdbIdentifier: TMDB_ID,
      });
    });

    it('returns 409 when the user already reviewed the same movie or show', async () => {
      const duplicateTmdbId = 42_425;
      const first = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'First take',
        isMovie: true,
        dateOfReview: '2026-01-10',
        tmdbIdentifier: duplicateTmdbId,
      });
      expect(first.status).toBe(201);

      const second = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'Second take',
        isMovie: true,
        dateOfReview: '2026-01-11',
        tmdbIdentifier: duplicateTmdbId,
      });

      expect(second.status).toBe(409);
      expect(second.body.error).toMatch(/already reviewed/i);
    });
  });

  describe('GET /reviews/me', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).get('/reviews/me');
      expect(response.status).toBe(401);
    });

    it('returns 200 with an empty array when the user has no reviews', async () => {
      const u = await prisma.user.findUnique({ where: { subjectId: 'reviews-me-user' } });
      await prisma.review.deleteMany({ where: { userId: u!.id } });

      const response = await request(app)
        .get('/reviews/me')
        .set(authHeader({ sub: 'reviews-me-user' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 200 with all reviews for the authenticated user (raw rows)', async () => {
      const u = await prisma.user.findUnique({ where: { subjectId: 'reviews-me-user' } });
      await prisma.review.deleteMany({ where: { userId: u!.id } });

      await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'reviews-me-user' }))
        .send({
          reviewContent: 'me list one',
          isMovie: true,
          dateOfReview: '2026-04-20',
          tmdbIdentifier: TMDB_ID,
        });
      await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'reviews-me-user' }))
        .send({
          reviewContent: 'me list two',
          isMovie: false,
          dateOfReview: '2026-04-21',
          tmdbIdentifier: TMDB_ID + 1,
        });

      const response = await request(app)
        .get('/reviews/me')
        .set(authHeader({ sub: 'reviews-me-user' }));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      const contents = response.body.map((r: { reviewContent: string }) => r.reviewContent).sort();
      expect(contents).toEqual(['me list one', 'me list two']);

      for (const row of response.body) {
        expect(row).toMatchObject({
          userId: u!.id,
          isMovie: expect.any(Boolean),
          reviewContent: expect.any(String),
          tmdbIdentifier: expect.any(Number),
        });
        expect(row).toHaveProperty('reviewId');
        expect(row).toHaveProperty('dateOfReview');
        expect(typeof row.reviewId).toBe('number');
        expect(typeof row.dateOfReview).toBe('string');
      }
    });

    it('does not include another user reviews', async () => {
      const other = await prisma.user.findUnique({ where: { subjectId: 'other-user-123' } });
      const mine = await prisma.user.findUnique({ where: { subjectId: 'test-sub-123' } });
      expect(other).toBeTruthy();
      expect(mine).toBeTruthy();

      const createdOther = await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({
          reviewContent: 'other user only',
          isMovie: true,
          dateOfReview: '2026-05-01',
          tmdbIdentifier: TMDB_ID,
        });
      expect(createdOther.status).toBe(201);

      const response = await request(app).get('/reviews/me').set(authHeader());

      expect(response.status).toBe(200);
      const ids = response.body.map((r: { reviewId: number }) => r.reviewId);
      expect(ids).not.toContain(createdOther.body.reviewId);
      expect(response.body.every((r: { userId: number }) => r.userId === mine!.id)).toBe(true);
    });
  });

  describe('GET /reviews/:reviewId', () => {
    it('returns 200 without Authorization (public read)', async () => {
      const created = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'Public read',
        isMovie: true,
        dateOfReview: '2026-03-15',
        tmdbIdentifier: TMDB_ID,
      });

      const response = await request(app).get(`/reviews/${created.body.reviewId}`);
      expect(response.status).toBe(200);
      expect(response.body.reviewContent).toBe('Public read');
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app).get('/reviews/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 404 when review does not exist', async () => {
      const response = await request(app).get('/reviews/999999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 200 with persisted content', async () => {
      const created = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'Read me',
        isMovie: true,
        dateOfReview: '2026-03-15',
        tmdbIdentifier: TMDB_ID,
      });

      const response = await request(app).get(`/reviews/${created.body.reviewId}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reviewId: created.body.reviewId,
        isMovie: true,
        reviewContent: 'Read me',
        dateOfReview: '2026-03-15',
        tmdbIdentifier: TMDB_ID,
      });
    });
  });

  describe('PATCH /reviews/:reviewId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app)
        .patch('/reviews/1')
        .send({ reviewContent: 'x', dateOfReview: '2026-01-01' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing or malformed Authorization header');
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app)
        .patch('/reviews/abc')
        .set(authHeader())
        .send({ reviewContent: 'x', dateOfReview: '2026-01-01' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 400 when update body is invalid', async () => {
      const created = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'before',
        isMovie: false,
        dateOfReview: '2026-01-01',
        tmdbIdentifier: TMDB_ID,
      });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId}`)
        .set(authHeader())
        .send({ reviewContent: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewContent|dateOfReview/);
    });

    it('returns 403 when authenticated user does not own the review', async () => {
      const created = await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({
          reviewContent: 'theirs',
          isMovie: true,
          dateOfReview: '2026-02-01',
          tmdbIdentifier: TMDB_ID,
        });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId}`)
        .set(authHeader())
        .send({ reviewContent: 'after', dateOfReview: '2026-02-02' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/own reviews/i);
    });

    it('returns 200 when owner updates their review', async () => {
      const created = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'before',
        isMovie: false,
        dateOfReview: '2026-01-01',
        tmdbIdentifier: TMDB_ID,
      });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId}`)
        .set(authHeader())
        .send({ reviewContent: 'after', dateOfReview: '2026-06-20' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reviewContent: 'after',
        dateOfReview: '2026-06-20',
        tmdbIdentifier: TMDB_ID,
      });
    });
  });

  describe('DELETE /reviews/:reviewId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).delete('/reviews/1');
      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app).delete('/reviews/abc').set(authHeader());

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 404 when review does not exist', async () => {
      const response = await request(app).delete('/reviews/999999').set(authHeader());

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 403 when authenticated user does not own the review', async () => {
      const created = await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({
          reviewContent: 'to delete',
          isMovie: true,
          dateOfReview: '2026-08-01',
          tmdbIdentifier: TMDB_ID,
        });

      const response = await request(app)
        .delete(`/reviews/${created.body.reviewId}`)
        .set(authHeader());

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/own reviews/i);
    });

    it('returns 200 when owner deletes their review', async () => {
      const created = await request(app).post('/reviews').set(authHeader()).send({
        reviewContent: 'remove me',
        isMovie: false,
        dateOfReview: '2026-02-20',
        tmdbIdentifier: TMDB_ID,
      });

      const response = await request(app)
        .delete(`/reviews/${created.body.reviewId}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review deleted successfully' });
    });

    it('allows admin to delete another user review', async () => {
      const created = await request(app)
        .post('/reviews')
        .set(authHeader({ sub: 'other-user-123' }))
        .send({
          reviewContent: 'moderated',
          isMovie: true,
          dateOfReview: '2026-09-01',
          tmdbIdentifier: TMDB_ID,
        });

      const response = await request(app)
        .delete(`/reviews/${created.body.reviewId}`)
        .set(authHeader({ sub: 'admin-user-123', role: 'Admin' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review deleted successfully' });
    });
  });
});
