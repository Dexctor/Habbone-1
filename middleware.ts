import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================================================
// CSP Configuration (declarative for maintainability)
// ============================================================================

type CSPDirectives = Record<string, string[] | ((isProd: boolean) => string[])>;

const CSP_CONFIG: CSPDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'img-src': ["'self'", 'data:', 'https:'],
  // media-src couvre <video>/<audio> (ex: animations GIF rapatriées en .webm
  // servies depuis pb.habbone.fr). Sans cette directive, <video> retombe sur
  // default-src 'self' et les vidéos cross-origin seraient bloquées.
  'media-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https:', 'data:'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'script-src': (isProd) =>
    isProd
      ? ["'self'", "'unsafe-inline'", 'https://vercel.live']
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://vercel.live'],
  'connect-src': (isProd) =>
    isProd ? ["'self'", 'https:', 'https://vercel.live'] : ["'self'", 'https:', 'https://vercel.live', 'ws:'],
};

function buildCSP(isProd: boolean): string {
  const directives = Object.entries(CSP_CONFIG).map(([key, value]) => {
    const sources = typeof value === 'function' ? value(isProd) : value;
    return `${key} ${sources.join(' ')}`;
  });
  directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  res.headers.set('Content-Security-Policy', buildCSP(isProd));
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '0');
  return res;
}

// ============================================================================
// Middleware
// ============================================================================

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', req.nextUrl.pathname);
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res);
  }

  // Defence in depth for /admin: require the admin role at the edge, on top of
  // the per-page/route assertAdmin checks. Closes the gap if a page forgets to
  // call assertAdmin. The token is still re-validated server-side by assertAdmin
  // (this only blocks obviously non-admin sessions early).
  if (req.nextUrl.pathname.startsWith('/admin') && (token as { role?: string }).role !== 'admin') {
    const res = NextResponse.redirect(new URL('/', req.url));
    return applySecurityHeaders(res);
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: ['/profile', '/profile/:path*', '/admin', '/admin/:path*'],
};
