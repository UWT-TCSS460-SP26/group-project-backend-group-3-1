import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { helloRouter } from './hello';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/hello', helloRouter);

export { routes };
