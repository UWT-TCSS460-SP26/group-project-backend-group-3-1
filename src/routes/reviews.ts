import { Router } from 'express';
import { createReview, deleteReview } from '../controllers/reviews';
import { requireAuth } from '../middleware/requireAuth';
import { validateReviewBody, validateReviewIdParam } from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.delete('/:reviewId', requireAuth, validateReviewIdParam, deleteReview);

export { reviewRouter };
