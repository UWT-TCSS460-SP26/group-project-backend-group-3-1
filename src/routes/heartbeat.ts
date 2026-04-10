import { Router } from 'express';
import { getHeartbeat } from '../controllers/heartbeat';

const heartbeatRouter = Router();

heartbeatRouter.get('/', getHeartbeat);

export { heartbeatRouter };
