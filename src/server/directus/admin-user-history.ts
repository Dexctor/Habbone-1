import 'server-only';

import { TABLES, USE_V2 } from './tables';
import { directusFetch } from './fetch';
import {
  LEGACY_HISTORY_FIELDS,
  V2_HISTORY_FIELDS,
  alternateNickForLegacyFallback,
  cleanLegacyUserId,
  hasUserHistoryResults,
  mergeUserHistory,
  normalizeHistoryRow,
  type HistoryFields,
  type HistoryKind,
  type HistoryRow,
  type UserHistory,
} from './admin-user-history-core';

const USERS_TABLE = TABLES.users;

type DirectusFilter = Record<string, Record<string, string | number>>;

async function fetchItems(
  table: string,
  filter: DirectusFilter,
  fields: string[],
  sort: string,
  limit = 50,
): Promise<HistoryRow[]> {
  const params: Record<string, string> = {
    fields: fields.join(','),
    sort,
    limit: String(limit),
  };

  for (const [key, ops] of Object.entries(filter)) {
    for (const [op, value] of Object.entries(ops)) {
      params[`filter[${key}][${op}]`] = String(value);
    }
  }

  const json = await directusFetch<{ data?: HistoryRow[] }>(`/items/${encodeURIComponent(table)}`, { params }).catch(
    () => null,
  );
  return Array.isArray(json?.data) ? json.data : [];
}

async function getUserNickById(userId: string): Promise<string | null> {
  const json = await directusFetch<{ data?: { nick?: unknown } }>(
    `/items/${encodeURIComponent(USERS_TABLE)}/${encodeURIComponent(userId)}`,
    { params: { fields: 'nick' } },
  ).catch(() => null);
  return typeof json?.data?.nick === 'string' ? json.data.nick : null;
}

async function fetchHistoryByFilter(
  filter: DirectusFilter,
  sortField: string,
  fields: HistoryFields,
): Promise<UserHistory> {
  const [rawTopics, rawArticles, rawForumComments, rawArticleComments] = await Promise.all([
    fetchItems(TABLES.forumTopics, filter, fields.topic, sortField),
    fetchItems(TABLES.articles, filter, fields.article, sortField),
    fetchItems(TABLES.forumComments, filter, fields.forumComment, sortField),
    fetchItems(TABLES.articleComments, filter, fields.articleComment, sortField),
  ]);

  return {
    topics: rawTopics.map((row) => normalizeHistoryRow(row, 'topic' satisfies HistoryKind, USE_V2)),
    articles: rawArticles.map((row) => normalizeHistoryRow(row, 'article' satisfies HistoryKind, USE_V2)),
    forumComments: rawForumComments.map((row) => normalizeHistoryRow(row, 'forumComment' satisfies HistoryKind, USE_V2)),
    newsComments: rawArticleComments.map((row) => normalizeHistoryRow(row, 'articleComment' satisfies HistoryKind, USE_V2)),
    adminLogs: [],
  };
}

export async function getAdminUserHistory(userId: string): Promise<UserHistory> {
  const cleanId = cleanLegacyUserId(userId);

  if (USE_V2) {
    return fetchHistoryByFilter(
      { author: { _eq: Number(cleanId) } },
      '-created_at',
      V2_HISTORY_FIELDS,
    );
  }

  const nick = (await getUserNickById(cleanId)) || cleanId;

  const history = await fetchHistoryByFilter({ autor: { _eq: nick } }, '-data', LEGACY_HISTORY_FIELDS);

  if (hasUserHistoryResults(history) || !nick) return history;

  const altNick = alternateNickForLegacyFallback(nick);
  const fallback = await fetchHistoryByFilter({ autor: { _eq: altNick } }, '-data', LEGACY_HISTORY_FIELDS);

  return mergeUserHistory(history, fallback);
}
