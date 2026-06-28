import 'server-only';

import { TABLES } from './tables';
import { pbCount } from './helpers';

export async function adminCount(table: string): Promise<number> {
  return pbCount(table);
}

export function adminCountUsers(): Promise<number> {
  return adminCount(TABLES.users);
}
