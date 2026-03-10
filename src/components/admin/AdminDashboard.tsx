"use client";

import { type ReactNode, useState } from "react";
import AdminActivityCharts from "@/components/admin/AdminActivityCharts";
import AdminContentManager from "@/components/admin/AdminContentManager";
import AdminLogsPanel from "@/components/admin/AdminLogsPanel";
import AdminRolesPanel from "@/components/admin/AdminRolesPanel";
import AdminThemePanel from "@/components/admin/AdminThemePanel";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";

type ServerActionFn = (formData: FormData) => Promise<void>;
type SettingsTab = "theme" | "roles" | "logs";

interface SummaryStat {
  label: string;
  value: number;
  icon?: ReactNode;
  trend?: string;
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

export default function AdminDashboard(props: AdminDashboardProps) {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    rolesVirtual: false,
    usersFallback: false,
    usersSource: "unknown",
  });
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("theme");

  const totalComments = props.forumComments.length + props.newsComments.length;
  const totalUsers = props.stats
    .filter((item) => item.label === "Utilisateurs (legacy)" || item.label === "Utilisateurs (Directus)")
    .reduce((sum, item) => sum + item.value, 0);

  const statusItems: string[] = [];
  if (adminStatus.usersFallback && adminStatus.usersSource === "legacy") {
    statusItems.push("Recherche utilisateurs en mode legacy.");
  }
  if (adminStatus.rolesVirtual) {
    statusItems.push("Roles fournis par le fallback virtuel.");
  }

  return (
    <div className="space-y-5 text-[color:var(--text-100)]">
      <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,70,0.94),rgba(20,20,51,0.98))] px-5 py-5 shadow-[0_28px_80px_-68px_rgba(0,0,0,0.86)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Administration</h1>
            <p className="mt-1 text-sm text-white/55">
              Interface simplifiee. Les memes actions restent disponibles, avec moins de blocs et une lecture plus claire.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/62">
            <Badge className="border-0 bg-white/8 text-white/72">{totalUsers} utilisateurs</Badge>
            <Badge className="border-0 bg-white/8 text-white/72">{props.topics.length + props.posts.length + props.news.length + totalComments + props.stories.length} contenus</Badge>
            <span>Connecte: {props.currentAdminName || "Administrateur"}</span>
          </div>
        </div>
      </section>

      {statusItems.length > 0 ? (
        <section className="rounded-[18px] border border-[#ffd772]/18 bg-[#ffd772]/8 px-4 py-3 text-sm text-[#ffe39e]">
          {statusItems.join(" ")}
        </section>
      ) : null}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[18px] border border-white/10 bg-[rgba(20,20,51,0.92)] p-2">
          <TabsTrigger value="users" className="rounded-[14px] px-4 py-2 data-[state=active]:bg-[#2596ff] data-[state=active]:text-white">
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-[14px] px-4 py-2 data-[state=active]:bg-[#2596ff] data-[state=active]:text-white">
            Contenus
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-[14px] px-4 py-2 data-[state=active]:bg-[#2596ff] data-[state=active]:text-white">
            Activite
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-[14px] px-4 py-2 data-[state=active]:bg-[#2596ff] data-[state=active]:text-white">
            Parametres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,70,0.94),rgba(20,20,51,0.98))] p-4 sm:p-5">
            <AdminUsersPanel onStatusChange={setAdminStatus} />
          </section>
        </TabsContent>

        <TabsContent value="content" className="mt-0">
          <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,70,0.94),rgba(20,20,51,0.98))] p-4 sm:p-5">
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
          </section>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,70,0.94),rgba(20,20,51,0.98))] p-4 sm:p-5">
            <AdminActivityCharts />
          </section>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <section className="space-y-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,70,0.94),rgba(20,20,51,0.98))] p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSettingsTab("theme")}
                className={`rounded-[14px] px-4 py-2 text-sm transition ${settingsTab === "theme" ? "bg-[#2596ff] text-white" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                Theme
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("roles")}
                className={`rounded-[14px] px-4 py-2 text-sm transition ${settingsTab === "roles" ? "bg-[#2596ff] text-white" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                Roles
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("logs")}
                className={`rounded-[14px] px-4 py-2 text-sm transition ${settingsTab === "logs" ? "bg-[#2596ff] text-white" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                Logs
              </button>
            </div>

            {settingsTab === "theme" ? <AdminThemePanel /> : null}
            {settingsTab === "roles" ? <AdminRolesPanel /> : null}
            {settingsTab === "logs" ? <AdminLogsPanel /> : null}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
