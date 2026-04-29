import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

/**
 * POST /reviews — author is always req.user (set by requireAuth).
 */
export const createReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { reviewContent, isMovie, dateOfReview, tmdbIdentifier } = req.body as {
    reviewContent: string;
    isMovie: boolean;
    dateOfReview: string;
    tmdbIdentifier: number;
  };

  const resolvedTmdb =
    typeof tmdbIdentifier === 'string'
      ? Number.parseInt(tmdbIdentifier, 10)
      : (tmdbIdentifier as number);

  try {
    const review = await prisma.review.create({
      data: {
        userId: req.user.sub,
        isMovie,
        dateOfReview: new Date(dateOfReview),
        reviewContent,
        tmdbIdentifier: resolvedTmdb,
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
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: 'Parameter "reviewId" must be a positive integer' });
  }

  try {
    const existing = await prisma.review.findFirst({ where: { reviewId } });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const isOwner = existing.userId === req.user.sub;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await prisma.review.delete({
      where: {
        reviewId_userId: {
          reviewId: existing.reviewId,
          userId: existing.userId,
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
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { reviewContent, dateOfReview } = req.body as {
    reviewContent: string;
    dateOfReview: string;
  };

  const reviewId = Number(req.params.reviewId);

  try {
    const existing = await prisma.review.findFirst({ where: { reviewId } });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (existing.userId !== req.user.sub) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }

    const review = await prisma.review.update({
      data: {
        reviewContent,
        dateOfReview: new Date(dateOfReview),
      },
      where: {
        reviewId_userId: {
          reviewId: existing.reviewId,
          userId: existing.userId,
        },
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
