import { Router } from 'express';
import { heartbeatRouter } from './heartbeat';
import { movieRouter } from './movies';
import { showRouter } from './shows';
import { reviewRouter } from './reviews';
import { ratingRouter } from './ratings';

const routes = Router();

routes.use('/heartbeat', heartbeatRouter);
routes.use('/movies', movieRouter);
routes.use('/shows', showRouter);
routes.use('/reviews', reviewRouter);
routes.use('/ratings', ratingRouter);

export { routes };
