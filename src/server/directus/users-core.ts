export type AdminUserStatusStats = {
  total: number;
  actifs: number;
  bannis: number;
  inactifs: number;
};

type StatsBucket = Record<string, unknown> & { count?: { id?: number } };

export function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    return ['s', 'sim', 'y', 'yes', 'true', '1'].includes(lowered);
  }
  return false;
}

export function summarizeUserStatusBuckets(
  buckets: StatsBucket[],
  columns: { banned: string; active: string },
): AdminUserStatusStats {
  const stats: AdminUserStatusStats = {
    total: 0,
    actifs: 0,
    bannis: 0,
    inactifs: 0,
  };

  for (const bucket of buckets) {
    const count = Number(bucket.count?.id ?? 0);
    stats.total += count;
    const banned = isTruthyFlag(bucket[columns.banned]);
    const active = isTruthyFlag(bucket[columns.active]);
    if (banned) stats.bannis += count;
    else if (!active) stats.inactifs += count;
    else stats.actifs += count;
  }

  return stats;
}
