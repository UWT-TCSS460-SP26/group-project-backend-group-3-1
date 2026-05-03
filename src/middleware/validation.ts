import { Request, Response, NextFunction } from 'express';

/** Matches a canonical UUID (version nibble 1–8, variant in 8, 9, a, or b). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

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
  const id = Number(req.params.reviewId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Parameter "reviewId" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates that the ':ratingId' route parameter is a positive integer.
 */
export const validateRatingIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.ratingId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Parameter "ratingId" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates JSON body for POST /reviews:
 *   reviewContent, isMovie (boolean), dateOfReview, tmdbIdentifier.
 */
export const validateReviewBody = (req: Request, res: Response, next: NextFunction) => {
  const { reviewContent, isMovie, dateOfReview, tmdbIdentifier } = req.body as {
    reviewContent?: unknown;
    isMovie?: unknown;
    dateOfReview?: unknown;
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
  if (dateOfReview === undefined || dateOfReview === null || dateOfReview === '') {
    res.status(400).json({ error: 'Field "dateOfReview" is required' });
    return;
  }
  if (typeof dateOfReview !== 'string') {
    res.status(400).json({ error: 'Field "dateOfReview" must be a date string' });
    return;
  }
  const parsed = new Date(dateOfReview);
  if (Number.isNaN(parsed.getTime())) {
    res.status(400).json({ error: 'Field "dateOfReview" must be a valid date' });
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
  const tmdb =
    typeof tmdbIdentifier === 'string' ? Number.parseInt(tmdbIdentifier, 10) : tmdbIdentifier;
  if (typeof tmdb !== 'number' || !Number.isInteger(tmdb) || tmdb < 1) {
    res.status(400).json({ error: 'Field "tmdbIdentifier" must be a positive integer' });
    return;
  }

  req.body.tmdbIdentifier = tmdb;

  next();
};

/**
 * Validates JSON body for PATCH /reviews/:reviewId — only `reviewContent` and `dateOfReview` (does not change movie vs show).
 */
export const validateReviewUpdateBody = (req: Request, res: Response, next: NextFunction) => {
  const { reviewContent, dateOfReview } = req.body as {
    reviewContent?: unknown;
    dateOfReview?: unknown;
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
  if (dateOfReview === undefined || dateOfReview === null || dateOfReview === '') {
    res.status(400).json({ error: 'Field "dateOfReview" is required' });
    return;
  }
  if (typeof dateOfReview !== 'string') {
    res.status(400).json({ error: 'Field "dateOfReview" must be a date string' });
    return;
  }
  const parsed = new Date(dateOfReview);
  if (Number.isNaN(parsed.getTime())) {
    res.status(400).json({ error: 'Field "dateOfReview" must be a valid date' });
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
  const n = typeof rating === 'string' ? Number.parseInt(rating, 10) : rating;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 10) {
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
  const n = typeof rating === 'string' ? Number.parseInt(rating, 10) : rating;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 10) {
    res.status(400).json({ error: 'Field "rating" must be an integer from 1 to 10' });
    return;
  }

  if (tmdbIdentifier === undefined || tmdbIdentifier === null) {
    res.status(400).json({ error: 'Field "tmdbIdentifier" is required' });
    return;
  }
  const tmdb =
    typeof tmdbIdentifier === 'string' ? Number.parseInt(tmdbIdentifier, 10) : tmdbIdentifier;
  if (typeof tmdb !== 'number' || !Number.isInteger(tmdb) || tmdb < 1) {
    res.status(400).json({ error: 'Field "tmdbIdentifier" must be a positive integer' });
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
  const { issueStatus, issueDesc } = request.body as {
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
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Parameter "id" must be a positive integer' });
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
