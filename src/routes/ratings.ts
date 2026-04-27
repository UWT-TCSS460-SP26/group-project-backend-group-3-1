import { Router } from 'express';
import { createRating, deleteRating, getRating, updateRating } from '../controllers/ratings';
import { requireAuth } from '../middleware/requireAuth';
import { validateRatingBody, validateRatingIdParam } from '../middleware/validation';

const ratingRouter = Router();

ratingRouter.get('/:ratingId', validateRatingIdParam, getRating);
ratingRouter.patch(
  '/:ratingId',
  validateRatingIdParam,
  validateRatingBody,
  updateRating
);
ratingRouter.post('/', requireAuth, validateRatingBody, createRating);
ratingRouter.delete('/:ratingId', requireAuth, validateRatingIdParam, deleteRating);

export { ratingRouter };
