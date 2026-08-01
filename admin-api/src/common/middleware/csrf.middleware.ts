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
    // ---- Step 1: Ensure every client has a CSRF cookie ----
    // Issued on first contact. NOT httpOnly — the frontend's JS must be able
    // to read it and echo it back in a custom header. This is the core of
    // the double-submit pattern: an attacker's cross-origin page can trigger
    // a request that includes cookies automatically, but it CANNOT read this
    // cookie's value (blocked by browser same-origin policy) to also set the
    // matching header — so a forged request will always be missing a valid header.
    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (!csrfToken) {
      csrfToken = generateToken();
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // matches refresh token lifetime
      });
      req.cookies[CSRF_COOKIE_NAME] = csrfToken;
    }

    const isExempt = CSRF_EXEMPT_PATHS.some((path) =>
      req.path.startsWith(path),
    );
    const needsCheck = PROTECTED_METHODS.includes(req.method) && !isExempt;

    if (!needsCheck) {
      return next();
    }

    // ---- Step 2: Defense-in-depth — verify Origin/Referer matches our own host ----
    // Even before checking the token, reject requests whose Origin header
    // doesn't match where this API is actually hosted. Browsers set Origin
    // reliably and it cannot be spoofed by JavaScript running on another site.
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

    // ---- Step 3: Double-submit token check ----
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
