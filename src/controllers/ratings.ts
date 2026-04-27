import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

const toRatingResponse = (rating: {
  ratingId: number;
  userId: string;
  isMovie: boolean;
  rating: number;
}) => ({
  ratingId: rating.ratingId,
  userId: rating.userId,
  content: rating.isMovie ? 0 : 1,
  value: rating.rating,
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
 * PATCH /ratings/:ratingId — updates the rating row for this id (first match). For local Postman testing without JWT.
 */
export const updateRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.ratingId);
  const { content, value } = req.body as { content?: unknown; value?: unknown };
  const resolvedContent =
    typeof content === 'string' ? Number.parseInt(content, 10) : (content as number | undefined);
  const resolvedValue =
    typeof value === 'string' ? Number.parseInt(value, 10) : (value as number | undefined);

  try {
    const existing = await prisma.rating.findFirst({ where: { ratingId } });
    if (!existing) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const data: Prisma.RatingUncheckedUpdateInput = {};
    if (resolvedContent !== undefined) {
      data.isMovie = resolvedContent === 0;
    }
    if (resolvedValue !== undefined) {
      data.rating = resolvedValue;
    }

    const rating = await prisma.rating.update({
      where: {
        ratingId_userId: {
          ratingId: existing.ratingId,
          userId: existing.userId,
        },
      },
      data,
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
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { content, value } = req.body as {
    content?: number;
    value?: number;
  };

  const resolvedContent =
    typeof content === 'string' ? Number.parseInt(content, 10) : (content as number);
  const resolvedValue = typeof value === 'string' ? Number.parseInt(value, 10) : (value as number);

  if (!Number.isFinite(resolvedContent) || !Number.isFinite(resolvedValue)) {
    return res.status(400).json({ error: 'content and value are required numbers' });
  }

  const rating = await prisma.rating.create({
    data: {
      userId: req.user.sub,
      isMovie: resolvedContent === 0,
      rating: resolvedValue,
    },
  });

  return res.status(201).json(toRatingResponse(rating));
};

/**
 * DELETE /ratings/:ratingId — deletes the authenticated user's rating.
 */
export const deleteRating = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const ratingId = Number(req.params.ratingId);

  try {
    await prisma.rating.delete({
      where: {
        ratingId_userId: {
          ratingId,
          userId: req.user.sub,
        },
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
