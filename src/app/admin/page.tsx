import 'server-only';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { assertAdmin } from '@/server/authz';
import { adminCount, adminCountUsers } from '@/server/directus/admin';
import { TABLES } from '@/server/directus/tables';
import {
  adminListForumTopics,
  adminListForumPosts,
  adminListForumComments,
} from '@/server/directus/forum';
import {
  adminListNews,
  adminListNewsComments,
} from '@/server/directus/news';
import { adminListStories } from '@/server/directus/stories';
import { getAdminLogs } from '@/server/directus/admin-logs';
import {
  updateTopicAction,
  deleteTopicAction,
  updatePostAction,
  deletePostAction,
  updateArticleAction,
  deleteArticleAction,
  updateForumCommentAction,
  deleteForumCommentAction,
  updateNewsCommentAction,
  deleteNewsCommentAction,
  updateStoryAction,
  deleteStoryAction,
} from '@/server/actions/admin-content';

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
  if (session.user.role !== 'admin') redirect('/profile');
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
    // Admin Content tab does local filtering / pagination, so we cap the payload
    // at 200 per collection. Real counts still come from adminCount() below.
    adminListForumTopics(200).catch(() => []),
    adminListForumPosts(200).catch(() => []),
    adminListNews(200).catch(() => []),
    adminListStories(100).catch(() => []),
    adminCount(TABLES.forumTopics).catch(() => 0),
    adminCount(TABLES.articles).catch(() => 0),
    adminCountUsers().catch(() => 0),
    adminCount('directus_users').catch(() => 0),
    adminCount(TABLES.forumComments).catch(() => 0),
    adminCount(TABLES.articleComments).catch(() => 0),
    adminListForumComments(100).catch(() => []),
    adminListNewsComments(100).catch(() => []),
  ]);
  const commentsTotal = (forumCommentsCount || 0) + (newsCommentsCount || 0);

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
  // MySQL stores DATETIME without a timezone suffix, and Directus returns it
  // as "2026-04-24T09:38:20" which Date.parse interprets as LOCAL time. Force
  // UTC by appending `Z` when missing, otherwise admin logs appear shifted by
  // the local TZ offset (e.g. 2h in Europe/Paris summer).
  const parseDirectusUtc = (s: string | null | undefined): Date | null => {
    if (!s) return null;
    const normalised = /[Z+-]\d\d?:?\d\d?$|Z$/i.test(s) ? s : `${s}Z`;
    const d = new Date(normalised);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const adminLogs = await getAdminLogs({ limit: 10 }).catch(() => ({ data: [], total: 0 }));

  // Helpers to pull values out of log.details without TypeScript hoops.
  const getStr = (d: unknown, key: string): string | null => {
    if (!d || typeof d !== 'object') return null;
    const v = (d as Record<string, unknown>)[key];
    return typeof v === 'string' && v.length > 0 ? v : null;
  };
  const getNum = (d: unknown, key: string): number | null => {
    if (!d || typeof d !== 'object') return null;
    const v = (d as Record<string, unknown>)[key];
    return typeof v === 'number' ? v : null;
  };
  const formatCoins = (n: number): string => n.toLocaleString('fr-FR');
  const contentTypeLabel = (t: string | null | undefined): string => {
    switch (t) {
      case 'article': return 'article';
      case 'topic': return 'sujet';
      case 'post': return 'message';
      case 'comment': return 'commentaire';
      default: return 'contenu';
    }
  };

  for (const log of adminLogs.data) {
    const dateObj = parseDirectusUtc(log.created_at);
    const byWhom = log.admin_name ? ` par ${log.admin_name}` : '';
    const nick = getStr(log.details, 'nick');

    let title = '';
    switch (log.action) {
      case 'user.ban':
        title = nick
          ? `${nick} a été banni${byWhom}`
          : `Utilisateur banni${byWhom}`;
        break;
      case 'user.unban':
        title = nick
          ? `${nick} a été réactivé${byWhom}`
          : `Utilisateur réactivé${byWhom}`;
        break;
      case 'user.delete':
        title = nick
          ? `${nick} a été supprimé${byWhom}`
          : `Utilisateur supprimé${byWhom}`;
        break;
      case 'user.role_change': {
        const newRole = getStr(log.details, 'new_role_name');
        if (nick && newRole) {
          title = `${nick} est maintenant « ${newRole} »${byWhom}`;
        } else if (nick) {
          title = `Rôle modifié pour ${nick}${byWhom}`;
        } else {
          title = `Rôle modifié${byWhom}`;
        }
        break;
      }
      case 'user.coins_grant': {
        const amount = getNum(log.details, 'amount');
        const newBalance = getNum(log.details, 'new_balance');
        if (nick && amount !== null && newBalance !== null) {
          title = `+${formatCoins(amount)} coins à ${nick} (solde : ${formatCoins(newBalance)})${byWhom}`;
        } else if (nick && amount !== null) {
          title = `+${formatCoins(amount)} coins à ${nick}${byWhom}`;
        } else if (amount !== null) {
          title = `+${formatCoins(amount)} coins offerts${byWhom}`;
        } else {
          title = `Coins offerts${byWhom}`;
        }
        break;
      }
      case 'content.update': {
        const titulo = getStr(log.details, 'titulo') || getStr(log.details, 'title');
        const what = contentTypeLabel(log.target_type);
        if (titulo) {
          title = `${what.charAt(0).toUpperCase()}${what.slice(1)} modifié : « ${titulo} »${byWhom}`;
        } else if (log.target_id) {
          title = `${what.charAt(0).toUpperCase()}${what.slice(1)} #${log.target_id} modifié${byWhom}`;
        } else {
          title = `Contenu modifié${byWhom}`;
        }
        break;
      }
      case 'content.delete': {
        const titulo = getStr(log.details, 'titulo') || getStr(log.details, 'title');
        const what = contentTypeLabel(log.target_type);
        if (titulo) {
          title = `${what.charAt(0).toUpperCase()}${what.slice(1)} supprimé : « ${titulo} »${byWhom}`;
        } else if (log.target_id) {
          title = `${what.charAt(0).toUpperCase()}${what.slice(1)} #${log.target_id} supprimé${byWhom}`;
        } else {
          title = `Contenu supprimé${byWhom}`;
        }
        break;
      }
      default:
        title = `Action administrateur${byWhom}`;
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
      currentAdminName={session.user.nick}
      stats={summaryStats}
      topics={topicsArray}
      posts={postsArray}
      news={newsArray}
      forumComments={forumCommentsArray}
      newsComments={newsCommentsArray}
      stories={storiesArray}
      topicTitleById={topicTitleById}
      recentActivity={activityFeed}
      updateTopic={updateTopicAction}
      deleteTopic={deleteTopicAction}
      updatePost={updatePostAction}
      deletePost={deletePostAction}
      updateArticle={updateArticleAction}
      deleteArticle={deleteArticleAction}
      updateForumComment={updateForumCommentAction}
      deleteForumComment={deleteForumCommentAction}
      updateNewsComment={updateNewsCommentAction}
      deleteNewsComment={deleteNewsCommentAction}
      updateStory={updateStoryAction}
      deleteStory={deleteStoryAction}
    />
  );
}
