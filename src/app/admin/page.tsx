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
import { getAdminLogs } from '@/server/directus/admin-logs';

import AdminDashboard from '@/components/admin/AdminDashboard';
import type { RecentActivityItem } from '@/components/admin/AdminDashboard';

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Il y a quelques secondes';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' });
}

export const revalidate = 0;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?from=/admin');
  if ((session.user as any).role !== 'admin') redirect('/profile');
  try {
    await assertAdmin();
  } catch {
    redirect('/profile');
  }
  return session;
}

function revalidatePublicFeeds() {
  revalidatePath('/');
  revalidatePath('/news');
  revalidatePath('/forum');
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

  // Server actions
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
    revalidatePath('/admin');
  }

  async function deleteTopic(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumTopic(id);
    revalidatePath('/admin');
    revalidatePublicFeeds();
    revalidatePath(`/forum/topic/${id}`);
  }

  async function updatePost(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const conteudo = String(formData.get('conteudo') || '');
    await adminUpdateForumPost(id, { conteudo });
    revalidatePath('/admin');
  }

  async function deletePost(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumPost(id);
    revalidatePath('/admin');
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
    revalidatePath('/admin');
  }

  async function deleteArticle(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteNews(id);
    revalidatePath('/admin');
    revalidatePublicFeeds();
    revalidatePath(`/news/${id}`);
  }

  async function updateForumComment(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const comentario = String(formData.get('comentario') || '');
    await adminUpdateForumComment(id, { comentario });
    revalidatePath('/admin');
  }

  async function deleteForumComment(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteForumComment(id);
    revalidatePath('/admin');
  }

  async function updateNewsComment(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const comentario = String(formData.get('comentario') || '');
    await adminUpdateNewsComment(id, { comentario });
    revalidatePath('/admin');
  }

  async function deleteNewsComment(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteNewsComment(id);
    revalidatePath('/admin');
  }

  async function updateStory(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    const patch: any = {
      status: String(formData.get('status') || 'public'),
    };
    if (formData.has('titulo')) patch.titulo = String(formData.get('titulo') || '');
    if (formData.has('imagem')) patch.imagem = String(formData.get('imagem') || '');
    await adminUpdateStory(id, patch);
    revalidatePath('/admin');
  }

  async function deleteStory(formData: FormData) {
    'use server';
    await requireAdmin();
    const id = Number(formData.get('id') || 0);
    if (!id) return;
    await adminDeleteStory(id);
    revalidatePath('/admin');
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

  // ── Build recent activity feed from real data ──
  const recentActivity: RecentActivityItem[] = [];

  // Recent news (last 5)
  for (const article of newsArray.slice(0, 5)) {
    const ts = Number(article.data);
    const dateObj = ts > 1e9 && ts < 1e12 ? new Date(ts * 1000) : ts > 1e12 ? new Date(ts) : null;
    recentActivity.push({
      id: `news-${article.id}`,
      type: 'news_published',
      title: `Actualité publiée : "${String(article.titulo || '').slice(0, 60)}"`,
      date: dateObj ? formatRelativeTime(dateObj) : '',
    });
  }

  // Recent topics (last 5)
  for (const topic of topicsArray.slice(0, 5)) {
    const ts = Number(topic.data);
    const dateObj = ts > 1e9 && ts < 1e12 ? new Date(ts * 1000) : ts > 1e12 ? new Date(ts) : null;
    recentActivity.push({
      id: `topic-${topic.id}`,
      type: 'topic_created',
      title: `Sujet créé : "${String(topic.titulo || '').slice(0, 60)}"`,
      date: dateObj ? formatRelativeTime(dateObj) : '',
    });
  }

  // Admin logs (last 10)
  const adminLogs = await getAdminLogs({ limit: 10 }).catch(() => ({ data: [], total: 0 }));
  for (const log of adminLogs.data) {
    const dateObj = log.created_at ? new Date(log.created_at) : null;
    const adminLabel = log.admin_name ? ` par ${log.admin_name}` : '';

    let title = '';
    switch (log.action) {
      case 'user.ban':
        title = `Utilisateur banni${adminLabel}`;
        if (log.details && typeof log.details === 'object' && 'nick' in log.details) {
          title = `Utilisateur banni : ${log.details.nick}${adminLabel}`;
        }
        break;
      case 'user.unban':
        title = `Utilisateur réactivé${adminLabel}`;
        if (log.details && typeof log.details === 'object' && 'nick' in log.details) {
          title = `Utilisateur réactivé : ${log.details.nick}${adminLabel}`;
        }
        break;
      case 'user.delete':
        title = `Utilisateur supprimé${adminLabel}`;
        break;
      case 'user.role_change':
        title = `Rôle modifié${adminLabel}`;
        if (log.details && typeof log.details === 'object' && 'nick' in log.details) {
          title = `Rôle modifié : ${log.details.nick}${adminLabel}`;
        }
        break;
      case 'content.delete':
        title = `Contenu supprimé${adminLabel}`;
        break;
      case 'content.update':
        title = `Contenu modifié${adminLabel}`;
        break;
      default:
        title = `Action : ${log.action}${adminLabel}`;
    }

    recentActivity.push({
      id: `log-${log.id}`,
      type: log.action as RecentActivityItem['type'],
      title,
      date: dateObj ? formatRelativeTime(dateObj) : '',
      admin: log.admin_name,
    });
  }

  // Sort all by most recent first, limit to 10
  recentActivity.sort((a, b) => {
    // Items without dates go last
    if (!a.date && b.date) return 1;
    if (a.date && !b.date) return -1;
    return 0; // Keep relative order since items are already recent-first
  });
  const activityFeed = recentActivity.slice(0, 10);

  return (
    <AdminDashboard
      currentAdminName={(session.user as any).nick}
      stats={summaryStats}
      topics={topicsArray}
      posts={postsArray}
      news={newsArray}
      forumComments={forumCommentsArray}
      newsComments={newsCommentsArray}
      stories={storiesArray}
      topicTitleById={topicTitleById}
      recentActivity={activityFeed}
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
  );
}
