import 'server-only';

import { TABLES } from './tables';
import { directusCount } from './fetch';

export async function adminCount(table: string): Promise<number> {
  return directusCount(table);
}

export function adminCountUsers(): Promise<number> {
  return adminCount(TABLES.users);
}
