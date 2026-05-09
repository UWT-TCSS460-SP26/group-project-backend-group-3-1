import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { TMDBMovieDetailed, TMDBTVDetailsApi } from '../types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

/** Minimum ratings per title for the top-rated discovery list (outlier filter). */
const MIN_RATINGS_TOP_RATED = 3;

type DiscoveryMetadata = {
  title: string | null;
  posterPath: string | null;
  overview: string | null;
  releaseDate: string | null;
};

const fetchMovieMetadata = async (tmdbId: number, token: string): Promise<DiscoveryMetadata> => {
  const result = await fetch(`${BASE_URL}/movie/${tmdbId}?language=en-US`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!result.ok) {
    throw new Error(`TMDB API error: ${result.status}`);
  }

  const data = (await result.json()) as TMDBMovieDetailed;
  const title = data.title ?? null;

  return {
    title,
    posterPath: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
    releaseDate: data.release_date ?? null,
    overview: data.overview ?? null,
  };
};

const fetchShowMetadata = async (tmdbId: number, token: string): Promise<DiscoveryMetadata> => {
  const result = await fetch(`${BASE_URL}/tv/${tmdbId}?language=en-US`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!result.ok) {
    throw new Error(`TMDB API error: ${result.status}`);
  }

  const data = (await result.json()) as TMDBTVDetailsApi;

  return {
    title: data.name ?? null,
    posterPath: data.poster_path ? `${POSTER_BASE}${data.poster_path}` : null,
    releaseDate: data.first_air_date ?? null,
    overview: data.overview ?? null,
  };
};

export const getCommunityDiscovery = async (req: Request, res: Response) => {
  const token = process.env.TMDB_BEARER_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  const type = req.query.type as string;
  const sort = req.query.sort as string;

  if (type !== 'movie' && type !== 'show') {
    return res.status(400).json({ error: 'Invalid type. Must be "movie" or "show"' });
  }

  if (sort !== 'top-rated' && sort !== 'most-reviewed') {
    return res.status(400).json({ error: 'Invalid sort. Must be "top-rated" or "most-reviewed"' });
  }

  try {
    const isMovie = type === 'movie';

    const aggregatedRatings = await prisma.rating.groupBy({
      by: ['tmdbIdentifier'],
      where: { isMovie },
      _avg: { rating: true },
      _count: { rating: true },
      ...(sort === 'top-rated'
        ? {
            having: {
              rating: {
                _count: { gte: MIN_RATINGS_TOP_RATED },
              },
            },
          }
        : {}),
      orderBy: sort === 'top-rated' ? { _avg: { rating: 'desc' } } : { _count: { rating: 'desc' } },
      take: 10,
    });

    const results = await Promise.all(
      aggregatedRatings.map(async (item) => {
        try {
          const metadata =
            type === 'movie'
              ? await fetchMovieMetadata(item.tmdbIdentifier, token)
              : await fetchShowMetadata(item.tmdbIdentifier, token);

          return {
            tmdbId: item.tmdbIdentifier,
            averageRating: item._avg.rating !== null ? Number(item._avg.rating.toFixed(1)) : 0,
            reviewCount: item._count.rating,
            title: metadata.title,
            posterPath: metadata.posterPath,
            overview: metadata.overview,
            releaseDate: metadata.releaseDate,
          };
        } catch {
          return {
            tmdbId: item.tmdbIdentifier,
            averageRating: item._avg.rating !== null ? Number(item._avg.rating.toFixed(1)) : 0,
            reviewCount: item._count.rating,
            title: null,
            posterPath: null,
            overview: null,
            releaseDate: null,
          };
        }
      })
    );

    return res.json({
      type,
      sort,
      results,
    });
  } catch {
    return res.status(502).json({ error: 'Internal server error' });
  }
};
