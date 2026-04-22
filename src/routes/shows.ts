import { Router } from 'express';
import { getPopularShows, getShowById, searchShows } from '../controllers/shows';
import { validateNumericId, requireEnvVar } from '../middleware/validation';


const showRouter = Router();

showRouter.use(requireEnvVar('TMDB_BEARER_TOKEN', 'TMDB_API_KEY'));

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);
showRouter.get('/:id', validateNumericId, getShowById);

export { showRouter };
