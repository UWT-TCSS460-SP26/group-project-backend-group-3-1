import { Router } from 'express';
import { greetingRouter } from './greeting';

const routes = Router();

//change path later according to API structure
routes.use('/', greetingRouter);

export { routes };
