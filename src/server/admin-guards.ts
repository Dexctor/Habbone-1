import 'server-only';

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { directusUrl, serviceToken, USERS_TABLE } from '@/server/directus/client';
import { getRoleById } from '@/server/directus/roles';
import { cleanUserId, decideGuard, isFounderRoleName } from '@/server/admin-guards-core';

export type AdminGuardResult =
  | { ok: true; target: { id: string; nick: string; roleId: string | null; isAdmin: boolean } }
  | { ok: false; response: NextResponse };

async function fetchTarget(userId: string) {
  const cleanId = cleanUserId(userId);
  const res = await fetch(
    `${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${cleanId}?fields=id,nick,directus_role_id`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const data = json?.data;
  if (!data) return null;
  return {
    id: String(data.id),
    nick: String(data.nick || ''),
    roleId: data.directus_role_id ? String(data.directus_role_id) : null,
  };
}

/**
 * Protects admin actions that target another user:
 *  - blocks self-action (you cannot ban / delete / demote yourself)
 *  - blocks actions against another admin unless the caller is a founder
 *
 * Returns either { ok: true, target } with the resolved target user,
 * or { ok: false, response } with a ready-to-return error response.
 */
export async function guardTargetUser(opts: {
  callerId: string | null | undefined;
  callerIsFounder?: boolean;
  targetUserId: string;
  action: 'ban' | 'unban' | 'delete' | 'role_change' | 'coins';
}): Promise<AdminGuardResult> {
  const target = await fetchTarget(opts.targetUserId);

  let targetIsAdmin = false;
  if (target?.roleId) {
    try {
      const role = await getRoleById(target.roleId);
      targetIsAdmin = role?.admin_access === true;
    } catch {
      targetIsAdmin = false;
    }
  }

  const decision = decideGuard({
    callerId: opts.callerId ?? null,
    callerIsFounder: !!opts.callerIsFounder,
    targetUserId: opts.targetUserId,
    target: target ? { id: target.id, isAdmin: targetIsAdmin } : null,
  });

  if (!decision.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: decision.error, code: decision.code },
        { status: decision.status },
      ),
    };
  }

  return {
    ok: true,
    target: {
      id: target!.id,
      nick: target!.nick,
      roleId: target!.roleId,
      isAdmin: targetIsAdmin,
    },
  };
}

export function isCallerFounder(user: Session['user'] | null | undefined): boolean {
  return isFounderRoleName(user?.directusRoleName);
}
