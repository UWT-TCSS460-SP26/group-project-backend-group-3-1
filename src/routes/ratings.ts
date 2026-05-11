import { Router } from 'express';
import {
  createRating,
  deleteRating,
  getRating,
  updateRating,
  getMyRatings,
  getMyEnrichedRatings,
} from '../controllers/ratings';
import { requireAuth } from '../middleware/requireAuth';
import {
  requireEnvVar,
  validateRatingCreateBody,
  validateRatingIdParam,
  validateRatingPatchBody,
} from '../middleware/validation';

const ratingRouter = Router();

ratingRouter.get('/me', requireAuth, getMyRatings);
ratingRouter.get('/me/enriched', requireAuth, requireEnvVar('TMDB_BEARER_TOKEN'), getMyEnrichedRatings);
ratingRouter.get('/:ratingId', validateRatingIdParam, getRating);
ratingRouter.patch(
  '/:ratingId',
  requireAuth,
  validateRatingIdParam,
  validateRatingPatchBody,
  updateRating
);
ratingRouter.post('/', requireAuth, validateRatingCreateBody, createRating);
ratingRouter.delete('/:ratingId', requireAuth, validateRatingIdParam, deleteRating);

export { ratingRouter };
