import 'server-only';

import { applyInvalidation } from '@/server/cache-policy';
import type { InvalidationPlan } from '@/server/cache-policy-core';

/**
 * Server-side: directly call revalidateTag for each tag.
 * Use this in API route handlers and server actions.
 */
export function serverRevalidate(tagsOrPlan: string[] | InvalidationPlan, paths?: string[]) {
  applyInvalidation(Array.isArray(tagsOrPlan)
    ? { tags: tagsOrPlan, paths: paths || [] }
    : tagsOrPlan);
}
