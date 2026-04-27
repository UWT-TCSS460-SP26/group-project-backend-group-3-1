import 'dotenv/config';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const DEV_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const OTHER_USER_ID = '6f1ed002-ab65-4c86-a994-7cfa0f55df0f';

const describeIfDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

function signToken(overrides: { sub?: string } = {}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set (e.g. in .env) to run rating tests');
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

describeIfDb('Ratings (integration, requires DB + JWT in .env)', () => {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  beforeAll(async () => {
    if (!hasDatabaseUrl) {
      throw new Error('DATABASE_URL must be set in .env to run rating integration tests');
    }
    await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      create: {
        id: DEV_USER_ID,
        username: 'rating-test-user',
        email: 'rating-dev@test.local',
      },
      update: {},
    });
    await prisma.user.upsert({
      where: { id: OTHER_USER_ID },
      create: {
        id: OTHER_USER_ID,
        username: 'rating-other-user',
        email: 'rating-other@test.local',
      },
      update: {},
    });
  });

  afterAll(async () => {
    if (hasDatabaseUrl) {
      await prisma.rating.deleteMany({ where: { userId: { in: [DEV_USER_ID, OTHER_USER_ID] } } });
    }
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

    it('returns 200 and reads a rating', async () => {
      const rating = await prisma.rating.create({
        data: {
          userId: DEV_USER_ID,
          movieShow: true,
        },
      });

      const response = await request(app).get(`/ratings/${rating.ratingId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ratingId: rating.ratingId,
        userId: DEV_USER_ID,
        content: 0,
      });
    });
  });

  describe('POST /ratings', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).post('/ratings').send({ content: 0, value: 5 });

      expect(response.status).toBe(401);
    });

    it('returns 400 when content is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ value: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/content/);
    });

    it('returns 400 when value is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/value/);
    });

    it('returns 201 and creates a new rating', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 1, value: 4 });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        content: 1,
        value: 4,
      });
      expect(response.body.ratingId).toBeDefined();
    });
  });

  describe('PATCH /ratings/:ratingId', () => {
    it('returns 404 when rating does not exist (no auth required)', async () => {
      const response = await request(app).patch('/ratings/999999').send({ content: 1 });

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app)
        .patch('/ratings/abc')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 400 when content is not 0 or 1', async () => {
      const response = await request(app)
        .patch('/ratings/1')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 2 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/content/);
    });

    it('returns 200 and updates the rating by ratingId (first row; no user scoping)', async () => {
      const rating = await prisma.rating.create({
        data: {
          userId: OTHER_USER_ID,
          movieShow: true,
        },
      });

      const response = await request(app).patch(`/ratings/${rating.ratingId}`).send({ content: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ratingId: rating.ratingId,
        userId: OTHER_USER_ID,
        content: 1,
      });
    });

    it('returns 200 and updates the authenticated user rating', async () => {
      const rating = await prisma.rating.create({
        data: {
          userId: DEV_USER_ID,
          movieShow: true,
        },
      });

      const response = await request(app)
        .patch(`/ratings/${rating.ratingId}`)
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ratingId: rating.ratingId,
        userId: DEV_USER_ID,
        content: 1,
      });
    });
  });

  describe('DELETE /ratings/:ratingId', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).delete('/ratings/1');

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app)
        .delete('/ratings/abc')
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 404 when rating does not belong to the authenticated user', async () => {
      const rating = await prisma.rating.create({
        data: {
          userId: OTHER_USER_ID,
          isMovie: true,
          rating: 5,
        },
      });

      const response = await request(app)
        .delete(`/ratings/${rating.ratingId}`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 200 and deletes the authenticated user rating', async () => {
      const rating = await prisma.rating.create({
        data: {
          userId: DEV_USER_ID,
          isMovie: true,
          rating: 5,
        },
      });

      const response = await request(app)
        .delete(`/ratings/${rating.ratingId}`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Rating deleted successfully');

      // Verify it's actually gone
      const deletedRating = await prisma.rating.findUnique({
        where: {
          ratingId_userId: {
            ratingId: rating.ratingId,
            userId: DEV_USER_ID,
          },
        },
      });
      expect(deletedRating).toBeNull();
    });
  });
});
