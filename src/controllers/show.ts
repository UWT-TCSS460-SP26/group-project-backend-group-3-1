import { Request, Response } from 'express';

const BASE_URL = 'https://api.themoviedb.org/3';

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
