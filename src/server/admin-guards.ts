import 'server-only';

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { pbOne } from '@/server/pocketbase/helpers';
import { TABLES } from '@/server/pocketbase/tables';
import { getRoleById } from '@/server/pocketbase/roles';
import {
  cleanUserId,
  decideGuard,
  hasFounderPrivileges,
  isOwnerRoleName,
  isProtectedFounderRoleName,
} from '@/server/admin-guards-core';

const USERS_TABLE = TABLES.users;

export type AdminGuardResult =
  | {
      ok: true;
      target: { id: string; nick: string; roleId: string | null; isAdmin: boolean; isFounder: boolean };
    }
  | { ok: false; response: NextResponse };

export type AdminPrivilege = {
  isFounder: boolean;
  isOwner: boolean;
};

async function fetchTarget(userId: string) {
  const cleanId = cleanUserId(userId);
  // v2: role is a relation column on the users collection.
  const data = await pbOne<{ id: string; nick: string; role: string | null }>(
    USERS_TABLE,
    cleanId,
    { fields: 'id,nick,role' },
  ).catch(() => null);
  if (!data) return null;
  return {
    id: String(data.id),
    nick: String(data.nick || ''),
    roleId: data.role ? String(data.role) : null,
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
  callerIsOwner?: boolean;
  targetUserId: string;
  action: 'ban' | 'unban' | 'delete' | 'role_change' | 'coins';
}): Promise<AdminGuardResult> {
  const target = await fetchTarget(opts.targetUserId);
  const callerPrivilege = await resolveCallerAdminPrivilege(opts.callerId, {
    isFounder: !!opts.callerIsFounder,
    isOwner: !!opts.callerIsOwner,
  });

  let targetIsAdmin = false;
  let targetIsFounder = false;
  if (target?.roleId) {
    try {
      const role = await getRoleById(target.roleId);
      targetIsAdmin = role?.admin_access === true;
      targetIsFounder = isProtectedFounderRoleName(role?.name);
    } catch {
      targetIsAdmin = false;
      targetIsFounder = false;
    }
  }

  const decision = decideGuard({
    callerId: opts.callerId ?? null,
    callerIsFounder: callerPrivilege.isFounder,
    callerIsOwner: callerPrivilege.isOwner,
    targetUserId: opts.targetUserId,
    target: target ? { id: target.id, isAdmin: targetIsAdmin, isFounder: targetIsFounder } : null,
    action: opts.action,
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
      isFounder: targetIsFounder,
    },
  };
}

export function isCallerFounder(user: Session['user'] | null | undefined): boolean {
  return hasFounderPrivileges(user?.roleName);
}

export function isCallerOwner(user: Session['user'] | null | undefined): boolean {
  return isOwnerRoleName(user?.roleName);
}

export async function resolveCallerIsFounder(
  callerId: string | null | undefined,
  sessionFallback = false,
): Promise<boolean> {
  const privilege = await resolveCallerAdminPrivilege(callerId, { isFounder: sessionFallback });
  return privilege.isFounder;
}

export async function resolveCallerAdminPrivilege(
  callerId: string | null | undefined,
  sessionFallback: Partial<AdminPrivilege> = {},
): Promise<AdminPrivilege> {
  const cleanId = callerId ? cleanUserId(callerId) : '';
  if (!cleanId) {
    return {
      isFounder: !!sessionFallback.isFounder || !!sessionFallback.isOwner,
      isOwner: !!sessionFallback.isOwner,
    };
  }

  try {
    const caller = await fetchTarget(cleanId);
    if (!caller) {
      return {
        isFounder: !!sessionFallback.isFounder || !!sessionFallback.isOwner,
        isOwner: !!sessionFallback.isOwner,
      };
    }
    if (!caller.roleId) return { isFounder: false, isOwner: false };

    const role = await getRoleById(caller.roleId);
    const isOwner = isOwnerRoleName(role?.name);
    return {
      isFounder: isOwner || hasFounderPrivileges(role?.name),
      isOwner,
    };
  } catch {
    return {
      isFounder: !!sessionFallback.isFounder || !!sessionFallback.isOwner,
      isOwner: !!sessionFallback.isOwner,
    };
  }
}
