"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  FileText,
  LayoutGrid,
  Palette,
  Shield,
  Users,
} from "lucide-react";
import AdminContentManager from "@/components/admin/AdminContentManager";
import AdminRolesPanel from "@/components/admin/AdminRolesPanel";
import AdminThemePanel from "@/components/admin/AdminThemePanel";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminPubPanel from "@/components/admin/AdminPubPanel";
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";

type ServerActionFn = (formData: FormData) => Promise<void>;
type MainView = "overview" | "users" | "content" | "settings";

interface SummaryStat {
  label: string;
  value: number;
}

interface AdminStatus {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
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

type NavItem = {
  id: MainView;
  label: string;
  icon: ReactNode;
};

export default function AdminDashboard(props: AdminDashboardProps) {
  const [view, setView] = useState<MainView>("overview");
  const [, setAdminStatus] = useState<AdminStatus>({
    rolesVirtual: false,
    usersFallback: false,
    usersSource: "unknown",
  });

  const legacyUsers = getStatValue(props.stats, "Utilisateurs (legacy)");
  const directusUsers = getStatValue(props.stats, "Utilisateurs (Directus)");
  const articleCount = props.news.length;
  const topicCount = props.topics.length;
  const storyCount = props.stories.length;
  const commentCount = props.forumComments.length + props.newsComments.length;
  const totalUsers = legacyUsers + directusUsers;

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "overview", label: "Accueil", icon: <LayoutGrid className="h-4 w-4" /> },
      { id: "users", label: "Utilisateurs", icon: <Users className="h-4 w-4" /> },
      { id: "content", label: "Contenus", icon: <FileText className="h-4 w-4" /> },
      { id: "settings", label: "Parametres", icon: <Shield className="h-4 w-4" /> },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      {/* Navigation tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-1.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`inline-flex items-center gap-2 rounded-[4px] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
              view === item.id
                ? "bg-[#2596FF] text-white"
                : "text-[color:var(--foreground)]/65 hover:bg-[#25254D] hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        <div className="ml-auto hidden items-center gap-2 px-3 text-xs text-[color:var(--foreground)]/55 sm:flex">
          <span>{props.currentAdminName || "Admin"}</span>
        </div>
      </nav>

      {/* Views */}
      {view === "overview" && (
        <div className="space-y-5">
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

          {/* Quick access */}
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickCard
              title="Utilisateurs"
              description="Recherche, moderation et roles"
              icon={<Users className="h-5 w-5" />}
              onClick={() => setView("users")}
            />
            <QuickCard
              title="Contenus"
              description="Articles, forum et stories"
              icon={<FileText className="h-5 w-5" />}
              onClick={() => setView("content")}
            />
            <QuickCard
              title="Parametres"
              description="Theme et gestion des roles"
              icon={<Palette className="h-5 w-5" />}
              onClick={() => setView("settings")}
            />
          </div>
        </div>
      )}

      {view === "users" && <AdminUsersPanel onStatusChange={setAdminStatus} />}

      {view === "content" && (
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
      )}

      {view === "settings" && <SettingsView />}
    </div>
  );
}

function SettingsView() {
  const [tab, setTab] = useState<"theme" | "roles" | "pub">("theme");

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "theme", label: "Theme" },
    { id: "roles", label: "Roles" },
    { id: "pub", label: "Publicite" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-[4px] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
              tab === t.id
                ? "bg-[#2596FF] text-white"
                : "text-[color:var(--foreground)]/65 hover:bg-[#25254D] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-5">
        {tab === "theme" && <AdminThemePanel />}
        {tab === "roles" && <AdminRolesPanel />}
        {tab === "pub" && <AdminPubPanel />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-4 py-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--foreground)]/55">
        <span>{label}</span>
        <span className="text-[color:var(--foreground)]/40">{icon}</span>
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
      className="group rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-5 text-left transition-colors hover:border-[#2596FF]/40 hover:bg-[#25254D]"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-[4px] bg-[#25254D] p-2.5 text-[#2596FF]">{icon}</span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-white">{title}</h3>
          <p className="mt-1 text-xs text-[color:var(--foreground)]/55">{description}</p>
        </div>
      </div>
    </button>
  );
}

function getStatValue(stats: SummaryStat[], label: string) {
  return stats.find((item) => item.label === label)?.value || 0;
}
