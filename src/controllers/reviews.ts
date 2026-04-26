import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

/**
 * POST /reviews — body: { text, type: 0|1, dateOfReview: string }.
 * `type` 0 = movie, 1 = show. `text` maps to `Review.reviewContent`. userId from JWT `sub`.
 */
export const createReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { text, type, dateOfReview } = req.body as {
    text: string;
    type: number;
    dateOfReview: string;
  };

  const kind = typeof type === 'string' ? Number.parseInt(type, 10) : type;

  try {
    const review = await prisma.review.create({
      data: {
        userId: req.user.sub,
        isMovie: kind === 0,
        reviewContent: text,
        dateOfReview: new Date(dateOfReview),
      },
    });
    return res.status(201).json({
      reviewId: review.reviewId,
      userId: review.userId,
      content: review.reviewContent,
      isMovie: review.isMovie,
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

/**
 * GET /reviews/:reviewId — reads one review by id using the current schema.
 */
export const getReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const reviewId = Number(req.params.reviewId);

  const review = await prisma.review.findUnique({
    where: {
      reviewId_userId: {
        reviewId,
        userId: req.user.sub,
      },
    },
  });

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  return res.status(200).json({
    reviewId: review.reviewId,
    userId: review.userId,
    content: review.reviewContent,
    isMovie: review.isMovie,
    dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
  });
};

/**
 * PUT /reviews/:reviewId — full replace: body same as POST (`text`, `type`, `dateOfReview`).
 */
export const updateReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { text, type, dateOfReview } = req.body as {
    text: string;
    type: number;
    dateOfReview: string;
  };
  const kind = typeof type === 'string' ? Number.parseInt(type, 10) : type;
  const reviewId = Number(req.params.reviewId);

  try {
    const review = await prisma.review.update({
      data: {
        reviewContent: text,
        isMovie: kind === 0,
        dateOfReview: new Date(dateOfReview),
      },
      where: {
        reviewId_userId: {
          reviewId,
          userId: req.user.sub,
        },
      },
    });
    return res.status(200).json({
      reviewId: review.reviewId,
      userId: review.userId,
      content: review.reviewContent,
      isMovie: review.isMovie,
      dateOfReview: review.dateOfReview.toISOString().slice(0, 10),
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
