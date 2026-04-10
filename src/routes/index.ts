import { Router } from 'express';
import { helloRouter } from './hello';

const routes = Router();

routes.use('/hello', helloRouter);

export { routes };
