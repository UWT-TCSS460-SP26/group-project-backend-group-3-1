import { Request, Response } from 'express';
import { resolveLocalUser } from '../auth/resolveLocalUser';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

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
      return res.status(403).json({ error: 'You can only delete your own reviews' });
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
