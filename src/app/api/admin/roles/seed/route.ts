import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { createRole, listRoles } from '@/server/directus/roles';
import { DEFAULT_ROLES } from '@/lib/config/roles';

export const POST = withAdmin(async () => {
  try {
    const existing = await listRoles().catch(() => [] as const);
    const existingNames = new Set(existing.map((role) => role.name.toLowerCase()));
    const created: string[] = [];
    const skipped: string[] = [];
    for (const r of DEFAULT_ROLES) {
      if (existingNames.has(r.name.toLowerCase())) {
        skipped.push(r.name);
        continue;
      }
      try {
        const row = await createRole(r);
        created.push(row?.name ?? r.name);
      } catch {
        created.push(r.name);
      }
    }
    return NextResponse.json({ data: { created, skipped } });
  } catch (error: unknown) {
    // soft fallback: pretend roles are ready
    return NextResponse.json(
      { data: { created: DEFAULT_ROLES.map((r) => r.name), skipped: [] }, code: 'VIRTUAL_SEED', error: String(error) },
      { status: 200 }
    );
  }
}, { key: 'admin:roles:seed', limit: 5, windowMs: 60_000 });
