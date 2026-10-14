// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { decryptSessionToken, GOOGLE_SESSION_COOKIE_NAME, type GoogleUserSession } from '@/core/session';
import { logger } from '@/core/logger';

// Augment Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: GoogleUserSession;
      rawBody?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // 1. Allow public auth endpoints, webhooks, and cron endpoints
  if (
    path.startsWith('/api/auth') ||
    path.startsWith('/auth') ||
    path.startsWith('/api/webhooks') ||
    path.startsWith('/webhooks') ||
    path.startsWith('/api/cron') ||
    path.startsWith('/cron')
  ) {
    return next();
  }

  // 2. Extract session cookie or Bearer token
  const sessionCookie = req.cookies?.[GOOGLE_SESSION_COOKIE_NAME] || req.headers[GOOGLE_SESSION_COOKIE_NAME.toLowerCase()] as string;
  let token = sessionCookie;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized. Please authenticate with Google OAuth.'
    });
  }

  try {
    const session = await decryptSessionToken(token);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized. Please authenticate with Google OAuth.'
      });
    }

    req.user = session;
    req.headers['x-user-id'] = session.id;
    req.headers['x-user-email'] = session.email;
    req.headers['x-user-name'] = encodeURIComponent(session.name);
    req.headers['x-user-role'] = session.role;

    next();
  } catch (err: unknown) {
    logger.warn({ err }, '[AuthMiddleware] Session validation failure');
    return res.status(401).json({
      error: 'Unauthorized. Invalid session token.'
    });
  }
}
