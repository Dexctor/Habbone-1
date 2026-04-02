import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { setAdminUserRole } from '@/server/services/admin-users';
import { checkRateLimit } from '@/server/rate-limit';

const Body = z.object({ userId: z.string().min(1), roleId: z.string().min(1) });

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { key: 'admin:users:set-role', limit: 20, windowMs: 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'RATE_LIMITED', code: 'RATE_LIMITED' }, { status: 429, headers: rl.headers });
  }
  try {
    await assertAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'FORBIDDEN', code: 'FORBIDDEN' }, { status: e?.status || 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, roleId } = parsed.data;
  try {
    const result = await setAdminUserRole(userId, roleId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ data: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'SET_ROLE_FAILED', code: 'SET_ROLE_FAILED' }, { status: 500 });
  }
}
