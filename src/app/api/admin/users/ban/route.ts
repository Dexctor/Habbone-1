import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { banAdminUser } from '@/server/services/admin-users';
import { guardTargetUser, isCallerFounder } from '@/server/admin-guards';
import { logAdminAction } from '@/server/directus/admin-logs';

const BodySchema = z.object({
  userId: z.string().min(1),
  ban: z.boolean(),
});

export const POST = withAdmin(async (req, { user }) => {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, ban } = parsed.data;

  const guard = await guardTargetUser({
    callerId: user?.id,
    callerIsFounder: isCallerFounder(user),
    targetUserId: userId,
    action: ban ? 'ban' : 'unban',
  });
  if (!guard.ok) return guard.response;

  try {
    const result = await banAdminUser(userId, ban);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    await logAdminAction({
      action: ban ? 'user.ban' : 'user.unban',
      admin_id: String(user?.id || ''),
      admin_name: user?.nick ?? undefined,
      target_type: 'user',
      target_id: guard.target.id,
      details: { nick: guard.target.nick },
    });

    return NextResponse.json({ data: true });
  } catch (error: unknown) {
    console.error('[admin:ban]', error);
    const message = error instanceof Error ? error.message : 'BAN_ACTION_FAILED';
    return NextResponse.json({ error: message, code: 'BAN_ACTION_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:ban', limit: 20, windowMs: 60_000 });
