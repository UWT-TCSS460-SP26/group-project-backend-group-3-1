import { Request, Response, NextFunction } from 'express';

/** Matches a canonical UUID (version nibble 1–8, variant in 8, 9, a, or b). */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that the named route parameter is a UUID (e.g. for `UserID`).
 */
export const validateUuidParam = (paramName: string) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const value = request.params[paramName];
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      response
        .status(400)
        .json({ error: `Parameter "${paramName}" must be a valid UUID` });
      return;
    }
    next();
  };
};

/**
 * Validates that the ':reviewId' route parameter is a positive integer.
 */
export const validateReviewIdParam = (request: Request, response: Response, next: NextFunction) => {
  const id = Number(request.params.reviewId);
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'Parameter "reviewId" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates JSON body for creating or updating a review:
 *   content — 0 = movie, 1 = show
 *   dateOfReview — parseable date string (e.g. YYYY-MM-DD)
 */
export const validateReviewBody = (request: Request, response: Response, next: NextFunction) => {
  const { content, dateOfReview } = request.body as { content?: unknown; dateOfReview?: unknown };
  const c = typeof content === 'string' ? Number.parseInt(content, 10) : content;
  if (typeof c !== 'number' || !Number.isInteger(c) || (c !== 0 && c !== 1)) {
    response
      .status(400)
      .json({ error: 'Field "content" must be 0 (movie) or 1 (show)' });
    return;
  }
  if (dateOfReview === undefined || dateOfReview === null || dateOfReview === '') {
    response.status(400).json({ error: 'Field "dateOfReview" is required' });
    return;
  }
  if (typeof dateOfReview !== 'string') {
    response.status(400).json({ error: 'Field "dateOfReview" must be a date string' });
    return;
  }
  const parsed = new Date(dateOfReview);
  if (Number.isNaN(parsed.getTime())) {
    response.status(400).json({ error: 'Field "dateOfReview" must be a valid date' });
    return;
  }
  next();
};

/**
 * Validates that the ':id' route parameter is a positive integer.
 */
export const validateNumericId = (request: Request, response: Response, next: NextFunction) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'Parameter "id" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates that a required environment variable is set.
 * Returns a middleware function that checks for the given key in process.env.
 */
export const requireEnvVar = (token: string) => {
  return (_request: Request, response: Response, next: NextFunction) => {
    if (!process.env[token]) {
      response.status(500).json({ error: `${token} is not configured` });
      return;
    }
    next();
  };
};
