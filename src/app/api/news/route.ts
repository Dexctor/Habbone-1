import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { adminCreateNews } from '@/server/directus/news'
import { checkRateLimit } from '@/server/rate-limit'

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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps requis' }, { status: 400 })
    }

    const titulo = String(body.titulo || '').trim()
    const descricao = String(body.descricao || '').trim()
    const noticia = String(body.noticia || '').trim()
    const imagem = body.imagem ? String(body.imagem).trim() : null

    if (!titulo || titulo.length < 3) {
      return NextResponse.json({ error: 'Titre trop court (min. 3 caractères)' }, { status: 400 })
    }
    if (!noticia || noticia.length < 10) {
      return NextResponse.json({ error: 'Contenu trop court (min. 10 caractères)' }, { status: 400 })
    }

    const article = await adminCreateNews({
      titulo,
      descricao: descricao || null,
      imagem,
      noticia,
      autor: nick,
    })

    const id = article && typeof article === 'object' ? (article as any).id : null
    return NextResponse.json({ ok: true, id: id != null ? Number(id) : null })
  } catch (error: unknown) {
    let message: string
    if (error instanceof Error) {
      message = error.message
    } else if (error && typeof error === 'object') {
      const e = error as Record<string, any>
      message = e?.errors?.[0]?.message || e?.message || JSON.stringify(e)
    } else {
      message = String(error)
    }
    return NextResponse.json(
      { error: 'Erreur serveur', detail: message },
      { status: 500 }
    )
  }
}
