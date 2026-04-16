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
      showId: 100,
    });
  });

  it('GET /shows/popular returns 500 when token is missing', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/shows/popular');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB token is not configured' });
  });
});
