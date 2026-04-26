import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { directusUrl, serviceToken } from '@/server/directus/client'
import { TABLES, USE_V2 } from '@/server/directus/tables'

export const dynamic = 'force-dynamic';

// Accepte URLs absolues (http/https), schemes Discord (discord.gg, discord.com),
// ou un chemin relatif. Préfixe automatiquement https:// si manquant.
function normalizeLink(input: string): string {
  const trimmed = String(input || '').trim()
  if (!trimmed) return trimmed
  // Already has a scheme
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  // Looks like a domain (contains a dot, no spaces)
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed) && !/\s/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

const TABLE = TABLES.sponsors;

// App-facing response shape (legacy-style): { id, nome, link, imagem, status }
// Maps to either parceiros (legacy) or sponsors (v2).
function mapDbRow(row: any): Record<string, unknown> {
  if (USE_V2) {
    return {
      id: Number(row.id),
      nome: row.name ?? '',
      link: row.link ?? '',
      imagem: row.image ?? '',
      status: row.active ? 'ativo' : 'inativo',
    };
  }
  return {
    id: Number(row.id),
    nome: row.nome ?? '',
    link: row.link ?? '',
    imagem: row.imagem ?? '',
    status: row.status ?? 'ativo',
  };
}

function appToDb(input: { nome?: string; link?: string; imagem?: string; status?: string }): Record<string, unknown> {
  if (USE_V2) {
    const db: Record<string, unknown> = {};
    if (input.nome !== undefined) db.name = input.nome;
    if (input.link !== undefined) db.link = input.link;
    if (input.imagem !== undefined) db.image = input.imagem;
    if (input.status !== undefined) db.active = input.status === 'ativo';
    return db;
  }
  return { ...input };
}

// GET: list all pubs
export const GET = withAdmin(async () => {
  const fields = USE_V2 ? 'id,name,link,image,active' : 'id,nome,link,imagem,status';
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(TABLE)}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('sort', '-id');
  url.searchParams.set('limit', '50');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ data: [] });
  const json = await res.json();
  const data = (json?.data ?? []).map(mapDbRow);
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

  // Helper: invalider le cache home (tag) ET la page elle-même
  // (revalidate=300 sur app/page.tsx). Sans ça, la home reste figée
  // jusqu'à 5 min après une modif.
  const invalidatePub = () => {
    revalidateTag('pub');
    revalidateTag('home');
    revalidatePath('/');
  };

  if (action === 'delete') {
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}/${parsed.data.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
    invalidatePub();
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const { id, ...patch } = parsed.data;
    if (patch.link !== undefined) patch.link = normalizeLink(patch.link);
    const dbPatch = appToDb(patch);
    const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(dbPatch),
    });
    if (!res.ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    const json = await res.json();
    invalidatePub();
    return NextResponse.json({ ok: true, data: json?.data ? mapDbRow(json.data) : null });
  }

  // CREATE
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const data = { ...parsed.data, link: normalizeLink(parsed.data.link) };
  const payload = USE_V2
    ? { ...appToDb(data), sort: 0 }
    : { ...data, autor: 'admin', data: Math.floor(Date.now() / 1000) };
  const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  const json = await res.json();
  invalidatePub();
  return NextResponse.json({ ok: true, data: json?.data ? mapDbRow(json.data) : null });
}, { key: 'admin:pub', limit: 30, windowMs: 60_000 });
