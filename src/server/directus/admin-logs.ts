/**
 * Admin Logs Service
 * Track admin actions for audit trail
 */

import { directusService as directus } from "@/server/directus/client";
import { createItem, readItems, aggregate } from "@directus/sdk";

export type AdminAction =
    | "user.ban"
    | "user.unban"
    | "user.delete"
    | "user.role_change"
    | "content.delete"
    | "content.update";

export interface AdminLogEntry {
    id?: number;
    action: AdminAction;
    admin_id: string;
    admin_name?: string;
    target_type?: "user" | "topic" | "post" | "article" | "comment";
    target_id?: string | number;
    details?: Record<string, unknown>;
    created_at?: string;
}

interface AdminLogRow {
    id: number;
    action: string;
    admin_id: string;
    admin_name: string | null;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, unknown> | null;
    date_created: string | null;
}

/**
 * Log an admin action
 */
export async function logAdminAction(entry: Omit<AdminLogEntry, "id" | "created_at">): Promise<void> {
    try {
        await directus.request(
            createItem("admin_logs" as any, {
                action: entry.action,
                admin_id: entry.admin_id,
                admin_name: entry.admin_name || null,
                target_type: entry.target_type || null,
                target_id: entry.target_id ? String(entry.target_id) : null,
                details: entry.details || null,
            } as any)
        );
    } catch (error) {
        // Log to console but don't throw - logging should never break the main action
        console.error("[AdminLogs] Failed to log action:", error);
    }
}

/**
 * Get admin logs with pagination and filters
 */
export async function getAdminLogs(options: {
    page?: number;
    limit?: number;
    action?: AdminAction;
    adminId?: string;
    targetType?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ data: AdminLogEntry[]; total: number }> {
    const { page = 1, limit = 50, action, adminId, targetType, fromDate, toDate } = options;

    const filter: Record<string, unknown> = {};

    if (action) filter.action = { _eq: action };
    if (adminId) filter.admin_id = { _eq: adminId };
    if (targetType) filter.target_type = { _eq: targetType };
    if (fromDate || toDate) {
        filter.date_created = {};
        if (fromDate) (filter.date_created as Record<string, string>)._gte = fromDate;
        if (toDate) (filter.date_created as Record<string, string>)._lte = toDate;
    }

    try {
        const hasFilter = Object.keys(filter).length > 0;

        const [rows, countResult] = await Promise.all([
            directus.request(
                readItems("admin_logs" as any, {
                    ...(hasFilter ? { filter } : {}),
                    sort: ["-date_created"],
                    limit,
                    offset: (page - 1) * limit,
                    fields: ["id", "action", "admin_id", "admin_name", "target_type", "target_id", "details", "date_created"],
                } as any)
            ) as unknown as Promise<AdminLogRow[]>,
            directus.request(
                aggregate("admin_logs" as any, {
                    aggregate: { count: "*" },
                    ...(hasFilter ? { query: { filter } } : {}),
                } as any)
            ),
        ]);

        const total = Number((countResult as Record<string, unknown>[])?.[0]?.count ?? 0);

        return {
            data: (rows || []).map((row) => ({
                id: row.id,
                action: row.action as AdminAction,
                admin_id: row.admin_id,
                admin_name: row.admin_name || undefined,
                target_type: row.target_type as AdminLogEntry["target_type"],
                target_id: row.target_id || undefined,
                details: row.details || undefined,
                created_at: row.date_created || undefined,
            })),
            total,
        };
    } catch (error) {
        console.error("[AdminLogs] Failed to fetch logs:", error);
        return { data: [], total: 0 };
    }
}

/**
 * Get log statistics for dashboard
 */
export async function getLogStats(days: number = 7): Promise<{
    byAction: Record<string, number>;
    byDay: { date: string; count: number }[];
}> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString();

    try {
        const rows = await directus.request(
            readItems("admin_logs" as any, {
                filter: { date_created: { _gte: fromDateStr } },
                fields: ["action", "date_created"],
                limit: 10000,
            } as any)
        ) as unknown as { action: string; date_created: string }[];

        // Count by action
        const byAction: Record<string, number> = {};
        const byDayMap: Record<string, number> = {};

        for (const row of rows || []) {
            byAction[row.action] = (byAction[row.action] || 0) + 1;

            const day = row.date_created?.split("T")[0] || "unknown";
            byDayMap[day] = (byDayMap[day] || 0) + 1;
        }

        // Convert byDay to sorted array
        const byDay = Object.entries(byDayMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return { byAction, byDay };
    } catch (error) {
        console.error("[AdminLogs] Failed to get stats:", error);
        return { byAction: {}, byDay: [] };
    }
}
