import 'server-only';

import { getDirectusUserById, searchUsers, setDirectusUserStatus, deleteDirectusUser } from '@/server/directus/admin-users';
import { listRoles, getRoleById, setUserRole } from '@/server/directus/roles';
import { getLegacyUserByEmail, searchLegacyUsuarios, setLegacyUserBanStatus, deleteLegacyUser, setLegacyUserRole } from '@/server/directus/legacy-users';

type SearchInput = {
  q?: string;
  roleId?: string;
  status?: 'active' | 'suspended';
  page: number;
  limit: number;
  preferSource: 'auto' | 'legacy' | 'directus';
};

type SearchResult = {
  data: any[];
  total: number;
  meta: {
    source: 'legacy' | 'directus';
    fallback: boolean;
  };
};

type ActionResult =
  | { data: true }
  | { error: string; code: string; status: number };

function normalizeLegacyStatus(value: unknown) {
  const lowered = String(value || '').toLowerCase();
  const isBanned = ['1', 'true', 's', 'y', 'sim'].includes(lowered);
  const isActive = !['0', 'false', 'n', 'nao', 'no'].includes(lowered);
  return { isBanned, isActive };
}

export async function searchAdminUsers(input: SearchInput): Promise<SearchResult> {
  const { q, roleId, status, page, limit, preferSource } = input;
  const forceLegacy = preferSource === 'legacy';
  const forceDirectus = preferSource === 'directus';

  const roles = await listRoles().catch(() => [] as any[]);
  const rolesById = new Map<string, any>(roles.map((r: any) => [String(r?.id), r]));
  const roleRecord = roleId ? rolesById.get(String(roleId)) : undefined;
  const roleNameTarget = roleRecord ? String(roleRecord.name || '').toLowerCase() : undefined;

  let legacy: { items: any[]; total: number } | null = null;
  if (!forceDirectus) {
    legacy = await searchLegacyUsuarios(q, limit, page, {
      roleName: roleRecord?.name ?? undefined,
      status,
    }).catch(() => ({ items: [], total: 0 }));
  } else {
    legacy = { items: [], total: 0 };
  }

  if (legacy && (forceLegacy || (Array.isArray(legacy.items) && legacy.items.length > 0 && !forceDirectus))) {
    let mapped = legacy.items.map((row: any) => {
      const banido = String(row?.banido || '').toLowerCase();
      const ativado = String(row?.ativado || '').toLowerCase();
      const legacyStatus = normalizeLegacyStatus(banido);
      const activeStatus = normalizeLegacyStatus(ativado);
      const isBanned = legacyStatus.isBanned;
      const isActive = activeStatus.isActive;
      const roleNameRaw = String(row?.role || '').trim();
      const roleMatch = roles.find((r: any) => String(r?.name || '').toLowerCase() === roleNameRaw.toLowerCase()) || null;
      const rolePayload = roleMatch
        ? {
            id: roleMatch.id,
            name: roleMatch.name,
            admin_access: roleMatch.admin_access,
            app_access: roleMatch.app_access,
          }
        : null;
      const displayRoleName = rolePayload?.name || roleNameRaw || null;
      return {
        id: `legacy:${row.id}`,
        email: row.email || null,
        first_name: row.nick || null,
        last_name: null,
        status: isActive ? 'active' : 'suspended',
        role: rolePayload,
        _legacyBanned: !!isBanned,
        _legacyInactive: !isActive,
        _source: 'legacy',
        _roleName: displayRoleName,
      };
    });
    if (roleNameTarget) mapped = mapped.filter((u) => String((u as any)?._roleName || '').toLowerCase() === roleNameTarget);
    if (status) mapped = mapped.filter((u) => String((u as any)?.status) === status);
    return {
      data: mapped,
      total: legacy?.total || mapped.length,
      meta: { source: 'legacy', fallback: preferSource !== 'legacy' },
    };
  }

  if (forceLegacy) {
    return {
      data: [],
      total: legacy?.total || 0,
      meta: { source: 'legacy', fallback: false },
    };
  }

  const { items, total } = await searchUsers(q, roleId, status, limit, page).catch(() => ({ items: [], total: 0 }));
  const enriched = await Promise.all(
    (items || []).map(async (u: any) => {
      const legacyU = await getLegacyUserByEmail(u?.email || null).catch(() => null as any);
      const banido = String((legacyU as any)?.banido || '').toLowerCase();
      const ativado = String((legacyU as any)?.ativado || '').toLowerCase();
      const legacyStatus = normalizeLegacyStatus(banido);
      const activeStatus = normalizeLegacyStatus(ativado);
      const isBanned = legacyStatus.isBanned;
      const isActive = activeStatus.isActive;
      let roleIdValue: string | null = null;
      let roleNameValue: string | null = null;
      if (u?.role && typeof u.role === 'object') {
        roleIdValue = u.role?.id ? String(u.role.id) : null;
        roleNameValue = u.role?.name ? String(u.role.name) : null;
      } else if (u?.role) {
        roleIdValue = String(u.role);
      }
      if (!roleNameValue && roleIdValue) {
        const match = rolesById.get(String(roleIdValue));
        if (match) {
          roleNameValue = match.name || null;
        }
      }
      return {
        ...u,
        _legacyBanned: !!isBanned,
        _legacyInactive: !isActive,
        _source: 'directus',
        _roleName: roleNameValue,
      };
    })
  );
  return { data: enriched, total, meta: { source: 'directus', fallback: false } };
}

export async function banAdminUser(userId: string, ban: boolean): Promise<ActionResult> {
  if (userId.startsWith('legacy:')) {
    const legacyId = userId.split(':')[1];
    await setLegacyUserBanStatus(legacyId, ban);
    return { data: true };
  }

  const directusUser = await getDirectusUserById(userId);
  if (!directusUser) {
    return { error: 'NOT_FOUND', code: 'NOT_FOUND', status: 404 };
  }

  await setDirectusUserStatus(userId, ban ? 'suspended' : 'active');

  if (directusUser.email) {
    const legacyUser = await getLegacyUserByEmail(directusUser.email).catch(() => null as any);
    if (legacyUser?.id) {
      await setLegacyUserBanStatus(legacyUser.id, ban).catch(() => undefined);
    }
  }

  return { data: true };
}

export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  if (userId.startsWith('legacy:')) {
    const legacyId = userId.split(':')[1];
    await deleteLegacyUser(legacyId);
    return { data: true };
  }

  const directusUser = await getDirectusUserById(userId);
  if (!directusUser) {
    return { error: 'NOT_FOUND', code: 'NOT_FOUND', status: 404 };
  }

  await deleteDirectusUser(userId);

  if (directusUser.email) {
    const legacyUser = await getLegacyUserByEmail(directusUser.email).catch(() => null as any);
    if (legacyUser?.id) {
      await deleteLegacyUser(legacyUser.id).catch(() => undefined);
    }
  }

  return { data: true };
}

export async function setAdminUserRole(userId: string, roleId: string): Promise<ActionResult> {
  if (userId.startsWith('legacy:')) {
    const legacyId = userId.split(':')[1];
    const role = await getRoleById(roleId).catch(() => null);
    const roleName = (role as any)?.name || roleId;
    await setLegacyUserRole(legacyId, roleName);
    return { data: true };
  }

  const du = await getDirectusUserById(userId);
  const legacy = await getLegacyUserByEmail(du?.email || null);
  const banido = String((legacy as any)?.banido || '').toLowerCase();
  const ativado = String((legacy as any)?.ativado || '').toLowerCase();
  const isBanned = ['1', 'true', 's', 'y', 'sim'].includes(banido);
  const isActive = !['0', 'false', 'n', 'nao', 'n\u00e3o', 'no'].includes(ativado);
  if (legacy && (isBanned || !isActive)) {
    return { error: 'Utilisateur banni/inactif', code: 'USER_INACTIVE', status: 403 };
  }

  await setUserRole(userId, roleId);
  return { data: true };
}
