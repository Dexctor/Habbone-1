import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { directusUrl, serviceToken } from '@/server/directus/client';
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
    const params = new URLSearchParams();
    params.set('filter[directus_role_id][_eq]', roleId);
    params.set('limit', '0');
    params.set('meta', 'total_count');
    const countRes = await fetch(
      `${directusUrl}/items/${encodeURIComponent(TABLES.users)}?${params}`,
      { headers: { Authorization: `Bearer ${serviceToken}` }, cache: 'no-store' },
    );
    if (countRes.ok) {
      const countJson = (await countRes.json()) as { meta?: { total_count?: number } };
      const total = Number(countJson.meta?.total_count ?? 0);
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
    }
  } catch (e) {
    console.error('[admin:roles:delete] pre-check failed:', e);
    // Continue — Directus may still refuse the delete via FK constraints.
  }

  try {
    const res = await fetch(`${directusUrl}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.text().catch(() => '');
      console.error('[admin:roles:delete] Directus DELETE failed', res.status, body);
      return NextResponse.json(
        { error: 'Suppression impossible', code: 'DELETE_FAILED' },
        { status: 500 },
      );
    }

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
    const msg = e instanceof Error ? e.message : 'DELETE_ROLE_FAILED';
    return NextResponse.json({ error: msg, code: 'DELETE_FAILED' }, { status: 500 });
  }
}, { key: 'admin:roles:delete', limit: 10, windowMs: 60_000 });
