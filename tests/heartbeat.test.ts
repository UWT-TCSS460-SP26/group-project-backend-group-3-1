import request from 'supertest';
import { app } from '../src/app';

describe('Heartbeat Route', () => {
  it('GET /heartbeat — returns server alive message', async () => {
    // Exercise the heartbeat endpoint.
    const response = await request(app).get('/heartbeat');

    // Verify both HTTP status and response payload.
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('The server is alive and running.');
  });
});
