import { Request, Response } from 'express';
import { resolveLocalUser } from '../auth/resolveLocalUser';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

const BASE_URL = 'https://api.themoviedb.org/3';
const RECENT_REVIEW_LIMIT = 5;

/**
 * POST /reviews — author is always req.user (set by requireAuth).
 */
export const createReview = async (req: Request, res: Response) => {
  const { reviewContent, isMovie, dateOfReview, tmdbIdentifier } = req.body as {
    reviewContent: string;
    isMovie: boolean;
    dateOfReview: string;
    tmdbIdentifier: number;
  };

  try {
    const localUser = await resolveLocalUser(req);
    const review = await prisma.review.create({
      data: {
        userId: localUser.id,
        isMovie,
        dateOfReview: new Date(dateOfReview),
        reviewContent,
        tmdbIdentifier: tmdbIdentifier,
      },
    });
    return res.status(201).json({
      reviewId: review.reviewId,
      reviewContent,
      isMovie: review.isMovie,
      dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
      tmdbIdentifier: review.tmdbIdentifier,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    throw e;
  }
};

/**
 * DELETE /reviews/:reviewId — owner or admin (role === "admin"). Hard delete.
 */
export const deleteReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.reviewId);

  try {
    const localUser = await resolveLocalUser(req);
    const existing = await prisma.review.findFirst({ where: { reviewId } });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const isOwner = existing.userId === localUser.id;
    const isAdmin = req.user!.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own reviews or be an Admin' });
    }

    await prisma.review.delete({
      where: {
        reviewId,
      },
    });
    return res.status(200).json({ message: 'Review deleted successfully' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
    throw e;
  }
};

/**
 * GET /reviews/:reviewId — public; reviewId is unique per table (autoincrement).
 */
export const getReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.reviewId);

  const review = await prisma.review.findFirst({ where: { reviewId } });

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  return res.status(200).json({
    reviewId: review.reviewId,
    reviewContent: review.reviewContent,
    isMovie: review.isMovie,
    dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
    tmdbIdentifier: review.tmdbIdentifier,
  });
};

/**
 * PATCH /reviews/:reviewId — only the author may update (not admin).
 */
export const updateReview = async (req: Request, res: Response) => {
  const { reviewContent, dateOfReview } = req.body as {
    reviewContent: string;
    dateOfReview: string;
  };

  const reviewId = Number(req.params.reviewId);

  try {
    const localUser = await resolveLocalUser(req);
    const existing = await prisma.review.findFirst({ where: { reviewId } });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (existing.userId !== localUser.id) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }

    const review = await prisma.review.update({
      data: {
        reviewContent,
        dateOfReview: new Date(dateOfReview),
      },
      where: {
        reviewId,
      },
    });

    return res.status(200).json({
      reviewId: review.reviewId,
      reviewContent,
      isMovie: review.isMovie,
      dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
      tmdbIdentifier: review.tmdbIdentifier,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    throw e;
  }
};

/**
 * GET /reviews/me — lists all reviews for the authenticated user (raw DB rows; `dateOfReview` is full ISO datetime in JSON).
 */
export const getMyReviews = async (req: Request, res: Response) => {
  const localUser = await resolveLocalUser(req);
  const reviews = await prisma.review.findMany({
    where: { userId: localUser.id },
  });

  return res.status(200).json(reviews);
};

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
