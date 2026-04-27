import { Router } from 'express';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import {
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.get('/:reviewId', requireAuth, validateReviewIdParam, getReview);
reviewRouter.patch('/:reviewId', validateReviewIdParam, validateReviewUpdateBody, updateReview);
reviewRouter.delete('/:reviewId', validateReviewIdParam, deleteReview);

export { reviewRouter };
