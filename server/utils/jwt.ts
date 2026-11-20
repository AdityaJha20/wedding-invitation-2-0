import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';

// Local development and tests only; never used when NODE_ENV=production.
const DEV_ONLY_JWT_SECRET = 'local-development-only-jwt-secret-not-for-production';

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
}

/** Fails fast in production when JWT_SECRET is missing or blank. Called at server startup. */
export const assertJwtSecretConfigured = (): void => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET environment variable is missing or empty. Refusing to start in production.');
  }
};

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  assertJwtSecretConfigured(); // also guards any request path if startup check was bypassed
  return DEV_ONLY_JWT_SECRET;
};

export const signAdminToken = (payload: AdminTokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '24h',
  });
};

export const verifyAdminToken = (token: string): AdminTokenPayload => {
  return jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
};

export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  };
};
