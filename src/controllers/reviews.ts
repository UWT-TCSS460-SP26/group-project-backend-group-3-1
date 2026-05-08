import { Request, Response } from 'express';
import { resolveLocalUser } from '../auth/resolveLocalUser';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { toAuthor, userAuthorSelect } from '../lib/author';

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
      author: toAuthor(localUser),
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

  const review = await prisma.review.findFirst({
    where: { reviewId },
    include: { user: { select: userAuthorSelect } },
  });

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  const { user, ...rest } = review;
  return res.status(200).json({
    reviewId: rest.reviewId,
    reviewContent: rest.reviewContent,
    isMovie: rest.isMovie,
    dateOfReview: rest.dateOfReview.toISOString().slice(0, 10),
    tmdbIdentifier: rest.tmdbIdentifier,
    author: toAuthor(user),
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
      include: { user: { select: userAuthorSelect } },
    });

    const { user, ...rest } = review;
    return res.status(200).json({
      reviewId: rest.reviewId,
      reviewContent,
      isMovie: rest.isMovie,
      dateOfReview: rest.dateOfReview.toISOString().slice(0, 10),
      tmdbIdentifier: rest.tmdbIdentifier,
      author: toAuthor(user),
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
    include: { user: { select: userAuthorSelect } },
  });

  const body = reviews.map((r) => {
    const { user, ...rest } = r;
    return { ...rest, author: toAuthor(user) };
  });

  return res.status(200).json(body);
};
