import request from 'supertest';
import { app } from '../src/app';

describe('Show Popular Route', () => {
  const originalToken = process.env.TMDB_BEARER_TOKEN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.TMDB_BEARER_TOKEN = 'test-token';
  });

  afterEach(() => {
    process.env.TMDB_BEARER_TOKEN = originalToken;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('GET /shows/popular returns transformed top 10 show list', async () => {
    const results = Array.from({ length: 12 }, (_, i) => ({
      id: i + 100,
      name: `Show ${i + 1}`,
      poster_path: `/poster-${i + 1}.jpg`,
      first_air_date: `2024-02-${String(i + 1).padStart(2, '0')}`,
      overview: `Overview ${i + 1}`,
      genre_ids: [i + 20],
    }));

    const mockedResponse = {
      ok: true,
      json: async () => ({ results }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/popular');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(10);
    expect(response.body.results).toHaveLength(10);
    expect(response.body.results[0]).toEqual({
      id: 100,
      title: 'Show 1',
      posterImage: 'https://image.tmdb.org/t/p/w500/poster-1.jpg',
      releaseDate: '2024-02-01',
      shortDescription: 'Overview 1',
      genreIds: [20],
    });
  });

  it('GET /shows/popular returns 500 when token is missing', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/shows/popular');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB_BEARER_TOKEN is not configured' });
  });

  it('GET /shows/popular forwards TMDB status when discover response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/popular');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Unauthorized - 401');
  });

  it('GET /shows/popular returns 502 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/shows/popular');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });
});
