import { Request, Response } from 'express';

export const getHeartbeat = (_req: Request, res: Response) => {
  res.json({ status: 'The server is alive and running.' });
};
