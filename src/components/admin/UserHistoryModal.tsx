"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date-utils";
import { History } from "lucide-react";

interface UserHistoryData {
    topics: { id: number; titulo: string; data: string }[];
    articles: { id: number; titulo: string; data: string }[];
    forumComments: { id: number; id_forum: number; data: string }[];
    newsComments: { id: number; id_noticia: number; data: string }[];
    adminLogs: { id: number; action: string; created_at: string; admin_name: string }[];
}

interface UserHistoryStats {
    topics: number;
    articles: number;
    forumComments: number;
    newsComments: number;
    sanctions: number;
}

interface UserHistoryModalProps {
    userId: string;
    userName?: string;
}

export default function UserHistoryModal({ userId, userName }: UserHistoryModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<UserHistoryData | null>(null);
    const [stats, setStats] = useState<UserHistoryStats | null>(null);

    useEffect(() => {
        if (!open) return;

        async function fetchHistory() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/users/${userId}/history`, { cache: "no-store" });
                const json = await res.json();
                if (res.ok) {
                    setData(json.data);
                    setStats(json.stats);
                }
            } catch (error) {
                console.error("Failed to fetch user history:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [open, userId]);

    const getActionLabel = (action: string) => {
        const labels: Record<string, { text: string; color: string }> = {
            "user.ban": { text: "Banni", color: "bg-red-500/20 text-red-400" },
            "user.unban": { text: "Réactivé", color: "bg-green-500/20 text-green-400" },
            "user.role_change": { text: "Rôle modifié", color: "bg-blue-500/20 text-blue-400" },
        };
        return labels[action] || { text: action, color: "bg-gray-500/20 text-gray-400" };
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Voir l'historique">
                    <History className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        📜 Historique de {userName || userId}
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="py-8 text-center text-muted-foreground">
                        Chargement...
                    </div>
                )}

                {!loading && data && (
                    <div className="space-y-4">
                        {/* Stats badges */}
                        {stats && (
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{stats.topics} sujets</Badge>
                                <Badge variant="outline">{stats.articles} articles</Badge>
                                <Badge variant="outline">{stats.forumComments + stats.newsComments} commentaires</Badge>
                                {stats.sanctions > 0 && (
                                    <Badge variant="destructive">{stats.sanctions} sanction(s)</Badge>
                                )}
                            </div>
                        )}

                        {/* Content tabs */}
                        <Tabs defaultValue="topics" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-[color:var(--bg-800)]/50">
                                <TabsTrigger value="topics">Sujets</TabsTrigger>
                                <TabsTrigger value="articles">Articles</TabsTrigger>
                                <TabsTrigger value="comments">Commentaires</TabsTrigger>
                                <TabsTrigger value="sanctions">Sanctions</TabsTrigger>
                            </TabsList>

                            <TabsContent value="topics" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.topics.length === 0 ? (
                                        <p className="text-center py-4 text-muted-foreground">Aucun sujet</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {data.topics.map((topic) => (
                                                <li key={topic.id} className="flex items-center justify-between p-2 rounded bg-[color:var(--bg-800)]/30">
                                                    <span className="font-medium">{topic.titulo}</span>
                                                    <span className="text-xs text-muted-foreground">{formatDateTime(topic.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="articles" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.articles.length === 0 ? (
                                        <p className="text-center py-4 text-muted-foreground">Aucun article</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {data.articles.map((article) => (
                                                <li key={article.id} className="flex items-center justify-between p-2 rounded bg-[color:var(--bg-800)]/30">
                                                    <span className="font-medium">{article.titulo}</span>
                                                    <span className="text-xs text-muted-foreground">{formatDateTime(article.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="comments" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.forumComments.length === 0 && data.newsComments.length === 0 ? (
                                        <p className="text-center py-4 text-muted-foreground">Aucun commentaire</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {data.forumComments.map((c) => (
                                                <li key={`forum-${c.id}`} className="flex items-center justify-between p-2 rounded bg-[color:var(--bg-800)]/30">
                                                    <span className="text-sm">Commentaire sur sujet #{c.id_forum}</span>
                                                    <span className="text-xs text-muted-foreground">{formatDateTime(c.data)}</span>
                                                </li>
                                            ))}
                                            {data.newsComments.map((c) => (
                                                <li key={`news-${c.id}`} className="flex items-center justify-between p-2 rounded bg-[color:var(--bg-800)]/30">
                                                    <span className="text-sm">Commentaire sur article #{c.id_noticia}</span>
                                                    <span className="text-xs text-muted-foreground">{formatDateTime(c.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="sanctions" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.adminLogs.length === 0 ? (
                                        <p className="text-center py-4 text-muted-foreground">Aucune sanction</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {data.adminLogs.map((log) => {
                                                const label = getActionLabel(log.action);
                                                return (
                                                    <li key={log.id} className="flex items-center justify-between p-2 rounded bg-[color:var(--bg-800)]/30">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={`${label.color} border-0`}>
                                                                {label.text}
                                                            </Badge>
                                                            <span className="text-sm text-muted-foreground">par {log.admin_name}</span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
