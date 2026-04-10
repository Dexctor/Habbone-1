import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { createForumTopic } from '@/server/directus/forum'
import { checkRateLimit } from '@/server/rate-limit'
import { sanitizeRichContentHtml, sanitizePlainText } from '@/server/comment-sanitize'

export const dynamic = 'force-dynamic';

const TopicBodySchema = z.object({
  titulo: z.string().min(3, 'Titre trop court (min. 3 caractères)').max(200, 'Titre trop long'),
  conteudo: z.string().min(10, 'Contenu trop court (min. 10 caractères)').max(50000, 'Contenu trop long'),
  imagem: z.string().max(500).optional().default(''),
  cat_id: z.union([z.number(), z.string(), z.null()]).optional().default(null),
})

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rl = checkRateLimit(req, { key: 'forum:topic:create', limit: 5, windowMs: 10 * 60 * 1000 })
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
    const parsed = TopicBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Données invalides'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { titulo: rawTitulo, conteudo: rawConteudo, imagem: rawImagem, cat_id } = parsed.data
    const titulo = sanitizePlainText(rawTitulo)
    const conteudo = sanitizeRichContentHtml(rawConteudo)
    const imagem = rawImagem?.trim() || null

    if (!titulo || titulo.length < 3) {
      return NextResponse.json({ error: 'Titre trop court (min. 3 caractères)' }, { status: 400 })
    }

    const topic = await createForumTopic({
      titulo,
      conteudo,
      autor: nick,
      imagem,
      cat_id,
    })

    const id = topic && typeof topic === 'object' ? (topic as any).id : null
    revalidateTag('forum')
    revalidateTag('home')
    return NextResponse.json({ ok: true, id: id != null ? Number(id) : null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}
