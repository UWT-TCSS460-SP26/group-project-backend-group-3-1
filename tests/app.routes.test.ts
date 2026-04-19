import request from 'supertest';
import { app } from '../src/app';

describe('OpenAPI spec route', () => {
  it('GET /openapi.json returns parsed OpenAPI document', async () => {
    const response = await request(app).get('/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toMatchObject({
      openapi: '3.0.3',
      info: expect.objectContaining({
        title: expect.stringContaining('TCSS 460'),
      }),
    });
    expect(response.body.paths).toBeDefined();
  });
});

describe('API docs mount', () => {
  it('GET /api-docs falls through Scalar mock to 404 handler', async () => {
    const response = await request(app).get('/api-docs');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });
});

describe('Global 404 handler', () => {
  it('returns JSON for unknown paths', async () => {
    const response = await request(app).get('/no-such-route-for-test-xyz');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });
});
