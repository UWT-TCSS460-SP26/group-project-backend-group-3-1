import { Router } from 'express';
import { getEnrichedDetails } from '../controllers/details';
import { requireEnvVar } from '../middleware/validation';

const detailRouter = Router();

detailRouter.use(requireEnvVar('TMDB_BEARER_TOKEN'));
detailRouter.get('/:type/:id', getEnrichedDetails);

export { detailRouter };
