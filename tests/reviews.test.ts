import 'dotenv/config';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const DEV_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function signToken(overrides: { sub?: string } = {}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set (e.g. in .env) to run review tests');
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

describe('Reviews (integration, requires DB + JWT in .env)', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set in .env to run review integration tests');
    }
    await prisma.user.upsert({
      where: { userId: DEV_USER_ID },
      create: { userId: DEV_USER_ID },
      update: {},
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { userId: DEV_USER_ID } });
    await prisma.$disconnect();
  });

  describe('POST /reviews', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app)
        .post('/reviews')
        .send({ content: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('returns 401 when token is signed with the wrong secret', async () => {
      const badToken = jwt.sign({ sub: DEV_USER_ID, email: 'a@b', role: 'user' }, 'wrong-secret', {
        expiresIn: '1h',
      });
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${badToken}`)
        .send({ content: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(401);
    });

    it('returns 400 when body fails validation (missing dateOfReview)', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Field "dateOfReview" is required');
    });

    it('returns 400 when content is not 0 or 1', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 2, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/content/);
    });

    it('returns 201 and creates a review with valid token and body', async () => {
      const response = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0, dateOfReview: '2026-01-10' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        content: 0,
      });
      expect(response.body.reviewId).toEqual(expect.any(Number));
      expect(response.body.dateOfReview).toBe('2026-01-10');
    });
  });

  describe('DELETE /reviews/:reviewId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).delete('/reviews/1');

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid reviewId', async () => {
      const response = await request(app)
        .delete('/reviews/abc')
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reviewId/);
    });

    it('returns 404 when review does not exist for this user', async () => {
      const response = await request(app)
        .delete('/reviews/999999')
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Review not found');
    });

    it('returns 200 when delete succeeds', async () => {
      const created = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 1, dateOfReview: '2026-02-01' });

      expect(created.status).toBe(201);
      const reviewId = created.body.reviewId as number;

      const response = await request(app)
        .delete(`/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Review deleted successfully' });
    });
  });
});
