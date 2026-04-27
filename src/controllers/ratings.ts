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
 * PATCH /ratings/:ratingId — sets the numeric score from body field `rating` (1–10). Validated in middleware.
 */
export const updateRating = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const ratingId = Number(req.params.ratingId);
  const raw = (req.body as { rating: unknown }).rating;
  const nextRating = typeof raw === 'string' ? Number.parseInt(raw, 10) : (raw as number);

  try {
    const rating = await prisma.rating.update({
      where: {
        ratingId_userId: {
          ratingId,
          userId: req.user.sub,
        },
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
