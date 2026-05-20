import { Router } from 'express';
import { createIssue, deleteIssue, listIssues, updateIssue } from '../controllers/issue';
import {
  validateIssueCreateBody,
  validateIssueIdParam,
  validatePatchIssueBody,
} from '../middleware/validation';
import { requireAuth, requireDbRoleAtLeast } from '../middleware/requireAuth';

const issueRouter = Router();

issueRouter.get('/', requireAuth, requireDbRoleAtLeast('Admin'), listIssues);
issueRouter.post('/', validateIssueCreateBody, createIssue);
issueRouter.patch(
  '/:issueID',
  requireAuth,
  requireDbRoleAtLeast('Admin'),
  validatePatchIssueBody,
  validateIssueIdParam,
  updateIssue
);
issueRouter.delete(
  '/:issueID',
  requireAuth,
  requireDbRoleAtLeast('Admin'),
  validateIssueIdParam,
  deleteIssue
);

export { issueRouter };
