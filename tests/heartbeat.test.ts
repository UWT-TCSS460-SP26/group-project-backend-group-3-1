import request from 'supertest';
import { app } from '../src/app';

describe('Heartbeat Route', () => {
  it('GET /heartbeat — returns server alive message', async () => {
    const response = await request(app).get('/heartbeat');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('This server is alive!');
  });
});
