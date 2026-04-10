import { Request, Response } from 'express';

export const helloKevin = (req: Request, res: Response) => {
  res.json({ message: 'Hello from Kevin!' });
};
