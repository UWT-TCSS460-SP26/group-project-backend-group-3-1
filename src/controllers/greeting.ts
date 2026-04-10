import { Request, Response } from 'express';

export const getChristian = (_req: Request, res: Response) => {
  res.json({ message: 'Hello! My name is Christian' });
};
