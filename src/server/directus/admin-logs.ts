/**
 * Admin Logs Service (PocketBase)
 * Track admin actions for audit trail.
 *
 * Maps onto the v2 `admin_logs` collection (schema-v2 §3.16 / Lot 1d):
 *   actor   (relation -> users)   <- admin_id
 *   action  (select enum)         <- action (mapped to the enum values)
 *   target  (text)                <- "<target_type>:<target_id>"
 *   detail  (editor/json text)    <- { admin_name, target_type, target_id, details }
 *   created (system autodate)     <- timestamp
 */

import { pbList, pbCreate, pbCount } from './pb-helpers';
import { TABLES } from './tables';

const ADMIN_LOGS = TABLES.adminLogs;

export type AdminAction =
  | 'user.ban'
  | 'user.unban'
  | 'user.delete'
  | 'user.role_change'
  | 'user.coins_grant'
  | 'content.delete'
  | 'content.update';

export interface AdminLogEntry {
  id?: string;
  action: AdminAction;
  admin_id: string;
  admin_name?: string;
  target_type?: 'user' | 'topic' | 'post' | 'article' | 'comment';
  target_id?: string;
  details?: Record<string, unknown>;
  created_at?: string;
}

type AdminLogRow = {
  id: string;
  action: string;
  actor: string | null;
  target: string | null;
  detail: string | null;
  created: string | null;
};

/** Map a fine-grained AdminAction onto the collection's coarse enum. */
function toEnumAction(action: AdminAction): string {
  if (action.endsWith('.ban')) return 'ban';
  if (action.endsWith('.unban')) return 'unban';
  if (action.endsWith('.delete')) return 'delete';
  if (action.endsWith('.update') || action.endsWith('.role_change') || action.endsWith('.coins_grant'))
    return 'update';
  return 'other';
}

function parseDetail(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Log an admin action (never throws — logging must not break the main action). */
export async function logAdminAction(entry: Omit<AdminLogEntry, 'id' | 'created_at'>): Promise<void> {
  try {
    const detail = JSON.stringify({
      fineAction: entry.action,
      admin_name: entry.admin_name ?? null,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      details: entry.details ?? null,
    });
    await pbCreate(ADMIN_LOGS, {
      action: toEnumAction(entry.action),
      actor: entry.admin_id || null,
      target: entry.target_type ? `${entry.target_type}:${entry.target_id ?? ''}` : null,
      detail,
    });
  } catch (error) {
    console.error('[AdminLogs] Failed to log action:', error);
  }
}

/** Get admin logs with pagination and filters. */
export async function getAdminLogs(options: {
  page?: number;
  limit?: number;
  action?: AdminAction;
  adminId?: string;
  targetType?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{ data: AdminLogEntry[]; total: number }> {
  const { page = 1, limit = 50, action, adminId, fromDate, toDate } = options;

  const filter: Record<string, unknown> = {};
  if (action) filter.action = { _eq: toEnumAction(action) };
  if (adminId) filter.actor = { _eq: adminId };
  if (fromDate || toDate) {
    const c: Record<string, string> = {};
    if (fromDate) c._gte = fromDate;
    if (toDate) c._lte = toDate;
    filter.created = c;
  }

  try {
    const [rows, total] = await Promise.all([
      pbList<AdminLogRow>(ADMIN_LOGS, {
        filter: Object.keys(filter).length ? filter : undefined,
        sort: '-created',
        perPage: limit,
        page,
        fields: 'id,action,actor,target,detail,created',
      }),
      pbCount(ADMIN_LOGS, Object.keys(filter).length ? filter : undefined),
    ]);

    return {
      data: (rows || []).map((row) => {
        const d = parseDetail(row.detail);
        return {
          id: row.id,
          action: (d.fineAction as AdminAction) ?? (row.action as AdminAction),
          admin_id: row.actor || '',
          admin_name: (d.admin_name as string) || undefined,
          target_type: (d.target_type as AdminLogEntry['target_type']) || undefined,
          target_id: (d.target_id as string) || undefined,
          details: (d.details as Record<string, unknown>) || undefined,
          created_at: row.created || undefined,
        };
      }),
      total,
    };
  } catch (error) {
    console.error('[AdminLogs] Failed to fetch logs:', error);
    return { data: [], total: 0 };
  }
}

/** Get log statistics for dashboard. */
export async function getLogStats(days: number = 7): Promise<{
  byAction: Record<string, number>;
  byDay: { date: string; count: number }[];
}> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString();

  try {
    const rows = await pbList<{ action: string; created: string; detail: string | null }>(ADMIN_LOGS, {
      filter: { created: { _gte: fromDateStr } },
      fields: 'action,created,detail',
      perPage: 10000,
    });

    const byAction: Record<string, number> = {};
    const byDayMap: Record<string, number> = {};

    for (const row of rows || []) {
      const fine = parseDetail(row.detail).fineAction as string | undefined;
      const key = fine || row.action;
      byAction[key] = (byAction[key] || 0) + 1;

      const day = row.created?.split(' ')[0]?.split('T')[0] || 'unknown';
      byDayMap[day] = (byDayMap[day] || 0) + 1;
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { byAction, byDay };
  } catch (error) {
    console.error('[AdminLogs] Failed to get stats:', error);
    return { byAction: {}, byDay: [] };
  }
}
