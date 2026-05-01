import { Router } from 'express';
import { ensureLocalUser } from '../auth/resolveLocalUser';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import {
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, ensureLocalUser, validateReviewBody, createReview);
reviewRouter.get('/:reviewId', validateReviewIdParam, getReview);
reviewRouter.patch(
  '/:reviewId',
  requireAuth,
  ensureLocalUser,
  validateReviewIdParam,
  validateReviewUpdateBody,
  updateReview
);
reviewRouter.delete(
  '/:reviewId',
  requireAuth,
  ensureLocalUser,
  validateReviewIdParam,
  deleteReview
);

export { reviewRouter };
