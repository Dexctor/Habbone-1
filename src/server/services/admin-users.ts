import 'server-only';

import { listRoles, getRoleById } from '@/server/directus/roles';
import {
  searchLegacyUsuarios,
  setLegacyUserBanStatus,
  deleteLegacyUser,
  setLegacyUserRoleId,
} from '@/server/directus/legacy-users';

type SearchInput = {
  q?: string;
  roleId?: string;
  status?: 'active' | 'suspended';
  page: number;
  limit: number;
  preferSource?: string; // kept for API compat, ignored (always 'usuarios')
};

type SearchResult = {
  data: any[];
  total: number;
  meta: {
    source: 'usuarios';
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

// ── Search: single source (usuarios) ──────────────────────────────
export async function searchAdminUsers(input: SearchInput): Promise<SearchResult> {
  const { q, roleId, status, page, limit } = input;

  const roles = await listRoles().catch(() => [] as any[]);
  const rolesById = new Map<string, any>(roles.map((r: any) => [String(r?.id), r]));
  const roleRecord = roleId ? rolesById.get(String(roleId)) : undefined;
  const roleNameTarget = roleRecord ? String(roleRecord.name || '').toLowerCase() : undefined;

  const legacy = await searchLegacyUsuarios(q, limit, page, {
    roleName: roleRecord?.name ?? undefined,
    status,
  }).catch(() => ({ items: [], total: 0 }));

  let mapped = legacy.items.map((row: any) => {
    const banido = String(row?.banido || '').toLowerCase();
    const ativado = String(row?.ativado || '').toLowerCase();
    const legacyStatus = normalizeLegacyStatus(banido);
    const activeStatus = normalizeLegacyStatus(ativado);
    const isBanned = legacyStatus.isBanned;
    const isActive = activeStatus.isActive;

    // Role resolution: prefer directus_role_id, fallback to role string
    const directusRoleId = row?.directus_role_id || null;
    const roleNameRaw = String(row?.role || '').trim();
    let rolePayload: any = null;

    if (directusRoleId) {
      const match = rolesById.get(String(directusRoleId));
      if (match) {
        rolePayload = {
          id: match.id,
          name: match.name,
          admin_access: match.admin_access,
          app_access: match.app_access,
        };
      }
    }

    if (!rolePayload && roleNameRaw) {
      const match = roles.find((r: any) => String(r?.name || '').toLowerCase() === roleNameRaw.toLowerCase());
      if (match) {
        rolePayload = {
          id: match.id,
          name: match.name,
          admin_access: match.admin_access,
          app_access: match.app_access,
        };
      }
    }

    const displayRoleName = rolePayload?.name || roleNameRaw || null;

    return {
      id: String(row.id),
      email: row.email || null,
      first_name: row.nick || null,
      last_name: null,
      status: isActive ? (isBanned ? 'suspended' : 'active') : 'suspended',
      role: rolePayload,
      _legacyBanned: !!isBanned,
      _legacyInactive: !isActive,
      _source: 'usuarios',
      _roleName: displayRoleName,
    };
  });

  if (roleNameTarget) {
    mapped = mapped.filter((u) => String((u as any)?._roleName || '').toLowerCase() === roleNameTarget);
  }
  if (status) {
    mapped = mapped.filter((u) => String((u as any)?.status) === status);
  }

  return {
    data: mapped,
    total: legacy?.total || mapped.length,
    meta: { source: 'usuarios' },
  };
}

// ── Ban: single source (usuarios) ─────────────────────────────────
export async function banAdminUser(userId: string, ban: boolean): Promise<ActionResult> {
  // Remove legacy: prefix if present (backward compat)
  const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;
  await setLegacyUserBanStatus(cleanId, ban);
  return { data: true };
}

// ── Delete: single source (usuarios) ──────────────────────────────
export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;
  await deleteLegacyUser(cleanId);
  return { data: true };
}

// ── Set role: writes directus_role_id + role name to usuarios ─────
export async function setAdminUserRole(userId: string, roleId: string): Promise<ActionResult> {
  const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;

  const role = await getRoleById(roleId).catch(() => null);
  const roleName = (role as any)?.name || roleId;

  await setLegacyUserRoleId(cleanId, roleId, roleName);
  return { data: true };
}
