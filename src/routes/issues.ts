import { Router } from 'express';
import { createIssue, listIssues } from '../controllers/issue';
import { validateIssueCreateBody } from '../middleware/validation';

const issueRouter = Router();

issueRouter.get('/', listIssues);
issueRouter.post('/', validateIssueCreateBody, createIssue);

export { issueRouter };
