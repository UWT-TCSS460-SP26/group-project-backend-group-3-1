import 'dotenv/config';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const DEV_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const OTHER_USER_ID = '6f1ed002-ab65-4c86-a994-7cfa0f55df0f';

const describeIfDb = describe;

function signToken(overrides: { sub?: string } = {}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set (e.g. in .env) to run reviews2 tests');
  }
  return jwt.sign(
    {
      sub: overrides.sub ?? DEV_USER_ID,
      email: 'dev@test.local',
      role: 'user',
    },
    secret,
    { expiresIn: '1h' }
  );
}

describeIfDb('Reviews2 (integration, current behavior)', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set in .env to run reviews2 integration tests');
    }

    await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      create: {
        id: DEV_USER_ID,
        username: 'review2-test-user',
        email: 'review2-dev@test.local',
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: OTHER_USER_ID },
      create: {
        id: OTHER_USER_ID,
        username: 'review2-other-user',
        email: 'review2-other@test.local',
      },
      update: {},
    });
  });

  beforeEach(async () => {
    await prisma.review.deleteMany({ where: { userId: { in: [DEV_USER_ID, OTHER_USER_ID] } } });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { userId: { in: [DEV_USER_ID, OTHER_USER_ID] } } });
    await prisma.$disconnect();
  });

  describe('POST /reviews', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app)
        .post('/reviews')
        .send({ text: 'hello', type: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(401);
    });

    it('returns 401 for token signed with the wrong secret', async () => {
      const badToken = jwt.sign({ sub: DEV_USER_ID }, 'wrong-secret', { expiresIn: '1h' });
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${badToken}`)
        .send({ text: 'hello', type: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(401);
    });

    it('returns 400 when dateOfReview is missing', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'hello', type: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Field "dateOfReview" is required');
    });

    it('creates a review and returns persisted content/date', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'Great film', type: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        isMovie: true,
        content: 'Great film',
        dateOfReview: '2026-01-10',
      });
      expect(typeof response.body.reviewId).toBe('number');
    });

    it('accepts non-binary type and maps isMovie=false', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'type two', type: 2, dateOfReview: '2026-03-01' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        content: 'type two',
        isMovie: false,
      });
    });
  });

  describe('GET /reviews/:reviewId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).get('/reviews/1');
      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app)
        .get('/reviews/abc')
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 404 when review does not exist', async () => {
      const response = await request(app)
        .get('/reviews/999999')
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 200 with persisted content', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'Read me', type: 0, dateOfReview: '2026-03-15' });

      const response = await request(app)
        .get(`/reviews/${created.body.reviewId as number}`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reviewId: created.body.reviewId,
        userId: DEV_USER_ID,
        isMovie: true,
        content: 'Read me',
        dateOfReview: '2026-03-15',
      });
    });

    it('ignores invalid query userId and falls back to reviewId lookup', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'Query fallback', type: 1, dateOfReview: '2026-04-01' });

      const response = await request(app)
        .get(`/reviews/${created.body.reviewId as number}?userId=not-a-uuid`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reviewId: created.body.reviewId,
        userId: DEV_USER_ID,
        content: 'Query fallback',
      });
    });
  });

  describe('PATCH /reviews/:reviewId', () => {
    it('returns 401 when Authorization is missing (controller-level auth)', async () => {
      const response = await request(app)
        .patch('/reviews/1')
        .send({ text: 'x', dateOfReview: '2026-01-01' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/authenticated/i);
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app)
        .patch('/reviews/abc')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'x', dateOfReview: '2026-01-01' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 400 when update body is invalid', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'before', type: 1, dateOfReview: '2026-01-01' });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId as number}`)
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/text|dateOfReview/);
    });

    it('returns 401 even with Authorization header (no auth middleware on PATCH route)', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'mine', type: 0, dateOfReview: '2026-02-01' });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId as number}?userId=${OTHER_USER_ID}`)
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'after', dateOfReview: '2026-02-02' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/authenticated/i);
    });

    it('returns 401 for otherwise valid PATCH requests', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'before', type: 1, dateOfReview: '2026-01-01' });

      const response = await request(app)
        .patch(`/reviews/${created.body.reviewId as number}`)
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'after', dateOfReview: '2026-06-20' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/authenticated/i);
    });
  });

  describe('DELETE /reviews/:reviewId', () => {
    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app).delete('/reviews/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 404 when review does not exist', async () => {
      const response = await request(app).delete('/reviews/999999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 404 when query userId is valid UUID but does not match', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'to delete', type: 0, dateOfReview: '2026-08-01' });

      const response = await request(app).delete(
        `/reviews/${created.body.reviewId as number}?userId=${OTHER_USER_ID}`
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 200 and deletes successfully without auth middleware', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ text: 'remove me', type: 1, dateOfReview: '2026-02-20' });

      const response = await request(app).delete(`/reviews/${created.body.reviewId as number}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review deleted successfully' });
    });
  });
});
