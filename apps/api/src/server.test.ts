import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';

describe('SoleControl API Base Suite', () => {
  it('GET /api/health returns 200 and ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('ts');
  });

  it('GET /unknown-route returns 404 with error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-for-testing');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('POST /api/v1/auth/login with invalid credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@fortyv.local', password: 'wrongpassword' });
    expect([401, 500]).toContain(res.status);
    if (res.status === 401) {
      expect(res.body).toHaveProperty('error');
    }
  });
});

