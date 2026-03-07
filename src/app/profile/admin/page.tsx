import 'server-only';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/auth';
import { assertAdmin } from '@/server/authz';
import { adminCount, adminCountUsers } from '@/server/directus/admin';
import {
  adminListForumTopics,
  adminListForumPosts,
  adminUpdateForumTopic,
  adminDeleteForumTopic,
  adminUpdateForumPost,
  adminDeleteForumPost,
  adminListForumComments,
  adminUpdateForumComment,
  adminDeleteForumComment,
} from '@/server/directus/forum';
import {
  adminListNews,
  adminListNewsComments,
  adminUpdateNews,
  adminDeleteNews,
  adminUpdateNewsComment,
  adminDeleteNewsComment,
} from '@/server/directus/news';
import {
  adminListStories,
  adminUpdateStory,
  adminDeleteStory,
} from '@/server/directus/stories';

import AdminDashboard from '@/components/admin/AdminDashboard';

export const revalidate = 0;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?from=/profile/admin');
  if ((session.user as any).role !== 'admin') redirect('/profile');
  try {
    await assertAdmin();
  } catch {
    redirect('/profile');
  }
  return session;
}

export default async function AdminPage() {
  const session = await requireAdmin();

  const [
    topics,
    posts,
    news,
    stories,
    topicsCount,
    newsCount,
    legacyUsersCount,
    directusUsersCount,
    forumCommentsCount,
    newsCommentsCount,
    forumComments,
    newsComments,
  ] = await Promise.all([
    adminListForumTopics(1000).catch(() => []),
    adminListForumPosts(1000).catch(() => []),
    adminListNews(1000).catch(() => []),
    adminListStories(500).catch(() => []),
    adminCount('forum_topicos').catch(() => 0),
    adminCount('noticias').catch(() => 0),
    adminCountUsers().catch(() => 0),
    adminCount('directus_users').catch(() => 0),
    adminCount('forum_coment').catch(() => 0),
    adminCount('noticias_coment').catch(() => 0),
    adminListForumComments(500).catch(() => []),
    adminListNewsComments(500).catch(() => []),
  ]);
  const commentsTotal = (forumCommentsCount || 0) + (newsCommentsCount || 0);

  // Server actions (passed to client component)
  async function updateTopic(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const patch: any = {
      titulo: String(formData.get('titulo') || ''),
      imagem: String(formData.get('imagem') || ''),
      conteudo: String(formData.get('conteudo') || ''),
      fixo: !!formData.get('fixo'),
      fechado: !!formData.get('fechado'),
    };
    await adminUpdateForumTopic(id, patch);
    revalidatePath('/profile/admin');
  }

  async function deleteTopic(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumTopic(id);
    revalidatePath('/profile/admin');
  }

  async function updatePost(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const conteudo = String(formData.get('conteudo') || '');
    await adminUpdateForumPost(id, { conteudo });
    revalidatePath('/profile/admin');
  }

  async function deletePost(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumPost(id);
    revalidatePath('/profile/admin');
  }

  async function updateArticle(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const patch: any = {
      titulo: String(formData.get('titulo') || ''),
      descricao: String(formData.get('descricao') || ''),
      imagem: String(formData.get('imagem') || ''),
      noticia: String(formData.get('noticia') || ''),
    };
    await adminUpdateNews(id, patch);
    revalidatePath('/profile/admin');
  }

  async function deleteArticle(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteNews(id);
    revalidatePath('/profile/admin');
  }

  async function updateForumComment(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const comentario = String(formData.get('comentario') || '');
    await adminUpdateForumComment(id, { comentario });
    revalidatePath('/profile/admin');
  }

  async function deleteForumComment(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumComment(id);
    revalidatePath('/profile/admin');
  }

  async function updateNewsComment(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const comentario = String(formData.get('comentario') || '');
    await adminUpdateNewsComment(id, { comentario });
    revalidatePath('/profile/admin');
  }

  async function deleteNewsComment(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteNewsComment(id);
    revalidatePath('/profile/admin');
  }

  async function updateStory(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const patch: any = {
      status: String(formData.get('status') || 'public'),
    };
    if (formData.has('titulo')) patch.titulo = String(formData.get('titulo') || '');
    await adminUpdateStory(id, patch);
    revalidatePath('/profile/admin');
  }

  async function deleteStory(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteStory(id);
    revalidatePath('/profile/admin');
  }
  const summaryStats = [
    { label: 'Articles', value: newsCount },
    { label: 'Sujets forum', value: topicsCount },
    { label: 'Commentaires', value: commentsTotal },
    { label: 'Utilisateurs (legacy)', value: legacyUsersCount },
    { label: 'Utilisateurs (Directus)', value: directusUsersCount },
  ];

  const topicsArray = Array.isArray(topics) ? topics : [];
  const postsArray = Array.isArray(posts) ? posts : [];
  const newsArray = Array.isArray(news) ? news : [];
  const forumCommentsArray = Array.isArray(forumComments) ? forumComments : [];
  const newsCommentsArray = Array.isArray(newsComments) ? newsComments : [];
  const storiesArray = Array.isArray(stories) ? stories : [];
  const topicTitleById = topicsArray.reduce((acc: Record<number, string>, t: any) => {
    const id = Number(t?.id);
    if (!Number.isNaN(id)) acc[id] = String(t?.titulo || '');
    return acc;
  }, {});

  return (
    <main className="admin-skin mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Espace administration</h1>
          <p className="text-sm opacity-70">
            Gérez les contenus, les rôles et les utilisateurs depuis un espace unique.
          </p>
        </div>
        <div className="text-sm opacity-70">
          Connecté en tant que {(session.user as any).nick}
        </div>
      </header>

      <AdminDashboard
        stats={summaryStats}
        topics={topicsArray}
        posts={postsArray}
        news={newsArray}
        forumComments={forumCommentsArray}
        newsComments={newsCommentsArray}
        stories={storiesArray}
        topicTitleById={topicTitleById}
        updateTopic={updateTopic}
        deleteTopic={deleteTopic}
        updatePost={updatePost}
        deletePost={deletePost}
        updateArticle={updateArticle}
        deleteArticle={deleteArticle}
        updateForumComment={updateForumComment}
        deleteForumComment={deleteForumComment}
        updateNewsComment={updateNewsComment}
        deleteNewsComment={deleteNewsComment}
        updateStory={updateStory}
        deleteStory={deleteStory}
      />
    </main>
  );
}
