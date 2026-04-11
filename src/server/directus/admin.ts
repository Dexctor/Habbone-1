import 'server-only';

import { USERS_TABLE } from './client';
import { directusCount } from './fetch';

export async function adminCount(table: string): Promise<number> {
  return directusCount(table);
}

export function adminCountUsers(): Promise<number> {
  return adminCount(USERS_TABLE);
}
