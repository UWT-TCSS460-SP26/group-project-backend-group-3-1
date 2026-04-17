import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { movieRouter } from './movie';
import { showRouter } from './show';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/movies', movieRouter);
routes.use('/shows', showRouter);

export { routes };
