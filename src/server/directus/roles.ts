import 'server-only';

import { directusService, rItems, rItem, cItem, uItem } from './client';
import { readRoles } from '@directus/sdk';
import type { DirectusRoleLite, DirectusUserLite } from './types';

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

export async function listRoles(): Promise<DirectusRoleLite[]> {
  try {
    // Use readRoles for core collections (Directus SDK v11+)
    const rows = await directusService.request(
      readRoles({
        fields: ['id', 'name', 'description', 'admin_access', 'app_access'],
        sort: ['name'],
      } as any),
    );
    return Array.isArray(rows) ? (rows as unknown as DirectusRoleLite[]) : [];
  } catch {
    // Expected to fail if token doesn't have admin permissions
    // Fallback to DEFAULT_ROLES is handled in the API route
    return [];
  }
}

export async function createRole(role: CreateRoleInput): Promise<DirectusRoleLite> {
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
  const payload: Partial<DirectusRolePayload> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.adminAccess !== undefined) payload.admin_access = !!patch.adminAccess;
  if (patch.appAccess !== undefined) payload.app_access = patch.appAccess ?? true;
  const updated = await directusService.request(uItem('directus_roles', roleId, payload as any));
  return updated as DirectusRoleLite;
}

export async function getRoleById(roleId: string): Promise<DirectusRoleLite | null> {
  const row = await directusService
    .request(
      rItem('directus_roles', roleId, {
        fields: ['id', 'name', 'description', 'admin_access', 'app_access'] as any,
      } as any),
    )
    .catch(() => null);
  return (row ?? null) as DirectusRoleLite | null;
}

export async function setUserRole(userId: string, roleId: string) {
  return directusService.request(
    uItem('directus_users', userId, {
      role: roleId,
    } as any),
  );
}

export type { DirectusRoleLite, DirectusUserLite };
