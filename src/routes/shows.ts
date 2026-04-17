import { Router } from 'express';
import { getPopularShows } from '../controllers/shows';

const showRouter = Router();

showRouter.get('/popular', getPopularShows);

export { showRouter };
