import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ISSUE_STATUSES } from '../middleware/validation';

type IssueStatus = (typeof ISSUE_STATUSES)[number];

/**
 * GET /issues — all issues, optionally filtered by status, latest report date first.
 */
export const listIssues = async (req: Request, res: Response) => {
  const { status } = req.query;

  if (status !== undefined) {
    if (typeof status !== 'string' || !ISSUE_STATUSES.includes(status as IssueStatus)) {
      return res.status(400).json({
        error: `issueStatus must be one of: ${ISSUE_STATUSES.join(', ')}`,
      });
    }
  }

  const issues = await prisma.issue.findMany({
    where: status ? { issueStatus: status as IssueStatus } : undefined,
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

/**
 * PATCH /issues/:issueID — update issue status.
 */
export const updateIssue = async (req: Request, res: Response) => {
  const { issueStatus } = req.body;
  const issueID: number = Number.parseInt(req.params.issueID as string);

  try {
    const issue = await prisma.issue.update({
      where: { issueID },
      data: { issueStatus },
    });

    return res.status(200).json(issue);
  } catch {
    return res.status(404).json({ error: 'Issue not found' });
  }
};

/**
 * DELETE /issues/:issueID — delete issue.
 */
export const deleteIssue = async (req: Request, res: Response) => {
  const issueID: number = Number.parseInt(req.params.issueID as string);

  try {
    await prisma.issue.delete({
      where: { issueID },
    });

    return res.status(200).json({ message: 'Issue deleted successfully' });
  } catch {
    return res.status(404).json({ error: 'Issue not found' });
  }
};
