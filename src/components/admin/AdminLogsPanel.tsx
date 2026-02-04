"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date-utils";

interface AdminLogEntry {
    id: number;
    action: string;
    admin_id: string;
    admin_name?: string;
    target_type?: string;
    target_id?: string;
    details?: Record<string, unknown>;
    created_at?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    "user.ban": { label: "Ban", color: "bg-red-500/20 text-red-400" },
    "user.unban": { label: "Unban", color: "bg-green-500/20 text-green-400" },
    "user.delete": { label: "Suppression user", color: "bg-red-600/20 text-red-300" },
    "user.role_change": { label: "Changement rôle", color: "bg-blue-500/20 text-blue-400" },
    "content.delete": { label: "Suppression contenu", color: "bg-orange-500/20 text-orange-400" },
    "content.update": { label: "Modification", color: "bg-purple-500/20 text-purple-400" },
};

const PAGE_SIZE = 20;

export default function AdminLogsPanel() {
    const [logs, setLogs] = useState<AdminLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const fetchLogs = useCallback(async (targetPage: number, action: string, from?: string, to?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
                limit: String(PAGE_SIZE),
            });
            if (action && action !== "all") {
                params.set("action", action);
            }
            if (from) params.set("fromDate", from);
            if (to) params.set("toDate", to);

            const res = await fetch(`/api/admin/logs?${params}`, { cache: "no-store" });
            const json = await res.json();

            if (res.ok) {
                // Check if data is empty AND total is 0, could be permission issue
                setLogs(json.data || []);
                setTotal(json.total || 0);
                setPage(targetPage);
                setUnavailable(false);
            } else {
                // Permission denied or other error
                setUnavailable(true);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
            setUnavailable(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(1, actionFilter, fromDate, toDate);
    }, [actionFilter, fromDate, toDate, fetchLogs]);

    // Show unavailable message
    if (unavailable) {
        return (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                <div className="text-amber-400 font-medium mb-2">📜 Logs indisponibles</div>
                <p className="text-sm text-amber-200/70">
                    La table <code className="px-1 bg-amber-500/20 rounded">admin_logs</code> n'est pas accessible.
                    Vérifiez les permissions Directus pour le token de service.
                </p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const getActionBadge = (action: string) => {
        const config = ACTION_LABELS[action] || { label: action, color: "bg-gray-500/20 text-gray-400" };
        return (
            <Badge variant="outline" className={`${config.color} border-0`}>
                {config.label}
            </Badge>
        );
    };

    const formatDetails = (entry: AdminLogEntry): string => {
        if (!entry.details) return "";

        const parts: string[] = [];
        if (entry.details.reason) parts.push(`Raison: ${entry.details.reason}`);
        if (entry.details.oldRole) parts.push(`${entry.details.oldRole} → ${entry.details.newRole}`);
        if (entry.details.fields) parts.push(`Champs: ${(entry.details.fields as string[]).join(", ")}`);

        return parts.join(" | ");
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-48 bg-[color:var(--bg-800)]/50">
                        <SelectValue placeholder="Filtrer par action" />
                    </SelectTrigger>
                    <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)] text-[color:var(--foreground)]">
                        <SelectItem value="all">Toutes les actions</SelectItem>
                        <SelectItem value="user.ban">Ban</SelectItem>
                        <SelectItem value="user.unban">Unban</SelectItem>
                        <SelectItem value="user.delete">Suppression user</SelectItem>
                        <SelectItem value="user.role_change">Changement rôle</SelectItem>
                        <SelectItem value="content.delete">Suppression contenu</SelectItem>
                        <SelectItem value="content.update">Modification</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Du:</span>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-9 px-2 rounded-md border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-800)]/50 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">Au:</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-9 px-2 rounded-md border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-800)]/50 text-sm"
                    />
                    {(fromDate || toDate) && (
                        <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
                            ✕
                        </Button>
                    )}
                </div>

                <span className="text-sm text-muted-foreground ml-auto">
                    {loading ? "Chargement..." : `${total} entrée${total !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Logs table */}
            <ScrollArea className="max-h-[400px] rounded-lg border border-[color:var(--bg-700)]/50">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[color:var(--bg-800)]">
                        <tr className="border-b border-[color:var(--bg-700)]/50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Action</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Admin</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Cible</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Détails</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                    Aucun log trouvé
                                </td>
                            </tr>
                        )}
                        {logs.map((log) => (
                            <tr key={log.id} className="border-b border-[color:var(--bg-700)]/30 hover:bg-[color:var(--bg-700)]/20">
                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                    {formatDateTime(log.created_at)}
                                </td>
                                <td className="px-3 py-2">{getActionBadge(log.action)}</td>
                                <td className="px-3 py-2">{log.admin_name || log.admin_id}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                    {log.target_type && (
                                        <span className="capitalize">{log.target_type} #{log.target_id}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                                    {formatDetails(log)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                        Page {page} sur {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(page - 1, actionFilter, fromDate, toDate)}
                            disabled={page <= 1 || loading}
                        >
                            ← Précédent
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(page + 1, actionFilter, fromDate, toDate)}
                            disabled={page >= totalPages || loading}
                        >
                            Suivant →
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
