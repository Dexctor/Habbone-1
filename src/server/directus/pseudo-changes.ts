import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/pseudo-changes` keeps compiling. Once all imports are
 * migrated to `@/server/supabase/pseudo-changes`, this file can be deleted.
 */

export { syncHabboName, listPseudoChanges } from '@/server/supabase/pseudo-changes';

export interface PseudoChange {
  id: number;
  habbo_unique_id: string;
  old_nick: string;
  new_nick: string;
  hotel: string;
  user_id: number | null;
  changed_at: number;
}
