import { Router } from 'express';
import { getPopularShows, getShowById, searchShows } from '../controllers/shows';
import { validateNumericId } from '../middleware/validation';

const showRouter = Router();

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);
showRouter.get('/:id', validateNumericId, getShowById);

export { showRouter };
