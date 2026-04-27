import { Router } from 'express';
import { getRating, updateRating } from '../controllers/ratings';
import { validateRatingBody, validateRatingIdParam } from '../middleware/validation';

const ratingRouter = Router();

ratingRouter.get('/:ratingId', validateRatingIdParam, getRating);
ratingRouter.patch(
  '/:ratingId',
  validateRatingIdParam,
  validateRatingBody,
  updateRating
);

export { ratingRouter };
