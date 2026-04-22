import request from 'supertest';
import { app } from '../src/app';

describe('Show Search Route (GET /shows)', () => {
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

  it('returns 400 when title query is missing', async () => {
    const response = await request(app).get('/shows');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query parameter title is required' });
  });

  it('returns 400 when title is empty or whitespace', async () => {
    const empty = await request(app).get('/shows').query({ title: '' });
    expect(empty.status).toBe(400);

    const space = await request(app).get('/shows').query({ title: '   ' });
    expect(space.status).toBe(400);
  });

  it('returns 500 when bearer token is not configured', async () => {
    delete process.env.TMDB_BEARER_TOKEN;
    delete process.env.TMDB_API_KEY;

    const response = await request(app).get('/shows').query({ title: 'invincible' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB_BEARER_TOKEN is not configured' });
  });

  it('returns 500 when only TMDB_API_KEY is set without bearer', async () => {
    delete process.env.TMDB_BEARER_TOKEN;
    process.env.TMDB_API_KEY = 'v3-api-key';

    const response = await request(app).get('/shows').query({ title: 'test' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB_BEARER_TOKEN is not configured' });
  });

  it('forwards TMDB status when search response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows').query({ title: 'x' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Unauthorized - 401');
  });

  it('returns 502 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/shows').query({ title: 'x' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });

  it('returns an empty array when TMDB returns no TV results', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({ results: [] }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows').query({ title: 'zzzznonexistent' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns transformed shows when TMDB returns results', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            id: 95557,
            name: 'Invincible',
            poster_path: '/yDWJYRAfMNu9y2A0jN0aYf6APmn.jpg',
            first_air_date: '2021-03-26',
            overview: 'Teenage son of the most powerful superhero.',
            genre_ids: [16, 10765, 9648],
          },
          {
            id: 999,
            name: 'No Poster Show',
            poster_path: null,
            first_air_date: '',
            overview: '',
            genre_ids: [],
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/shows').query({ title: 'invincible' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 95557,
        title: 'Invincible',
        posterImage: 'https://image.tmdb.org/t/p/w500/yDWJYRAfMNu9y2A0jN0aYf6APmn.jpg',
        releaseDate: '2021-03-26',
        shortDescription: 'Teenage son of the most powerful superhero.',
        genreIds: [16, 10765, 9648],
      },
      {
        id: 999,
        title: 'No Poster Show',
        posterImage: null,
        releaseDate: '',
        shortDescription: '',
        genreIds: [],
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search/tv'),
      expect.any(Object)
    );
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('query=invincible');
    expect(url).toContain('language=en-US');

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-bearer',
      'Content-Type': 'application/json',
    });
  });

  it('encodes special characters in the search title for the TMDB query', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({ results: [] }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    await request(app).get('/shows').query({ title: 'a&b=c' });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent('a&b=c'));
  });
});
