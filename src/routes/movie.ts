import { Router } from 'express';
import { getMovieDetails, getPopularMovies, searchMovies } from '../controllers/movie';

const movieRouter = Router();

movieRouter.get('/', searchMovies);
movieRouter.get('/popular', getPopularMovies);
movieRouter.get('/:id', getMovieDetails);

export { movieRouter };
