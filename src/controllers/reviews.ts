import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

/** Matches a canonical UUID (same rule as validation middleware). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function userIdFromQuery(req: Request): string | undefined {
  const raw = req.query.userId;
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return typeof value === 'string' && UUID_REGEX.test(value) ? value : undefined;
}

function resolveUserIdForCreate(req: Request, body: { userId?: unknown }): string | null {
  if (req.user?.sub) return req.user.sub;
  if (typeof body.userId === 'string' && UUID_REGEX.test(body.userId)) return body.userId;
  return null;
}

async function findReviewForRequest(reviewId: number, queryUserId: string | undefined) {
  if (queryUserId) {
    return prisma.review.findUnique({
      where: { reviewId_userId: { reviewId, userId: queryUserId } },
    });
  }
  return prisma.review.findFirst({ where: { reviewId } });
}

/**
 * POST /reviews — body: { text, type: 0|1, dateOfReview: string, userId?: uuid }.
 * `type` 0 = movie, 1 = show. Without JWT, `userId` must be a valid user UUID.
 * `text` is stored as `reviewContent`; `type` maps to `isMovie` (0 = movie, 1 = show).
 */
export const createReview = async (req: Request, res: Response) => {
  const { text, type, dateOfReview, userId: bodyUserId } = req.body as {
    text: string;
    type: number;
    dateOfReview: string;
    userId?: unknown;
  };

  const userId = resolveUserIdForCreate(req, { userId: bodyUserId });
  if (!userId) {
    return res.status(400).json({
      error: 'Field "userId" is required (valid UUID) when not using Authorization: Bearer',
    });
  }

  const kind = typeof type === 'string' ? Number.parseInt(type, 10) : type;

  try {
    const review = await prisma.review.create({
      data: {
        userId,
        isMovie: kind === 0,
        dateOfReview: new Date(dateOfReview),
        reviewContent: text,
      },
    });
    return res.status(201).json({
      reviewId: review.reviewId,
      userId: review.userId,
      content: text,
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
 * DELETE /reviews/:reviewId — deletes one review. Optional query: ?userId=<uuid> for compound key.
 */
export const deleteReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: 'Parameter "reviewId" must be a positive integer' });
  }

  const qUser = userIdFromQuery(req);

  try {
    const existing = await findReviewForRequest(reviewId, qUser);
    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
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
 * GET /reviews/:reviewId — optional query: ?userId=<uuid>.
 */
export const getReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.reviewId);
  const qUser = userIdFromQuery(req);

  const review = await findReviewForRequest(reviewId, qUser);

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
 * PATCH /reviews/:reviewId — body: `text`, `dateOfReview` only. Does not change movie vs show (`isMovie` is fixed at create).
 */
export const updateReview = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { text, dateOfReview } = req.body as {
    text: string;
    dateOfReview: string;
  };

  const reviewId = Number(req.params.reviewId);
  const qUser = userIdFromQuery(req);

  try {
    const existing = await findReviewForRequest(reviewId, qUser);
    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const review = await prisma.review.update({
      data: {
        reviewContent: text,
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
      userId: review.userId,
      content: text,
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
