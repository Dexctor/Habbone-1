import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import CommentBubble from "@/components/forum/CommentBubble";
import ForumCommentForm from "@/components/forum/ForumCommentForm";
import CommentsActionButton from "@/components/forum/CommentsActionButton";
import TopicVoteButtons from "@/components/forum/TopicVoteButtons";
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";
import { mediaUrl } from "@/lib/media-url";
import {
  getPublicTopicById,
  getPublicTopicComments,
  getTopicVoteSummary,
} from "@/server/directus/forum";
import { getLikesMapForTopicComments } from "@/server/directus/likes";
import type { ForumCommentRecord, ForumTopicRecord } from "@/server/directus/types";
import { stripHtml } from "@/lib/text-utils";
import styles from "@/components/forum/forum-content.module.css";

export const revalidate = 30;

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
  const topicId = Number(id || 0);

  if (!Number.isFinite(topicId) || topicId <= 0) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-16 text-center text-sm text-[#BEBECE]/70">
        Sujet introuvable.
      </main>
    );
  }

  const [topic, commentsRaw, session, voteSummary]: [
    ForumTopicRecord | null,
    unknown,
    Awaited<ReturnType<typeof getServerSession>>,
    { up: number; down: number },
  ] = await Promise.all([
    getPublicTopicById(topicId).catch(() => null),
    getPublicTopicComments(topicId).catch(() => []),
    getServerSession(authOptions),
    getTopicVoteSummary(topicId).catch(() => ({ up: 0, down: 0 })),
  ]);

  if (!topic) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-16 text-center text-sm text-[#BEBECE]/70">
        Sujet introuvable.
      </main>
    );
  }

  const comments = (Array.isArray(commentsRaw) ? (commentsRaw as ForumCommentRecord[]) : []).filter((comment) =>
    isVisibleStatus(comment?.status),
  );
  const commentIds = comments
    .map((comment) => Number(comment?.id))
    .filter((value) => Number.isFinite(value) && value > 0);
  const likesMap = await getLikesMapForTopicComments(commentIds).catch(() => ({} as Record<number, number>));

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
        head_direction: 2,
        img_format: "png",
        gesture: "sml",
        headonly: 0,
        size: "m",
      })
    : "/img/avatar_empty.png";
  const isAuthenticated = Boolean((session as { user?: unknown } | null)?.user);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-8">
      <section>
        <div className="flex h-[76px] items-center rounded-t-[4px] border border-[#141433] bg-[#1F1F3E] px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/forum.png" alt="" className="h-[49px] w-auto image-pixelated object-contain" />
          <h1 className="ml-3 line-clamp-1 text-[18px] font-bold uppercase tracking-[0.04em] text-[#DDD]">
            {title}
          </h1>
        </div>

        <div className="rounded-b-[4px] border border-[#141433] bg-[#272746] py-6">
          <div className="mx-auto flex w-full max-w-[1150px] flex-col gap-5 px-4">
            {imageUrl ? (
              <div className="mx-auto h-[138px] w-full max-w-[563px] overflow-hidden rounded-[3px] bg-[#295A90]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}

            {topic.conteudo ? (
              <article
                className={`${styles.forumContent} w-full text-[16px] text-white`}
                dangerouslySetInnerHTML={{ __html: topic.conteudo }}
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
                  <span className="text-[16px] font-bold text-[#2976E8]">{author || "Anonyme"}</span>
                </div>
                <TopicVoteButtons topicId={topicId} initial={voteSummary} canVote={isAuthenticated} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex h-[76px] items-center justify-between rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/public.png" alt="" className="h-[50px] w-auto image-pixelated object-contain" />
            <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-[#DDD]">Commentaires</h2>
          </div>

          {isAuthenticated ? (
            <CommentsActionButton
              isAuthenticated
              label="Ecrire commentaire"
              className="inline-flex h-[38px] items-center justify-center rounded-[4px] bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8]"
            />
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(`/forum/topic/${topicId}`)}`}
              className="inline-flex h-[38px] items-center justify-center rounded-[4px] bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8]"
            >
              Se connecter
            </Link>
          )}
        </div>

        {isAuthenticated ? <ForumCommentForm topicId={topicId} /> : null}

        {visibleComments.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-5 py-8 text-center text-sm text-[#BEBECE]">
            Aucun commentaire pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((comment) => {
              const commentAuthor = stripHtml(comment.autor || "Anonyme");
              return (
                <CommentBubble
                  key={comment.id}
                  id={Number(comment.id)}
                  author={commentAuthor}
                  avatarNick={commentAuthor}
                  html={comment.comentario || ""}
                  likes={likesMap[Number(comment.id)] ?? 0}
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
    </main>
  );
}
