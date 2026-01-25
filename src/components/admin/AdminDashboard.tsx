"use client";

import { useState } from "react";
import AdminLists from "@/components/admin/AdminLists";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Fn = (formData: FormData) => Promise<void>;

type SummaryStat = {
  label: string;
  value: number;
  caption?: string;
};

type AdminStatus = {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
};

type AdminDashboardProps = {
  stats: SummaryStat[];
  topics: any[];
  posts: any[];
  news: any[];
  forumComments: any[];
  newsComments: any[];
  topicTitleById: Record<number, string>;
  updateTopic: Fn;
  deleteTopic: Fn;
  updatePost: Fn;
  deletePost: Fn;
  updateArticle: Fn;
  deleteArticle: Fn;
  updateForumComment: Fn;
  deleteForumComment: Fn;
  updateNewsComment: Fn;
  deleteNewsComment: Fn;
};

export default function AdminDashboard(props: AdminDashboardProps) {
  const {
    stats,
    topics,
    posts,
    news,
    forumComments,
    newsComments,
    topicTitleById,
    updateTopic,
    deleteTopic,
    updatePost,
    deletePost,
    updateArticle,
    deleteArticle,
    updateForumComment,
    deleteForumComment,
    updateNewsComment,
    deleteNewsComment,
  } = props;

  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    rolesVirtual: false,
    usersFallback: false,
    usersSource: "unknown",
  });

  const statusItems: string[] = [];
  if (adminStatus.rolesVirtual) {
    statusItems.push(
      "Roles systeme Directus indisponibles: modification des roles desactivee.",
    );
  }
  if (adminStatus.usersFallback && adminStatus.usersSource === "legacy") {
    statusItems.push(
      "Recherche utilisateurs en source legacy (mode auto). Verifie les permissions Directus.",
    );
  }

  // Roles modal removed: focus on inline actions per user

  return (
    <div className="space-y-8">
      <AdminStatusBanner items={statusItems} />
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{"Vue d\u2019ensemble"}</h2>
          <p className="text-sm opacity-70">
            Un apercu instantane des volumes cles a surveiller au quotidien.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <SummaryCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Gestion des contenus</h2>
          <p className="text-sm opacity-70">
            Rechercher, modifier et moderer les sujets, articles et commentaires depuis une vue unifiee.
          </p>
        </div>
        <DashboardModule>
          <AdminLists
            topics={topics}
            posts={posts}
            news={news}
            forumComments={forumComments}
            newsComments={newsComments}
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
          />
        </DashboardModule>
      </section>

      <section className="space-y-8">
        <DashboardWithHeader
          title="Utilisateurs & affectations"
          description="Rechercher, voir et ajuster rapidement les roles/statuts par utilisateur."
        >
          <AdminUsersPanel onStatusChange={setAdminStatus} />
        </DashboardWithHeader>
      </section>
    </div>
  );
}

function AdminStatusBanner({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
        Fallback detecte
      </div>
      <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard(stat: SummaryStat) {
  return (
    <Card className="border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/45 shadow-[0_10px_28px_-24px_rgba(0,0,0,0.55)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium opacity-75">{stat.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <span className="text-3xl font-semibold">{stat.value}</span>
        {stat.caption ? <span className="text-xs opacity-60">{stat.caption}</span> : null}
      </CardContent>
    </Card>
  );
}

function DashboardModule({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/45 shadow-[0_10px_28px_-24px_rgba(0,0,0,0.55)]">
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function DashboardWithHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/45 shadow-[0_10px_28px_-24px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <CardHeader className="space-y-1 border-b border-[color:var(--bg-700)]/70">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <p className="text-sm opacity-70">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="p-4 sm:p-6">{children}</div>
      </CardContent>
    </Card>
  );
}
