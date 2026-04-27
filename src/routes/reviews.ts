import { Router } from 'express';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
import { optionalAuth } from '../middleware/requireAuth';
import { validateReviewBody, validateReviewIdParam } from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.use(optionalAuth);

reviewRouter.post('/', validateReviewBody, createReview);
reviewRouter.get('/:reviewId', validateReviewIdParam, getReview);
reviewRouter.put(
  '/:reviewId',
  validateReviewIdParam,
  validateReviewBody,
  updateReview
);
reviewRouter.delete('/:reviewId', validateReviewIdParam, deleteReview);

export { reviewRouter };
