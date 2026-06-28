'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LayoutGrid,
  MessageSquare,
  Newspaper,
  Package,
  ShoppingBag,
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
import type { ShopItem, ShopOrder } from '@/types/shop';
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from '@/server/pocketbase/types';

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
  const shopSummary = useShopSummary();

  const legacyUsers = getStatValue(props.stats, 'Utilisateurs (legacy)');
  const pocketbaseUsers = getStatValue(props.stats, 'Utilisateurs PocketBase');
  const usersCount = getStatValue(props.stats, 'Utilisateurs') || legacyUsers + pocketbaseUsers;
  const articleCount = getStatValue(props.stats, 'Articles');
  const topicCount = getStatValue(props.stats, 'Sujets forum');
  const commentCount = getStatValue(props.stats, 'Commentaires');
  const cockpit = useMemo(() => buildCockpitData(props, shopSummary), [props, shopSummary]);

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

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <ActionPanel
              title="À traiter maintenant"
              subtitle={cockpit.priorityTotal > 0 ? `${cockpit.priorityTotal} point${cockpit.priorityTotal > 1 ? 's' : ''} à surveiller` : 'Aucune urgence détectée'}
              items={cockpit.priorityItems}
              emptyIcon={<CheckCircle2 className="h-8 w-8" />}
              emptyText="Tout est à jour"
            />
            <ShopPanel
              summary={shopSummary}
              onOpenShop={() => setView('shop')}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <HealthPanel items={cockpit.healthItems} />
            <ActivityPanel items={props.recentActivity ?? []} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickCard
              title="Modérer"
              description={`${cockpit.moderationTotal} élément${cockpit.moderationTotal > 1 ? 's' : ''} à vérifier`}
              icon={<Shield className="h-5 w-5" />}
              tone="red"
              onClick={() => setView('content')}
            />
            <QuickCard
              title="Boutique"
              description={`${shopSummary.pendingOrders} commande${shopSummary.pendingOrders > 1 ? 's' : ''} en attente`}
              icon={<ShoppingBag className="h-5 w-5" />}
              tone="yellow"
              onClick={() => setView('shop')}
            />
            <QuickCard
              title="Utilisateurs"
              description="Recherche, sanctions et rôles"
              icon={<Users className="h-5 w-5" />}
              tone="blue"
              onClick={() => setView('users')}
            />
            <QuickCard
              title="Apparence"
              description="Thème, partenaires et habillage"
              icon={<LayoutGrid className="h-5 w-5" />}
              tone="green"
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
/*  Cockpit data                                                       */
/* ------------------------------------------------------------------ */

type ShopSummary = {
  loading: boolean;
  error: boolean;
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingOrders: number;
  recentOrders: ShopOrder[];
};

type ActionItem = {
  id: string;
  label: string;
  value: number;
  detail: string;
  tone: 'blue' | 'green' | 'yellow' | 'red' | 'neutral';
  icon: ReactNode;
};

type HealthItem = {
  id: string;
  label: string;
  detail: string;
  state: 'ok' | 'watch' | 'alert';
};

function useShopSummary(): ShopSummary {
  const [summary, setSummary] = useState<ShopSummary>({
    loading: true,
    error: false,
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingOrders: 0,
    recentOrders: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [itemsRes, ordersRes] = await Promise.all([
          fetch('/api/admin/shop?view=items', { cache: 'no-store' }),
          fetch('/api/admin/shop?view=orders&status=pendente&page=1', { cache: 'no-store' }),
        ]);
        if (!itemsRes.ok || !ordersRes.ok) throw new Error('ADMIN_SHOP_SUMMARY_FAILED');

        const [itemsJson, ordersJson] = await Promise.all([itemsRes.json(), ordersRes.json()]);
        const items = Array.isArray(itemsJson?.data) ? itemsJson.data as ShopItem[] : [];
        const orders = Array.isArray(ordersJson?.data) ? ordersJson.data as ShopOrder[] : [];

        if (cancelled) return;
        setSummary({
          loading: false,
          error: false,
          totalItems: items.length,
          activeItems: items.filter((item) => item.status === 'ativo').length,
          inactiveItems: items.filter((item) => item.status !== 'ativo').length,
          lowStockItems: items.filter((item) => item.status === 'ativo' && item.estoque > 0 && item.estoque <= 3).length,
          outOfStockItems: items.filter((item) => item.status === 'ativo' && item.estoque <= 0).length,
          pendingOrders: Number(ordersJson?.total ?? orders.length) || 0,
          recentOrders: orders.slice(0, 3),
        });
      } catch {
        if (cancelled) return;
        setSummary((prev) => ({ ...prev, loading: false, error: true }));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return summary;
}

function buildCockpitData(props: AdminDashboardProps, shop: ShopSummary) {
  const pendingArticles = props.news.filter((item) => isReviewStatus(item.status)).length;
  const pendingTopics = props.topics.filter((item) => isReviewStatus(item.status)).length;
  const pendingForumComments = props.forumComments.filter((item) => isReviewStatus(item.status)).length;
  const pendingNewsComments = props.newsComments.filter((item) => isReviewStatus(item.status)).length;
  const privateStories = props.stories.filter((item) => {
    const status = normalizeStatus(item.status);
    return status && status !== 'public' && status !== 'published';
  }).length;
  const moderationTotal = pendingArticles + pendingTopics + pendingForumComments + pendingNewsComments;

  const priorityItems: ActionItem[] = [
    {
      id: 'orders',
      label: 'Commandes boutique',
      value: shop.pendingOrders,
      detail: shop.loading ? 'Chargement...' : 'Livraisons à traiter',
      tone: shop.pendingOrders > 0 ? 'yellow' : 'green',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      id: 'moderation',
      label: 'Modération contenu',
      value: moderationTotal,
      detail: 'Articles, sujets et commentaires non publiés',
      tone: moderationTotal > 0 ? 'red' : 'green',
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: 'stock',
      label: 'Stock boutique',
      value: shop.outOfStockItems + shop.lowStockItems,
      detail: `${shop.outOfStockItems} rupture, ${shop.lowStockItems} stock faible`,
      tone: shop.outOfStockItems > 0 ? 'red' : shop.lowStockItems > 0 ? 'yellow' : 'green',
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: 'stories',
      label: 'Stories privées',
      value: privateStories,
      detail: 'Stories hors statut public',
      tone: privateStories > 0 ? 'yellow' : 'green',
      icon: <Newspaper className="h-4 w-4" />,
    },
  ];

  const healthItems: HealthItem[] = [
    {
      id: 'content',
      label: 'Contenus',
      detail: `${props.news.length} articles chargés, ${props.topics.length} sujets chargés`,
      state: props.news.length > 0 || props.topics.length > 0 ? 'ok' : 'watch',
    },
    {
      id: 'comments',
      label: 'Commentaires',
      detail: `${props.forumComments.length + props.newsComments.length} commentaires récents`,
      state: props.forumComments.length + props.newsComments.length > 0 ? 'ok' : 'watch',
    },
    {
      id: 'shop',
      label: 'Boutique',
      detail: shop.error ? 'Résumé indisponible' : `${shop.activeItems}/${shop.totalItems} articles actifs`,
      state: shop.error ? 'alert' : shop.outOfStockItems > 0 ? 'watch' : 'ok',
    },
    {
      id: 'activity',
      label: 'Journal admin',
      detail: `${props.recentActivity?.length ?? 0} événements récents`,
      state: (props.recentActivity?.length ?? 0) > 0 ? 'ok' : 'watch',
    },
  ];

  return {
    priorityItems,
    healthItems,
    priorityTotal: priorityItems.reduce((sum, item) => sum + item.value, 0),
    moderationTotal,
  };
}

function isReviewStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  if (!normalized) return false;
  return !['published', 'publicado', 'public', 'active', 'ativo', 'ok'].includes(normalized);
}

function normalizeStatus(status: string | null | undefined): string {
  return String(status || '').trim().toLowerCase();
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

function ActionPanel({
  title,
  subtitle,
  items,
  emptyIcon,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: ActionItem[];
  emptyIcon: ReactNode;
  emptyText: string;
}) {
  const hasWork = items.some((item) => item.value > 0);

  return (
    <motion.section variants={STAGGER_ITEM} className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
      <PanelHeader title={title} subtitle={subtitle} />
      {!hasWork ? (
        <div className="flex items-center gap-3 rounded-[6px] bg-[#0FD52F]/[0.06] px-3 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-[6px] bg-[#0FD52F]/15 text-[#0FD52F]">
            {emptyIcon}
          </span>
          <div>
            <p className="text-[13px] font-bold text-white">{emptyText}</p>
            <p className="text-[12px] text-admin-text-tertiary">Aucune intervention prioritaire pour le moment</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <MetricRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function ShopPanel({
  summary,
  onOpenShop,
}: {
  summary: ShopSummary;
  onOpenShop: () => void;
}) {
  return (
    <motion.section variants={STAGGER_ITEM} className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <PanelHeader
          title="Boutique"
          subtitle={summary.loading ? 'Synchronisation...' : `${summary.activeItems} article${summary.activeItems > 1 ? 's' : ''} actif${summary.activeItems > 1 ? 's' : ''}`}
        />
        <button
          type="button"
          onClick={onOpenShop}
          className="rounded-[5px] bg-[#2596FF]/15 px-3 py-1.5 text-[11px] font-bold text-admin-brand-blue transition-colors hover:bg-[#2596FF]/25"
        >
          Ouvrir
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="En attente" value={summary.pendingOrders} tone={summary.pendingOrders > 0 ? 'yellow' : 'green'} />
        <MiniStat label="Rupture" value={summary.outOfStockItems} tone={summary.outOfStockItems > 0 ? 'red' : 'green'} />
        <MiniStat label="Inactifs" value={summary.inactiveItems} tone={summary.inactiveItems > 0 ? 'neutral' : 'green'} />
      </div>

      <div className="mt-4 space-y-2">
        {summary.loading ? (
          <div className="rounded-[6px] bg-white/[0.03] px-3 py-3 text-[12px] text-admin-text-tertiary">Chargement des commandes...</div>
        ) : summary.error ? (
          <div className="rounded-[6px] bg-[#F92330]/10 px-3 py-3 text-[12px] font-semibold text-[#FF4B6C]">Résumé boutique indisponible</div>
        ) : summary.recentOrders.length === 0 ? (
          <div className="rounded-[6px] bg-white/[0.03] px-3 py-3 text-[12px] text-admin-text-tertiary">Aucune commande en attente</div>
        ) : (
          summary.recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 rounded-[6px] bg-white/[0.03] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-white">{order.user_nick || `Utilisateur #${order.user_id}`}</p>
                <p className="truncate text-[11px] text-admin-text-tertiary">{order.item_nome || `Article #${order.item_id}`}</p>
              </div>
              <span className="shrink-0 text-[12px] font-bold text-[#FFC800]">{order.preco} coins</span>
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

function HealthPanel({ items }: { items: HealthItem[] }) {
  return (
    <motion.section variants={STAGGER_ITEM} className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
      <PanelHeader title="Santé du site" subtitle="Signaux rapides du back-office" />
      <div className="space-y-2">
        {items.map((item) => {
          const cls = healthClass(item.state);
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-[6px] bg-white/[0.03] px-3 py-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-[6px] ${cls.icon}`}>
                {item.state === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-white">{item.label}</p>
                <p className="truncate text-[11px] text-admin-text-tertiary">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function ActivityPanel({ items }: { items: RecentActivityItem[] }) {
  return (
    <motion.section variants={STAGGER_ITEM} className="rounded-[8px] border border-white/5 bg-[#141433]/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <PanelHeader title="Activité récente" subtitle={`${items.length} événement${items.length > 1 ? 's' : ''}`} />
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-[#BEBECE]/20" />
          <p className="text-[13px] text-admin-text-tertiary">Aucune activité récente</p>
        </div>
      ) : (
        <div className="space-y-0">
          {items.slice(0, 6).map((item, i) => (
            <ActivityRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[15px] font-bold text-white">{title}</h3>
      <p className="mt-0.5 text-[12px] text-admin-text-tertiary">{subtitle}</p>
    </div>
  );
}

function MetricRow({ item }: { item: ActionItem }) {
  const cls = toneClass(item.tone);
  return (
    <div className="flex items-center gap-3 rounded-[6px] bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[6px] ${cls.icon}`}>{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-white">{item.label}</p>
        <p className="truncate text-[11px] text-admin-text-tertiary">{item.detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls.badge}`}>{item.value}</span>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: ActionItem['tone'] }) {
  const cls = toneClass(tone);
  return (
    <div className="rounded-[6px] bg-white/[0.03] px-3 py-3">
      <p className={`text-[18px] font-bold leading-none ${cls.text}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-admin-text-tertiary">{label}</p>
    </div>
  );
}

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
  tone = 'blue',
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  tone?: ActionItem['tone'];
  onClick: () => void;
}) {
  const cls = toneClass(tone);

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
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] transition-all duration-300 group-hover:scale-110 ${cls.icon}`}>
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

function toneClass(tone: ActionItem['tone']) {
  const classes = {
    blue: {
      icon: 'bg-[#2596FF]/15 text-admin-brand-blue',
      badge: 'bg-[#2596FF]/15 text-admin-brand-blue',
      text: 'text-admin-brand-blue',
    },
    green: {
      icon: 'bg-[#0FD52F]/15 text-[#0FD52F]',
      badge: 'bg-[#0FD52F]/15 text-[#0FD52F]',
      text: 'text-[#0FD52F]',
    },
    yellow: {
      icon: 'bg-[#FFC800]/15 text-[#FFC800]',
      badge: 'bg-[#FFC800]/15 text-[#FFC800]',
      text: 'text-[#FFC800]',
    },
    red: {
      icon: 'bg-[#F92330]/15 text-[#FF4B6C]',
      badge: 'bg-[#F92330]/15 text-[#FF4B6C]',
      text: 'text-[#FF4B6C]',
    },
    neutral: {
      icon: 'bg-white/5 text-admin-text-tertiary',
      badge: 'bg-white/5 text-admin-text-tertiary',
      text: 'text-admin-text-tertiary',
    },
  } satisfies Record<ActionItem['tone'], { icon: string; badge: string; text: string }>;
  return classes[tone];
}

function healthClass(state: HealthItem['state']) {
  const classes = {
    ok: { icon: 'bg-[#0FD52F]/15 text-[#0FD52F]' },
    watch: { icon: 'bg-[#FFC800]/15 text-[#FFC800]' },
    alert: { icon: 'bg-[#F92330]/15 text-[#FF4B6C]' },
  } satisfies Record<HealthItem['state'], { icon: string }>;
  return classes[state];
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString('fr-FR');
  }
  return String(n);
}
