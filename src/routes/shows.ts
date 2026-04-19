import { Router } from 'express';
import { getPopularShows, getShowByID, searchShows } from '../controllers/shows';
import { validateNumericId } from '../middleware/validation';

const showRouter = Router();

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);
showRouter.get('/:id', validateNumericId ,getShowByID);

export { showRouter };
