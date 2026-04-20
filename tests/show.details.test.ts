import request from 'supertest';
import { app } from '../src/app';

describe('Show Details Route (GET /shows/:id)', () => {
  const originalBearer = process.env.TMDB_BEARER_TOKEN;
  const originalApiKey = process.env.TMDB_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.TMDB_BEARER_TOKEN = 'test-bearer';
    delete process.env.TMDB_API_KEY;
  });

  afterEach(() => {
    process.env.TMDB_BEARER_TOKEN = originalBearer;
    process.env.TMDB_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns 500 when neither bearer token nor API key is configured', async () => {
    delete process.env.TMDB_BEARER_TOKEN;
    delete process.env.TMDB_API_KEY;

    const response = await request(app).get('/shows/95557');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB authentication is not configured' });
  });

  it('forwards TMDB status when detail response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/999999999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Not Found - 404');
  });

  it('returns transformed show when TMDB returns ok', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        id: 95557,
        title: 'Invincible',
        poster_path: '/yDWJYRAfMNu9y2A0jN0aYf6APmn.jpg',
        first_air_date: '2021-03-26',
        overview: 'Teenage son of the most powerful superhero.',
        created_by: [{ name: 'Robert Kirkman' }],
        number_of_episodes: 24,
        number_of_seasons: 2,
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/95557');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 95557,
      title: 'Invincible',
      posterImage: 'https://image.tmdb.org/t/p/w500/yDWJYRAfMNu9y2A0jN0aYf6APmn.jpg',
      releaseDate: '2021-03-26',
      shortDescription: 'Teenage son of the most powerful superhero.',
      creator: ['Robert Kirkman'],
      episodeCount: 24,
      seasonCount: 2,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/tv\/95557/),
      expect.any(Object)
    );
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('language=en-US');

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-bearer',
      'Content-Type': 'application/json',
    });
  });

  it('handles null poster path', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Test',
        poster_path: null,
        first_air_date: '',
        overview: '',
        created_by: [],
        number_of_episodes: 0,
        number_of_seasons: 0,
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/1');

    expect(response.status).toBe(200);
    expect(response.body.posterImage).toBeNull();
  });

  it('uses TMDB_API_KEY query param when bearer token is not set', async () => {
    delete process.env.TMDB_BEARER_TOKEN;
    process.env.TMDB_API_KEY = 'v3-api-key';

    const mockedResponse = {
      ok: true,
      json: async () => ({
        id: 2,
        title: 'Keyed',
        poster_path: null,
        first_air_date: '2020-01-01',
        overview: 'Hi',
        created_by: [],
        number_of_episodes: 1,
        number_of_seasons: 1,
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows/2');

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Keyed');

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('api_key=v3-api-key');
    expect(url).not.toContain('Bearer');

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('returns 500 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/shows/1');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });

  it('encodes the id segment in the TMDB URL', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        id: 55,
        title: 'X',
        poster_path: null,
        first_air_date: '',
        overview: '',
        created_by: [],
        number_of_episodes: 0,
        number_of_seasons: 0,
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    await request(app).get('/shows/55');

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/tv/55');
  });
});
