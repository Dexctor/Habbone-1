import { MessageCircle } from "lucide-react";
import { PageSection } from "@/components/shared/page-section";
import CommentBubble from "@/components/forum/CommentBubble";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";
import { mediaUrl } from "@/lib/media-url";
import {
  getPublicTopicById,
  getPublicTopicComments,
} from '@/server/directus/forum';
import { getLikesMapForTopicComments } from '@/server/directus/likes';
import type { ForumCommentRecord, ForumTopicRecord } from '@/server/directus/types';
import { formatDateTimeSmart } from "@/lib/date-utils";
import ForumCommentForm from "@/components/forum/ForumCommentForm";
import CommentsActionButton from "@/components/forum/CommentsActionButton";
import TopicVoteButtons from "@/components/forum/TopicVoteButtons";
import { getTopicVoteSummary } from "@/server/directus/forum";
import { stripHtml } from "@/lib/text-utils";

export const revalidate = 30;

type TopicPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicPage(props: TopicPageProps) {
  const { id } = await props.params;
  const topicId = Number(id || 0);

  if (!Number.isFinite(topicId) || topicId <= 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55 sm:px-6 lg:px-12 xl:px-16 2xl:px-24">
        Sujet introuvable.
      </main>
    );
  }

  const [topic, commentsRaw]: [ForumTopicRecord | null, unknown] = await Promise.all([
    getPublicTopicById(topicId).catch(() => null),
    getPublicTopicComments(topicId).catch(() => []),
  ]);

  if (!topic) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55 sm:px-6 lg:px-12 xl:px-16 2xl:px-24">
        Sujet introuvable.
      </main>
    );
  }

  const comments: ForumCommentRecord[] = Array.isArray(commentsRaw)
    ? (commentsRaw as ForumCommentRecord[])
    : [];
  const commentIds = comments.map((comment: ForumCommentRecord) => Number(comment.id)).filter(Number.isFinite);
  const likesMap = commentIds.length ? await getLikesMapForTopicComments(commentIds) : {};

  const title = stripHtml(topic.titulo || `Sujet #${topic.id}`) || `Sujet #${topic.id}`;
  const excerpt = stripHtml(topic.conteudo || "");
  const publishedAt = formatDateTimeSmart(topic.data);
  const author = stripHtml(topic.autor || "");
  const imageUrl = topic.imagem ? mediaUrl(topic.imagem) : null;
  const avatarUrl = author
    ? buildHabboAvatarUrl(author, {
      direction: 2,
      head_direction: 2,
      img_format: "png",
      gesture: "sml",
      headonly: 1,
      size: "m",
    })
    : "/img/avatar_empty.png";

  const commentsLabel = `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`;
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);
  const voteSummary = await getTopicVoteSummary(topicId).catch(() => ({ up: 0, down: 0 }));
  const actionEl = isAuthenticated ? (
    <CommentsActionButton isAuthenticated={true} />
  ) : (
    <a
      href={"/login?from=" + encodeURIComponent(`/forum/topic/${topicId}`)}
      className="inline-flex h-9 items-center justify-center rounded-md bg-[color:var(--blue-500)] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-[color:var(--blue-700)]"
    >
      Se connecter
    </a>
  );

  return (
    <main className="mx-auto w-full space-y-20 py-10  ">
      {/* <PageHero
        icon={<MessageCircle className="h-6 w-6" />}
        kicker="Forum"
        title={title}
        description={excerpt ? `${excerpt.slice(0, 200)}${excerpt.length > 200 ? "…" : ""}` : undefined}
      >
        <div className="flex flex-wrap gap-2 text-xs uppercase">
          {author ? <Badge variant="outline">Par {author}</Badge> : null}
          {publishedAt ? (
            <Badge variant="outline" className="text-[color:var(--foreground)]/70">
              Publié le {publishedAt}
            </Badge>
          ) : null}
          {topic.fixo ? <Badge variant="secondary">Épinglé</Badge> : null}
          {topic.fechado ? <Badge variant="destructive">Fermé</Badge> : null}
        </div>
      </PageHero> */}

      <PageSection contentClassName="space-y-6">
        <section className="w-full rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-800)]/45 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.65)]">
          <header className="flex items-center justify-between border-b border-[color:var(--bg-700)]/70 bg-[#1F1F3E] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <img src="/img/hotel.png" alt="" className="h-11 w-8 sm:h-11 sm:w-8 image-pixelated" />
              <span className="text-lg font-bold uppercase tracking-[0.12em] text-[color:var(--foreground)]">{title}</span>
            </div>
          </header>
          <div className="px-7 sm:px-8 lg:px-10 py-7">
            {imageUrl ? (
              <div className="relative mb-4 w-full overflow-hidden rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 h-56 sm:h-72 lg:h-[420px]">
                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
              </div>
            ) : null}

            {topic.conteudo ? (
              <article
                className="prose prose-invert max-w-none leading-relaxed prose-p:leading-relaxed text-left prose-sm sm:prose-base lg:prose-lg"
                dangerouslySetInnerHTML={{ __html: topic.conteudo }}
              />
            ) : (
              <p className="text-sm text-[color:var(--foreground)]/65">Aucun contenu détaillé pour ce sujet.</p>
            )}
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-[color:var(--bg-700)]/70 bg-[color:var(--bg-800)]/55 px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-sm border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/55" />
              <span>Par {author || "Anonyme"}</span>
            </div>
            <TopicVoteButtons topicId={topicId} initial={voteSummary} canVote={isAuthenticated} />
          </footer>
        </section>
      </PageSection>

      <PageSection
        title={<div className="flex items-center gap-3"><img src="/img/public.png" alt="" className="h-12 w-auto image-pixelated" /><span>Commentaires</span></div>}
        titleClassName="text-2xl sm:text-3xl"
        description={commentsLabel}
        actions={actionEl}
        className="px-6 sm:px-8 lg:px-10 py-8 sm:py-10"
        contentClassName="space-y-6"
      >
        {isAuthenticated ? (<ForumCommentForm topicId={topicId} />) : null}
        {comments.length === 0 ? (
          <p className="border border-dashed border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/35 px-5 py-6 text-center text-sm text-[color:var(--foreground)]/60">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          comments.map((comment: ForumCommentRecord) => {
            const likeCount = likesMap?.[Number(comment.id)] ?? 0;
            const commentAuthor = stripHtml(comment.autor || "Anonyme");
            const commentDate = formatDateTimeSmart(comment.data);

            return (
              <CommentBubble
                key={comment.id}
                author={commentAuthor}
                date={commentDate}
                id={Number(comment.id)} html={comment.comentario || ""} canInteract={isAuthenticated}
                likes={likeCount}
                avatarNick={commentAuthor}
              />
            );
          })
        )}
      </PageSection>
    </main>
  );
}
