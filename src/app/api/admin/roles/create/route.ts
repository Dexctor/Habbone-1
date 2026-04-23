import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { createRole } from '@/server/directus/roles';
import { resolveHttpError } from '@/lib/http-error';

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  adminAccess: z.boolean().optional(),
  appAccess: z.boolean().optional(),
});

export const POST = withAdmin(async (req) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }
  try {
    const row = await createRole(parsed.data);
    return NextResponse.json({ data: row });
  } catch (error: unknown) {
    // Fallback: return a virtual role using name as id
    const r = parsed.data;
    const data = {
      id: r.name,
      name: r.name,
      description: r.description ?? null,
      admin_access: !!r.adminAccess,
      app_access: r.appAccess ?? true,
    };
    const { message } = resolveHttpError(error, 'ROLE_CREATE_FAILED', 500);
    return NextResponse.json({ data, code: 'VIRTUAL_ROLE', error: message });
  }
}, { key: 'admin:roles:create', limit: 10, windowMs: 60_000 });
