import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import {
  adminInvalidation,
  forumInvalidation,
  mergeInvalidationPlans,
  newsInvalidation,
  pubInvalidation,
  shopInvalidation,
  storiesInvalidation,
  teamInvalidation,
  themeInvalidation,
  type InvalidationPlan,
} from './cache-policy-core';

export type { InvalidationPlan };

export function applyInvalidation(plan: InvalidationPlan) {
  for (const tag of plan.tags) revalidateTag(tag);
  for (const path of plan.paths) revalidatePath(path);
}

export function invalidateShop() {
  applyInvalidation(shopInvalidation());
}

export function invalidateNews(options?: { newsId?: number | string; home?: boolean; admin?: boolean }) {
  applyInvalidation(newsInvalidation(options));
}

export function invalidateForum(options?: { topicId?: number | string; home?: boolean; admin?: boolean }) {
  applyInvalidation(forumInvalidation(options));
}

export function invalidateStories(options?: { home?: boolean; admin?: boolean }) {
  applyInvalidation(storiesInvalidation(options));
}

export function invalidatePub() {
  applyInvalidation(pubInvalidation());
}

export function invalidateTheme() {
  applyInvalidation(themeInvalidation());
}

export function invalidateTeam() {
  applyInvalidation(teamInvalidation());
}

export function invalidateAdmin() {
  applyInvalidation(adminInvalidation());
}

export function invalidateMany(...plans: InvalidationPlan[]) {
  applyInvalidation(mergeInvalidationPlans(...plans));
}
