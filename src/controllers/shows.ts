import { Request, Response } from 'express';
import { TMDBTVDetailsApi, TMDBTVSearchResponse } from '../types/tmdb';

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

export const getShowById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { headers, apiKey } = getTmdbAuth();

  if (id === undefined || id === null || String(id).trim() === '') {
    return res.status(400).json({ error: 'Show id is required' });
  }

  if (!process.env.TMDB_BEARER_TOKEN && !apiKey) {
    return res.status(500).json({ error: 'TMDB authentication is not configured' });
  }

  const params = new URLSearchParams({ language: 'en-US' });
  if (apiKey) {
    params.set('api_key', apiKey);
  }

  const url = `${BASE_URL}/tv/${encodeURIComponent(String(id))}?${params.toString()}`;

  try {
    const result = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        status: `${result.statusText} - ${result.status}`,
        error: 'TMDB API error',
      });
    }

    const data = (await result.json()) as TMDBTVDetailsApi & { id: number };

    return res.json({
      id: data.id,
      title: data.title,
      shortDescription: data.overview,
      creator: data.created_by?.map((person) => person.name) ?? [],
      releaseDate: data.first_air_date,
      episodeCount: data.number_of_episodes ?? 0,
      seasonCount: data.number_of_seasons ?? 0,
      posterImage: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
    });

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