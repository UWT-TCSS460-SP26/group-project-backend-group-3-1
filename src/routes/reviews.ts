import { Router } from 'express';
import {
  createReview,
  deleteReview,
  getMyReviews,
  getReview,
  updateReview,
} from '../controllers/reviews';
import { getEnrichedMovieDetails, getEnrichedShowDetails } from '../controllers/details';
import { requireAuth } from '../middleware/requireAuth';
import {
  requireEnvVar,
  validateNumericId,
  validateReviewBody,
  validateReviewIdParam,
  validateReviewUpdateBody,
} from '../middleware/validation';

const reviewRouter = Router();

reviewRouter.post('/', requireAuth, validateReviewBody, createReview);
reviewRouter.get('/me', requireAuth, getMyReviews);
reviewRouter.get(
  '/movies/:id/details',
  requireEnvVar('TMDB_BEARER_TOKEN'),
  validateNumericId,
  getEnrichedMovieDetails
);
reviewRouter.get(
  '/shows/:id/details',
  requireEnvVar('TMDB_BEARER_TOKEN'),
  validateNumericId,
  getEnrichedShowDetails
);
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
