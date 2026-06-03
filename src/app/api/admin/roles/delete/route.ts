import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { pbCount, pbDelete } from '@/server/directus/pb-helpers';
import { TABLES } from '@/server/directus/tables';
import { logAdminAction } from '@/server/directus/admin-logs';

const Body = z.object({ roleId: z.string().min(1) });

export const POST = withAdmin(async (req, { user }) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { roleId } = parsed.data;

  // Safety: refuse to delete if the role is still assigned to users. The
  // admin panel should make this unreachable (button disabled) but we keep
  // the server check as a net.
  try {
    const total = await pbCount(TABLES.users, { role: { _eq: roleId } });
    if (total > 0) {
      return NextResponse.json(
        {
          error: `Ce rôle est assigné à ${total} utilisateur(s). Réaffectez-les avant de supprimer.`,
          code: 'ROLE_IN_USE',
          membersCount: total,
        },
        { status: 409 },
      );
    }
  } catch (e) {
    console.error('[admin:roles:delete] pre-check failed:', e);
    // Continue — PocketBase may still refuse the delete via FK constraints.
  }

  try {
    await pbDelete(TABLES.roles, roleId);

    await logAdminAction({
      action: 'content.delete',
      admin_id: String(user?.id || ''),
      admin_name: user?.nick ?? undefined,
      target_type: undefined,
      target_id: roleId,
      details: { kind: 'role', roleId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[admin:roles:delete] PocketBase DELETE failed', e);
    const msg = e instanceof Error ? e.message : 'DELETE_ROLE_FAILED';
    return NextResponse.json({ error: msg, code: 'DELETE_FAILED' }, { status: 500 });
  }
}, { key: 'admin:roles:delete', limit: 10, windowMs: 60_000 });
