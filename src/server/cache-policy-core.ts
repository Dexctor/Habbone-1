import {
  TAG_FORUM,
  TAG_FORUM_TOPIC,
  TAG_HOME,
  TAG_NEWS,
  TAG_NEWS_DETAIL,
  TAG_PUB,
  TAG_SHOP,
  TAG_STORIES,
  TAG_THEME,
} from '@/lib/revalidate-tags';

export type InvalidationPlan = {
  tags: string[];
  paths: string[];
};

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

export function makeInvalidationPlan(input: {
  tags?: Array<string | null | undefined>;
  paths?: Array<string | null | undefined>;
}): InvalidationPlan {
  return {
    tags: unique(input.tags || []),
    paths: unique(input.paths || []),
  };
}

export function shopInvalidation(): InvalidationPlan {
  return makeInvalidationPlan({ tags: [TAG_SHOP] });
}

export function newsInvalidation(options?: { newsId?: number | string; home?: boolean; admin?: boolean }): InvalidationPlan {
  return makeInvalidationPlan({
    tags: [TAG_NEWS, options?.newsId != null ? TAG_NEWS_DETAIL(options.newsId) : null, options?.home ? TAG_HOME : null],
    paths: [options?.newsId != null ? `/news/${options.newsId}` : null, options?.admin ? '/admin' : null],
  });
}

export function forumInvalidation(options?: { topicId?: number | string; home?: boolean; admin?: boolean }): InvalidationPlan {
  return makeInvalidationPlan({
    tags: [TAG_FORUM, options?.topicId != null ? TAG_FORUM_TOPIC(options.topicId) : null, options?.home ? TAG_HOME : null],
    paths: [options?.topicId != null ? `/forum/topic/${options.topicId}` : null, options?.admin ? '/admin' : null],
  });
}

export function storiesInvalidation(options?: { home?: boolean; admin?: boolean }): InvalidationPlan {
  return makeInvalidationPlan({
    tags: [TAG_STORIES, options?.home ? TAG_HOME : null],
    paths: [options?.admin ? '/admin' : null],
  });
}

export function pubInvalidation(): InvalidationPlan {
  return makeInvalidationPlan({ tags: [TAG_PUB, TAG_HOME], paths: ['/'] });
}

export function themeInvalidation(): InvalidationPlan {
  return makeInvalidationPlan({ tags: [TAG_THEME] });
}

export function teamInvalidation(): InvalidationPlan {
  return makeInvalidationPlan({ paths: ['/team'] });
}

export function adminInvalidation(): InvalidationPlan {
  return makeInvalidationPlan({ paths: ['/admin'] });
}

export function mergeInvalidationPlans(...plans: InvalidationPlan[]): InvalidationPlan {
  return makeInvalidationPlan({
    tags: plans.flatMap((plan) => plan.tags),
    paths: plans.flatMap((plan) => plan.paths),
  });
}
