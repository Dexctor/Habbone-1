import 'server-only';

import { directusService, cItem, uItem } from './client';
import type { DirectusRoleLite, DirectusUserLite } from './types';
import { TABLES } from './tables';
import { directusCount, directusFetch } from './fetch';
import { isSupabaseDataEnabled } from '@/server/supabase/config';
import * as supabaseRoles from '@/server/supabase/roles';

type DirectusRolePayload = {
  name: string;
  description: string | null;
  admin_access: boolean;
  app_access: boolean;
};

export type CreateRoleInput = {
  name: string;
  description?: string | null;
  adminAccess?: boolean;
  appAccess?: boolean;
};

export type UpdateRoleInput = Partial<{
  name: string;
  description: string | null;
  adminAccess: boolean;
  appAccess: boolean;
}>;

// ── Policy-based admin_access resolution (Directus v11+) ──────────
// In Directus v11+, admin_access moved from roles to policies.
// A role has admin_access if ANY of its policies has admin_access=true.

type PolicyLite = { id: string; admin_access?: boolean; app_access?: boolean };

async function fetchPoliciesForRole(roleId: string): Promise<PolicyLite[]> {
  try {
    // Directus v11+: roles have a `policies` array of policy IDs
    const json = await directusFetch<{ data?: PolicyLite[] }>('/policies', {
      params: {
        fields: 'id,admin_access,app_access',
        limit: '100',
      },
    });
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

// Cache policies for the session (they rarely change)
let _policiesCache: Map<string, PolicyLite> | null = null;
let _policiesCacheTs = 0;
const POLICY_CACHE_TTL = 60_000; // 1 minute

async function getAllPolicies(): Promise<Map<string, PolicyLite>> {
  if (_policiesCache && Date.now() - _policiesCacheTs < POLICY_CACHE_TTL) {
    return _policiesCache;
  }
  try {
    const json = await directusFetch<{ data?: PolicyLite[] }>('/policies', {
      params: {
        fields: 'id,admin_access,app_access',
        limit: '500',
      },
    });
    const policies = Array.isArray(json?.data) ? json.data : [];
    _policiesCache = new Map(policies.map((p: PolicyLite) => [p.id, p]));
    _policiesCacheTs = Date.now();
    return _policiesCache;
  } catch {
    return _policiesCache ?? new Map();
  }
}

async function resolveRoleAccess(roleRaw: any): Promise<DirectusRoleLite> {
  const role: DirectusRoleLite = {
    id: roleRaw.id,
    name: roleRaw.name ?? '',
    description: roleRaw.description ?? null,
    admin_access: roleRaw.admin_access ?? false,
    app_access: roleRaw.app_access ?? false,
  };

  // If admin_access is already set (older Directus or already resolved), trust it
  if (role.admin_access === true) return role;

  // Directus v11+: policies is an array of access records (pivot table)
  // Each entry has { id, role, user, policy } where `policy` is the actual policy UUID
  const policyIds: string[] = [];
  if (Array.isArray(roleRaw.policies)) {
    for (const entry of roleRaw.policies) {
      if (typeof entry === 'string') {
        policyIds.push(entry);
      } else if (entry?.policy) {
        // Access record: { id, role, user, policy: "uuid" } or { policy: { id, ... } }
        const pid = typeof entry.policy === 'string' ? entry.policy : entry.policy?.id;
        if (pid) policyIds.push(pid);
      } else if (entry?.id) {
        policyIds.push(entry.id);
      }
    }
  }

  if (policyIds.length > 0) {
    const allPolicies = await getAllPolicies();
    for (const pid of policyIds) {
      const policy = allPolicies.get(pid);
      if (policy?.admin_access === true) {
        role.admin_access = true;
        role.app_access = true;
        break;
      }
      if (policy?.app_access === true) {
        role.app_access = true;
      }
    }
  }

  return role;
}

// ── Public API ─────────────────────────────────────────────────────

export async function listRoles(): Promise<DirectusRoleLite[]> {
  if (isSupabaseDataEnabled()) return supabaseRoles.listRoles();

  try {
    const json = await directusFetch<{ data?: unknown[] }>('/roles', {
      params: {
        fields: 'id,name,description,policies.*',
        sort: 'name',
        limit: '100',
      },
    });
    const rows = Array.isArray(json?.data) ? json.data : [];
    return Promise.all(rows.map((r: any) => resolveRoleAccess(r)));
  } catch {
    return [];
  }
}

export async function createRole(role: CreateRoleInput): Promise<DirectusRoleLite> {
  if (isSupabaseDataEnabled()) return supabaseRoles.createRole(role);

  const payload: DirectusRolePayload = {
    name: role.name,
    description: role.description ?? null,
    admin_access: role.adminAccess ?? false,
    app_access: role.appAccess ?? true,
  };
  const created = await directusService.request(cItem('directus_roles', payload as any));
  return created as DirectusRoleLite;
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<DirectusRoleLite> {
  if (isSupabaseDataEnabled()) return supabaseRoles.updateRole(roleId, patch);

  const payload: Partial<DirectusRolePayload> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.adminAccess !== undefined) payload.admin_access = !!patch.adminAccess;
  if (patch.appAccess !== undefined) payload.app_access = patch.appAccess ?? true;
  const updated = await directusService.request(uItem('directus_roles', roleId, payload as any));
  return updated as DirectusRoleLite;
}

export async function getRoleMemberCounts(): Promise<{ counts: Record<string, number>; withoutRole: number }> {
  if (isSupabaseDataEnabled()) return supabaseRoles.getRoleMemberCounts();

  const json = await directusFetch<{
    data?: Array<{ directus_role_id?: string | null; count?: { id?: number } }>;
  }>(`/items/${encodeURIComponent(TABLES.users)}`, {
    params: {
      'aggregate[count]': 'id',
      'groupBy[]': 'directus_role_id',
      limit: '-1',
    },
  });

  const counts: Record<string, number> = {};
  let withoutRole = 0;

  for (const bucket of json.data ?? []) {
    const count = Number(bucket.count?.id ?? 0);
    if (bucket.directus_role_id) {
      counts[bucket.directus_role_id] = count;
    } else {
      withoutRole += count;
    }
  }

  return { counts, withoutRole };
}

export async function countRoleMembers(roleId: string): Promise<number> {
  if (isSupabaseDataEnabled()) return supabaseRoles.countRoleMembers(roleId);

  return directusCount(TABLES.users, { 'filter[directus_role_id][_eq]': roleId });
}

export async function deleteRole(roleId: string): Promise<boolean> {
  if (isSupabaseDataEnabled()) return supabaseRoles.deleteRole(roleId);

  try {
    await directusFetch(`/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function getRoleById(roleId: string): Promise<DirectusRoleLite | null> {
  if (isSupabaseDataEnabled()) return supabaseRoles.getRoleById(roleId);

  try {
    const json = await directusFetch<{ data?: unknown }>(`/roles/${encodeURIComponent(roleId)}`, {
      params: {
        fields: 'id,name,description,policies.*',
      },
    });
    const row = json?.data;
    if (!row) return null;
    return resolveRoleAccess(row);
  } catch {
    return null;
  }
}

/** @deprecated Use setLegacyUserRoleId from legacy-users.ts instead */
export async function setUserRole(userId: string, roleId: string) {
  if (isSupabaseDataEnabled()) return supabaseRoles.setUserRole(userId, roleId);

  return directusService.request(
    uItem('directus_users', userId, {
      role: roleId,
    } as any),
  );
}

export type { DirectusRoleLite, DirectusUserLite };
