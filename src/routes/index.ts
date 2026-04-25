import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { movieRouter } from './movies';
import { showRouter } from './shows';
import { reviewRouter } from './reviews';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/movies', movieRouter);
routes.use('/shows', showRouter);
routes.use('/reviews', reviewRouter);

export { routes };
