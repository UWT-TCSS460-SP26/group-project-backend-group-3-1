import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { resolveLocalUser } from '../auth/resolveLocalUser';

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
