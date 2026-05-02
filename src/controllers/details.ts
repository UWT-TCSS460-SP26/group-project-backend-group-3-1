import { Request, Response } from 'express';
const BASE_URL = 'https://api.themoviedb.org/3';

export const getEnrichedDetails = async (req: Request, res: Response) => {
  const token = process.env.TMDB_BEARER_TOKEN;
  const { type, id } = req.params;

  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  if (type !== 'movie' && type !== 'show') {
    return res.status(400).json({ error: 'Parameter "type" must be "movie" or "show"' });
  }

  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: 'Parameter "id" must be a positive integer' });
  }

  const tmdbPath = type === 'movie' ? 'movie' : 'tv';

  try {
    const result = await fetch(
      `${BASE_URL}/${tmdbPath}/${encodeURIComponent(String(tmdbId))}?language=en-US`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!result.ok) {
      return res.status(result.status).json({
        status: `${result.statusText} - ${result.status}`,
        error: 'TMDB API error',
      });
    }

    const metadata = (await result.json()) as Record<string, unknown>;

    return res.status(200).json({
      type,
      tmdbId,
      metadata,
    });
  } catch {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
