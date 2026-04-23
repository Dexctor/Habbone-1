import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { directusUrl, serviceToken } from '@/server/directus/client'
import { TABLES, USE_V2 } from '@/server/directus/tables'

export const dynamic = 'force-dynamic';

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

const CreateSchema = z.object({
  nome: z.string().min(1, 'Nom requis').max(100),
  link: z.string().url('URL invalide').max(500),
  imagem: z.string().min(1, 'Image requise').max(500),
  status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
});

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).max(100).optional(),
  link: z.string().url().max(500).optional(),
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
    const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}/${parsed.data.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
    revalidateTag('pub');
    revalidateTag('home');
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const { id, ...patch } = parsed.data;
    const dbPatch = appToDb(patch);
    const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(dbPatch),
    });
    if (!res.ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    const json = await res.json();
    revalidateTag('pub');
    revalidateTag('home');
    return NextResponse.json({ ok: true, data: json?.data ? mapDbRow(json.data) : null });
  }

  // CREATE
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const payload = USE_V2
    ? { ...appToDb(parsed.data), sort: 0 }
    : { ...parsed.data, autor: 'admin', data: Math.floor(Date.now() / 1000) };
  const res = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  const json = await res.json();
  revalidateTag('pub');
  revalidateTag('home');
  return NextResponse.json({ ok: true, data: json?.data ? mapDbRow(json.data) : null });
}, { key: 'admin:pub', limit: 30, windowMs: 60_000 });
