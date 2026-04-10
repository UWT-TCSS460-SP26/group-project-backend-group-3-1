import { Router } from 'express';
import { greetingRouter } from './greeting';

const routes = Router();

routes.use('/hello', greetingRouter);

export { routes };
