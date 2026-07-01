import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { setAdminUserRole } from '@/server/services/admin-users';
import {
  guardTargetUser,
  isCallerFounder,
  isCallerOwner,
  resolveCallerAdminPrivilege,
} from '@/server/admin-guards';
import { isOwnerRoleName } from '@/server/admin-guards-core';
import { logAdminAction } from '@/server/pocketbase/admin-logs';
import { getRoleById } from '@/server/pocketbase/roles';

const Body = z.object({ userId: z.string().min(1), roleId: z.string().min(1) });

export const POST = withAdmin(async (req, { user }) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { userId, roleId } = parsed.data;

  const callerPrivilege = await resolveCallerAdminPrivilege(user?.id, {
    isFounder: isCallerFounder(user),
    isOwner: isCallerOwner(user),
  });
  const callerIsFounder = callerPrivilege.isFounder;
  const callerIsOwner = callerPrivilege.isOwner;

  const guard = await guardTargetUser({
    callerId: user?.id,
    callerIsFounder,
    callerIsOwner,
    targetUserId: userId,
    action: 'role_change',
  });
  if (!guard.ok) {
    return guard.response;
  }

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

  if (isOwnerRoleName(newRole?.name) && !callerIsOwner) {
    return NextResponse.json(
      { error: "Seul un proprietaire peut assigner le role proprietaire", code: 'OWNER_REQUIRED' },
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

    // Invalidate the public team page so the role change is reflected immediately.
    revalidatePath('/team');

    return NextResponse.json({ data: true });
  } catch (e: unknown) {
    console.error('[admin:set-role]', e);
    const message = e instanceof Error ? e.message : 'SET_ROLE_FAILED';
    return NextResponse.json({ error: message, code: 'SET_ROLE_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:set-role', limit: 20, windowMs: 60_000 });
