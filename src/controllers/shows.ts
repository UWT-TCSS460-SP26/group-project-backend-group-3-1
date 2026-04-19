import { Request, Response } from 'express';
import { TMDBTVSearchResponse } from '../types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

function getTmdbAuth(): { headers: Record<string, string>; apiKey: string | undefined } {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (bearer) {
    return {
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      apiKey: undefined,
    };
  }

  return {
    headers: { 'Content-Type': 'application/json' },
    apiKey: apiKey,
  };
}

export const searchShows = async (req: Request, res: Response) => {
  const title = req.query.title;
  const { headers, apiKey } = getTmdbAuth();

  if (title === undefined || title === null || String(title).trim() === '') {
    return res.status(400).json({ error: 'Query parameter title is required' });
  }

  if (!process.env.TMDB_BEARER_TOKEN && !apiKey) {
    return res.status(500).json({ error: 'TMDB authentication is not configured' });
  }

  const params = new URLSearchParams({
    query: String(title),
    language: 'en-US',
  });
  if (apiKey) {
    params.set('api_key', apiKey);
  }

  try {
    const result = await fetch(`${BASE_URL}/search/tv?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'TMDB API error' });
    }

    const data = (await result.json()) as TMDBTVSearchResponse;

    const shows = data.results.map((show) => ({
      id: show.id,
      title: show.name,
      posterImage: show.poster_path ? `${POSTER_BASE}${show.poster_path}` : null,
      releaseDate: show.first_air_date,
      shortDescription: show.overview,
      genreIds: show.genre_ids,
    }));

    return res.json(shows);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getPopularShows = async (_req: Request, res: Response) => {
  const token = process.env.TMDB_BEARER_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  try {
    const result = await fetch(
      `${BASE_URL}/discover/tv?with_original_language=en&sort_by=popularity.desc`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!result.ok) {
      return res.status(result.status).json({ error: 'TMDB API error' });
    }

    const data = (await result.json()) as {
      results: Array<{
        id: number;
      }>;
    };

    const popularShows = data.results.slice(0, 10).map((show) => ({
      showId: show.id,
    }));

    return res.json({ count: popularShows.length, results: popularShows });
  } catch (_error) {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
export const getShowByID = async (request: Request, response: Response) => {
  const { id } = request.params;
  const { apiKey } = getTmdbAuth();

  try {
    const result = await fetch(
      `${BASE_URL}/tv/${encodeURIComponent(String(id))}?api_key=${apiKey}`,
      { method: 'GET' }
    );

    if (!result.ok) {
      const errorText = await result.text();
      response.status(result.status).json({
        error: errorText || 'TMDB API Error'
      });
      return;
    }

    const data = await result.json() as {
      id: number;
      name: string;
      first_air_date: string;
      overview: string;
      poster_path: string | null;
      created_by?: Array<{ name: string }>;
      genres?: Array<{ id: number; name: string }>;
      number_of_episodes?: number;
      number_of_seasons?: number;
    };

    const transformed = {
      creator: data.created_by?.map((person) => person.name) ?? [],
      title: data.name,
      releaseDate: data.first_air_date,
      shortDescription: data.overview,
      genre: data.genres?.map((genre) => genre.name) ?? [],
      posterImage: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
      episodeCount: data.number_of_episodes ?? 0,
      seasonCount: data.number_of_seasons ?? 0,
    };

    response.json(transformed);

  } catch (_error) {
    response.status(502).json({ error: 'Failed to reach TMDB' });
  }
};