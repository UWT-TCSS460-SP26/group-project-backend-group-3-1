import { Router } from 'express';
import { createIssue, listIssues } from '../controllers/issue';
import { validateIssueCreateBody } from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const issueRouter = Router();

issueRouter.get('/', listIssues);
issueRouter.post('/', validateIssueCreateBody, createIssue);

export { issueRouter };
