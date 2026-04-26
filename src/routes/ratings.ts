import { Router } from 'express';
import { getRating, updateRating } from '../controllers/ratings';
import { requireAuth } from '../middleware/requireAuth';
import { validateRatingBody, validateRatingIdParam } from '../middleware/validation';

const ratingRouter = Router();

ratingRouter.get('/:ratingId', validateRatingIdParam, getRating);
ratingRouter.patch('/:ratingId', requireAuth, validateRatingIdParam, validateRatingBody, updateRating);

export { ratingRouter };
