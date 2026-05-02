import { Router } from 'express';
import { resolveLocalUser } from '../auth/resolveLocalUser';
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
  resolveLocalUser,
  validateRatingIdParam,
  validateRatingPatchBody,
  updateRating
);
ratingRouter.post('/', requireAuth, resolveLocalUser, validateRatingCreateBody, createRating);
ratingRouter.delete(
  '/:ratingId',
  requireAuth,
  resolveLocalUser,
  validateRatingIdParam,
  deleteRating
);

export { ratingRouter };
