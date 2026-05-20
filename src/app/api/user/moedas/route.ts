import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getUserMoedas } from '@/server/directus/users'
import { buildError } from '@/types/api'

export const dynamic = 'force-dynamic';

function sessionCoins(user: unknown): number | null {
  const raw = (user as any)?.moedas;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseSessionUserId(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const clean = raw.startsWith('legacy:') ? raw.slice('legacy:'.length) : raw;
  const id = Number(clean);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const GET = withAuth(async (_req, { user }) => {
  try {
    const uid = parseSessionUserId((user as any)?.id)
    if (!uid) return NextResponse.json(buildError('Non authentifié', { code: 'UNAUTHORIZED' }), { status: 401 })

    const moedas = await getUserMoedas(uid)
    return NextResponse.json({ ok: true, moedas })
  } catch (e: any) {
    const fallback = sessionCoins(user);
    if (fallback !== null) {
      return NextResponse.json({ ok: true, moedas: fallback, stale: true });
    }

    console.error('[api/user/moedas] failed', e);
    return NextResponse.json(buildError('Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 })
  }
})
