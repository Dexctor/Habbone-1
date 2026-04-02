import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertAdmin } from '@/server/authz'
import { directusUrl, serviceToken } from '@/server/directus/client'
import { checkRateLimit } from '@/server/rate-limit'

// GET: list all pubs
export async function GET(req: Request) {
  try { await assertAdmin() } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'FORBIDDEN' }, { status: e?.status || 403 })
  }

  const url = new URL(`${directusUrl}/items/parceiros`)
  url.searchParams.set('fields', 'id,nome,link,imagem,status')
  url.searchParams.set('sort', '-id')
  url.searchParams.set('limit', '50')
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ data: [] })
  const json = await res.json()
  return NextResponse.json({ data: json?.data ?? [] })
}

const CreateSchema = z.object({
  nome: z.string().min(1, 'Nom requis').max(100),
  link: z.string().url('URL invalide').max(500),
  imagem: z.string().min(1, 'Image requise').max(500),
  status: z.enum(['ativo', 'inativo']).optional().default('ativo'),
})

const UpdateSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(1).max(100).optional(),
  link: z.string().url().max(500).optional(),
  imagem: z.string().min(1).max(500).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
})

const DeleteSchema = z.object({
  id: z.number().int().positive(),
})

// POST: create, update or delete pub
export async function POST(req: Request) {
  const rl = checkRateLimit(req, { key: 'admin:pub', limit: 30, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: rl.headers })

  try { await assertAdmin() } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'FORBIDDEN' }, { status: e?.status || 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })

  const action = String(body?.action || 'create')

  // DELETE
  if (action === 'delete') {
    const parsed = DeleteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    const res = await fetch(`${directusUrl}/items/parceiros/${parsed.data.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceToken}` },
    })
    if (!res.ok && res.status !== 204) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // UPDATE
  if (action === 'update') {
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    const { id, ...patch } = parsed.data
    const res = await fetch(`${directusUrl}/items/parceiros/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    const json = await res.json()
    return NextResponse.json({ ok: true, data: json?.data })
  }

  // CREATE
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const payload = {
    ...parsed.data,
    autor: 'admin',
    data: Math.floor(Date.now() / 1000),
  }
  const res = await fetch(`${directusUrl}/items/parceiros`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 })
  const json = await res.json()
  return NextResponse.json({ ok: true, data: json?.data })
}
