import 'server-only';

import { Pool } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  const url = (process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || '').trim();
  if (!url) {
    throw new Error('SUPABASE_DB_URL manquant');
  }
  return url;
}

function shouldUseSsl(databaseUrl: string): boolean {
  if (databaseUrl.includes('sslmode=disable')) return false;
  return !/(localhost|127\.0\.0\.1|host\.docker\.internal)/i.test(databaseUrl);
}

export function getSupabasePool(): Pool {
  if (pool) return pool;
  const connectionString = getDatabaseUrl();
  pool = new Pool({
    connectionString,
    max: Number(process.env.SUPABASE_DB_POOL_MAX || 4),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export async function queryRows<T = Record<string, unknown>>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getSupabasePool().query(text, [...values]);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(text, values);
  return rows[0] ?? null;
}
