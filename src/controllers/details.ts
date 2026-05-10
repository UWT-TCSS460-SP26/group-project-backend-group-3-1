import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const BASE_URL = 'https://api.themoviedb.org/3';
const RECENT_REVIEW_LIMIT = 5;

const getEnrichedDetailsByType = async (
  req: Request,
  res: Response,
  options: { type: 'movie' | 'show'; tmdbPath: 'movie' | 'tv'; isMovie: boolean }
) => {
  const token = process.env.TMDB_BEARER_TOKEN;
  const { id } = req.params;

  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: 'Parameter "id" must be a positive integer' });
  }

  try {
    const result = await fetch(
      `${BASE_URL}/${options.tmdbPath}/${encodeURIComponent(String(tmdbId))}?language=en-US`,
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

    const [ratingAggregate, reviewCount, recentReviews] = await Promise.all([
      prisma.rating.aggregate({
        where: { isMovie: options.isMovie, tmdbIdentifier: tmdbId },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: { isMovie: options.isMovie, tmdbIdentifier: tmdbId },
      }),
      prisma.review.findMany({
        where: { isMovie: options.isMovie, tmdbIdentifier: tmdbId },
        orderBy: { dateOfReview: 'desc' },
        take: RECENT_REVIEW_LIMIT,
        select: {
          reviewId: true,
          userId: true,
          reviewContent: true,
          dateOfReview: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      type: options.type,
      tmdbId,
      metadata,
      community: {
        averageRating: ratingAggregate._avg.rating,
        reviewCount,
        recentReviews: recentReviews.map((review) => ({
          reviewId: review.reviewId,
          userId: review.userId,
          username: review.user.username,
          reviewContent: review.reviewContent,
          dateOfReview: review.dateOfReview.toISOString(),
        })),
      },
    });
  } catch {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getEnrichedMovieDetails = async (req: Request, res: Response) => {
  return getEnrichedDetailsByType(req, res, {
    type: 'movie',
    tmdbPath: 'movie',
    isMovie: true,
  });
};

export const getEnrichedShowDetails = async (req: Request, res: Response) => {
  return getEnrichedDetailsByType(req, res, {
    type: 'show',
    tmdbPath: 'tv',
    isMovie: false,
  });
};
