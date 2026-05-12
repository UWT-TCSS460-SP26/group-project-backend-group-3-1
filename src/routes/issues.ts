import { Router } from 'express';
import { createIssue, deleteIssue, listIssues, updateIssue } from '../controllers/issue';
import {
  validateIssueCreateBody,
  validateIssueIdParam,
  validatePatchIssueBody,
} from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const issueRouter = Router();

issueRouter.get('/', requireAuth, listIssues);
issueRouter.post('/', validateIssueCreateBody, createIssue);
issueRouter.patch(
  '/:issueID',
  requireAuth,
  
  validatePatchIssueBody,
  validateIssueIdParam,
  updateIssue
);
issueRouter.delete(
  '/:issueID',
  requireAuth,
  
  validateIssueIdParam,
  deleteIssue
);

export { issueRouter };
