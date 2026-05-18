export type HistoryKind = 'topic' | 'article' | 'forumComment' | 'articleComment';

export type HistoryRow = Record<string, unknown>;

export type UserHistory = {
  topics: HistoryRow[];
  articles: HistoryRow[];
  forumComments: HistoryRow[];
  newsComments: HistoryRow[];
  adminLogs: HistoryRow[];
};

export type HistoryFields = {
  topic: string[];
  article: string[];
  forumComment: string[];
  articleComment: string[];
};

export const V2_HISTORY_FIELDS: HistoryFields = {
  topic: ['id', 'title', 'created_at'],
  article: ['id', 'title', 'created_at', 'published_at'],
  forumComment: ['id', 'topic', 'content', 'created_at'],
  articleComment: ['id', 'article', 'content', 'created_at'],
};

export const LEGACY_HISTORY_FIELDS: HistoryFields = {
  topic: ['id', 'titulo', 'data'],
  article: ['id', 'titulo', 'data'],
  forumComment: ['id', 'id_forum', 'comentario', 'data'],
  articleComment: ['id', 'id_noticia', 'comentario', 'data'],
};

export function emptyUserHistory(): UserHistory {
  return {
    topics: [],
    articles: [],
    forumComments: [],
    newsComments: [],
    adminLogs: [],
  };
}

export function cleanLegacyUserId(userId: string): string {
  return userId.startsWith('legacy:') ? userId.split(':')[1] : userId;
}

function unixFromIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / 1000).toString() : null;
}

export function normalizeHistoryRow(row: HistoryRow, kind: HistoryKind, useV2: boolean): HistoryRow {
  if (!useV2) return row;

  const unixData = unixFromIso(row.created_at) ?? unixFromIso(row.published_at);

  switch (kind) {
    case 'topic':
      return { id: row.id, titulo: row.title, data: unixData };
    case 'article':
      return { id: row.id, titulo: row.title, data: unixData };
    case 'forumComment':
      return { id: row.id, id_forum: row.topic, comentario: row.content, data: unixData };
    case 'articleComment':
      return { id: row.id, id_noticia: row.article, comentario: row.content, data: unixData };
  }
}

export function hasUserHistoryResults(history: UserHistory): boolean {
  return Boolean(
    history.topics.length ||
    history.articles.length ||
    history.forumComments.length ||
    history.newsComments.length,
  );
}

export function alternateNickForLegacyFallback(nick: string): string {
  const nickLower = nick.toLowerCase();
  const nickCapital = nick.charAt(0).toUpperCase() + nick.slice(1).toLowerCase();
  return nick === nickCapital ? nickLower : nickCapital;
}

export function mergeUserHistory(primary: UserHistory, fallback: UserHistory): UserHistory {
  return {
    topics: [...primary.topics, ...fallback.topics],
    articles: [...primary.articles, ...fallback.articles],
    forumComments: [...primary.forumComments, ...fallback.forumComments],
    newsComments: [...primary.newsComments, ...fallback.newsComments],
    adminLogs: [...primary.adminLogs, ...fallback.adminLogs],
  };
}
