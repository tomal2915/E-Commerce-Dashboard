// src/common/middleware/csrf.middleware.ts
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// State-changing methods that must carry a matching CSRF token.
// GET/HEAD/OPTIONS are "safe" methods by HTTP spec — they must never mutate
// state, so CSRF protection doesn't apply to them.
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Routes that legitimately cannot carry a CSRF header yet:
// - /auth/login: the very first request, before any session exists
// - /auth/refresh: may be called by a fresh tab that hasn't loaded the SPA's
//   in-memory CSRF handling yet, but already has cookies from a prior session
const CSRF_EXEMPT_PATHS = ['/auth/login', '/auth/refresh'];

const IS_PROD = process.env.NODE_ENV === 'production';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Constant-time string comparison — prevents an attacker from using response
// timing differences to guess the correct token byte-by-byte.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const actualPath = req.originalUrl.split('?')[0];

    console.log(
      '[CSRF]',
      req.method,
      actualPath,
      '(req.path was:',
      req.path,
      ')',
    );

    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (!csrfToken) {
      csrfToken = generateToken();
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: IS_PROD,
        sameSite: IS_PROD ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      req.cookies[CSRF_COOKIE_NAME] = csrfToken;
    }

    const normalizedPath = actualPath.replace(/\/+$/, '');
    const isExempt = CSRF_EXEMPT_PATHS.some(
      (path) => normalizedPath === path || normalizedPath.startsWith(`${path}`),
    );
    const needsCheck = PROTECTED_METHODS.includes(req.method) && !isExempt;

    if (!needsCheck) {
      return next();
    }

    const origin = req.headers.origin ?? req.headers.referer;
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (origin && allowedOrigins.length > 0) {
      const originIsAllowed = allowedOrigins.some((allowed) =>
        origin.startsWith(allowed),
      );
      if (!originIsAllowed) {
        throw new ForbiddenException('Request origin not allowed');
      }
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (
      !cookieToken ||
      !headerToken ||
      !safeCompare(cookieToken, headerToken)
    ) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    next();
  }
}
