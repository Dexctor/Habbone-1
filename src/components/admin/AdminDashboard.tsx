'use client';

import { type ReactNode, useMemo } from 'react';
import { FileText, LayoutGrid, Users } from 'lucide-react';
import { useAdminView } from '@/components/admin/AdminContext';
import AdminContentManager from '@/components/admin/AdminContentManager';
import AdminRolesPanel from '@/components/admin/AdminRolesPanel';
import AdminThemePanel from '@/components/admin/AdminThemePanel';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminPubPanel from '@/components/admin/AdminPubPanel';
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from '@/server/directus/types';

type ServerActionFn = (formData: FormData) => Promise<void>;

interface SummaryStat {
  label: string;
  value: number;
}

interface AdminDashboardProps {
  currentAdminName?: string;
  stats: SummaryStat[];
  topics: AdminTopic[];
  posts: AdminPost[];
  news: AdminArticle[];
  forumComments: AdminForumComment[];
  newsComments: AdminNewsComment[];
  stories: AdminStory[];
  topicTitleById: Record<number, string>;
  updateTopic: ServerActionFn;
  deleteTopic: ServerActionFn;
  updatePost: ServerActionFn;
  deletePost: ServerActionFn;
  updateArticle: ServerActionFn;
  deleteArticle: ServerActionFn;
  updateForumComment: ServerActionFn;
  deleteForumComment: ServerActionFn;
  updateNewsComment: ServerActionFn;
  deleteNewsComment: ServerActionFn;
  updateStory: ServerActionFn;
  deleteStory: ServerActionFn;
}

export default function AdminDashboard(props: AdminDashboardProps) {
  const { view, setView } = useAdminView();

  const legacyUsers = getStatValue(props.stats, 'Utilisateurs (legacy)');
  const directusUsers = getStatValue(props.stats, 'Utilisateurs (Directus)');
  const articleCount = props.news.length;
  const topicCount = props.topics.length;
  const storyCount = props.stories.length;
  const commentCount = props.forumComments.length + props.newsComments.length;
  const totalUsers = legacyUsers + directusUsers;

  return (
    <div className="space-y-5">
      {/* ── Overview ── */}
      {view === 'overview' && (
        <div className="space-y-5">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Tableau de bord
          </h2>

          {/* Stats grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Utilisateurs" value={totalUsers} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Articles" value={articleCount} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Sujets forum" value={topicCount} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Commentaires" value={commentCount} icon={<FileText className="h-4 w-4" />} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Stories" value={storyCount} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Legacy" value={legacyUsers} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Directus" value={directusUsers} icon={<Users className="h-4 w-4" />} />
          </div>

          {/* Quick access cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickCard
              title="Membres"
              description="Recherche, modération et rôles"
              icon={<Users className="h-5 w-5" />}
              onClick={() => setView('users')}
            />
            <QuickCard
              title="Contenus"
              description="Articles, forum et stories"
              icon={<FileText className="h-5 w-5" />}
              onClick={() => setView('content')}
            />
            <QuickCard
              title="Thème"
              description="Personnalisation du site"
              icon={<LayoutGrid className="h-5 w-5" />}
              onClick={() => setView('theme')}
            />
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {view === 'users' && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Gestion des membres
          </h2>
          <AdminUsersPanel />
        </div>
      )}

      {/* ── Content ── */}
      {view === 'content' && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Gestion des contenus
          </h2>
          <AdminContentManager
            topics={props.topics}
            posts={props.posts}
            news={props.news}
            forumComments={props.forumComments}
            newsComments={props.newsComments}
            topicTitleById={props.topicTitleById}
            updateTopic={props.updateTopic}
            deleteTopic={props.deleteTopic}
            updatePost={props.updatePost}
            deletePost={props.deletePost}
            updateArticle={props.updateArticle}
            deleteArticle={props.deleteArticle}
            updateForumComment={props.updateForumComment}
            deleteForumComment={props.deleteForumComment}
            updateNewsComment={props.updateNewsComment}
            deleteNewsComment={props.deleteNewsComment}
            stories={props.stories}
            updateStory={props.updateStory}
            deleteStory={props.deleteStory}
          />
        </div>
      )}

      {/* ── Theme ── */}
      {view === 'theme' && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Personnalisation du thème
          </h2>
          <div className="rounded-[4px] border border-[#141433] bg-[#272746] p-5">
            <AdminThemePanel />
          </div>
        </div>
      )}

      {/* ── Roles ── */}
      {view === 'roles' && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Gestion des rôles
          </h2>
          <div className="rounded-[4px] border border-[#141433] bg-[#272746] p-5">
            <AdminRolesPanel />
          </div>
        </div>
      )}

      {/* ── Publicité ── */}
      {view === 'pub' && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold uppercase tracking-[0.04em] text-white">
            Gestion de la publicité
          </h2>
          <div className="rounded-[4px] border border-[#141433] bg-[#272746] p-5">
            <AdminPubPanel />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-[#141433] bg-[#272746] px-4 py-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
        <span>{label}</span>
        <span className="text-[#BEBECE]/40">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function QuickCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[6px] border border-[#141433] bg-[#272746] p-5 text-left transition-colors hover:border-[#2596FF]/40 hover:bg-[#25254D]"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-[6px] bg-[#1F1F3E] p-2.5 text-[#2596FF]">{icon}</span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-white">{title}</h3>
          <p className="mt-1 text-xs text-[#BEBECE]">{description}</p>
        </div>
      </div>
    </button>
  );
}

function getStatValue(stats: SummaryStat[], label: string) {
  return stats.find((item) => item.label === label)?.value || 0;
}
