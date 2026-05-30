import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/team` keeps compiling. Once all imports are migrated to
 * `@/server/supabase/team`, this file can be deleted.
 */

export { listTeamMembersByRoles } from '@/server/supabase/team';
export type { TeamMember } from '@/server/directus/types';
