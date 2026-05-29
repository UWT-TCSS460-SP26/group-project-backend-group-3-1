import { Request, Response, NextFunction } from 'express';

/** Matches a canonical UUID (version nibble 1–8, variant in 8, 9, a, or b). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const POSITIVE_INTEGER_REGEX = /^[1-9]\d*$/;

/** Upper bound for Prisma `Int` / typical SQL `INTEGER` (signed 32-bit). */
export const PG_INT32_MAX = 2_147_483_647;

/** Shown in 400 responses — values above this cannot be stored as `Int`. */
const PG_INTEGER_RANGE_MSG = `must be a positive integer up to ${PG_INT32_MAX}`;

/**
 * Parses a positive integer that fits stored `Int` fields: safe in JS and ≤ {@link PG_INT32_MAX}.
 * Accepts JSON `string` or `number`; strings must be digits only with no leading zero (e.g. `"550"`, not `"0550"`).
 */
const parsePositiveSafeIntegerFromUnknown = (rawValue: unknown): number | null => {
  let n: number;
  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue <= 0 || !Number.isSafeInteger(rawValue)) {
      return null;
    }
    n = rawValue;
  } else if (typeof rawValue === 'string') {
    if (!POSITIVE_INTEGER_REGEX.test(rawValue)) {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return null;
    }
    n = parsed;
  } else {
    return null;
  }
  if (n > PG_INT32_MAX) {
    return null;
  }
  return n;
};

const parsePositiveSafeIntegerParam = (rawValue: unknown): number | null =>
  parsePositiveSafeIntegerFromUnknown(rawValue);

/** `rating` body field: integer 1–10, same digit rules as {@link parsePositiveSafeIntegerFromUnknown} for strings. */
const parseTenPointRatingFromUnknown = (rawValue: unknown): number | null => {
  const n = parsePositiveSafeIntegerFromUnknown(rawValue);
  if (n === null || n > 10) {
    return null;
  }
  return n;
};

/**
 * Validates that the named route parameter is a UUID (e.g. for `UserID`).
 */
export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      res.status(400).json({ error: `Parameter "${paramName}" must be a valid UUID` });
      return;
    }
    next();
  };
};

/**
 * Validates that the ':reviewId' route parameter is a positive integer.
 */
export const validateReviewIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parsePositiveSafeIntegerParam(req.params.reviewId);
  if (id === null) {
    res.status(400).json({
      error: `Parameter "reviewId" ${PG_INTEGER_RANGE_MSG}`,
    });
    return;
  }
  next();
};

/**
 * Validates that the ':ratingId' route parameter is a positive integer.
 */
export const validateRatingIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parsePositiveSafeIntegerParam(req.params.ratingId);
  if (id === null) {
    res.status(400).json({
      error: `Parameter "ratingId" ${PG_INTEGER_RANGE_MSG}`,
    });
    return;
  }
  next();
};

/**
 * Validates JSON body for POST /reviews:
 *   reviewContent, isMovie (boolean), tmdbIdentifier.
 */
export const validateReviewBody = (req: Request, res: Response, next: NextFunction) => {
  const { reviewContent, isMovie, tmdbIdentifier } = req.body as {
    reviewContent?: unknown;
    isMovie?: unknown;
    tmdbIdentifier?: unknown;
  };
  if (
    reviewContent === undefined ||
    reviewContent === null ||
    String(reviewContent).trim() === ''
  ) {
    res.status(400).json({ error: 'Field "reviewContent" is required' });
    return;
  }
  if (typeof reviewContent !== 'string') {
    res.status(400).json({ error: 'Field "reviewContent" must be a string' });
    return;
  }
  if (typeof isMovie !== 'boolean') {
    res.status(400).json({ error: 'Field "isMovie" must be a boolean' });
    return;
  }
  if (tmdbIdentifier === undefined || tmdbIdentifier === null) {
    res.status(400).json({ error: 'Field "tmdbIdentifier" is required' });
    return;
  }
  const tmdb = parsePositiveSafeIntegerFromUnknown(tmdbIdentifier);
  if (tmdb === null) {
    res.status(400).json({ error: `Field "tmdbIdentifier" ${PG_INTEGER_RANGE_MSG}` });
    return;
  }

  req.body.tmdbIdentifier = tmdb;

  next();
};

/**
 * Validates JSON body for PATCH /reviews/:reviewId — only `reviewContent` (does not change movie vs show).
 */
export const validateReviewUpdateBody = (req: Request, res: Response, next: NextFunction) => {
  const { reviewContent } = req.body as {
    reviewContent?: unknown;
  };
  if (
    reviewContent === undefined ||
    reviewContent === null ||
    String(reviewContent).trim() === ''
  ) {
    res.status(400).json({ error: 'Field "reviewContent" is required' });
    return;
  }
  if (typeof reviewContent !== 'string') {
    res.status(400).json({ error: 'Field "reviewContent" must be a string' });
    return;
  }
  next();
};

/**
 * Validates JSON body for PATCH /ratings/:ratingId — required `rating` (1–10).
 */
export const validateRatingPatchBody = (req: Request, res: Response, next: NextFunction) => {
  const { rating } = req.body as { rating?: unknown };
  if (rating === undefined || rating === null) {
    res.status(400).json({ error: 'Field "rating" is required' });
    return;
  }
  const n = parseTenPointRatingFromUnknown(rating);
  if (n === null) {
    res.status(400).json({ error: 'Field "rating" must be an integer from 1 to 10' });
    return;
  }

  req.body.rating = n;

  next();
};

/**
 * Validates JSON body for POST /ratings — `isMovie` (boolean), `rating` (1–10), `tmdbIdentifier` (positive TMDB id).
 */
export const validateRatingCreateBody = (req: Request, res: Response, next: NextFunction) => {
  const { isMovie, rating, tmdbIdentifier } = req.body as {
    isMovie?: unknown;
    rating?: unknown;
    tmdbIdentifier?: unknown;
  };

  if (isMovie === undefined || isMovie === null) {
    res.status(400).json({ error: 'Field "isMovie" is required' });
    return;
  }
  if (typeof isMovie !== 'boolean') {
    res.status(400).json({ error: 'Field "isMovie" must be a boolean' });
    return;
  }

  if (rating === undefined || rating === null) {
    res.status(400).json({ error: 'Field "rating" is required' });
    return;
  }
  const n = parseTenPointRatingFromUnknown(rating);
  if (n === null) {
    res.status(400).json({ error: 'Field "rating" must be an integer from 1 to 10' });
    return;
  }

  if (tmdbIdentifier === undefined || tmdbIdentifier === null) {
    res.status(400).json({ error: 'Field "tmdbIdentifier" is required' });
    return;
  }
  const tmdb = parsePositiveSafeIntegerFromUnknown(tmdbIdentifier);
  if (tmdb === null) {
    res.status(400).json({ error: `Field "tmdbIdentifier" ${PG_INTEGER_RANGE_MSG}` });
    return;
  }

  req.body.rating = n;
  req.body.tmdbIdentifier = tmdb;

  next();
};

/**
 * Validates JSON body for POST /issues — required `issueStatus` and `issueDesc`.
 */
export const validateIssueCreateBody = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { issueStatus, issueDesc } = (request.body ?? {}) as {
    issueStatus?: unknown;
    issueDesc?: unknown;
  };

  if (
    typeof issueStatus !== 'string' ||
    !ISSUE_STATUSES.includes(issueStatus as (typeof ISSUE_STATUSES)[number])
  ) {
    response.status(400).json({
      error: `issueStatus must be one of: ${ISSUE_STATUSES.join(', ')}`,
    });
    return;
  }

  if (typeof issueDesc !== 'string' || issueDesc.trim() === '') {
    response.status(400).json({ error: 'issueDesc is required' });
    return;
  }

  next();
};

/**
 * Validates that the ':id' route parameter is a positive integer.
 */
export const validateNumericId = (req: Request, res: Response, next: NextFunction) => {
  const id = parsePositiveSafeIntegerParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: `Parameter "id" ${PG_INTEGER_RANGE_MSG}` });
    return;
  }
  next();
};

export const validateIssueIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parsePositiveSafeIntegerParam(req.params.issueID);
  if (id === null) {
    res.status(400).json({
      error: `Parameter "issueID" ${PG_INTEGER_RANGE_MSG}`,
    });
    return;
  }
  next();
};

/**
 * Validates that a required environment variable is set.
 * Returns a middleware function that checks for the given key in process.env.
 */
export const requireEnvVar = (token: string) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!process.env[token]) {
      res.status(500).json({ error: `${token} is not configured` });
      return;
    }
    next();
  };
};

export const validatePatchIssueBody = (req: Request, res: Response, next: NextFunction) => {
  const { issueStatus } = (req.body ?? {}) as { issueStatus?: unknown };
  if (issueStatus === undefined || issueStatus === null) {
    res.status(400).json({ error: 'Field "issueStatus" is required' });
    return;
  }
  if (
    typeof issueStatus !== 'string' ||
    !ISSUE_STATUSES.includes(issueStatus as (typeof ISSUE_STATUSES)[number])
  ) {
    res.status(400).json({
      error: `issueStatus must be one of: ${ISSUE_STATUSES.join(', ')}`,
    });
    return;
  }
  next();
};
