import Link from "next/link"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/auth"
import NewsCommentForm from "@/components/news/NewsCommentForm"
import { mediaUrl } from "@/lib/media-url"
import { getPublicNewsById, getPublicNewsComments } from "@/server/pocketbase/news"
import { getLikesMapForNewsComments } from "@/server/pocketbase/likes"
import type { NewsCommentRecord, NewsRecord } from "@/server/pocketbase/types"
import { stripHtml } from "@/lib/text-utils"
import { formatDateTimeFromAny } from "@/lib/date-utils"
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging"
import CommentBubble from "@/components/forum/CommentBubble"
import CommentsActionButton from "@/components/forum/CommentsActionButton"
import ContentWithLightbox from "@/components/ui/image-lightbox"
import { getRoleBadgesForNicks } from "@/server/pocketbase/badges"
import ClickableImage from "@/components/ui/clickable-image"
import { SiteButton, SiteEmptyState, SiteHeader, SitePage, SitePanel } from "@/components/site"

import { unstable_cache } from 'next/cache'

export const revalidate = 300

type NewsDetailProps = {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage(props: NewsDetailProps) {
  const { id } = await props.params
  const newsId = String(id || '')

  if (!newsId) {
    return (
      <SitePage>
        <SiteEmptyState>Article introuvable.</SiteEmptyState>
      </SitePage>
    )
  }

  const getCachedNewsItem = unstable_cache(
    () => getPublicNewsById(newsId).catch(() => null),
    [`news-detail-${newsId}`],
    { tags: ['news', `news-${newsId}`], revalidate: 300 }
  )
  const getCachedComments = unstable_cache(
    () => getPublicNewsComments(newsId).catch(() => []),
    [`news-comments-${newsId}`],
    { tags: ['news', `news-${newsId}`], revalidate: 300 }
  )

  const [newsItem, commentsRaw, session]: [NewsRecord | null, unknown, Session | null] = await Promise.all([
    getCachedNewsItem(),
    getCachedComments(),
    getServerSession(authOptions),
  ])

  if (!newsItem) {
    return (
      <SitePage>
        <SiteEmptyState>Article introuvable.</SiteEmptyState>
      </SitePage>
    )
  }

  const comments: NewsCommentRecord[] = Array.isArray(commentsRaw) ? (commentsRaw as NewsCommentRecord[]) : []
  const commentIds = comments
    .map((comment) => String(comment?.id || ''))
    .filter((value) => value.length > 0)
  const [likesMap, roleBadgesMap] = await Promise.all([
    getLikesMapForNewsComments(commentIds).catch(() => ({} as Record<string, number>)),
    getRoleBadgesForNicks([
      ...(newsItem.autor ? [stripHtml(newsItem.autor)] : []),
      ...comments.map((c) => stripHtml(c.autor || '')).filter(Boolean),
    ]).catch(() => ({} as Record<string, string | null>)),
  ])
  const title = stripHtml(newsItem.titulo || `Article #${newsItem.id}`) || `Article #${newsItem.id}`
  const publishedAt = formatDateTimeFromAny(newsItem.data)
  const author = stripHtml(newsItem.autor || "")
  const imageUrl = mediaUrl(newsItem.imagem || undefined)
  const isAuthenticated = Boolean(session?.user)
  const avatarUrl = author
    ? buildHabboAvatarUrl(author, {
      direction: 2,
      head_direction: 3,
      img_format: "png",
      gesture: "sml",
      headonly: 1,
      size: "l",
    })
    : "/img/avatar_empty.png"

  // Category badge text
  const categoryLabel = newsItem.id % 3 === 0 ? "NOUVEAUTÉ" : newsItem.id % 3 === 1 ? "HABBONE" : "RARES"

  const commentLabel = `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`
  const actionEl = isAuthenticated ? (
    <CommentsActionButton isAuthenticated={true} />
  ) : (
    <SiteButton asChild>
      <a href={`/login?from=/news/${newsId}`}>Se connecter</a>
    </SiteButton>
  )

  return (
    <SitePage className="gap-10">
      <SitePanel className="overflow-hidden p-0">
        <SiteHeader title={title} imageSrc="/img/news.png" className="rounded-none border-x-0 border-t-0" />

        <div className="flex flex-col items-center gap-4 px-6 py-8">
          {imageUrl ? (
            <div className="flex w-full items-center justify-center">
              <div className="flex w-full max-w-[760px] items-center justify-center overflow-hidden rounded-[4px] border border-[#141433] bg-[#272746] p-3">
                <ClickableImage src={imageUrl} alt={title} className="max-h-[320px] w-auto max-w-full object-contain" />
              </div>
            </div>
          ) : null}

          {/* Article HTML content */}
          <ContentWithLightbox
            html={newsItem.noticia || ""}
            className="article-content w-full max-w-[1152px] text-base font-normal leading-relaxed text-white"
          />
        </div>

        <div className="border-t border-[#141433] px-4 pb-1 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className="h-[50px] w-[50px] object-contain image-pixelated" />
              <div className="flex items-center gap-3 text-base">
                <Link href={`/profile?user=${encodeURIComponent(author || "Anonyme")}`} className="font-bold text-[#2596FF] hover:underline transition">{author || "Anonyme"}</Link>
                {publishedAt ? <span className="font-normal text-[#DDD]">{publishedAt}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </SitePanel>

      <section className="w-full space-y-8">
        <SiteHeader title="Commentaires" imageSrc="/img/public.png" actions={actionEl} />

        {isAuthenticated ? <NewsCommentForm newsId={newsId} /> : null}

        {comments.length === 0 ? (
          <SiteEmptyState>Aucun commentaire pour le moment.</SiteEmptyState>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: NewsCommentRecord) => {
              const commentAuthor = stripHtml(comment.autor || "Anonyme")
              const commentDate = formatDateTimeFromAny(comment.data)
              return (
                <CommentBubble
                  key={comment.id}
                  id={String(comment.id)}
                  author={commentAuthor}
                  date={commentDate}
                  html={comment.comentario || ""}
                  likes={likesMap[String(comment.id)] ?? 0}
                  avatarNick={commentAuthor}
                  canInteract={isAuthenticated}
                  likeEndpoint={`/api/news/comments/${comment.id}/like`}
                  reportEndpoint={null}
                  roleBadge={roleBadgesMap[commentAuthor] ?? null}
                  showActions={true}
                />
              )
            })}
          </div>
        )}
      </section>
    </SitePage>
  )
}
