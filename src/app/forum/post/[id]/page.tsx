import {
  getPublicPostById,
  getPublicTopicComments,
} from '@/server/pocketbase/forum';
import { getLikesMapForTopicComments } from '@/server/pocketbase/likes';
import { formatDateTimeSmart } from '@/lib/date-utils';
import { SiteHeader, SitePage, SitePanel } from '@/components/site';

export const revalidate = 300;

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const postId = String(id);

  // 1) Récupère le post
  const post = await getPublicPostById(postId);

  // 2) Charge les commentaires du TOPIC de ce post
  const topicId = String(post.id_topico);
  const comments = await getPublicTopicComments(topicId);

  // 3) Compteur de likes par commentaire (batch)
  const likesMap = await getLikesMapForTopicComments(
    comments.map((c: any) => String(c.id))
  );

  return (
    <SitePage width="md">
      <SitePanel as="article" className="p-5">
        <SiteHeader title={`Post #${post.id}`} imageSrc="/img/forum.png" compact className="mb-5" />
        <h1 className="text-xl font-bold">Post #{post.id}</h1>
        <div className="text-xs opacity-60">{formatDateTimeSmart(post.data)}</div>
        <div
          className="mt-3 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.conteudo || "" }}
        />
      </SitePanel>

      <SitePanel>
        <h2 className="text-lg font-semibold mb-2">
          Commentaires du topic ({comments.length})
        </h2>
        <ul className="space-y-3">
          {comments.map((c: any) => (
            <li key={c.id} className="rounded-[6px] border border-[#141433] bg-[#1F1F3E]/50 p-3">
              <div className="text-xs opacity-60 mb-1">
                {formatDateTimeSmart(c.data)} • 👍 {likesMap[String(c.id)] ?? 0}
              </div>
              <div
                className="prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: c.comentario }}
              />
            </li>
          ))}
        </ul>
      </SitePanel>
    </SitePage>
  );
}
