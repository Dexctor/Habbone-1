'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  FileText,
  LayoutGrid,
  MessageSquare,
  Newspaper,
  Users,
  Ban,
  UserCheck,
  UserX,
  Shield,
  Pencil,
  Trash2,
  Clock,
  Coins,
} from 'lucide-react';
import { easings, dur } from '@/lib/motion-tokens';
import { useAdminView } from '@/components/admin/AdminContext';
import AdminContentManager from '@/components/admin/AdminContentManager';
import AdminRolesPanel from '@/components/admin/AdminRolesPanel';
import AdminThemePanel from '@/components/admin/AdminThemePanel';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminPubPanel from '@/components/admin/AdminPubPanel';
import AdminShopPanel from '@/components/admin/AdminShopPanel';
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

export interface RecentActivityItem {
  id: string;
  // Couvre les actions synthétiques (news_published, topic_created) ET les
  // enums admin_logs (user.ban, user.coins_grant, content.update, etc.).
  // Le style/icône est résolu via ACTIVITY_CONFIG ci-dessous.
  type: string;
  title: string;
  date: string;
  admin?: string;
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
  recentActivity?: RecentActivityItem[];
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
  const usersCount = getStatValue(props.stats, 'Utilisateurs') || legacyUsers + directusUsers;
  const articleCount = getStatValue(props.stats, 'Articles');
  const topicCount = getStatValue(props.stats, 'Sujets forum');
  const commentCount = getStatValue(props.stats, 'Commentaires');

  return (
    <div className="space-y-6">
      {/* ── Overview ── */}
      {view === 'overview' && (
        <motion.div
          className="space-y-6"
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.div variants={STAGGER_ITEM} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-white">
                Tableau de bord
              </h2>
              <p className="text-[13px] text-admin-text-tertiary">
                Bienvenue sur le panneau d&apos;administration HabbOne
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-admin-text-tertiary">
              <Clock className="h-3.5 w-3.5" />
              Dernière mise à jour : maintenant
            </div>
          </motion.div>

          {/* Stats grid — 4 clickable cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Utilisateurs inscrits"
              value={usersCount}
              icon={<Users className="h-5 w-5" />}
              iconBg="bg-[#2596FF]/15"
              iconColor="text-admin-brand-blue"
              onClick={() => setView('users')}
            />
            <StatCard
              label="Actualités publiées"
              value={articleCount}
              icon={<Newspaper className="h-5 w-5" />}
              iconBg="bg-[#0FD52F]/15"
              iconColor="text-[#0FD52F]"
              onClick={() => setView('content')}
            />
            <StatCard
              label="Sujets sur le forum"
              value={topicCount}
              icon={<MessageSquare className="h-5 w-5" />}
              iconBg="bg-[#FFC800]/15"
              iconColor="text-[#FFC800]"
              onClick={() => setView('content')}
            />
            <StatCard
              label="Commentaires"
              value={commentCount}
              icon={<FileText className="h-5 w-5" />}
              iconBg="bg-[#FF4B6C]/15"
              iconColor="text-[#FF4B6C]"
              onClick={() => setView('content')}
            />
          </div>

          {/* Activity feed */}
          <motion.div variants={STAGGER_ITEM} className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Activité récente</h3>
              {(props.recentActivity?.length ?? 0) > 0 && (
                <span className="text-[12px] text-admin-text-tertiary">
                  {props.recentActivity?.length} événement{(props.recentActivity?.length ?? 0) > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {(!props.recentActivity || props.recentActivity.length === 0) ? (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-[#BEBECE]/20" />
                <p className="text-[13px] text-admin-text-tertiary">Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-0">
                {props.recentActivity.map((item, i) => (
                  <ActivityRow key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick access cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickCard
              title="Utilisateurs"
              description="Recherche, modération et rôles"
              icon={<Users className="h-5 w-5" />}
              onClick={() => setView('users')}
            />
            <QuickCard
              title="Actualités"
              description="Articles, forum et stories"
              icon={<FileText className="h-5 w-5" />}
              onClick={() => setView('content')}
            />
            <QuickCard
              title="Paramètres"
              description="Thème, rôles et partenaires"
              icon={<LayoutGrid className="h-5 w-5" />}
              onClick={() => setView('theme')}
            />
          </div>
        </motion.div>
      )}

      {/* ── Users ── */}
      {view === 'users' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
            Gestion des utilisateurs
          </h2>
          <AdminUsersPanel />
        </ViewWrapper>
      )}

      {/* ── Content ── */}
      {view === 'content' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
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
        </ViewWrapper>
      )}

      {/* ── Theme ── */}
      {view === 'theme' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
            Personnalisation du thème
          </h2>
          <div className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
            <AdminThemePanel />
          </div>
        </ViewWrapper>
      )}

      {/* ── Roles ── */}
      {view === 'roles' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
            Gestion des rôles
          </h2>
          <div className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
            <AdminRolesPanel />
          </div>
        </ViewWrapper>
      )}

      {/* ── Publicité ── */}
      {view === 'pub' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
            Gestion des partenaires
          </h2>
          <div className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
            <AdminPubPanel />
          </div>
        </ViewWrapper>
      )}

      {/* ── Boutique ── */}
      {view === 'shop' && (
        <ViewWrapper>
          <h2 className="text-[20px] font-bold text-white">
            Gestion de la boutique
          </h2>
          <AdminShopPanel />
        </ViewWrapper>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animation primitives                                              */
/* ------------------------------------------------------------------ */

const STAGGER_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: dur.md, ease: easings.emph } },
};

/** Fade/slide wrapper used when switching between admin views. */
function ViewWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.sm, ease: easings.emph }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated count-up for the stat cards. Returns a ref to attach to the element
 * (animation starts when it enters the viewport) and the current display value.
 * Respects prefers-reduced-motion.
 */
function useAnimatedNumber(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLParagraphElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, durationMs]);

  return { ref, value };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}) {
  const { ref, value: animated } = useAnimatedNumber(value);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={STAGGER_ITEM}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-[8px] border border-white/5 bg-[#141433]/50 p-5 text-left transition-colors hover:border-[#2596FF]/25 hover:bg-[#141433]/70 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2596FF]/40"
    >
      {/* subtle hover sheen */}
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#2596FF]/0 blur-2xl transition-colors duration-300 group-hover:bg-[#2596FF]/10" />
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-[8px] ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <p ref={ref} className="mt-4 text-[28px] font-bold leading-none text-white">
        {formatNumber(animated)}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-admin-text-secondary">{label}</p>
    </motion.button>
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
    <motion.button
      type="button"
      onClick={onClick}
      variants={STAGGER_ITEM}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      whileTap={{ scale: 0.98 }}
      className="group rounded-[8px] border border-white/5 bg-[#141433]/50 p-5 text-left transition-colors hover:border-[#2596FF]/30 hover:bg-[#141433]/80 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#2596FF]/10 text-admin-brand-blue transition-all duration-300 group-hover:scale-110 group-hover:bg-[#2596FF]/20">
          {icon}
        </span>
        <div>
          <h3 className="text-[14px] font-bold text-white">{title}</h3>
          <p className="mt-0.5 text-[12px] text-admin-text-tertiary">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity feed row                                                  */
/* ------------------------------------------------------------------ */

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; icon: ReactNode }> = {
  news_published: {
    label: 'Publié',
    color: 'bg-[#0FD52F]/15 text-[#0FD52F]',
    icon: <Newspaper className="h-4 w-4" />,
  },
  news_updated: {
    label: 'Modifié',
    color: 'bg-[#2596FF]/15 text-admin-brand-blue',
    icon: <Pencil className="h-4 w-4" />,
  },
  topic_created: {
    label: 'Nouveau',
    color: 'bg-[#FFC800]/15 text-[#FFC800]',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  'user.ban': {
    label: 'Banni',
    color: 'bg-[#F92330]/15 text-[#F92330]',
    icon: <Ban className="h-4 w-4" />,
  },
  'user.unban': {
    label: 'Réactivé',
    color: 'bg-[#0FD52F]/15 text-[#0FD52F]',
    icon: <UserCheck className="h-4 w-4" />,
  },
  'user.delete': {
    label: 'Supprimé',
    color: 'bg-[#F92330]/15 text-[#F92330]',
    icon: <UserX className="h-4 w-4" />,
  },
  'user.role_change': {
    label: 'Rôle modifié',
    color: 'bg-[#2596FF]/15 text-admin-brand-blue',
    icon: <Shield className="h-4 w-4" />,
  },
  'user.coins_grant': {
    label: 'Coins',
    color: 'bg-[#FFC800]/15 text-[#FFC800]',
    icon: <Coins className="h-4 w-4" />,
  },
  'content.delete': {
    label: 'Supprimé',
    color: 'bg-[#F92330]/15 text-[#F92330]',
    icon: <Trash2 className="h-4 w-4" />,
  },
  'content.update': {
    label: 'Modifié',
    color: 'bg-[#2596FF]/15 text-admin-brand-blue',
    icon: <Pencil className="h-4 w-4" />,
  },
};

function ActivityRow({ item, index = 0 }: { item: RecentActivityItem; index?: number }) {
  const config = ACTIVITY_CONFIG[item.type] ?? {
    // Fallback volontairement neutre pour ne plus afficher 'user.coins_grant'
    // ou autre clé technique brute dans le badge.
    label: 'Action',
    color: 'bg-white/5 text-admin-text-tertiary',
    icon: <Clock className="h-4 w-4" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.05, duration: dur.sm, ease: easings.std }}
      className="flex items-center gap-3 border-b border-white/[0.03] py-3 transition-colors last:border-0 hover:bg-white/[0.02]"
    >
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[6px] ${config.color}`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{item.title}</p>
        <p className="text-[11px] text-admin-text-tertiary">{item.date}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${config.color}`}>
        {config.label}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatValue(stats: SummaryStat[], label: string) {
  return stats.find((item) => item.label === label)?.value || 0;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString('fr-FR');
  }
  return String(n);
}
