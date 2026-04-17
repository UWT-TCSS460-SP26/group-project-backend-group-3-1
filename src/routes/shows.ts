import { Router } from 'express';
import { getPopularShows, searchShows } from '../controllers/shows';

const showRouter = Router();

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);

export { showRouter };
