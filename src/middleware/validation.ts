import { Request, Response, NextFunction } from 'express';

/** Matches a canonical UUID (version nibble 1–8, variant in 8, 9, a, or b). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that the named route parameter is a UUID (e.g. for `UserID`).
 */
export const validateUuidParam = (paramName: string) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const value = request.params[paramName];
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      response.status(400).json({ error: `Parameter "${paramName}" must be a valid UUID` });
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
 * Validates that the ':ratingId' route parameter is a positive integer.
 */
export const validateRatingIdParam = (request: Request, response: Response, next: NextFunction) => {
  const id = Number(request.params.ratingId);
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'Parameter "ratingId" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates JSON body for POST /reviews:
 *   text, isMovie (boolean), dateOfReview, tmdbIdentifier.
 */
export const validateReviewBody = (request: Request, response: Response, next: NextFunction) => {
  const { text, isMovie, dateOfReview, tmdbIdentifier } = request.body as {
    text?: unknown;
    isMovie?: unknown;
    dateOfReview?: unknown;
    tmdbIdentifier?: unknown;
  };
  if (text === undefined || text === null || String(text).trim() === '') {
    response.status(400).json({ error: 'Field "text" is required' });
    return;
  }
  if (typeof text !== 'string') {
    response.status(400).json({ error: 'Field "text" must be a string' });
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
  if (typeof isMovie !== 'boolean') {
    response.status(400).json({ error: 'Field "isMovie" must be a boolean' });
    return;
  }
  if (tmdbIdentifier === undefined || tmdbIdentifier === null) {
    response.status(400).json({ error: 'Field "tmdbIdentifier" is required' });
    return;
  }
  const tmdb =
    typeof tmdbIdentifier === 'string' ? Number.parseInt(tmdbIdentifier, 10) : tmdbIdentifier;
  if (typeof tmdb !== 'number' || !Number.isInteger(tmdb) || tmdb < 1) {
    response.status(400).json({ error: 'Field "tmdbIdentifier" must be a positive integer' });
    return;
  }
  next();
};

/**
 * Validates JSON body for PATCH /reviews/:reviewId — only `text` and `dateOfReview` (does not change movie vs show).
 */
export const validateReviewUpdateBody = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { text, dateOfReview } = request.body as {
    text?: unknown;
    dateOfReview?: unknown;
  };
  if (text === undefined || text === null || String(text).trim() === '') {
    response.status(400).json({ error: 'Field "text" is required' });
    return;
  }
  if (typeof text !== 'string') {
    response.status(400).json({ error: 'Field "text" must be a string' });
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
 * Validates JSON body for PATCH /ratings/:ratingId — required `rating` (1–10).
 */
export const validateRatingPatchBody = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { rating } = request.body as { rating?: unknown };
  if (rating === undefined || rating === null) {
    response.status(400).json({ error: 'Field "rating" is required' });
    return;
  }
  const n = typeof rating === 'string' ? Number.parseInt(rating, 10) : rating;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 10) {
    response.status(400).json({ error: 'Field "rating" must be an integer from 1 to 10' });
    return;
  }
  next();
};

/**
 * Validates JSON body for POST /ratings — `isMovie` (boolean), `rating` (1–10), `tmdbIdentifier` (positive TMDB id).
 */
export const validateRatingCreateBody = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const { isMovie, rating, tmdbIdentifier } = request.body as {
    isMovie?: unknown;
    rating?: unknown;
    tmdbIdentifier?: unknown;
  };

  if (isMovie === undefined || isMovie === null) {
    response.status(400).json({ error: 'Field "isMovie" is required' });
    return;
  }
  if (typeof isMovie !== 'boolean') {
    response.status(400).json({ error: 'Field "isMovie" must be a boolean' });
    return;
  }

  if (rating === undefined || rating === null) {
    response.status(400).json({ error: 'Field "rating" is required' });
    return;
  }
  const n = typeof rating === 'string' ? Number.parseInt(rating, 10) : rating;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 10) {
    response.status(400).json({ error: 'Field "rating" must be an integer from 1 to 10' });
    return;
  }

  if (tmdbIdentifier === undefined || tmdbIdentifier === null) {
    response.status(400).json({ error: 'Field "tmdbIdentifier" is required' });
    return;
  }
  const tmdb =
    typeof tmdbIdentifier === 'string' ? Number.parseInt(tmdbIdentifier, 10) : tmdbIdentifier;
  if (typeof tmdb !== 'number' || !Number.isInteger(tmdb) || tmdb < 1) {
    response.status(400).json({ error: 'Field "tmdbIdentifier" must be a positive integer' });
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
