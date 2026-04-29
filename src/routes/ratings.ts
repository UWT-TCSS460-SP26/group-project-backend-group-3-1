import { Router } from 'express';
import { createRating, deleteRating, getRating, updateRating } from '../controllers/ratings';
import { requireAuth } from '../middleware/requireAuth';
import {
  validateRatingCreateBody,
  validateRatingIdParam,
  validateRatingPatchBody,
} from '../middleware/validation';

const ratingRouter = Router();

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
