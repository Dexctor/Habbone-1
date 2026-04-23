import 'server-only';

import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/auth';
import { assertAdmin } from '@/server/authz';
import { checkRateLimit } from '@/server/rate-limit';

type ApiHandlerContext = {
  session: Session | null;
  user: Session['user'] | null;
  nick: string;
  params?: Record<string, string | undefined>;
};

type ApiHandler = (
  req: Request,
  ctx: ApiHandlerContext,
) => Promise<NextResponse | Response>;

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

/**
 * Wrap an API route handler with admin auth + optional rate limiting.
 * Eliminates ~8 lines of boilerplate per route.
 *
 * Usage:
 * ```ts
 * export const POST = withAdmin(
 *   async (req, { session, nick }) => {
 *     // Your logic here — already authenticated as admin
 *     return NextResponse.json({ ok: true });
 *   },
 *   { key: 'admin:action', limit: 20, windowMs: 60_000 }
 * );
 * ```
 */
export function withAdmin(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return async (req: Request, routeCtx?: any) => {
    // Rate limit check
    if (rateLimit) {
      const rl = checkRateLimit(req, rateLimit);
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Trop de requêtes', code: 'RATE_LIMITED' },
          { status: 429, headers: rl.headers },
        );
      }
    }

    // Admin auth check
    try {
      await assertAdmin();
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'FORBIDDEN', code: 'FORBIDDEN' },
        { status: error?.status || 403 },
      );
    }

    // Get session for handler context
    const session = await getServerSession(authOptions);
    const user = session?.user ?? null;
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : '';
    const params = routeCtx?.params ? await routeCtx.params : undefined;

    return handler(req, { session, user, nick, params });
  };
}

/**
 * Wrap an API route handler with user auth (must be logged in) + optional rate limiting.
 *
 * Usage:
 * ```ts
 * export const POST = withAuth(
 *   async (req, { nick }) => {
 *     return NextResponse.json({ ok: true });
 *   },
 *   { key: 'forum:comment', limit: 10, windowMs: 60_000 }
 * );
 * ```
 */
export function withAuth(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return async (req: Request, routeCtx?: any) => {
    // Rate limit check
    if (rateLimit) {
      const rl = checkRateLimit(req, rateLimit);
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Trop de requêtes', code: 'RATE_LIMITED' },
          { status: 429, headers: rl.headers },
        );
      }
    }

    // Auth check
    const session = await getServerSession(authOptions);
    const user = session?.user ?? null;
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : '';

    if (!nick) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    const params = routeCtx?.params ? await routeCtx.params : undefined;

    return handler(req, { session, user, nick, params });
  };
}
