// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { decryptSessionToken, GOOGLE_SESSION_COOKIE_NAME } from '@/core/session';

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Allow public authentication endpoints, login page, setup wizard, and design system showcase
  if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/wizard' || pathname === '/design-system') {
    // If user is already authenticated and visits /login, redirect to dashboard
    if (pathname === '/login') {
      const sessionCookie = request.cookies.get(GOOGLE_SESSION_COOKIE_NAME)?.value;
      if (sessionCookie) {
        const session = await decryptSessionToken(sessionCookie);
        if (session) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 2. Allow webhooks (they use cryptographic HMAC signature validation)
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // 3. Allow cron endpoints (they use Bearer CRON_SECRET authentication)
  if (pathname.startsWith('/api/cron')) {
    return NextResponse.next();
  }

  // 4. Authenticate all other dashboard and API routes
  const sessionCookie = request.cookies.get(GOOGLE_SESSION_COOKIE_NAME)?.value;
  let session = null;

  if (sessionCookie) {
    session = await decryptSessionToken(sessionCookie);
  }

  if (!session) {
    // In local development mode, allow seamless access without requiring external Google OAuth
    if (process.env.NODE_ENV === 'development' && !process.env.VITEST) {
      return NextResponse.next();
    }

    // For API calls, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please authenticate with Google OAuth.' },
        { status: 401 }
      );
    }

    // For pages, redirect to /login with returnUrl
    const loginUrl = new URL('/login', request.url);
    const returnUrl = pathname + search;
    if (returnUrl && returnUrl !== '/') {
      loginUrl.searchParams.set('returnUrl', returnUrl);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. Inject authenticated user context headers into downstream request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.id);
  requestHeaders.set('x-user-email', session.email);
  requestHeaders.set('x-user-name', encodeURIComponent(session.name));
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}
