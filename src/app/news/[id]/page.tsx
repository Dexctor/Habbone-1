import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/auth"
import NewsCommentForm from "@/components/news/NewsCommentForm"
import { PageSection } from "@/components/shared/page-section"
import { mediaUrl } from "@/lib/media-url"
import { getPublicNewsById, getPublicNewsComments } from "@/server/directus/news"
import type { NewsCommentRecord, NewsRecord } from "@/server/directus/types"
import { stripHtml } from "@/lib/text-utils"
import { formatDateTimeFromAny } from "@/lib/date-utils"
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging"
import CommentBubble from "@/components/forum/CommentBubble"
import CommentsActionButton from "@/components/forum/CommentsActionButton"

export const revalidate = 60

type NewsDetailProps = {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage(props: NewsDetailProps) {
  const { id } = await props.params
  const newsId = Number(id || 0)

  if (!Number.isFinite(newsId) || newsId <= 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55 sm:px-6 lg:px-12 xl:px-16 2xl:px-24">
        Article introuvable.
      </main>
    )
  }

  const [newsItem, commentsRaw, session]: [NewsRecord | null, unknown, Session | null] = await Promise.all([
    getPublicNewsById(newsId).catch(() => null),
    getPublicNewsComments(newsId).catch(() => []),
    getServerSession(authOptions),
  ])

  if (!newsItem) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55 sm:px-6 lg:px-12 xl:px-16 2xl:px-24">
        Article introuvable.
      </main>
    )
  }

  const comments: NewsCommentRecord[] = Array.isArray(commentsRaw) ? (commentsRaw as NewsCommentRecord[]) : []
  const title = stripHtml(newsItem.titulo || `Article #${newsItem.id}`) || `Article #${newsItem.id}`
  const publishedAt = formatDateTimeFromAny(newsItem.data)
  const author = stripHtml(newsItem.autor || "")
  const imageUrl = mediaUrl(newsItem.imagem || undefined)
  const isAuthenticated = Boolean(session?.user)
  const avatarUrl = author
    ? buildHabboAvatarUrl(author, {
      direction: 2,
      head_direction: 2,
      img_format: "png",
      gesture: "sml",
      headonly: 1,
      size: "m",
    })
    : "/img/avatar_empty.png"

  const commentLabel = `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`
  const actionEl = isAuthenticated ? (
    <CommentsActionButton isAuthenticated={true} />
  ) : (
    <a
      href={`/login?from=/news/${newsId}`}
      className="inline-flex h-9 items-center justify-center rounded-md bg-[color:var(--blue-500)] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-[color:var(--blue-700)]"
    >
      Se connecter
    </a>
  )

  return (
    <main className="mx-auto w-full space-y-20 py-10">
      <PageSection contentClassName="space-y-6">
        <section className="w-full rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-800)]/45 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.65)]">
          <header className="flex items-center justify-between border-b border-[color:var(--bg-700)]/70 bg-[#1F1F3E] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <img src="/img/news.png" alt="" className="h-11 w-8 sm:h-11 sm:w-8 image-pixelated" />
              <span className="text-lg font-bold uppercase tracking-[0.12em] text-[color:var(--foreground)]">{title}</span>
            </div>
          </header>
          <div className="px-7 sm:px-8 lg:px-10 py-7">
            {imageUrl ? (
              <div className="relative mb-4 w-full overflow-hidden rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 h-56 sm:h-72 lg:h-[420px]">
                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
              </div>
            ) : null}

            <article
              className="prose prose-invert max-w-none leading-relaxed prose-p:leading-relaxed text-left prose-sm sm:prose-base lg:prose-lg"
              dangerouslySetInnerHTML={{ __html: newsItem.noticia || "" }}
            />
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-[color:var(--bg-700)]/70 bg-[color:var(--bg-800)]/55 px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-sm border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/55" />
              <span>Par {author || "Anonyme"}</span>
            </div>
            {publishedAt ? (
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                Publie le {publishedAt}
              </span>
            ) : null}
          </footer>
        </section>
      </PageSection>

      <PageSection
        title={<div className="flex items-center gap-3"><img src="/img/public.png" alt="" className="h-12 w-auto image-pixelated" /><span>Commentaires</span></div>}
        titleClassName="text-2xl sm:text-3xl"
        description={commentLabel}
        actions={actionEl}
        className="px-6 sm:px-8 lg:px-10 py-8 sm:py-10"
        contentClassName="space-y-6"
      >
        {isAuthenticated ? (<NewsCommentForm newsId={newsId} />) : null}
        {comments.length === 0 ? (
          <p className="border border-dashed border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/35 px-5 py-6 text-center text-sm text-[color:var(--foreground)]/60">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          comments.map((comment: NewsCommentRecord) => {
            const commentAuthor = stripHtml(comment.autor || "Anonyme")
            const commentDate = formatDateTimeFromAny(comment.data)
            return (
              <CommentBubble
                key={comment.id}
                author={commentAuthor}
                date={commentDate}
                html={comment.comentario || ""}
                avatarNick={commentAuthor}
                canInteract={false}
                showActions={false}
              />
            )
          })
        )}
      </PageSection>
    </main>
  )
}
