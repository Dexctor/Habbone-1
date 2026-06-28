import { unstable_cache } from 'next/cache';
import { getPublicNews } from '@/server/pocketbase/news';
import NewsPageClient from './news-page-client';

export const revalidate = 300;

const getCachedNews = unstable_cache(
  () => getPublicNews('').catch(() => []),
  ['news-list'],
  { tags: ['news'], revalidate: 300 }
);

export default async function NewsPage() {
  const rawNews = await getCachedNews();
  const news: any[] = Array.isArray(rawNews)
    ? rawNews
    : Array.isArray((rawNews as any)?.data)
      ? (rawNews as any).data
      : Array.isArray((rawNews as any)?.items)
        ? (rawNews as any).items
        : [];

  return <NewsPageClient articles={news} />;
}
