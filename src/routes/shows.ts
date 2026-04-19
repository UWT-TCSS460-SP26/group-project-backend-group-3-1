import { Router } from 'express';
import { getPopularShows, getShowById, searchShows } from '../controllers/shows';

const showRouter = Router();

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);
showRouter.get('/:id', getShowById);

export { showRouter };
