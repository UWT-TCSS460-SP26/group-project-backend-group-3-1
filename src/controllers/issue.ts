import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ISSUE_STATUSES } from '../middleware/validation';

type IssueStatus = (typeof ISSUE_STATUSES)[number];

/**
 * GET /issues — all issues, latest report date first.
 */
export const listIssues = async (_req: Request, res: Response) => {
  const issues = await prisma.issue.findMany({
    orderBy: { issueReportDate: 'desc' },
  });

  return res.status(200).json(issues);
};

/**
 * POST /issues — create bug report (body validated by validateIssueCreateBody).
 */
export const createIssue = async (req: Request, res: Response) => {
  const { issueStatus, issueDesc } = req.body as {
    issueStatus: IssueStatus;
    issueDesc: string;
  };

  const issue = await prisma.issue.create({
    data: {
      issueStatus,
      issueDesc: issueDesc.trim(),
      issueReportDate: new Date(),
    },
  });

  return res.status(201).json(issue);
};
