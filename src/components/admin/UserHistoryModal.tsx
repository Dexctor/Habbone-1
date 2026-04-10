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
    trigger?: React.ReactNode;
}

export default function UserHistoryModal({ userId, userName, trigger }: UserHistoryModalProps) {
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
            "user.unban": { text: "Reactive", color: "bg-green-500/20 text-green-400" },
            "user.role_change": { text: "Role modifie", color: "bg-[#2596FF]/20 text-[#2596FF]" },
        };
        return labels[action] || { text: action, color: "bg-[#25254D] text-[color:var(--foreground)]/60" };
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="sm"
                        title="Voir l'historique"
                        className="h-[36px] w-[36px] rounded-[4px] text-[color:var(--foreground)]/60 hover:bg-[#25254D] hover:text-white"
                    >
                        <History className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl rounded-[4px] border border-[#141433] bg-[#1F1F3E] text-[color:var(--foreground)]">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        Historique de {userName || userId}
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="py-8 text-center text-sm text-[color:var(--foreground)]/50">
                        Chargement...
                    </div>
                )}

                {!loading && data && (
                    <div className="space-y-4">
                        {stats && (
                            <div className="flex flex-wrap gap-2">
                                <Badge className="border-0 bg-[#25254D] text-[color:var(--foreground)]/70">{stats.topics} sujets</Badge>
                                <Badge className="border-0 bg-[#25254D] text-[color:var(--foreground)]/70">{stats.articles} articles</Badge>
                                <Badge className="border-0 bg-[#25254D] text-[color:var(--foreground)]/70">{stats.forumComments + stats.newsComments} commentaires</Badge>
                                {stats.sanctions > 0 && (
                                    <Badge className="border-0 bg-red-500/20 text-red-400">{stats.sanctions} sanction(s)</Badge>
                                )}
                            </div>
                        )}

                        <Tabs defaultValue="topics" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 rounded-[4px] bg-[#25254D]">
                                <TabsTrigger value="topics" className="rounded-[4px] text-xs data-[state=active]:bg-[#2596FF] data-[state=active]:text-white">Sujets</TabsTrigger>
                                <TabsTrigger value="articles" className="rounded-[4px] text-xs data-[state=active]:bg-[#2596FF] data-[state=active]:text-white">Articles</TabsTrigger>
                                <TabsTrigger value="comments" className="rounded-[4px] text-xs data-[state=active]:bg-[#2596FF] data-[state=active]:text-white">Commentaires</TabsTrigger>
                                <TabsTrigger value="sanctions" className="rounded-[4px] text-xs data-[state=active]:bg-[#2596FF] data-[state=active]:text-white">Sanctions</TabsTrigger>
                            </TabsList>

                            <TabsContent value="topics" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.topics.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-[color:var(--foreground)]/50">Aucun sujet</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {data.topics.map((topic) => (
                                                <li key={topic.id} className="flex items-center justify-between rounded-[4px] bg-[#25254D] p-2.5">
                                                    <span className="text-sm font-semibold text-white">{topic.titulo}</span>
                                                    <span className="text-[11px] text-[color:var(--foreground)]/45">{formatDateTime(topic.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="articles" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.articles.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-[color:var(--foreground)]/50">Aucun article</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {data.articles.map((article) => (
                                                <li key={article.id} className="flex items-center justify-between rounded-[4px] bg-[#25254D] p-2.5">
                                                    <span className="text-sm font-semibold text-white">{article.titulo}</span>
                                                    <span className="text-[11px] text-[color:var(--foreground)]/45">{formatDateTime(article.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="comments" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.forumComments.length === 0 && data.newsComments.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-[color:var(--foreground)]/50">Aucun commentaire</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {data.forumComments.map((c) => (
                                                <li key={`forum-${c.id}`} className="flex items-center justify-between rounded-[4px] bg-[#25254D] p-2.5">
                                                    <span className="text-sm text-white">Commentaire sur sujet #{c.id_forum}</span>
                                                    <span className="text-[11px] text-[color:var(--foreground)]/45">{formatDateTime(c.data)}</span>
                                                </li>
                                            ))}
                                            {data.newsComments.map((c) => (
                                                <li key={`news-${c.id}`} className="flex items-center justify-between rounded-[4px] bg-[#25254D] p-2.5">
                                                    <span className="text-sm text-white">Commentaire sur article #{c.id_noticia}</span>
                                                    <span className="text-[11px] text-[color:var(--foreground)]/45">{formatDateTime(c.data)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="sanctions" className="mt-4">
                                <ScrollArea className="max-h-[300px]">
                                    {data.adminLogs.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-[color:var(--foreground)]/50">Aucune sanction</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {data.adminLogs.map((log) => {
                                                const label = getActionLabel(log.action);
                                                return (
                                                    <li key={log.id} className="flex items-center justify-between rounded-[4px] bg-[#25254D] p-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={`${label.color} border-0`}>
                                                                {label.text}
                                                            </Badge>
                                                            <span className="text-xs text-[color:var(--foreground)]/50">par {log.admin_name}</span>
                                                        </div>
                                                        <span className="text-[11px] text-[color:var(--foreground)]/45">{formatDateTime(log.created_at)}</span>
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
