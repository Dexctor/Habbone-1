import 'server-only';

import {
  mapSponsorDbRow,
  normalizeSponsorInput,
  sponsorAppToDb,
  type SponsorInput,
  type SponsorView,
} from '@/server/directus/sponsors-core';
import { tableName } from './config';
import { queryOne, queryRows } from './db';

const SPONSOR_SELECT = 'id, name, link, image, active';

export async function listSponsors(limit = 50): Promise<SponsorView[]> {
  const rows = await queryRows<Record<string, unknown>>(
    `select ${SPONSOR_SELECT}
     from ${tableName('sponsors')}
     order by id desc
     limit $1`,
    [limit],
  );
  return rows.map((row) => mapSponsorDbRow(row, true));
}

export async function createSponsor(data: Required<SponsorInput>): Promise<SponsorView> {
  const normalized = normalizeSponsorInput(data);
  const payload = sponsorAppToDb(normalized, true);
  const row = await queryOne<Record<string, unknown>>(
    `insert into ${tableName('sponsors')} (name, link, image, active, sort)
     values ($1, $2, $3, $4, 0)
     returning ${SPONSOR_SELECT}`,
    [
      payload.name ?? '',
      payload.link ?? '',
      payload.image ?? '',
      payload.active ?? false,
    ],
  );
  if (!row) throw new Error('SPONSOR_CREATE_FAILED');
  return mapSponsorDbRow(row, true);
}

export async function updateSponsor(id: number, patch: SponsorInput): Promise<SponsorView | null> {
  const normalized = normalizeSponsorInput(patch);
  const payload = sponsorAppToDb(normalized, true);
  const entries = Object.entries(payload);
  if (entries.length === 0) {
    const existing = await queryOne<Record<string, unknown>>(
      `select ${SPONSOR_SELECT} from ${tableName('sponsors')} where id = $1 limit 1`,
      [id],
    );
    return existing ? mapSponsorDbRow(existing, true) : null;
  }

  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(', ');
  const row = await queryOne<Record<string, unknown>>(
    `update ${tableName('sponsors')}
     set ${assignments}
     where id = $1
     returning ${SPONSOR_SELECT}`,
    [id, ...entries.map(([, value]) => value)],
  );
  return row ? mapSponsorDbRow(row, true) : null;
}

export async function deleteSponsor(id: number): Promise<boolean> {
  const rows = await queryRows<{ id: number }>(
    `delete from ${tableName('sponsors')} where id = $1 returning id`,
    [id],
  );
  return rows.length > 0;
}
