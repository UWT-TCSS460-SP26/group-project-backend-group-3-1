import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { toAuthor, userAuthorSelect } from '../lib/author';

const BASE_URL = 'https://api.themoviedb.org/3';
const RECENT_REVIEW_LIMIT = 5;

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
  const isMovie = type === 'movie';

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

    const [ratingAggregate, reviewCount, recentReviews] = await Promise.all([
      prisma.rating.aggregate({
        where: { isMovie, tmdbIdentifier: tmdbId },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: { isMovie, tmdbIdentifier: tmdbId },
      }),
      prisma.review.findMany({
        where: { isMovie, tmdbIdentifier: tmdbId },
        orderBy: { dateOfReview: 'desc' },
        take: RECENT_REVIEW_LIMIT,
        select: {
          reviewId: true,
          userId: true,
          reviewContent: true,
          dateOfReview: true,
          user: {
            select: userAuthorSelect,
          },
        },
      }),
    ]);

    return res.status(200).json({
      type,
      tmdbId,
      metadata,
      community: {
        averageRating: ratingAggregate._avg.rating,
        reviewCount,
        recentReviews: recentReviews.map((review) => ({
          reviewId: review.reviewId,
          userId: review.userId,
          reviewContent: review.reviewContent,
          dateOfReview: review.dateOfReview.toISOString(),
          author: toAuthor(review.user),
        })),
      },
    });
  } catch {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
