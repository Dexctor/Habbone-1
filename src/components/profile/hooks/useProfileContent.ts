'use client';

import { useEffect, useState } from 'react';

export type ProfileContentCard = {
  id: number | string;
  imagem?: string;
  titulo?: string;
  autor?: string;
  data?: string | number | null;
};

async function fetchProfileContent(endpoint: 'topics' | 'articles', author: string, signal: AbortSignal) {
  const response = await fetch(`/api/profile/${endpoint}?author=${encodeURIComponent(author)}`, {
    cache: 'no-store',
    signal,
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const maybeErr = (payload as { error?: unknown } | null)?.error;
    const fallback = endpoint === 'topics'
      ? 'Erreur de recuperation des sujets'
      : 'Erreur de recuperation des articles';
    throw new Error(typeof maybeErr === 'string' ? maybeErr : fallback);
  }

  const rows = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(rows) ? (rows as ProfileContentCard[]) : [];
}

export function useProfileContent(author: string) {
  const [topics, setTopics] = useState<ProfileContentCard[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [articles, setArticles] = useState<ProfileContentCard[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  useEffect(() => {
    if (!author) return;

    let cancelled = false;
    const controller = new AbortController();
    setTopicsLoading(true);

    void fetchProfileContent('topics', author, controller.signal)
      .then((rows) => {
        if (!cancelled) setTopics(rows);
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [author]);

  useEffect(() => {
    if (!author) return;

    let cancelled = false;
    const controller = new AbortController();
    setArticlesLoading(true);

    void fetchProfileContent('articles', author, controller.signal)
      .then((rows) => {
        if (!cancelled) setArticles(rows);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setArticlesLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [author]);

  return {
    topics,
    topicsLoading,
    articles,
    articlesLoading,
  };
}
