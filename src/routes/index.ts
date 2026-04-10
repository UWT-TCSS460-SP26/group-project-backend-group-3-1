import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { helloRouter } from './hello';

const routes = Router();

routes.use('/hello', helloRouter);
routes.use('/heartbeat', heartbeatRouter);

export { routes };
