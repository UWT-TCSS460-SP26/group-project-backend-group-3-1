import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      groupBy: jest.fn(),
    },
    review: {
      count: jest.fn(),
    },
  },
}));

describe('GET /community/discovery', () => {
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

  it('returns 500 when TMDB_BEARER_TOKEN is not set', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/community/discovery');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB token is not configured' });
  });

  it('returns 400 for invalid type', async () => {
    const response = await request(app).get('/community/discovery').query({ type: 'book' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/movie.*show/i);
  });

  it('returns 400 for invalid sort', async () => {
    const response = await request(app)
      .get('/community/discovery')
      .query({ type: 'movie', sort: 'random' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/top-rated|most-reviewed/i);
  });

  it('returns aggregated movies with TMDB metadata', async () => {
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([
      {
        tmdbIdentifier: 550,
        _avg: { rating: 8.5 },
        _count: { rating: 4 },
      },
    ]);
    (prisma.review.count as jest.Mock).mockResolvedValue(4);

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Fight Club',
        poster_path: '/abc.jpg',
        release_date: '1999-10-15',
        overview: 'An insomniac...',
        revenue: 0,
        runtime: 139,
        budget: 63000000,
      }),
    } as never) as typeof globalThis.fetch;

    const response = await request(app)
      .get('/community/discovery')
      .query({ type: 'movie', sort: 'top-rated' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('movie');
    expect(response.body.sort).toBe('top-rated');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0]).toEqual({
      tmdbId: 550,
      averageRating: 8.5,
      reviewCount: 4,
      title: 'Fight Club',
      posterPath: 'https://image.tmdb.org/t/p/w500/abc.jpg',
      overview: 'An insomniac...',
      releaseDate: '1999-10-15',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/550?language=en-US',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });

  it('calls groupBy for movie top-rated when type and sort are provided', async () => {
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([]);

    await request(app).get('/community/discovery').query({ type: 'movie', sort: 'top-rated' });

    expect(prisma.rating.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isMovie: true },
        orderBy: { _avg: { rating: 'desc' } },
        having: {
          rating: { _count: { gte: 3 } },
        },
      })
    );
  });

  it('uses show TMDB path and isMovie false when type=show', async () => {
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([
      { tmdbIdentifier: 1396, _avg: { rating: 9 }, _count: { rating: 5 } },
    ]);
    (prisma.review.count as jest.Mock).mockResolvedValue(5);

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1396,
        name: 'Breaking Bad',
        overview: 'Chem teacher',
        poster_path: '/bb.jpg',
        first_air_date: '2008-01-20',
      }),
    } as never) as typeof globalThis.fetch;

    const response = await request(app)
      .get('/community/discovery')
      .query({ type: 'show', sort: 'top-rated' });

    expect(response.status).toBe(200);
    expect(response.body.results[0].title).toBe('Breaking Bad');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/tv/1396?language=en-US',
      expect.any(Object)
    );
    expect(prisma.rating.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isMovie: false } })
    );
  });

  it('omits minimum-count having for most-reviewed sort', async () => {
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([]);

    await request(app).get('/community/discovery').query({ type: 'movie', sort: 'most-reviewed' });

    expect(prisma.rating.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { _count: { rating: 'desc' } },
      })
    );
    const callArg = (prisma.rating.groupBy as jest.Mock).mock.calls[0][0];
    expect(callArg).not.toHaveProperty('having');
  });

  it('fills null metadata when TMDB fetch fails', async () => {
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([
      { tmdbIdentifier: 999, _avg: { rating: 7 }, _count: { rating: 3 } },
    ]);
    (prisma.review.count as jest.Mock).mockResolvedValue(3);

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as never) as typeof globalThis.fetch;

    const response = await request(app)
      .get('/community/discovery')
      .query({ type: 'movie', sort: 'top-rated' });

    expect(response.status).toBe(200);
    expect(response.body.results[0]).toMatchObject({
      tmdbId: 999,
      averageRating: 7,
      reviewCount: 3,
      title: null,
      posterPath: null,
      overview: null,
      releaseDate: null,
    });
  });

  it('returns 502 when groupBy throws', async () => {
    (prisma.rating.groupBy as jest.Mock).mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .get('/community/discovery')
      .query({ type: 'movie', sort: 'top-rated' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
