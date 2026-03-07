import { getPublicNews } from '@/server/directus/news';
import NewsPageClient from './news-page-client';

export const revalidate = 60;

export default async function NewsPage() {
  const rawNews = await getPublicNews('').catch(() => []);
  const news: any[] = Array.isArray(rawNews)
    ? rawNews
    : Array.isArray((rawNews as any)?.data)
      ? (rawNews as any).data
      : Array.isArray((rawNews as any)?.items)
        ? (rawNews as any).items
        : [];

  return <NewsPageClient articles={news} />;
}
