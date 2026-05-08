import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      aggregate: jest.fn(),
    },
    review: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('Enriched Details Route (GET /details/:type/:id)', () => {
  const originalToken = process.env.TMDB_BEARER_TOKEN;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.TMDB_BEARER_TOKEN = 'test-token';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.TMDB_BEARER_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns enriched details with community data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 550, title: 'Fight Club' }),
    } as never) as typeof globalThis.fetch;

    (prisma.rating.aggregate as jest.Mock).mockResolvedValue({ _avg: { rating: 4.2 } });
    (prisma.review.count as jest.Mock).mockResolvedValue(2);
    (prisma.review.findMany as jest.Mock).mockResolvedValue([
      {
        reviewId: 10,
        userId: 1,
        reviewContent: 'Great.',
        dateOfReview: new Date('2026-05-01T00:00:00.000Z'),
        user: {
          subjectId: 'alice-sub',
          username: 'alice',
          firstName: '',
          lastName: '',
        },
      },
    ]);

    const response = await request(app).get('/details/movie/550');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      type: 'movie',
      tmdbId: 550,
      metadata: { id: 550, title: 'Fight Club' },
      community: {
        averageRating: 4.2,
        reviewCount: 2,
        recentReviews: [
          {
            reviewId: 10,
            userId: 1,
            reviewContent: 'Great.',
            dateOfReview: '2026-05-01T00:00:00.000Z',
            author: { id: 'alice-sub', displayName: 'alice' },
          },
        ],
      },
    });
  });

  it('returns 404 when TMDB item does not exist', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    } as never) as typeof globalThis.fetch;

    const response = await request(app).get('/details/show/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'Not Found - 404',
      error: 'TMDB API error',
    });
  });

  it('returns null/zero/empty community data when there is no local data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 777, name: 'Some Show' }),
    } as never) as typeof globalThis.fetch;

    (prisma.rating.aggregate as jest.Mock).mockResolvedValue({ _avg: { rating: null } });
    (prisma.review.count as jest.Mock).mockResolvedValue(0);
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    const response = await request(app).get('/details/show/777');

    expect(response.status).toBe(200);
    expect(response.body.community).toEqual({
      averageRating: null,
      reviewCount: 0,
      recentReviews: [],
    });
  });
});
