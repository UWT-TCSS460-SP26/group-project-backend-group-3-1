import { Router } from 'express';
import { createIssue, deleteIssue, listIssues, updateIssue } from '../controllers/issue';
import {
  validateIssueCreateBody,
  validateIssueIdParam,
  validatePatchIssueBody,
} from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const issueRouter = Router();

issueRouter.get('/', requireAuth, requireRole('Admin'), listIssues);
issueRouter.post('/', validateIssueCreateBody, createIssue);
issueRouter.patch(
  '/:issueID',
  requireAuth,
  requireRole('Admin'),
  validatePatchIssueBody,
  validateIssueIdParam,
  updateIssue
);
issueRouter.delete(
  '/:issueID',
  requireAuth,
  requireRole('Admin'),
  validateIssueIdParam,
  deleteIssue
);

export { issueRouter };
