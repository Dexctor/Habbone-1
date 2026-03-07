import {
  getPublicPostById,
  getPublicTopicComments,
} from '@/server/directus/forum';
import { getLikesMapForTopicComments } from '@/server/directus/likes';
import { formatDateTimeSmart } from '@/lib/date-utils';

export const revalidate = 30;

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const postId = Number(id);

  // 1) Récupère le post
  const post = await getPublicPostById(postId);

  // 2) Charge les commentaires du TOPIC de ce post
  const topicId = Number(post.id_topico);
  const comments = await getPublicTopicComments(topicId);

  // 3) Compteur de likes par commentaire (batch)
  const likesMap = await getLikesMapForTopicComments(
    comments.map((c: any) => Number(c.id))
  );

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <article className="border rounded p-4">
        <h1 className="text-xl font-bold">Post #{post.id}</h1>
        <div className="text-xs opacity-60">{formatDateTimeSmart(post.data)}</div>
        <div
          className="mt-3 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.conteudo || "" }}
        />
      </article>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Commentaires du topic ({comments.length})
        </h2>
        <ul className="space-y-3">
          {comments.map((c: any) => (
            <li key={c.id} className="border rounded p-3">
              <div className="text-xs opacity-60 mb-1">
                {formatDateTimeSmart(c.data)} • 👍 {likesMap[Number(c.id)] ?? 0}
              </div>
              <div
                className="prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: c.comentario }}
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
