import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { movieRouter } from './movie';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/movies', movieRouter);

export { routes };
