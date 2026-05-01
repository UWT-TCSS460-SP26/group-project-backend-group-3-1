import { Router } from 'express';
import { ensureLocalUser } from '../auth/resolveLocalUser';
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
  ensureLocalUser,
  validateRatingIdParam,
  validateRatingPatchBody,
  updateRating
);
ratingRouter.post('/', requireAuth, ensureLocalUser, validateRatingCreateBody, createRating);
ratingRouter.delete(
  '/:ratingId',
  requireAuth,
  ensureLocalUser,
  validateRatingIdParam,
  deleteRating
);

export { ratingRouter };
