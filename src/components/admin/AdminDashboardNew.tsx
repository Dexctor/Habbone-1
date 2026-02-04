"use client";

import { useState } from "react";
import AdminContentManagerV2 from "@/components/admin/AdminContentManagerV2";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminLogsPanel from "@/components/admin/AdminLogsPanel";
import AdminActivityCharts from "@/components/admin/AdminActivityCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SummaryStat, AdminStatus, ServerActionFn, AdminTopic, AdminPost, AdminArticle, AdminForumComment, AdminNewsComment } from "@/types/admin";

interface AdminDashboardProps {
    stats: SummaryStat[];
    topics: AdminTopic[];
    posts: AdminPost[];
    news: AdminArticle[];
    forumComments: AdminForumComment[];
    newsComments: AdminNewsComment[];
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
}

export default function AdminDashboardNew(props: AdminDashboardProps) {
    const { stats } = props;

    const [adminStatus, setAdminStatus] = useState<AdminStatus>({
        rolesVirtual: false,
        usersFallback: false,
        usersSource: "unknown",
    });

    // Build status items for banner
    const statusItems: string[] = [];
    // Note: rolesVirtual is OK - we use DEFAULT_ROLES which work perfectly with MySQL usuarios table
    if (adminStatus.usersFallback && adminStatus.usersSource === "legacy") {
        statusItems.push("Recherche utilisateurs en mode legacy.");
    }

    return (
        <div className="space-y-6">
            {/* Status banner */}
            {statusItems.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1">
                        ⚠️ Mode dégradé
                    </div>
                    <ul className="text-sm text-amber-200/80 space-y-0.5">
                        {statusItems.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Main admin tabs */}
            <Tabs defaultValue="activity" className="space-y-4">
                <TabsList className="bg-[color:var(--bg-800)]/60 p-1.5 h-auto gap-1">
                    <TabsTrigger
                        value="activity"
                        className="px-6 py-3 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
                    >
                        📊 Activité
                    </TabsTrigger>
                    <TabsTrigger
                        value="content"
                        className="px-6 py-3 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
                    >
                        📝 Contenus
                    </TabsTrigger>
                    <TabsTrigger
                        value="users"
                        className="px-6 py-3 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
                    >
                        👥 Utilisateurs
                    </TabsTrigger>
                    {/* TODO: Réactiver quand les permissions Directus admin_logs seront configurées
                    <TabsTrigger
                        value="logs"
                        className="px-6 py-3 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md transition-all"
                    >
                        📜 Logs
                    </TabsTrigger>
                    */}
                </TabsList>

                {/* Activity Dashboard Tab */}
                <TabsContent value="activity">
                    <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Tableau de bord</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Vue d'ensemble de l'activité du site sur les derniers jours.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AdminActivityCharts />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Content Management Tab */}
                <TabsContent value="content">
                    <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Gestion des contenus</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Recherchez, modifiez et modérez les sujets, articles et commentaires.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AdminContentManagerV2
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
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Utilisateurs & rôles</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Gérez les utilisateurs et leurs permissions.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AdminUsersPanel onStatusChange={setAdminStatus} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TODO: Réactiver quand les permissions Directus admin_logs seront configurées
                <TabsContent value="logs">
                    <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Journal des actions</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Historique des actions effectuées par les administrateurs.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AdminLogsPanel />
                        </CardContent>
                    </Card>
                </TabsContent>
                */}
            </Tabs>
        </div>
    );
}

