'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SiteButton, SiteEmptyState, SiteHeader, SitePage, SitePagination, SiteSearch } from '@/components/site'
import { mediaUrl } from '@/lib/media-url'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'

const NEWS_FALLBACK_ICON = '/img/news.png'
const PAGE_SIZE = 10

type CategoryId = 'novidades' | 'raros' | 'habbo' | 'guides' | 'packs' | 'habbone'

const CATEGORY_LABELS: Record<CategoryId, string> = {
  novidades: 'NOUVEAUTES',
  raros: 'RARES',
  habbo: 'HABBO',
  guides: 'GUIDE DE JEUX',
  packs: 'PACKS',
  habbone: 'HABBONE',
}

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
  return CATEGORY_LABELS[category]
}

// Conteneur de l'image : 300x150 desktop, full-width x150 mobile.
// On choisit cover/contain selon le ratio réel de l'image pour éviter
// l'étirement ou le crop massif. Seuils calibrés sur le ratio cible 2:1.
const CONTAINER_RATIO = 300 / 150 // = 2

type FitMode = 'cover' | 'contain'

function pickFitMode(naturalWidth: number, naturalHeight: number): FitMode {
  if (!naturalWidth || !naturalHeight) return 'cover'
  // Image plus petite que le conteneur dans les deux dimensions → contain
  // (sinon next/image upscale et ça pixellise).
  if (naturalWidth < 280 && naturalHeight < 140) return 'contain'
  const ratio = naturalWidth / naturalHeight
  // Trop large (panoramique) ou trop verticale/carrée → contain pour tout
  // garder visible. Sinon cover, le crop sera léger.
  if (ratio > CONTAINER_RATIO * 1.35) return 'contain'
  if (ratio < CONTAINER_RATIO * 0.75) return 'contain'
  return 'cover'
}

export default function NewsPageClient({ articles }: { articles: any[] }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const [fitModes, setFitModes] = useState<Record<number, FitMode>>({})

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return articles
    return articles.filter((article) => {
      const title = stripHtml(article?.titulo || '').toLowerCase()
      const desc = stripHtml(article?.descricao || article?.noticia || '').toLowerCase()
      return title.includes(term) || desc.includes(term)
    })
  }, [articles, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <SitePage className="gap-6 py-8 sm:px-8">
      <SiteHeader
        title="Tous les articles"
        imageSrc="/img/news.png"
        compact
        actions={
          <>
            <SiteButton asChild size="sm">
              <Link href="/news/nouveau">Publier un article</Link>
            </SiteButton>
            <SiteSearch
              height="sm"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder="Rechercher un titre"
            />
          </>
        }
      />

      <section className="space-y-[10px]">
        {visible.length === 0 ? (
          <SiteEmptyState>Aucun article trouvé.</SiteEmptyState>
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
                  {/* Image preview — taille verrouillée à 150×300 (md+), même rendu sur mobile.
                      Le fond gradient + l'inset shadow donnent de la profondeur même quand
                      l'image est petite, transparente ou en fallback. */}
                  <Link
                    href={`/news/${article.id}`}
                    aria-label={title}
                    className="group relative h-[150px] w-full shrink-0 overflow-hidden rounded-[6px] bg-gradient-to-br from-[#1F1F3E] via-[#25254D] to-[#303060] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_-30px_60px_-20px_rgba(0,0,0,0.4)] md:w-[300px]"
                  >
                    <Image
                      src={cardImage}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className={
                        isFallback
                          ? 'object-contain p-6 opacity-70 transition-transform duration-300 group-hover:scale-[1.04]'
                          : `${
                              fitModes[article.id] === 'contain' ? 'object-contain p-2' : 'object-cover'
                            } transition-transform duration-300 group-hover:scale-[1.04]`
                      }
                      onLoad={(event) => {
                        if (isFallback) return
                        const target = event.currentTarget
                        const mode = pickFitMode(target.naturalWidth, target.naturalHeight)
                        setFitModes((prev) =>
                          prev[article.id] === mode ? prev : { ...prev, [article.id]: mode },
                        )
                      }}
                      onError={() => setFailedImages((prev) => new Set(prev).add(article.id))}
                    />
                    {/* Léger voile en bas pour que la légende reste lisible si on
                        ajoute un overlay un jour, et pour adoucir le bord. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <Link
                      href={`/news/${article.id}`}
                      className="text-[16px] font-bold leading-[1.25] text-[#2596FF] hover:text-[#25B1FF]"
                    >
                      {title}
                    </Link>
                    <p className="line-clamp-3 text-[14px] font-normal leading-[1.45] text-[#DDD]">
                      {previewText || 'Aperçu indisponible.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <SiteButton
                        asChild
                        className="h-auto px-5 py-3 text-[12px] tracking-[0.06em]"
                      >
                        <Link href={`/news/${article.id}`}>
                          Lire plus
                          <span className="text-[13px]">+</span>
                        </Link>
                      </SiteButton>
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

      <SitePagination
        page={clampedPage}
        pageCount={pageCount}
        onPageChange={setPage}
        label="Pagination des actualités"
      />
    </SitePage>
  )
}
