import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import YAML from 'yaml';
import { apiReference } from '@scalar/express-api-reference';
import { routes } from './routes/index';
import { logger } from './middleware/logger';

const app = express();

// Application-level middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// TEMPORARY — Sprint 2 only. Use this router for local development.
// import devAuthRouter from './routes/devAuth';
// app.use('/auth', devAuthRouter);

// OpenAPI documentation
const specFile = fs.readFileSync('./openapi.yaml', 'utf8');
const spec = YAML.parse(specFile);
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(spec);
});
app.use('/api-docs', apiReference({ spec: { url: '/openapi.json' } }));

app.use(routes);

// 404 handler — must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

export { app };
