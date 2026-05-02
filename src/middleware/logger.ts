import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();

  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};
