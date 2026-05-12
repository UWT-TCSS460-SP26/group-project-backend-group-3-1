import { Router } from 'express';
import {
  getEnrichedMovieDetails,
  getMovieDetails,
  getPopularMovies,
  searchMovies,
} from '../controllers/movies';
import { requireEnvVar, validateNumericId } from '../middleware/validation';

const movieRouter = Router();

movieRouter.use(requireEnvVar('TMDB_BEARER_TOKEN'));

movieRouter.get('/', searchMovies);
movieRouter.get('/popular', getPopularMovies);
movieRouter.get('/details/:id', validateNumericId, getEnrichedMovieDetails);
movieRouter.get('/:id', getMovieDetails);

export { movieRouter };
