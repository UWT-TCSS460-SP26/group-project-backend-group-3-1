import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { resolveLocalUser } from '../auth/resolveLocalUser';

const BASE_URL = 'https://api.themoviedb.org/3';

const toRatingResponse = (rating: {
  ratingId: number;
  isMovie: boolean;
  rating: number;
  tmdbIdentifier: number;
}) => ({
  ratingId: rating.ratingId,
  isMovie: rating.isMovie,
  value: rating.rating,
  tmdbIdentifier: rating.tmdbIdentifier,
});

/**
 * GET /ratings/:ratingId — reads one rating by id using the current schema.
 */
export const getRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.ratingId);

  const rating = await prisma.rating.findFirst({
    where: { ratingId },
  });

  if (!rating) {
    return res.status(404).json({ error: 'Rating not found' });
  }

  return res.status(200).json(toRatingResponse(rating));
};

/**
 * PATCH /ratings/:ratingId — sets the numeric score from body field `rating` (1–10). Validated in middleware.
 */
export const updateRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.ratingId);
  const nextRating = Number(req.body.rating);

  try {
    const localUser = await resolveLocalUser(req);
    const existing = await prisma.rating.findUnique({
      where: { ratingId },
      select: { userId: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    if (existing.userId !== localUser.id) {
      return res.status(403).json({ error: 'You can only update your own ratings' });
    }

    const rating = await prisma.rating.update({
      where: {
        ratingId,
      },
      data: { rating: nextRating },
    });

    return res.status(200).json(toRatingResponse(rating));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Rating not found' });
    }
    throw e;
  }
};

/**
 * POST /ratings — creates a new rating for the authenticated user.
 */
export const createRating = async (req: Request, res: Response) => {
  const { isMovie, rating, tmdbIdentifier } = req.body as {
    isMovie: boolean;
    rating: number;
    tmdbIdentifier: number;
  };

  const localUser = await resolveLocalUser(req);

  const ratingResult = await prisma.rating.create({
    data: {
      userId: localUser.id,
      isMovie,
      rating,
      tmdbIdentifier,
    },
  });

  return res.status(201).json(toRatingResponse(ratingResult));
};

/**
 * DELETE /ratings/:ratingId — deletes the authenticated user's rating.
 */
export const deleteRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.ratingId);

  try {
    const localUser = await resolveLocalUser(req);
    const existing = await prisma.rating.findUnique({
      where: { ratingId },
      select: { userId: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    if (existing.userId !== localUser.id) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    await prisma.rating.delete({
      where: {
        ratingId,
      },
    });

    return res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Rating not found' });
    }
    throw e;
  }
};

/**
 * GET /ratings/me — lists all ratings for the authenticated user (raw DB rows; field `rating` is the score).
 */
export const getMyRatings = async (req: Request, res: Response) => {
  const localUser = await resolveLocalUser(req);
  const ratings = await prisma.rating.findMany({
    where: { userId: localUser.id },
  });

  return res.status(200).json(ratings);
};

/**
 * GET /ratings/me/enriched — lists current user's ratings with TMDB metadata.
 */
export const getMyEnrichedRatings = async (req: Request, res: Response) => {
  const token = process.env.TMDB_BEARER_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TMDB token is not configured' });
  }

  const localUser = await resolveLocalUser(req);
  const ratings = await prisma.rating.findMany({
    where: { userId: localUser.id },
    orderBy: { ratingId: 'desc' },
  });

  const displayName =
    localUser.username || `${localUser.firstName} ${localUser.lastName}`.trim() || 'Unknown User';

  try {
    const enriched = await Promise.all(
      ratings.map(async (rating) => {
        const tmdbPath = rating.isMovie ? 'movie' : 'tv';
        const response = await fetch(
          `${BASE_URL}/${tmdbPath}/${encodeURIComponent(String(rating.tmdbIdentifier))}?language=en-US`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            return {
              ratingId: rating.ratingId,
              isMovie: rating.isMovie,
              value: rating.rating,
              tmdbIdentifier: rating.tmdbIdentifier,
              author: {
                userId: localUser.id,
                username: displayName,
              },
              missing: true,
              metadata: null,
            };
          }

          throw new Error('TMDB API error');
        }

        const metadata = (await response.json()) as Record<string, unknown>;

        return {
          ratingId: rating.ratingId,
          isMovie: rating.isMovie,
          value: rating.rating,
          tmdbIdentifier: rating.tmdbIdentifier,
          author: {
            userId: localUser.id,
            username: displayName,
          },
          missing: false,
          metadata,
        };
      })
    );

    return res.status(200).json({
      count: enriched.length,
      results: enriched,
    });
  } catch {
    return res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};
