"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DayCount {
    date: string;
    count: number;
}

interface ActivityStats {
    daily: {
        topics: DayCount[];
        articles: DayCount[];
        comments: DayCount[];
    };
    totals: {
        topics: number;
        articles: number;
        forumComments: number;
        newsComments: number;
        users: number;
    };
    distribution: {
        name: string;
        value: number;
    }[];
}

export default function AdminActivityCharts() {
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState("30");

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/stats/activity?days=${days}`, { cache: "no-store" });
                const json = await res.json();
                if (res.ok && json.data) {
                    setStats(json.data);
                }
            } catch (error) {
                console.error("Failed to fetch activity stats:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [days]);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30 animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-[color:var(--bg-700)]/50 rounded w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-32 bg-[color:var(--bg-700)]/30 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    // Calculate max value for bar chart scaling
    const maxDaily = Math.max(
        ...stats.daily.topics.map((d) => d.count),
        ...stats.daily.articles.map((d) => d.count),
        ...stats.daily.comments.map((d) => d.count),
        1
    );

    const totalContent = stats.distribution.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Période :</span>
                <Select value={days} onValueChange={setDays}>
                    <SelectTrigger className="w-32 bg-[color:var(--bg-800)]/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)] text-[color:var(--foreground)]">
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="14">14 jours</SelectItem>
                        <SelectItem value="30">30 jours</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Charts grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Bar chart: Daily activity */}
                <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">📊 Activité quotidienne</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Show only last 14 days to prevent overflow */}
                        <div className="flex items-end justify-between gap-0.5 h-32 overflow-hidden">
                            {stats.daily.articles.slice(-14).map((day, i, arr) => {
                                const topicsData = stats.daily.topics.slice(-14);
                                const commentsData = stats.daily.comments.slice(-14);
                                const articlesH = (day.count / maxDaily) * 100;
                                const topicsH = (topicsData[i]?.count / maxDaily) * 100;
                                const commentsH = (commentsData[i]?.count / maxDaily) * 100;
                                const dayLabel = new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3);

                                return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="flex items-end gap-0.5 h-24">
                                            <div
                                                className="w-1.5 bg-purple-500 rounded-t transition-all"
                                                style={{ height: `${Math.max(articlesH, 4)}%` }}
                                                title={`Articles: ${day.count}`}
                                            />
                                            <div
                                                className="w-1.5 bg-blue-500 rounded-t transition-all"
                                                style={{ height: `${Math.max(topicsH, 4)}%` }}
                                                title={`Sujets: ${topicsData[i]?.count || 0}`}
                                            />
                                            <div
                                                className="w-1.5 bg-green-500 rounded-t transition-all"
                                                style={{ height: `${Math.max(commentsH, 4)}%` }}
                                                title={`Commentaires: ${commentsData[i]?.count || 0}`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500" /> Articles
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> Sujets
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Commentaires
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Pie chart: Distribution */}
                <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">🥧 Répartition contenus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center">
                            {/* Simple pie representation using stacked bars */}
                            <div className="w-full h-6 flex rounded-full overflow-hidden mb-4">
                                {stats.distribution.map((item, i) => {
                                    const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500"];
                                    const pct = totalContent > 0 ? (item.value / totalContent) * 100 : 0;
                                    return (
                                        <div
                                            key={item.name}
                                            className={`${colors[i]} transition-all`}
                                            style={{ width: `${pct}%` }}
                                            title={`${item.name}: ${item.value} (${pct.toFixed(1)}%)`}
                                        />
                                    );
                                })}
                            </div>
                            {/* Legend */}
                            <div className="space-y-2 w-full">
                                {stats.distribution.map((item, i) => {
                                    const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500"];
                                    const pct = totalContent > 0 ? (item.value / totalContent) * 100 : 0;
                                    return (
                                        <div key={item.name} className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${colors[i]}`} />
                                                {item.name}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {item.value.toLocaleString()} ({pct.toFixed(0)}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Totals row */}
            <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
                {[
                    { label: "Articles", value: stats.totals.articles, icon: "📰" },
                    { label: "Sujets", value: stats.totals.topics, icon: "💬" },
                    { label: "Comm. Forum", value: stats.totals.forumComments, icon: "🗨️" },
                    { label: "Comm. News", value: stats.totals.newsComments, icon: "📝" },
                    { label: "Utilisateurs", value: stats.totals.users, icon: "👥" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--bg-800)]/40 border border-[color:var(--bg-700)]/30"
                    >
                        <span>{stat.icon}</span>
                        <div className="text-sm">
                            <span className="font-semibold">{stat.value.toLocaleString()}</span>
                            <span className="text-muted-foreground ml-1">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
