import { Router, Request, Response } from 'express';
import { getMovieDetails, getPopularMovies, searchMovies } from '../controllers/movie';

const movieRouter = Router();

movieRouter.get('/', searchMovies);
movieRouter.get('/:id', getMovieDetails);
movieRouter.get('/popular', getPopularMovies);

export { movieRouter };
