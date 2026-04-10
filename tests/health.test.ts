import request from 'supertest';
import { app } from '../src/app';

describe('Heartbeat route', () => {
  it('GET /heartbeat — returns alive status', async () => {
    const response = await request(app).get('/heartbeat');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('The server is alive and running.');
  });
});
