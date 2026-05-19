import 'server-only';

import type { AdminAction, AdminLogEntry } from '@/server/directus/admin-logs';
import { tableName } from './config';
import { queryRows } from './db';

type AdminLogRow = {
  id: number;
  action: string;
  admin_id: string;
  admin_name: string | null;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  date_created: string | Date | null;
};

function mapLog(row: AdminLogRow): AdminLogEntry {
  return {
    id: row.id,
    action: row.action as AdminAction,
    admin_id: row.admin_id,
    admin_name: row.admin_name || undefined,
    target_type: row.target_type as AdminLogEntry['target_type'],
    target_id: row.target_id || undefined,
    details: row.details || undefined,
    created_at: row.date_created instanceof Date ? row.date_created.toISOString() : row.date_created || undefined,
  };
}

export async function logAdminAction(entry: Omit<AdminLogEntry, 'id' | 'created_at'>): Promise<void> {
  try {
    await queryRows(
      `insert into ${tableName('admin_logs')} (action, admin_id, admin_name, target_type, target_id, details, date_created)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [
        entry.action,
        entry.admin_id,
        entry.admin_name || null,
        entry.target_type || null,
        entry.target_id ? String(entry.target_id) : null,
        entry.details || null,
      ],
    );
  } catch (error) {
    console.error('[AdminLogs] Supabase log failed:', error);
  }
}

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
  const values: unknown[] = [];
  const where: string[] = [];
  if (action) {
    values.push(action);
    where.push(`action = $${values.length}`);
  }
  if (adminId) {
    values.push(adminId);
    where.push(`admin_id = $${values.length}`);
  }
  if (targetType) {
    values.push(targetType);
    where.push(`target_type = $${values.length}`);
  }
  if (fromDate) {
    values.push(fromDate);
    where.push(`date_created >= $${values.length}`);
  }
  if (toDate) {
    values.push(toDate);
    where.push(`date_created <= $${values.length}`);
  }
  values.push(limit, (page - 1) * limit);
  const limitParam = values.length - 1;
  const offsetParam = values.length;
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const [rows, countRows] = await Promise.all([
    queryRows<AdminLogRow>(
      `select id, action, admin_id, admin_name, target_type, target_id, details, date_created
       from ${tableName('admin_logs')}
       ${whereSql}
       order by date_created desc nulls last, id desc
       limit $${limitParam}
       offset $${offsetParam}`,
      values,
    ),
    queryRows<{ count: string }>(
      `select count(*)::text as count from ${tableName('admin_logs')} ${whereSql}`,
      values.slice(0, -2),
    ),
  ]);

  return {
    data: rows.map(mapLog),
    total: Number(countRows[0]?.count) || 0,
  };
}

export async function getLogStats(days = 7): Promise<{
  byAction: Record<string, number>;
  byDay: { date: string; count: number }[];
}> {
  const rows = await queryRows<{ action: string; day: string; count: string }>(
    `select action, to_char(date_created, 'YYYY-MM-DD') as day, count(*)::text as count
     from ${tableName('admin_logs')}
     where date_created >= now() - ($1::int * interval '1 day')
     group by action, day
     order by day asc`,
    [days],
  );

  const byAction: Record<string, number> = {};
  const byDayMap: Record<string, number> = {};
  for (const row of rows) {
    const count = Number(row.count) || 0;
    byAction[row.action] = (byAction[row.action] || 0) + count;
    byDayMap[row.day] = (byDayMap[row.day] || 0) + count;
  }
  return {
    byAction,
    byDay: Object.entries(byDayMap).map(([date, count]) => ({ date, count })),
  };
}
