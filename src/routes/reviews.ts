import { Router } from 'express';
import {
  createReview,
  deleteReview,
  getMyReviews,
  getReview,
  updateReview,
} from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import {
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.get('/me', requireAuth, getMyReviews);
reviewRouter.get('/:reviewId', validateReviewIdParam, getReview);
reviewRouter.patch(
  '/:reviewId',
  requireAuth,
  validateReviewIdParam,
  validateReviewUpdateBody,
  updateReview
);
reviewRouter.delete('/:reviewId', requireAuth, validateReviewIdParam, deleteReview);

export { reviewRouter };
