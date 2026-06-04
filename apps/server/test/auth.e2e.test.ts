import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser } from './helpers';
import { User } from '../src/models/User';

const sentCodes: { to: string; code: string }[] = [];
vi.mock('../src/lib/email', () => ({
  sendPasswordResetCode: vi.fn(async (to: string, code: string) => {
    sentCodes.push({ to, code });
  }),
}));


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

describe('User toJSON strips reset fields', () => {
  it('never exposes resetCodeHash / resetCodeExpires / resetAttempts', async () => {
    const u = await makeUser();
    const res = await request(app).get('/api/auth/me').set(auth(u.token)).expect(200);
    expect(res.body.resetCodeHash).toBeUndefined();
    expect(res.body.resetCodeExpires).toBeUndefined();
    expect(res.body.resetAttempts).toBeUndefined();
  });
});

describe('Password reset flow', () => {
  it('forgot-password returns generic 200 for an existing user and sends a code', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset1@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset1@test.dev' })
      .expect(200);
    expect(res.body.message).toMatch(/reset code/i);
    expect(sentCodes.at(-1)?.to).toBe('reset1@test.dev');
    expect(sentCodes.at(-1)?.code).toMatch(/^\d{6}$/);
  });

  it('forgot-password returns the same generic 200 for an unknown email (no enumeration)', async () => {
    sentCodes.length = 0;
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@test.dev' })
      .expect(200);
    expect(res.body.message).toMatch(/reset code/i);
    expect(sentCodes.length).toBe(0);
  });

  it('reset-password with the correct code sets a new password and returns a token', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset2@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset2@test.dev' }).expect(200);
    const code = sentCodes.at(-1)!.code;

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset2@test.dev', code, newPassword: 'newpassword123' })
      .expect(200);
    expect(res.body.token).toBeTypeOf('string');

    // old password no longer works, new one does
    await request(app).post('/api/auth/login').send({ email: 'reset2@test.dev', password: 'password123' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'reset2@test.dev', password: 'newpassword123' }).expect(200);
  });

  it('reset-password with a wrong code fails with 400', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset3@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset3@test.dev' }).expect(200);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset3@test.dev', code: '000000', newPassword: 'newpassword123' })
      .expect(400);
  });

  it('reset-password is blocked after 5 failed attempts', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset4@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset4@test.dev' }).expect(200);
    const realCode = sentCodes.at(-1)!.code;
    const wrong = realCode === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'reset4@test.dev', code: wrong, newPassword: 'newpassword123' })
        .expect(400);
    }
    // even the correct code now fails — attempt cap reached
    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset4@test.dev', code: realCode, newPassword: 'newpassword123' })
      .expect(400);
  });

  it('reset-password with an expired code fails with 400', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset5@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset5@test.dev' }).expect(200);
    const realCode = sentCodes.at(-1)!.code;

    // Force the stored code to be expired.
    await User.updateOne(
      { email: 'reset5@test.dev' },
      { $set: { resetCodeExpires: new Date(Date.now() - 1000) } }
    );

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset5@test.dev', code: realCode, newPassword: 'newpassword123' })
      .expect(400);
  });
});
