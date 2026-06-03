import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { pbList, pbCreate, pbUpdate, pbDelete } from '@/server/directus/pb-helpers'
import { TABLES } from '@/server/directus/tables'

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

// v2 sponsors row (English columns: id, name, link, image, active, sort).
type SponsorRow = {
  id: string;
  name?: string | null;
  link?: string | null;
  image?: string | null;
  active?: boolean | null;
  sort?: number | null;
};

// App-facing response shape (legacy-style): { id, nome, link, imagem, status }.
// PB ids sont des STRINGS -> on les conserve tels quels (jamais Number()).
function mapDbRow(row: SponsorRow): Record<string, unknown> {
  return {
    id: String(row.id),
    nome: row.name ?? '',
    link: row.link ?? '',
    imagem: row.image ?? '',
    status: row.active ? 'ativo' : 'inativo',
  };
}

// Traduit le payload app (nome/link/imagem/status) vers les colonnes v2.
function appToDb(input: { nome?: string; link?: string; imagem?: string; status?: string }): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (input.nome !== undefined) db.name = input.nome;
  if (input.link !== undefined) db.link = input.link;
  if (input.imagem !== undefined) db.image = input.imagem;
  if (input.status !== undefined) db.active = input.status === 'ativo';
  return db;
}

// GET: list all pubs
export const GET = withAdmin(async () => {
  try {
    const rows = await pbList<SponsorRow>(TABLE, {
      fields: 'id,name,link,image,active',
      sort: '-created',
      perPage: 50,
    });
    const data = rows.map(mapDbRow);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
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

// PB ids = strings. Le panneau admin renvoie l'id reçu du GET ; on l'accepte
// en string ou number et on le coerce en string pour les helpers PB.
const idSchema = z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v));

const UpdateSchema = z.object({
  id: idSchema,
  nome: z.string().min(1).max(100).optional(),
  link: z.string().min(1).max(500).optional(),
  imagem: z.string().min(1).max(500).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
});

const DeleteSchema = z.object({
  id: idSchema,
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
    try {
      await pbDelete(TABLE, parsed.data.id);
    } catch {
      return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
    }
    invalidatePub();
    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    const { id, ...patch } = parsed.data;
    if (patch.link !== undefined) patch.link = normalizeLink(patch.link);
    const dbPatch = appToDb(patch);
    try {
      const updated = await pbUpdate<SponsorRow>(TABLE, id, dbPatch);
      invalidatePub();
      return NextResponse.json({ ok: true, data: updated ? mapDbRow(updated) : null });
    } catch {
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    }
  }

  // CREATE
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const data = { ...parsed.data, link: normalizeLink(parsed.data.link) };
  const payload = { ...appToDb(data), sort: 0 };
  try {
    const created = await pbCreate<SponsorRow>(TABLE, payload);
    invalidatePub();
    return NextResponse.json({ ok: true, data: created ? mapDbRow(created) : null });
  } catch {
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}, { key: 'admin:pub', limit: 30, windowMs: 60_000 });
