import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

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
  if (!req.localUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const ratingId = Number(req.params.ratingId);
  const raw = (req.body as { rating: unknown }).rating;
  const nextRating = typeof raw === 'string' ? Number.parseInt(raw, 10) : (raw as number);

  const owned = await prisma.rating.findFirst({
    where: { ratingId, userId: req.localUser.id },
  });
  if (!owned) {
    return res.status(404).json({ error: 'Rating not found' });
  }

  try {
    const rating = await prisma.rating.update({
      where: { ratingId },
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
  if (!req.localUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { isMovie, rating, tmdbIdentifier } = req.body as {
    isMovie: boolean;
    rating: number;
    tmdbIdentifier: number;
  };

  const resolvedIsMovie = Boolean(isMovie);
  const resolvedValue =
    typeof rating === 'string' ? Number.parseInt(rating, 10) : (rating as number);
  const resolvedTmdb =
    typeof tmdbIdentifier === 'string'
      ? Number.parseInt(tmdbIdentifier, 10)
      : (tmdbIdentifier as number);

  const ratingResult = await prisma.rating.create({
    data: {
      userId: req.localUser.id,
      isMovie: resolvedIsMovie,
      rating: resolvedValue,
      tmdbIdentifier: resolvedTmdb,
    },
  });

  return res.status(201).json(toRatingResponse(ratingResult));
};

/**
 * DELETE /ratings/:ratingId — deletes the authenticated user's rating.
 */
export const deleteRating = async (req: Request, res: Response) => {
  if (!req.localUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const ratingId = Number(req.params.ratingId);

  const owned = await prisma.rating.findFirst({
    where: { ratingId, userId: req.localUser.id },
  });
  if (!owned) {
    return res.status(404).json({ error: 'Rating not found' });
  }

  try {
    await prisma.rating.delete({
      where: { ratingId },
    });

    return res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Rating not found' });
    }
    throw e;
  }
};
