import { Router } from 'express';
import { getCommunityDiscovery } from '../controllers/community';

const communityRouter = Router();

/** Public discovery feed: DB aggregates joined with TMDB metadata. */
communityRouter.get('/discovery', getCommunityDiscovery);

export { communityRouter };
