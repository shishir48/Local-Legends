import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

export const app: Express = createApp();

export interface TestUser {
  token: string;
  id: string;
  email: string;
  displayName: string;
}

let counter = 0;

/** Register a fresh user through the real HTTP route and return its token. */
export async function makeUser(overrides: Partial<{ email: string; password: string; displayName: string }> = {}): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@test.dev`;
  const password = overrides.password ?? 'password123';
  const displayName = overrides.displayName ?? `User ${counter}`;

  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, displayName })
    .expect(201);

  return { token: res.body.token, id: res.body.user.id, email, displayName };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Minimal valid gem payload for create routes. */
export function gemPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Hidden Cafe',
    category: 'food',
    description: 'Tiny place with great filter coffee.',
    address: '12 Lane St',
    city: 'Chennai',
    lat: 13.0827,
    lng: 80.2707,
    ...overrides,
  };
}
