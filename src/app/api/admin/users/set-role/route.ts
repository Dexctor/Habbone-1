import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { setAdminUserRole } from '@/server/services/admin-users';
import { guardTargetUser, isCallerFounder } from '@/server/admin-guards';
import { logAdminAction } from '@/server/directus/admin-logs';
import { getRoleById } from '@/server/directus/roles';

const Body = z.object({ userId: z.string().min(1), roleId: z.string().min(1) });

export const POST = withAdmin(async (req, { user }) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, roleId } = parsed.data;

  const callerIsFounder = isCallerFounder(user);

  const guard = await guardTargetUser({
    callerId: user?.id,
    callerIsFounder,
    targetUserId: userId,
    action: 'role_change',
  });
  if (!guard.ok) return guard.response;

  let newRole: Awaited<ReturnType<typeof getRoleById>> | null = null;
  try {
    newRole = await getRoleById(roleId);
  } catch {
    newRole = null;
  }

  if (newRole?.admin_access === true && !callerIsFounder) {
    return NextResponse.json(
      { error: "Seul un fondateur peut assigner un role administrateur", code: 'FOUNDER_REQUIRED' },
      { status: 403 },
    );
  }

  try {
    const result = await setAdminUserRole(userId, roleId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    await logAdminAction({
      action: 'user.role_change',
      admin_id: String(user?.id || ''),
      admin_name: user?.nick ?? undefined,
      target_type: 'user',
      target_id: guard.target.id,
      details: {
        nick: guard.target.nick,
        new_role_id: roleId,
        new_role_name: newRole?.name || null,
        new_admin_access: newRole?.admin_access === true,
      },
    });

    return NextResponse.json({ data: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'SET_ROLE_FAILED', code: 'SET_ROLE_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:set-role', limit: 20, windowMs: 60_000 });
