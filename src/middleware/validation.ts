import { Request, Response, NextFunction } from 'express';

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
export const requireEnvVar = (key: string) => {
  return (_request: Request, response: Response, next: NextFunction) => {
    if (!process.env[key]) {
      response.status(500).json({ error: `${key} is not configured` });
      return;
    }
    next();
  };
};
