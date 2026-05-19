import 'server-only';

import { directusService, rItems, cItem, uItem, dItem } from './client';
import { TABLES, USE_V2 } from './tables';
import { isSupabaseDataEnabled } from '@/server/supabase/config';
import * as supabaseSponsors from '@/server/supabase/sponsors';
import {
  mapSponsorDbRow,
  normalizeSponsorInput,
  sponsorAppToDb,
  type SponsorInput,
  type SponsorView,
} from './sponsors-core';

const TABLE = TABLES.sponsors;

export async function listSponsors(limit = 50): Promise<SponsorView[]> {
  if (isSupabaseDataEnabled()) return supabaseSponsors.listSponsors(limit);

  const rows = (await directusService
    .request(
      rItems(TABLE as any, {
        fields: (USE_V2 ? ['id', 'name', 'link', 'image', 'active'] : ['id', 'nome', 'link', 'imagem', 'status']) as any,
        sort: ['-id'] as any,
        limit: limit as any,
      } as any),
    )
    .catch(() => [])) as Record<string, unknown>[];
  return rows.map((row) => mapSponsorDbRow(row, USE_V2));
}

export async function createSponsor(data: Required<SponsorInput>): Promise<SponsorView> {
  if (isSupabaseDataEnabled()) return supabaseSponsors.createSponsor(data);

  const normalized = normalizeSponsorInput(data);
  const payload = USE_V2
    ? { ...sponsorAppToDb(normalized, USE_V2), sort: 0 }
    : { ...normalized, autor: 'admin', data: Math.floor(Date.now() / 1000) };
  const created = await directusService.request(cItem(TABLE as any, payload as any));
  return mapSponsorDbRow(created as Record<string, unknown>, USE_V2);
}

export async function updateSponsor(id: number, patch: SponsorInput): Promise<SponsorView | null> {
  if (isSupabaseDataEnabled()) return supabaseSponsors.updateSponsor(id, patch);

  const normalized = normalizeSponsorInput(patch);
  const updated = await directusService
    .request(uItem(TABLE as any, id as any, sponsorAppToDb(normalized, USE_V2) as any))
    .catch(() => null);
  return updated ? mapSponsorDbRow(updated as Record<string, unknown>, USE_V2) : null;
}

export async function deleteSponsor(id: number): Promise<boolean> {
  if (isSupabaseDataEnabled()) return supabaseSponsors.deleteSponsor(id);

  try {
    await directusService.request(dItem(TABLE as any, id as any));
    return true;
  } catch {
    return false;
  }
}
