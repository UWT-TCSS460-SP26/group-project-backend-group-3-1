import { Router } from 'express';
import { resolveLocalUser } from '../auth/resolveLocalUser';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import {
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, resolveLocalUser, validateReviewBody, createReview);
reviewRouter.get('/:reviewId', validateReviewIdParam, getReview);
reviewRouter.patch(
  '/:reviewId',
  requireAuth,
  resolveLocalUser,
  validateReviewIdParam,
  validateReviewUpdateBody,
  updateReview
);
reviewRouter.delete(
  '/:reviewId',
  requireAuth,
  resolveLocalUser,
  validateReviewIdParam,
  deleteReview
);

export { reviewRouter };
