import { Router } from 'express';
import {
  getEnrichedShowDetails,
  getPopularShows,
  getShowById,
  searchShows,
} from '../controllers/shows';
import { validateNumericId, requireEnvVar } from '../middleware/validation';

const showRouter = Router();

showRouter.use(requireEnvVar('TMDB_BEARER_TOKEN'));

showRouter.get('/', searchShows);
showRouter.get('/popular', getPopularShows);
showRouter.get('/details/:id', validateNumericId, getEnrichedShowDetails);
showRouter.get('/:id', validateNumericId, getShowById);

export { showRouter };
