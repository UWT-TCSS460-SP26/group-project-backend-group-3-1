import { Router } from 'express';
import { createReview, deleteReview, getReview, updateReview } from '../controllers/reviews';
<<<<<<< HEAD
import { optionalAuth } from '../middleware/requireAuth';
import { validateReviewBody, validateReviewIdParam } from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.use(optionalAuth);

reviewRouter.post('/', validateReviewBody, createReview);
reviewRouter.get('/:reviewId', validateReviewIdParam, getReview);
reviewRouter.put(
=======
import { requireAuth } from '../middleware/requireAuth';
import {
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.get('/:reviewId', requireAuth, validateReviewIdParam, getReview);
reviewRouter.patch(
>>>>>>> bc6451291104ea6f6ef2201ecdb88bec28505e90
  '/:reviewId',
  validateReviewIdParam,
  validateReviewUpdateBody,
  updateReview
);
reviewRouter.delete('/:reviewId', validateReviewIdParam, deleteReview);

export { reviewRouter };
