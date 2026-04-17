import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { movieRouter } from './movies';
import { showRouter } from './shows';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/movies', movieRouter);
routes.use('/shows', showRouter);

export { routes };
