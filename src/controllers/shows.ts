import { Request, Response } from 'express';
import { TMDBTVDetailsApi, TMDBTVSearchResponse } from '../types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export const searchShows = async (req: Request, res: Response) => {
  const title = req.query.title;
  const token = process.env.TMDB_BEARER_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  if (title === undefined || title === null || String(title).trim() === '') {
    return res.status(400).json({ error: 'Query parameter title is required' });
  }

  try {
    const result = await fetch(
      `${BASE_URL}/search/tv?query=${encodeURIComponent(String(title))}&language=en-US`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!result.ok) {
      res
        .status(result.status)
        .json({ status: `${result.statusText} - ${result.status}`, error: 'TMDB API error' });
      return;
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
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getShowById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = process.env.TMDB_BEARER_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  if (id === undefined || id === null || String(id).trim() === '') {
    return res.status(400).json({ error: 'Show id is required' });
  }

  try {
    const result = await fetch(`${BASE_URL}/tv/${encodeURIComponent(String(id))}?language=en-US`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!result.ok) {
      return res.status(result.status).json({
        status: `${result.statusText} - ${result.status}`,
        error: 'TMDB API error',
      });
    }

    const data = (await result.json()) as TMDBTVDetailsApi & {
      id: number;
      name?: string;
      original_name?: string;
    };

    return res.json({
      id: data.id,
      title: data.name ?? data.original_name ?? '',
      shortDescription: data.overview,
      creator: data.created_by?.map((person) => person.name) ?? [],
      genres: data.genres ?? [],
      releaseDate: data.first_air_date,
      episodeCount: data.number_of_episodes ?? 0,
      seasonCount: data.number_of_seasons ?? 0,
      posterImage: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
    });
  } catch (_error) {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
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
      res
        .status(result.status)
        .json({ status: `${result.statusText} - ${result.status}`, error: 'TMDB API error' });
      return;
    }

    const data = (await result.json()) as {
      results: Array<{
        id: number;
        name: string;
        poster_path: string | null;
        first_air_date: string;
        overview: string;
        genre_ids?: number[];
      }>;
    };

    const popularShows = data.results.slice(0, 10).map((show) => ({
      id: show.id,
      title: show.name,
      posterImage: show.poster_path ? `${POSTER_BASE}${show.poster_path}` : null,
      releaseDate: show.first_air_date,
      shortDescription: show.overview,
      genreIds: show.genre_ids ?? [],
    }));

    return res.json({ count: popularShows.length, results: popularShows });
  } catch (_error) {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
