import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { invalidatePub } from '@/server/cache-policy'
import { createSponsor, deleteSponsor, listSponsors, updateSponsor } from '@/server/directus/sponsors'

export const dynamic = 'force-dynamic';

// GET: list all pubs
export const GET = withAdmin(async () => {
  const data = await listSponsors(50);
  return NextResponse.json({ data });
}, { key: 'admin:pub:read', limit: 120, windowMs: 60_000 });

// Validation tolérante du lien : on n'exige pas .url() strict pour ne pas
// rejeter "discord.gg/xxx" ou un domaine sans scheme. La normalisation
// (préfixe https://) est faite côté serveur avant l'écriture en base.
const CreateSchema = z.object({
  nome: z.string().min(1, 'Nom requis').max(100),
  link: z.string().min(1, 'Lien requis').max(500),
  imagem: z.string().min(1, 'Image requise').max(500),
  status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
});

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).max(100).optional(),
  link: z.string().min(1).max(500).optional(),
  imagem: z.string().min(1).max(500).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
});

const DeleteSchema = z.object({
  id: z.number().int().positive(),
});

// POST: create, update or delete pub
export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const action = String(body?.action || 'create');

  if (action === 'delete') {
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const deleted = await deleteSponsor(parsed.data.id);
    if (!deleted) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
    invalidatePub();
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const { id, ...patch } = parsed.data;
    const data = await updateSponsor(id, patch);
    if (!data) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    invalidatePub();
    return NextResponse.json({ ok: true, data });
  }

  // CREATE
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const data = await createSponsor(parsed.data);
  invalidatePub();
  return NextResponse.json({ ok: true, data });
}, { key: 'admin:pub', limit: 30, windowMs: 60_000 });
