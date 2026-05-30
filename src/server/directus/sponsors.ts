import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/sponsors` keeps compiling. Once all imports are migrated
 * to `@/server/supabase/sponsors`, this file can be deleted.
 */

export {
  listSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
} from '@/server/supabase/sponsors';

export type { SponsorInput, SponsorView } from '@/server/directus/sponsors-core';
