import 'server-only';

import { uploadSupabaseObject } from '@/server/supabase/storage';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. `uploadFileToDirectus` is renamed in spirit only — it now
 * uploads to Supabase Storage. The function name is kept so existing callers
 * (api/stories/route.ts) keep working.
 */

export {
  createStoryRow,
  countStoriesThisMonthByAuthor,
  listStoriesService,
  adminListStories,
  adminUpdateStory,
  adminDeleteStory,
} from '@/server/supabase/stories';

export type { StoryRecord } from './types';

export async function uploadFileToDirectus(
  file: File,
  filename: string,
  mimeType: string,
): Promise<{ id: string }> {
  const safeName = filename?.trim() || `story-${Date.now()}`;
  const uploaded = await uploadSupabaseObject({
    file,
    filename: safeName,
    mimeType,
    prefix: 'stories',
  });
  return { id: uploaded.url };
}
