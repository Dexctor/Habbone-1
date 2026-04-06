import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/auth"
import NewsCommentForm from "@/components/news/NewsCommentForm"
import { PageSection } from "@/components/shared/page-section"
import { mediaUrl } from "@/lib/media-url"
import { getPublicNewsById, getPublicNewsComments } from "@/server/directus/news"
import { getLikesMapForNewsComments } from "@/server/directus/likes"
import type { NewsCommentRecord, NewsRecord } from "@/server/directus/types"
import { stripHtml } from "@/lib/text-utils"
import { formatDateTimeFromAny } from "@/lib/date-utils"
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging"
import CommentBubble from "@/components/forum/CommentBubble"
import CommentsActionButton from "@/components/forum/CommentsActionButton"
import ContentWithLightbox from "@/components/ui/image-lightbox"

export const revalidate = 60

type NewsDetailProps = {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage(props: NewsDetailProps) {
  const { id } = await props.params
  const newsId = Number(id || 0)

  if (!Number.isFinite(newsId) || newsId <= 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[#BEBECE]/55">
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
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[#BEBECE]/55">
        Article introuvable.
      </main>
    )
  }

  const comments: NewsCommentRecord[] = Array.isArray(commentsRaw) ? (commentsRaw as NewsCommentRecord[]) : []
  const commentIds = comments
    .map((comment) => Number(comment?.id))
    .filter((value) => Number.isFinite(value) && value > 0)
  const likesMap = await getLikesMapForNewsComments(commentIds).catch(() => ({} as Record<number, number>))
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
      headonly: 0,
      size: "m",
    })
    : "/img/avatar_empty.png"

  // Category badge text
  const categoryLabel = newsItem.id % 3 === 0 ? "NOUVEAUTÉ" : newsItem.id % 3 === 1 ? "HABBONE" : "RARES"

  const commentLabel = `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`
  const actionEl = isAuthenticated ? (
    <CommentsActionButton isAuthenticated={true} />
  ) : (
    <a
      href={`/login?from=/news/${newsId}`}
      className="inline-flex items-center justify-center rounded-[4px] bg-[#2596FF] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#2976E8] transition"
    >
      Se connecter
    </a>
  )

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-16 px-4 py-10">
      {/* ─── Article Card ─── */}
      <section className="w-full rounded-[8px] border border-[#141433] bg-[#1F1F3E] py-3">
        {/* Title header bar */}
        <div className="mx-3 rounded-[8px] bg-[#141433] p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/news.png" alt="" className="h-[49px] w-auto image-pixelated" />
            <span className="text-lg font-bold uppercase tracking-[0.12em] text-[#DDD]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {title}
            </span>
          </div>
        </div>

        {/* Article body */}
        <div className="flex flex-col items-center gap-4 px-6 py-8">
          {/* Centered image 150×150 */}
          {imageUrl ? (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-[150px] w-[150px] object-cover rounded" />
            </div>
          ) : null}

          {/* Article HTML content */}
          <ContentWithLightbox
            html={newsItem.noticia || ""}
            className="article-content w-full max-w-[1152px] text-base font-normal leading-relaxed text-white"
          />
        </div>

        {/* Author footer */}
        <div className="border-t border-[#141433] px-4 pb-1 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className="h-[50px] w-[50px] object-contain image-pixelated" />
              <div className="flex items-center gap-3 text-base">
                <span className="font-bold text-[#2596FF]">{author || "Anonyme"}</span>
                {publishedAt ? <span className="font-normal text-[#DDD]">{publishedAt}</span> : null}
              </div>
            </div>
            <div className="rounded-[4px] bg-[rgba(255,255,255,0.05)] px-2 py-1.5">
              <span className="text-sm font-normal uppercase text-white">{categoryLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comments Section ─── */}
      <section className="w-full space-y-8">
        {/* Comments header bar */}
        <div className="flex items-center justify-between rounded-[4px] border border-[rgba(0,0,0,0.6)] bg-[#1F1F3E] px-5 py-4 shadow-[0_0_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/public.png" alt="" className="h-[50px] w-auto image-pixelated" />
            <span className="text-lg font-bold uppercase tracking-[0.12em] text-[#DDD]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              Commentaires
            </span>
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[4px] bg-[#2596FF] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#2976E8] transition"
              onClick={undefined}
            >
              Écrire commentaire
            </button>
          ) : (
            <a
              href={`/login?from=/news/${newsId}`}
              className="inline-flex items-center justify-center rounded-[4px] bg-[#2596FF] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#2976E8] transition"
            >
              Se connecter
            </a>
          )}
        </div>

        {/* Comment form */}
        {isAuthenticated ? <NewsCommentForm newsId={newsId} /> : null}

        {/* Comment list */}
        {comments.length === 0 ? (
          <p className="rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-5 py-6 text-center text-sm text-[#BEBECE]/60">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: NewsCommentRecord) => {
              const commentAuthor = stripHtml(comment.autor || "Anonyme")
              const commentDate = formatDateTimeFromAny(comment.data)
              return (
                <CommentBubble
                  key={comment.id}
                  id={Number(comment.id)}
                  author={commentAuthor}
                  date={commentDate}
                  html={comment.comentario || ""}
                  likes={likesMap[Number(comment.id)] ?? 0}
                  avatarNick={commentAuthor}
                  canInteract={isAuthenticated}
                  likeEndpoint={`/api/news/comments/${comment.id}/like`}
                  reportEndpoint={null}
                  showActions={true}
                />
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
