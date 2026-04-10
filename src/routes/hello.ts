import { Router } from 'express';
import { helloKevin } from '../controllers/hello';

const helloRouter = Router();

helloRouter.get('/kevin', helloKevin);

export { helloRouter };
