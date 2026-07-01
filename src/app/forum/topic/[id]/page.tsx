import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import CommentBubble from "@/components/forum/CommentBubble";
import ForumCommentForm from "@/components/forum/ForumCommentForm";
import CommentsActionButton from "@/components/forum/CommentsActionButton";
import TopicVoteButtons from "@/components/forum/TopicVoteButtons";
import ContentWithLightbox from "@/components/ui/image-lightbox";
import ClickableImage from "@/components/ui/clickable-image";
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";
import { mediaUrl } from "@/lib/media-url";
import {
  getPublicTopicById,
  getPublicTopicComments,
  getTopicVoteSummary,
} from "@/server/pocketbase/forum";
import { getLikesMapForTopicComments } from "@/server/pocketbase/likes";
import type { ForumCommentRecord, ForumTopicRecord } from "@/server/pocketbase/types";
import { getRoleBadgesForNicks } from "@/server/pocketbase/badges";
import { stripHtml } from "@/lib/text-utils";
import { formatDateTimeFromAny } from "@/lib/date-utils";
import styles from "@/components/forum/forum-content.module.css";
import { SiteButton, SiteEmptyState, SiteHeader, SitePage, SitePanel } from "@/components/site";

import { unstable_cache } from 'next/cache';

export const revalidate = 300;

type TopicPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

function readSearchValue(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function toPositiveInt(value: string, fallback = 1): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

function isVisibleStatus(status: unknown): boolean {
  const normalized = String(status || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized === "" || normalized === "ativo" || normalized === "active" || normalized === "public";
}

export default async function TopicPage(props: TopicPageProps) {
  const { id } = await props.params;
  const resolvedSearchParams = ((await props.searchParams) ?? {}) as Record<string, string | string[]>;
  const topicId = String(id || '');

  if (!topicId) {
    return (
      <SitePage>
        <SiteEmptyState>Sujet introuvable.</SiteEmptyState>
      </SitePage>
    );
  }

  const getCachedTopicData = unstable_cache(
    () => Promise.all([
      getPublicTopicById(topicId).catch(() => null),
      getPublicTopicComments(topicId).catch(() => []),
      getTopicVoteSummary(topicId).catch(() => ({ up: 0, down: 0 })),
    ]),
    [`forum-topic-${topicId}`],
    { tags: ['forum', `forum-topic-${topicId}`], revalidate: 300 }
  );

  const [topic, commentsRaw, voteSummary] = await getCachedTopicData() as [
    ForumTopicRecord | null,
    unknown,
    { up: number; down: number },
  ];
  const session = await getServerSession(authOptions);

  if (!topic) {
    return (
      <SitePage>
        <SiteEmptyState>Sujet introuvable.</SiteEmptyState>
      </SitePage>
    );
  }

  const comments = (Array.isArray(commentsRaw) ? (commentsRaw as ForumCommentRecord[]) : []).filter((comment) =>
    isVisibleStatus(comment?.status),
  );
  const commentIds = comments
    .map((comment) => String(comment?.id || ''))
    .filter((value) => value.length > 0);
  const [likesMap, roleBadgesMap] = await Promise.all([
    getLikesMapForTopicComments(commentIds).catch(() => ({} as Record<string, number>)),
    getRoleBadgesForNicks([
      ...(topic?.autor ? [stripHtml(topic.autor)] : []),
      ...comments.map((c) => stripHtml(c.autor || '')).filter(Boolean),
    ]).catch(() => ({} as Record<string, string | null>)),
  ]);

  const commentPageSize = 5;
  const commentPageCount = Math.max(1, Math.ceil(comments.length / commentPageSize));
  const rawPage = toPositiveInt(readSearchValue(resolvedSearchParams.cp), 1);
  const commentPage = Math.max(1, Math.min(rawPage, commentPageCount));
  const visibleComments = comments.slice((commentPage - 1) * commentPageSize, commentPage * commentPageSize);

  const buildCommentPageHref = (page: number): string => {
    const safePage = Math.max(1, Math.min(page, commentPageCount));
    return safePage <= 1 ? `/forum/topic/${topicId}` : `/forum/topic/${topicId}?cp=${safePage}`;
  };

  const title = stripHtml(topic.titulo || `Sujet #${topic.id}`) || `Sujet #${topic.id}`;
  const author = stripHtml(topic.autor || "");
  const imageUrl = topic.imagem ? mediaUrl(topic.imagem) : null;
  const avatarUrl = author
    ? buildHabboAvatarUrl(author, {
        direction: 2,
        head_direction: 3,
        img_format: "png",
        gesture: "sml",
        headonly: 1,
        size: "l",
      })
    : "/img/avatar_empty.png";
  const isAuthenticated = Boolean((session as { user?: unknown } | null)?.user);

  return (
    <SitePage className="gap-8 sm:px-8">
      <SitePanel className="overflow-hidden p-0">
        <SiteHeader title={title} imageSrc="/img/forum.png" className="rounded-none border-x-0 border-t-0" />

        <div className="py-6">
          <div className="mx-auto flex w-full max-w-[1150px] flex-col gap-5 px-4">
            {imageUrl ? (
              <div className="mx-auto flex w-full max-w-[760px] items-center justify-center overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-3">
                <ClickableImage src={imageUrl} alt="" className="max-h-[320px] w-auto max-w-full object-contain" />
              </div>
            ) : null}

            {topic.conteudo ? (
              <ContentWithLightbox
                html={topic.conteudo}
                className={`${styles.forumContent} w-full text-[16px] text-white`}
              />
            ) : (
              <p className="text-[15px] text-[#BEBECE]">Aucun contenu detaille pour ce sujet.</p>
            )}
          </div>

          <div className="mt-5 px-4">
            <div className="border-t border-[#141433] pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt="" className="h-[62px] w-[54px] object-contain image-pixelated" />
                  <Link href={`/profile?user=${encodeURIComponent(author || "Anonyme")}`} className="text-[16px] font-bold text-[#2976E8] hover:underline transition">{author || "Anonyme"}</Link>
                </div>
                <TopicVoteButtons topicId={topicId} initial={voteSummary} canVote={isAuthenticated} />
              </div>
            </div>
          </div>
        </div>
      </SitePanel>

      <section className="space-y-3">
        <SiteHeader
          title="Commentaires"
          imageSrc="/img/public.png"
          actions={isAuthenticated ? (
            <CommentsActionButton
              isAuthenticated
              label="Ecrire commentaire"
              className="inline-flex h-[38px] items-center justify-center rounded-[4px] border border-[#2596FF]/70 bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8]"
            />
          ) : (
            <SiteButton asChild size="sm">
              <Link href={`/login?from=${encodeURIComponent(`/forum/topic/${topicId}`)}`}>Se connecter</Link>
            </SiteButton>
          )}
        />

        {isAuthenticated ? <ForumCommentForm topicId={topicId} /> : null}

        {visibleComments.length === 0 ? (
          <SiteEmptyState>Aucun commentaire pour le moment.</SiteEmptyState>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((comment) => {
              const commentAuthor = stripHtml(comment.autor || "Anonyme");
              const commentDate = formatDateTimeFromAny(comment.data);
              return (
                <CommentBubble
                  key={comment.id}
                  id={String(comment.id)}
                  author={commentAuthor}
                  date={commentDate}
                  avatarNick={commentAuthor}
                  html={comment.comentario || ""}
                  likes={likesMap[String(comment.id)] ?? 0}
                  roleBadge={roleBadgesMap[commentAuthor] ?? null}
                  canInteract={isAuthenticated}
                />
              );
            })}
          </div>
        )}

        {commentPageCount > 1 ? (
          <nav className="flex items-center justify-center gap-4 pt-4" aria-label="Pagination des commentaires">
            {commentPage > 1 ? (
              <Link
                href={buildCommentPageHref(commentPage - 1)}
                className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] hover:bg-white/10"
                aria-label="Page precedente"
              >
                <i className="material-icons text-[18px]" aria-hidden>
                  chevron_left
                </i>
              </Link>
            ) : (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD]/45">
                <i className="material-icons text-[18px]" aria-hidden>
                  chevron_left
                </i>
              </span>
            )}

            <div className="flex items-center gap-2">
              {Array.from({ length: commentPageCount }, (_, index) => {
                const page = index + 1;
                const active = page === commentPage;
                return active ? (
                  <span key={page} className="px-1 text-[14px] text-white underline">
                    {page}
                  </span>
                ) : (
                  <Link key={page} href={buildCommentPageHref(page)} className="px-1 text-[14px] text-[#DDD] hover:text-white">
                    {page}
                  </Link>
                );
              })}
            </div>

            {commentPage < commentPageCount ? (
              <Link
                href={buildCommentPageHref(commentPage + 1)}
                className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] hover:bg-white/10"
                aria-label="Page suivante"
              >
                <i className="material-icons text-[18px]" aria-hidden>
                  chevron_right
                </i>
              </Link>
            ) : (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD]/45">
                <i className="material-icons text-[18px]" aria-hidden>
                  chevron_right
                </i>
              </span>
            )}
          </nav>
        ) : null}
      </section>
    </SitePage>
  );
}
