import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/likes` keeps compiling. Once all imports are migrated to
 * `@/server/supabase/likes`, this file can be deleted.
 */

export {
  getLikesMapForNewsComments,
  getLikesMapForTopicComments,
} from '@/server/supabase/likes';
