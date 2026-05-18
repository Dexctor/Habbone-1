import 'server-only';

export const SUPABASE_SCHEMA = (process.env.SUPABASE_DB_SCHEMA || 'habbonex_main').trim() || 'habbonex_main';

export function isSupabaseDataEnabled(): boolean {
  return (process.env.DATA_BACKEND || '').trim().toLowerCase() === 'supabase';
}

export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function tableName(table: string): string {
  return `${quoteIdent(SUPABASE_SCHEMA)}.${quoteIdent(table)}`;
}
