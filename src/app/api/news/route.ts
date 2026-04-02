import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { adminCreateNews } from '@/server/directus/news'
import { checkRateLimit } from '@/server/rate-limit'
import { sanitizeRichContentHtml, sanitizePlainText } from '@/server/comment-sanitize'

const NewsBodySchema = z.object({
  titulo: z.string().min(3, 'Titre trop court (min. 3 caractères)').max(200, 'Titre trop long'),
  descricao: z.string().max(500, 'Description trop longue').optional().default(''),
  noticia: z.string().min(10, 'Contenu trop court (min. 10 caractères)').max(50000, 'Contenu trop long'),
  imagem: z.string().max(500).nullable().optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rl = checkRateLimit(req, { key: 'news:create', limit: 5, windowMs: 10 * 60 * 1000 })
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

    const { titulo: rawTitulo, descricao: rawDescricao, noticia: rawNoticia, imagem } = parsed.data
    const titulo = sanitizePlainText(rawTitulo)
    const descricao = rawDescricao ? sanitizePlainText(rawDescricao) : null
    const noticia = sanitizeRichContentHtml(rawNoticia)

    if (!titulo || titulo.length < 3) {
      return NextResponse.json({ error: 'Titre trop court (min. 3 caractères)' }, { status: 400 })
    }

    const article = await adminCreateNews({
      titulo,
      descricao,
      imagem: imagem ?? null,
      noticia,
      autor: nick,
    })

    const id = article && typeof article === 'object' ? (article as any).id : null
    return NextResponse.json({ ok: true, id: id != null ? Number(id) : null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}
