import { Router } from 'express';
import { getChristian } from '../controllers/greeting';

//maybe create v1 folder and put this file in there
const greetingRouter = Router();

greetingRouter.get('/christian', getChristian);

export { greetingRouter };