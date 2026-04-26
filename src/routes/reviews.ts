import { Router } from 'express';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import { validateReviewBody, validateReviewIdParam } from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.get('/:reviewId', requireAuth, validateReviewIdParam, getReview);
reviewRouter.put(
  '/:reviewId',
  requireAuth,
  validateReviewIdParam,
  validateReviewBody,
  updateReview
);
reviewRouter.delete('/:reviewId', requireAuth, validateReviewIdParam, deleteReview);

export { reviewRouter };
