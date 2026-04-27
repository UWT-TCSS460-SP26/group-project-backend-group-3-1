import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

const toRatingResponse = (rating: { ratingId: number; userId: string; movieShow: boolean }) => ({
  ratingId: rating.ratingId,
  userId: rating.userId,
  content: rating.movieShow ? 0 : 1,
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
  const { content } = req.body as { content: unknown };
  const resolvedContent = typeof content === 'string' ? Number.parseInt(content, 10) : content;

  try {
    const existing = await prisma.rating.findFirst({ where: { ratingId } });
    if (!existing) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const rating = await prisma.rating.update({
      where: {
        ratingId_userId: {
          ratingId: existing.ratingId,
          userId: existing.userId,
        },
      },
      data: {
        movieShow: resolvedContent === 0,
      },
    });

    return res.status(200).json(toRatingResponse(rating));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ error: 'Rating not found' });
    }
    throw e;
  }
};
