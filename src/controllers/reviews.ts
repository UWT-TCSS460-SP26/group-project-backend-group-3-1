import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

/**
 * POST /reviews — body: { content: 0|1, dateOfReview: string }. userId from JWT `sub`.
 */
export const createReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { content, dateOfReview } = req.body as { content: unknown; dateOfReview: string };
  const resolvedContent: number =
    typeof content === 'string' ? Number.parseInt(content, 10) : (content as number);

  try {
    const review = await prisma.review.create({
      data: {
        userId: req.user.sub,
        movieShow: resolvedContent === 0,
        dateOfReview: new Date(dateOfReview),
      },
    });
    return res.status(201).json({
      reviewId: review.reviewId,
      userId: review.userId,
      content: review.movieShow ? 0 : 1,
      dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    throw e;
  }
};

/**
 * DELETE /reviews/:reviewId — deletes the review for the authenticated user.
 * Responds 200 with a success message, or 404 if not found.
 */
export const deleteReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: 'Parameter "reviewId" must be a positive integer' });
  }

  try {
    await prisma.review.delete({
      where: {
        reviewId_userId: {
          reviewId,
          userId: req.user.sub,
        },
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
