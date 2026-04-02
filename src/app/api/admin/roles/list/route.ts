import { NextResponse } from 'next/server';
import { assertAdmin } from '@/server/authz';
import { listRoles } from '@/server/directus/roles';
import { DEFAULT_ROLES } from '@/lib/config/roles';
import { resolveHttpError } from '@/lib/http-error';

export async function GET() {
  try {
    await assertAdmin();
  } catch (error: unknown) {
    const { message, status, code } = resolveHttpError(error, 'FORBIDDEN', 403);
    return NextResponse.json({ error: message, code: code ?? 'FORBIDDEN' }, { status });
  }
  // Roles hidden from the admin panel (internal/service roles)
  const HIDDEN_ROLES = new Set(['frontend service']);

  try {
    const rows = await listRoles();
    if (Array.isArray(rows) && rows.length) {
      const filtered = rows.filter((r) => !HIDDEN_ROLES.has(String(r.name || '').toLowerCase()));
      return NextResponse.json({ data: filtered, meta: { virtual: false } });
    }
  } catch {}
  // Fallback virtual roles (no Directus system access)
  const data = DEFAULT_ROLES.map((r) => ({
    id: r.name, // use name as id when system roles are unavailable
    name: r.name,
    description: r.description,
    admin_access: r.adminAccess,
    app_access: r.appAccess,
  }));
  return NextResponse.json({ data, meta: { virtual: true } });
}
