import { Request, Response } from 'express';
import { prisma } from './prisma';

const BASE_URL = 'https://api.themoviedb.org/3';
const RECENT_REVIEW_LIMIT = 5;

export type EnrichedDetailsKind = {
  type: 'movie' | 'show';
  tmdbPath: 'movie' | 'tv';
  isMovie: boolean;
};

/** TMDB metadata plus local ratings/reviews for a movie or TV title (route param `id`; pair with `validateNumericId`). */
export const sendEnrichedDetails = async (
  req: Request,
  res: Response,
  options: EnrichedDetailsKind
): Promise<void> => {
  const token = process.env.TMDB_BEARER_TOKEN;
  const { id } = req.params;

  if (!token) {
    res.status(500).json({ error: 'TMDB token is not configured' });
    return;
  }

  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    res.status(400).json({ error: 'Parameter "id" must be a positive integer' });
    return;
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
      res.status(result.status).json({
        status: `${result.statusText} - ${result.status}`,
        error: 'TMDB API error',
      });
      return;
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

    res.status(200).json({
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
    res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
