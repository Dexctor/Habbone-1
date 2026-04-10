'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { mediaUrl } from '@/lib/media-url'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'

const NEWS_FALLBACK_ICON = '/img/news.png'
const PAGE_SIZE = 10

type CategoryId = 'novidades' | 'raros' | 'habbo' | 'guides' | 'packs' | 'habbone'

const CATEGORY_FILTERS: Array<{ id: CategoryId; label: string }> = [
  { id: 'novidades', label: 'NOUVEAUTES' },
  { id: 'raros', label: 'RARES' },
  { id: 'habbo', label: 'HABBO' },
  { id: 'guides', label: 'GUIDE DE JEUX' },
  { id: 'packs', label: 'PACKS' },
  { id: 'habbone', label: 'HABBONE' },
]

function getArticleCategory(article: any): CategoryId {
  const cat = String(article?.category || article?.categoria || '').toLowerCase()
  if (cat.includes('raro')) return 'raros'
  if (cat.includes('casa') || cat.includes('jogo') || cat.includes('guia') || cat.includes('guide')) return 'guides'
  if (cat.includes('pack')) return 'packs'
  if (cat.includes('habbone')) return 'habbone'
  if (cat.includes('habbo')) return 'habbo'
  return 'novidades'
}

function getCategoryLabel(category: CategoryId): string {
  return CATEGORY_FILTERS.find((entry) => entry.id === category)?.label || 'NOUVEAUTES'
}

export default function NewsPageClient({ articles }: { articles: any[] }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)
  const [page, setPage] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  const filtered = useMemo(() => {
    let result = articles
    const term = query.trim().toLowerCase()

    if (term) {
      result = result.filter((article) => {
        const title = stripHtml(article?.titulo || '').toLowerCase()
        const desc = stripHtml(article?.descricao || article?.noticia || '').toLowerCase()
        return title.includes(term) || desc.includes(term)
      })
    }

    if (activeCategory) {
      result = result.filter((article) => getArticleCategory(article) === activeCategory)
    }

    return result
  }, [articles, query, activeCategory])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-8">
      <section className="space-y-3 rounded-[4px] bg-[#2C2C4F]">
        <div className="flex flex-col gap-3 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/news.png" alt="" className="h-[27px] w-auto image-pixelated" />
            <h1 className="text-[14px] font-bold uppercase tracking-[0.08em] text-[#DDD]">
              Tous les articles
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/news/nouveau"
              className="inline-flex h-[40px] shrink-0 items-center rounded-[4px] bg-[#2596FF] px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8]"
            >
              Publier un article
            </Link>
            <div className="relative w-full sm:w-[255px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#BEBECE] material-icons text-[16px]">
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
                placeholder="Rechercher un titre"
                className="h-[40px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] pl-9 pr-3 text-[12px] font-normal text-[#DDD] placeholder:text-[#BEBECE]/60 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((category) => {
            const active = activeCategory === category.id
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setPage(0)
                  setActiveCategory((current) => (current === category.id ? null : category.id))
                }}
                className={`rounded-[2px] border px-2.5 py-1 text-[9px] font-normal uppercase tracking-[0.08em] transition ${
                  active
                    ? 'border-[#2596FF] bg-[#2596FF] text-white'
                    : 'border-white/5 bg-[#1F1F3E] text-[#BEBECE] hover:bg-[#25254D] hover:text-[#DDD]'
                }`}
              >
                {category.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-[10px]">
        {visible.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
            Aucun article trouve.
          </div>
        ) : (
          visible.map((article) => {
            const imageUrl = mediaUrl(article?.imagem)
            const hasFailed = failedImages.has(article.id)
            const cardImage = (imageUrl && !hasFailed) ? imageUrl : NEWS_FALLBACK_ICON
            const isFallback = !imageUrl || hasFailed
            const title = stripHtml(article?.titulo || `Article #${article?.id || ''}`) || `Article #${article?.id || ''}`
            const excerpt = buildExcerptFromHtml(article?.descricao || article?.noticia || '', { maxLength: 170 })
            const previewText = buildPreviewText(excerpt, { maxLength: 145, suffix: '' })
            const category = getArticleCategory(article)
            const categoryLabel = getCategoryLabel(category)

            return (
              <article
                key={article.id}
                className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-[20px] py-[25px]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                  <div className="relative h-[150px] w-full shrink-0 overflow-hidden rounded-[6px] md:w-[300px]">
                    <Image
                      src={cardImage}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className={isFallback ? 'object-contain p-4' : 'object-cover'}
                      onError={() => setFailedImages((prev) => new Set(prev).add(article.id))}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <Link
                      href={`/news/${article.id}`}
                      className="text-[16px] font-bold leading-[1.25] text-[#2596FF] hover:text-[#25B1FF]"
                    >
                      {title}
                    </Link>
                    <p className="line-clamp-3 text-[14px] font-normal leading-[1.45] text-[#DDD]">
                      {previewText || 'Apercu indisponible.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/news/${article.id}`}
                        className="inline-flex items-center gap-2 rounded-[4px] bg-[#2596FF] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.06em] text-white hover:bg-[#2976E8]"
                      >
                        Lire plus
                        <span className="text-[13px]">+</span>
                      </Link>
                      <span className="rounded-[4px] bg-[#141433] px-4 py-3 text-[12px] font-normal uppercase text-[#DDD]">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>

      {pageCount > 1 ? (
        <nav className="flex items-center justify-center gap-4 py-3" aria-label="Pagination des actualites">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={clampedPage === 0}
            className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page precedente"
          >
            <i className="material-icons text-[18px]" aria-hidden>chevron_left</i>
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => {
              const isActive = index === clampedPage
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  className={`px-1 text-[14px] font-normal leading-none transition ${
                    isActive ? 'text-white underline' : 'text-[#DDD] hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Page ${index + 1}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            disabled={clampedPage >= pageCount - 1}
            className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page suivante"
          >
            <i className="material-icons text-[18px]" aria-hidden>chevron_right</i>
          </button>
        </nav>
      ) : null}
    </main>
  )
}
