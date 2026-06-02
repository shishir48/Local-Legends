import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser } from './helpers';

describe('health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.env).toBe('test');
  });
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token, never the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'New@Test.dev', password: 'password123', displayName: 'New' })
      .expect(201);

    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.id).toBeTypeOf('string');
    expect(res.body.user.email).toBe('new@test.dev'); // lowercased
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user._id).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    await makeUser({ email: 'dup@test.dev' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.dev', password: 'password123', displayName: 'Dup' })
      .expect(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('rejects short passwords with 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@test.dev', password: 'short', displayName: 'S' })
      .expect(400);
  });

  it('rejects invalid email with 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', displayName: 'X' })
      .expect(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await makeUser({ email: 'login@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'password123' })
      .expect(200);
    expect(res.body.token).toBeTypeOf('string');
  });

  it('is case-insensitive on email', async () => {
    await makeUser({ email: 'case@test.dev', password: 'password123' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'CASE@TEST.DEV', password: 'password123' })
      .expect(200);
  });

  it('rejects wrong password with 401 and a generic message', async () => {
    await makeUser({ email: 'wrong@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.dev', password: 'nope-wrong' })
      .expect(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('rejects unknown email with the same generic 401 (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.dev', password: 'password123' })
      .expect(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const u = await makeUser();
    const res = await request(app).get('/api/auth/me').set(auth(u.token)).expect(200);
    expect(res.body.id).toBe(u.id);
    expect(res.body.email).toBe(u.email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('rejects a missing token with 401', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('rejects a malformed token with 401', async () => {
    await request(app).get('/api/auth/me').set(auth('garbage.token.here')).expect(401);
  });
});
