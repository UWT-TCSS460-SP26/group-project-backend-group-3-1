import 'dotenv/config';
import request from 'supertest';
import { app } from '../src/app';

// Mock fetch globally
const globalFetch = globalThis.fetch;
beforeAll(() => {
  process.env.TMDB_BEARER_TOKEN = 'fake-token';
});

afterAll(() => {
  globalThis.fetch = globalFetch;
});

describe('Enriched Details (integration)', () => {
  it('returns 200 and enriched data for a movie happy path', async () => {
    // Mock TMDB response
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 550, title: 'Fight Club' }),
    });

    const response = await request(app).get('/reviews/movies/550/details');

    expect(response.status).toBe(200);
    expect(response.body.tmdbId).toBe(550);
    expect(response.body.type).toBe('movie');
    expect(response.body.metadata.title).toBe('Fight Club');
    expect(response.body.community).toBeDefined();
    expect(Array.isArray(response.body.community.recentReviews)).toBe(true);
  });

  it('returns 404 when TMDB returns 404', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ status_message: 'The resource you requested could not be found.' }),
    });

    const response = await request(app).get('/reviews/movies/99999999/details');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('TMDB API error');
  });

  it('returns 200 and enriched data for a show happy path', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 2004, name: 'Malcolm in the Middle' }),
    });

    const response = await request(app).get('/reviews/shows/2004/details');

    expect(response.status).toBe(200);
    expect(response.body.tmdbId).toBe(2004);
    expect(response.body.type).toBe('show');
    expect(response.body.metadata.name).toBe('Malcolm in the Middle');
    expect(response.body.community).toBeDefined();
  });

  it('returns 400 for invalid id', async () => {
    const response = await request(app).get('/reviews/movies/abc/details');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Parameter "id" must be a positive safe integer');
  });
});
