import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAuth } from '@/server/api-helpers'
import { createForumTopic } from '@/server/pocketbase/forum'
import { sanitizeRichContentHtml, sanitizePlainText } from '@/server/comment-sanitize'

export const dynamic = 'force-dynamic';

const TopicBodySchema = z.object({
  titulo: z.string().min(3, 'Titre trop court (min. 3 caractères)').max(200, 'Titre trop long'),
  conteudo: z.string().min(10, 'Contenu trop court (min. 10 caractères)').max(50000, 'Contenu trop long'),
  imagem: z.string().max(500).optional().default(''),
  cat_id: z.union([z.number(), z.string(), z.null()]).optional().default(null),
})

export const POST = withAuth(async (req, { nick }) => {
  try {
    const body = await req.json().catch(() => null)
    const parsed = TopicBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Données invalides'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { titulo: rawTitulo, conteudo: rawConteudo, imagem: rawImagem, cat_id: rawCatId } = parsed.data
    const titulo = sanitizePlainText(rawTitulo)
    const conteudo = sanitizeRichContentHtml(rawConteudo)
    const imagem = rawImagem?.trim() || null
    // PocketBase relation ids are strings; coerce the validated cat_id.
    const cat_id = rawCatId == null ? null : String(rawCatId)

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
    return NextResponse.json({ ok: true, id: id != null ? String(id) : null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}, { key: 'forum:topic:create', limit: 5, windowMs: 10 * 60 * 1000 })
