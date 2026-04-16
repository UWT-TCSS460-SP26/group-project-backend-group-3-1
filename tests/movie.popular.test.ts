import request from 'supertest';
import { app } from '../src/app';

describe('Movie Popular Route', () => {
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

  it('GET /movies/popular returns transformed top 10 movie list', async () => {
    const results = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
    }));

    const mockedResponse = {
      ok: true,
      json: async () => ({ results }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies/popular');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(10);
    expect(response.body.results).toHaveLength(10);
    expect(response.body.results[0]).toEqual({
      movieId: 1,
    });
  });

  it('GET /movies/popular returns 500 when token is missing', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/movies/popular');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB token is not configured' });
  });
});
