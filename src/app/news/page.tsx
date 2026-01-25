import Image from 'next/image';
import ContentCard from '@/components/shared/content-card';
import { mediaUrl } from '@/lib/directus/media';
import { getNews } from '@/lib/directus/news';
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils';
import { formatDateTimeFromString } from '@/lib/date-utils';

export const revalidate = 60;

const NEWS_FALLBACK_ICON = '/img/news.png';

type NewsPageProps = {
  searchParams?: Promise<{ q?: string }>
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const rawNews = await getNews(query).catch(() => []);
  const news: any[] = Array.isArray(rawNews)
    ? rawNews
    : Array.isArray((rawNews as any)?.data)
      ? (rawNews as any).data
      : Array.isArray((rawNews as any)?.items)
        ? (rawNews as any).items
        : [];

  return (
    <main className="mx-auto flex w-full max-w-[1898px] flex-col gap-8 px-4 py-10 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase text-[color:var(--foreground)]">
            Tous les articles
          </h1>
          <p className="text-xs font-semibold uppercase text-[color:var(--foreground)]/60">
            Parcourir les actualites de la communaute
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <form className="relative flex-1 sm:w-72" method="get">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/35 material-icons">
              search
            </span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Rechercher un article"
              className="h-11 w-full border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/55 pl-9 pr-3 text-sm font-medium text-[color:var(--foreground)]/85 placeholder:text-[color:var(--foreground)]/30 focus-visible:border-[color:var(--bg-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bg-300)]/25"
            />
          </form>
        </div>
      </header>

      <section className="grid gap-6">
        {news.length === 0 ? (
          <div className="rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 px-6 py-16 text-center text-sm uppercase tracking-[0.24em] text-[color:var(--foreground)]/45">
            Aucun article trouve
          </div>
        ) : (
          news.map((article: any) => {
            const imageUrl = mediaUrl(article?.imagem);
            const cardImage = imageUrl || NEWS_FALLBACK_ICON;
            const title = stripHtml(article?.titulo || `Article #${article.id}`) || `Article #${article.id}`;
            const excerpt = buildExcerptFromHtml(article?.descricao || article?.noticia || '');
            const previewText = buildPreviewText(excerpt, { maxLength: 140 });
            const authorLabel = stripHtml(article?.autor || '');
            const statusLabel = stripHtml(article?.status || '');
            const publishedAt = formatDateTimeFromString(article?.data);

            return (
              <ContentCard
                key={article.id}
                title={title}
                href={`/news/${article.id}`}
                preview={previewText}
                image={
                  <Image
                    src={cardImage}
                    alt={title}
                    fill
                    sizes="64px"
                    className={imageUrl ? "object-cover" : "object-contain"}
                    priority={false}
                  />
                }
                meta={
                  <>
                    {authorLabel ? <span>Par {authorLabel}</span> : null}
                    {authorLabel && publishedAt ? (
                      <span className="mx-1 h-px w-3 bg-[color:var(--foreground)]/20" />
                    ) : null}
                    {publishedAt ? <span>Publie le {publishedAt}</span> : null}
                    {statusLabel ? (
                      <span className="rounded-[2px] bg-[color:var(--bg-700)]/65 px-2 py-0.5 text-[color:var(--foreground)]/70">
                        {statusLabel}
                      </span>
                    ) : null}
                  </>
                }
              />
            );
          })
        )}
      </section>
    </main>
  );
}
