import request from 'supertest';
import { app } from '../src/app';

describe('Movie Search Route', () => {
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

  it('GET /movies returns 400 when title query is missing', async () => {
    const response = await request(app).get('/movies');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Title is required' });
  });

  it('GET /movies returns 500 when token is missing', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/movies').query({ title: 'x' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB token is not configured' });
  });

  it('GET /movies forwards TMDB status when search response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies').query({ title: 'x' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Unauthorized - 401');
  });

  it('GET /movies returns message when TMDB returns no results', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({ results: [] }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies').query({ title: 'nothing' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'No movies found with title: nothing',
    });
  });

  it('GET /movies returns transformed movie list when TMDB returns results', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'The Matrix',
            poster_path: '/p.jpg',
            release_date: '1999-03-31',
            overview: 'A computer hacker learns from mysterious rebels.',
            id: 603,
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies').query({ title: 'matrix' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        title: 'The Matrix',
        poster: '/p.jpg',
        releaseDate: '1999-03-31',
        description: 'A computer hacker learns from mysterious rebels.',
        id: 603,
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search/movie'),
      expect.any(Object)
    );
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('query=matrix');
  });

  it('GET /movies returns 502 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/movies').query({ title: 'x' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });
});

describe('Movie Details Route', () => {
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

  it('GET /movies/:id returns 500 when token is missing', async () => {
    delete process.env.TMDB_BEARER_TOKEN;

    const response = await request(app).get('/movies/123');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'TMDB token is not configured' });
  });

  it('GET /movies/:id forwards TMDB status when detail response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Not Found - 404');
  });

  it('GET /movies/:id returns transformed movie when TMDB returns ok', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => ({
        title: 'The Matrix',
        poster_path: '/p.jpg',
        release_date: '1999-03-31',
        overview: 'A computer hacker learns from mysterious rebels.',
        revenue: 463517383,
        runtime: 136,
        budget: 63000000,
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies/550');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      title: 'The Matrix',
      poster_path: '/p.jpg',
      release_date: '1999-03-31',
      overview: 'A computer hacker learns from mysterious rebels.',
      revenue: 463517383,
      runtime: 136,
      budget: 63000000,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/movie\/550/),
      expect.any(Object)
    );
  });

  it('GET /movies/:id returns 502 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/movies/1');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });
});

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

  it('GET /movies/popular forwards TMDB status when discover response is not ok', async () => {
    const mockedResponse = {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({}),
    };

    global.fetch = jest.fn().mockResolvedValue(mockedResponse as never) as typeof global.fetch;

    const response = await request(app).get('/movies/popular');

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('TMDB API error');
    expect(response.body.status).toBe('Service Unavailable - 503');
  });

  it('GET /movies/popular returns 502 when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof global.fetch;

    const response = await request(app).get('/movies/popular');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to reach TMDB service' });
  });
});
