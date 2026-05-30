import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/admin-logs` keeps compiling. Once all imports are
 * migrated to `@/server/supabase/admin-logs`, this file can be deleted.
 *
 * Note: the AdminAction/AdminLogEntry types live here because that is where
 * the rest of the codebase still imports them from. They'll move alongside
 * the file in the final cleanup pass.
 */

export {
  logAdminAction,
  getAdminLogs,
  getLogStats,
} from '@/server/supabase/admin-logs';

export type AdminAction =
  | 'user.ban'
  | 'user.unban'
  | 'user.delete'
  | 'user.role_change'
  | 'user.coins_grant'
  | 'content.delete'
  | 'content.update';

export interface AdminLogEntry {
  id?: number;
  action: AdminAction;
  admin_id: string;
  admin_name?: string;
  target_type?: 'user' | 'topic' | 'post' | 'article' | 'comment';
  target_id?: string | number;
  details?: Record<string, unknown>;
  created_at?: string;
}
