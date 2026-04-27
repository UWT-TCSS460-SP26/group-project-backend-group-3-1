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
    throw new Error('JWT_SECRET must be set (e.g. in .env) to run ratings2 tests');
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
        },
      });

      const response = await request(app).get(`/ratings/${row.ratingId}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ratingId: row.ratingId,
        userId: DEV_USER_ID,
        content: 0,
        value: 6,
      });
    });
  });

  describe('POST /ratings', () => {
    it('returns 401 when Authorization is missing', async () => {
      const response = await request(app).post('/ratings').send({ content: 0, rating: 7 });
      expect(response.status).toBe(401);
    });

    it('returns 400 when rating is missing', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('returns 400 when rating is outside 1..10', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0, rating: 11 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/1 to 10/);
    });

    it('returns 400 when content is missing (controller-level requirement)', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ rating: 8 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/content and value/i);
    });

    it('creates a rating from content + rating body', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 1, rating: 4 });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        content: 1,
        value: 4,
      });
      expect(typeof response.body.ratingId).toBe('number');
    });

    it('accepts parseable rating strings because middleware/controller use parseInt', async () => {
      const response = await request(app)
        .post('/ratings')
        .set('Authorization', `Bearer ${signToken()}`)
        .send({ content: 0, rating: '7abc' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: DEV_USER_ID,
        content: 0,
        value: 7,
      });
    });
  });

  describe('PATCH /ratings/:ratingId', () => {
    it('does not require auth at route level; missing row still returns 404', async () => {
      const response = await request(app).patch('/ratings/999999').send({ rating: 5 });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 400 for invalid ratingId', async () => {
      const response = await request(app).patch('/ratings/abc').send({ rating: 6 });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ratingId/);
    });

    it('returns 400 when rating is missing', async () => {
      const created = await prisma.rating.create({
        data: { userId: DEV_USER_ID, isMovie: true, rating: 2 },
      });

      const response = await request(app).patch(`/ratings/${created.ratingId}`).send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/rating/i);
    });

    it('updates an existing row by ratingId even for another user', async () => {
      const created = await prisma.rating.create({
        data: { userId: OTHER_USER_ID, isMovie: true, rating: 3 },
      });

      const response = await request(app).patch(`/ratings/${created.ratingId}`).send({ rating: 9 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ratingId: created.ratingId,
        userId: OTHER_USER_ID,
        content: 0,
        value: 9,
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

    it('returns 404 when authenticated user does not own the row', async () => {
      const created = await prisma.rating.create({
        data: { userId: OTHER_USER_ID, isMovie: true, rating: 5 },
      });

      const response = await request(app)
        .delete(`/ratings/${created.ratingId}`)
        .set('Authorization', `Bearer ${signToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Rating not found');
    });

    it('returns 200 and deletes the authenticated users row', async () => {
      const created = await prisma.rating.create({
        data: { userId: DEV_USER_ID, isMovie: false, rating: 10 },
      });

      const response = await request(app)
        .delete(`/ratings/${created.ratingId}`)
        .set('Authorization', `Bearer ${signToken()}`);

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
