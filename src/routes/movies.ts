import { Router } from 'express';
import { getMovieDetails, getPopularMovies, searchMovies } from '../controllers/movies';
import { requireEnvVar } from '../middleware/validation';

const movieRouter = Router();

movieRouter.use(requireEnvVar('TMDB_BEARER_TOKEN'));

movieRouter.get('/', searchMovies);
movieRouter.get('/popular', getPopularMovies);
movieRouter.get('/:id', getMovieDetails);

export { movieRouter };
