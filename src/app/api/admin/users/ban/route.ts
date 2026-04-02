import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { banAdminUser } from '@/server/services/admin-users';
import { checkRateLimit } from '@/server/rate-limit';

const BodySchema = z.object({
  userId: z.string().min(1),
  ban: z.boolean(),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { key: 'admin:users:ban', limit: 20, windowMs: 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'RATE_LIMITED', code: 'RATE_LIMITED' }, { status: 429, headers: rl.headers });
  }
  try {
    await assertAdmin();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'FORBIDDEN', code: 'FORBIDDEN' },
      { status: error?.status || 403 },
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, ban } = parsed.data;

  try {
    const result = await banAdminUser(userId, ban);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ data: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'BAN_ACTION_FAILED', code: 'BAN_ACTION_FAILED' }, { status: 500 });
  }
}
