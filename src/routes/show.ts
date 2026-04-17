import { Router } from 'express';
import { getPopularShows } from '../controllers/show';

const showRouter = Router();

showRouter.get('/popular', getPopularShows);

export { showRouter };
