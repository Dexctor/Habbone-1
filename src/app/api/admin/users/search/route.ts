import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { searchAdminUsers } from '@/server/services/admin-users';
import { checkRateLimit } from '@/server/rate-limit';

const Body = z.object({
  q: z.string().optional(),
  roleId: z.string().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(req, { key: 'admin:users:search', limit: 60, windowMs: 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'RATE_LIMITED', code: 'RATE_LIMITED' }, { status: 429, headers: rl.headers });
  }
  try {
    await assertAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'FORBIDDEN', code: 'FORBIDDEN' }, { status: e?.status || 403 });
  }

  const url = new URL(req.url);
  const preferSourceRaw = (url.searchParams.get('source') || 'auto').toLowerCase();
  const preferSource =
    preferSourceRaw === 'legacy' || preferSourceRaw === 'directus' ? preferSourceRaw : 'auto';

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }
  const { q, roleId, status, page, limit } = parsed.data;
  try {
    const result = await searchAdminUsers({
      q,
      roleId,
      status,
      page,
      limit,
      preferSource,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: 'SEARCH_FAILED', code: 'SEARCH_FAILED' }, { status: 500 });
  }
}
