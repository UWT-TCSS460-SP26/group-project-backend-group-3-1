import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);

export { routes };
