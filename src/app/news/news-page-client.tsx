'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import ContentCard from '@/components/shared/content-card'
import { mediaUrl } from '@/lib/media-url'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'
import { formatDateTimeFromString } from '@/lib/date-utils'

const NEWS_FALLBACK_ICON = '/img/news.png'
const PAGE_SIZE = 8

const CATEGORIES = [
    { id: 'all', label: 'Tous' },
    { id: 'novidades', label: 'NOVIDADES' },
    { id: 'raros', label: 'RAROS' },
    { id: 'casa', label: 'CASA DE JOGOS' },
    { id: 'packs', label: 'PACKS' },
    { id: 'habbone', label: 'HABBONE' },
]

function getArticleCategory(article: any): string {
    const cat = (article?.category || article?.categoria || '').toLowerCase()
    if (cat.includes('raro')) return 'raros'
    if (cat.includes('casa') || cat.includes('jogo')) return 'casa'
    if (cat.includes('pack')) return 'packs'
    if (cat.includes('habbone')) return 'habbone'
    return 'novidades'
}

function getCategoryTone(cat: string): "novidade" | "habbone" | "raros" | "default" {
    if (cat === 'habbone') return 'habbone'
    if (cat === 'raros') return 'raros'
    if (cat === 'novidades') return 'novidade'
    return 'default'
}

export default function NewsPageClient({ articles }: { articles: any[] }) {
    const [query, setQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [page, setPage] = useState(0)

    const filtered = useMemo(() => {
        let result = articles
        const term = query.trim().toLowerCase()
        if (term) {
            result = result.filter((a) => {
                const title = stripHtml(a?.titulo || '').toLowerCase()
                const desc = stripHtml(a?.descricao || a?.noticia || '').toLowerCase()
                return title.includes(term) || desc.includes(term)
            })
        }
        if (activeCategory !== 'all') {
            result = result.filter((a) => getArticleCategory(a) === activeCategory)
        }
        return result
    }, [articles, query, activeCategory])

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const clampedPage = Math.min(page, pageCount - 1)
    const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

    return (
        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-8">
            {/* Dark header bar — Figma style */}
            <div className="flex flex-col gap-4 rounded border border-[#141433] bg-[#1F1F3E] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/news.png" alt="" className="h-7 w-7 image-pixelated" />
                    <h1 className="text-lg font-bold uppercase tracking-wider text-white">
                        Archive de Notícias
                    </h1>
                </div>
                <div className="relative flex-shrink-0 sm:w-72">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35 material-icons text-lg">
                        search
                    </span>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                        placeholder="Rechercher un article"
                        className="h-11 w-full rounded border border-[#141433] bg-[#25254D] pl-9 pr-3 text-sm font-medium text-white/85 placeholder:text-white/30 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25"
                    />
                </div>
            </div>

            {/* Category filter tabs — Figma style */}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setPage(0) }}
                        className={`rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${activeCategory === cat.id
                                ? 'bg-[#2596FF] text-white shadow-md'
                                : 'bg-[#25254D] text-white/60 hover:bg-[#25254D]/80 hover:text-white/90'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Articles list */}
            <section className="grid gap-4">
                {visible.length === 0 ? (
                    <div className="rounded border border-[#141433] bg-[#1F1F3E] px-6 py-16 text-center text-sm uppercase tracking-[0.24em] text-white/45">
                        Aucun article trouvé
                    </div>
                ) : (
                    visible.map((article: any) => {
                        const imageUrl = mediaUrl(article?.imagem)
                        const cardImage = imageUrl || NEWS_FALLBACK_ICON
                        const title = stripHtml(article?.titulo || `Article #${article.id}`) || `Article #${article.id}`
                        const excerpt = buildExcerptFromHtml(article?.descricao || article?.noticia || '')
                        const previewText = buildPreviewText(excerpt, { maxLength: 140 })
                        const authorLabel = stripHtml(article?.autor || '')
                        const publishedAt = formatDateTimeFromString(article?.data)
                        const cat = getArticleCategory(article)

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
                                        sizes="120px"
                                        className={imageUrl ? "object-cover" : "object-contain"}
                                        priority={false}
                                    />
                                }
                                tags={[{ label: cat.toUpperCase(), tone: getCategoryTone(cat) }]}
                                meta={
                                    <>
                                        {authorLabel ? <span>Par {authorLabel}</span> : null}
                                        {authorLabel && publishedAt ? (
                                            <span className="mx-1 h-px w-3 bg-white/20" />
                                        ) : null}
                                        {publishedAt ? <span>Publié le {publishedAt}</span> : null}
                                    </>
                                }
                            />
                        )
                    })
                )}
            </section>

            {/* Numbered pagination — Figma style */}
            {pageCount > 1 ? (
                <nav className="flex items-center justify-center gap-2 py-4">
                    <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={clampedPage === 0}
                        className="grid h-9 w-9 place-items-center rounded bg-[#25254D] text-white/70 hover:bg-[#2596FF] hover:text-white disabled:opacity-40 transition"
                    >
                        ‹
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`grid h-9 w-9 place-items-center rounded text-sm font-bold transition ${i === clampedPage
                                    ? 'bg-[#2596FF] text-white shadow-md'
                                    : 'bg-[#25254D] text-white/60 hover:bg-[#25254D]/80 hover:text-white/90'
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                        disabled={clampedPage >= pageCount - 1}
                        className="grid h-9 w-9 place-items-center rounded bg-[#25254D] text-white/70 hover:bg-[#2596FF] hover:text-white disabled:opacity-40 transition"
                    >
                        ›
                    </button>
                </nav>
            ) : null}
        </main>
    )
}
