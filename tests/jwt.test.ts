import { describe, it, expect, afterEach } from 'vitest';
import { assertJwtSecretConfigured, getJwtSecret, signAdminToken, verifyAdminToken } from '../server/utils/jwt.js';

const original = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };

describe('JWT secret configuration', () => {
  afterEach(() => {
    process.env.NODE_ENV = original.NODE_ENV;
    if (original.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original.JWT_SECRET;
  });

  it.each([undefined, '', '   '])('refuses production when JWT_SECRET is %j', (secret) => {
    process.env.NODE_ENV = 'production';
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    expect(() => assertJwtSecretConfigured()).toThrow(/JWT_SECRET/);
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    expect(() => signAdminToken({ id: '1', email: 'a@b.c', role: 'admin' })).toThrow(/JWT_SECRET/);
  });

  it('uses the configured JWT_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'configured_production_secret_value_1234';
    expect(() => assertJwtSecretConfigured()).not.toThrow();
    expect(getJwtSecret()).toBe('configured_production_secret_value_1234');
    const token = signAdminToken({ id: '1', email: 'a@b.c', role: 'admin' });
    expect(verifyAdminToken(token).email).toBe('a@b.c');
  });

  it('keeps a development-only fallback outside production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    expect(getJwtSecret()).toMatch(/development-only/);
  });
});
