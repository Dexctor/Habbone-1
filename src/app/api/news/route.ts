import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { adminCreateNews } from '@/server/pocketbase/news'
import { checkRateLimit } from '@/server/rate-limit'
import { sanitizeRichContentHtml, sanitizePlainText } from '@/server/comment-sanitize'

export const dynamic = 'force-dynamic';

const NewsBodySchema = z.object({
  titulo: z.string().min(3, 'Titre trop court (min. 3 caractères)').max(200, 'Titre trop long'),
  descricao: z.string().max(500, 'Description trop longue').optional().default(''),
  noticia: z.string().min(10, 'Contenu trop court (min. 10 caractères)').max(50000, 'Contenu trop long'),
  imagem: z.string().max(500).nullable().optional(),
})

function normalizeCoverImage(value: string | null | undefined): string | null {
  const image = String(value ?? '').trim()
  if (!image) return null

  try {
    const url = new URL(image)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {}

  throw new Error('INVALID_COVER_IMAGE_URL')
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rl = await checkRateLimit(req, { key: 'news:create', limit: 5, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: rl.headers })
    }

    const session = await getServerSession(authOptions)
    const user = session?.user as { nick?: string | null } | undefined
    const nick = typeof user?.nick === 'string' ? user.nick.trim() : ''
    if (!nick) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = NewsBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Données invalides'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { titulo: rawTitulo, descricao: rawDescricao, noticia: rawNoticia, imagem: rawImagem } = parsed.data
    const titulo = sanitizePlainText(rawTitulo)
    const descricao = rawDescricao ? sanitizePlainText(rawDescricao) : null
    const noticia = sanitizeRichContentHtml(rawNoticia)
    let imagem: string | null = null

    try {
      imagem = normalizeCoverImage(rawImagem)
    } catch {
      return NextResponse.json({ error: "L'image de couverture doit être une URL valide." }, { status: 400 })
    }

    if (!titulo || titulo.length < 3) {
      return NextResponse.json({ error: 'Titre trop court (min. 3 caractères)' }, { status: 400 })
    }

    const article = await adminCreateNews({
      titulo,
      descricao,
      imagem,
      noticia,
      autor: nick,
    })

    const id = article && typeof article === 'object' ? (article as any).id : null
    revalidateTag('news')
    revalidateTag('home')
    // PocketBase ids are 15-char strings, not numbers — Number(id) would be NaN
    // (serialized as null), breaking the client redirect to the new article.
    return NextResponse.json({ ok: true, id: id != null ? String(id) : null })
  } catch (error: unknown) {
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : null
    if (status && status >= 400 && status < 500) {
      return NextResponse.json({ error: 'Données refusées par PocketBase' }, { status })
    }

    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}
