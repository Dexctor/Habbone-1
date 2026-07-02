'use client'

import { useEffect, useMemo, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { SiteButton, SiteEmptyState, SiteHeader, SitePage, SitePanel, SiteSearch, SiteSkeleton } from '@/components/site'

type Mobi = {
  id: number
  name: string
  image: string
  category: string
}

const FURNI_API = 'https://www.habboassets.com/api/v1/furniture?limit=1000'

const GRID_COLS = 8
const GRID_ROWS = 5
const PAGE_SIZE = GRID_COLS * GRID_ROWS

export default function MobisPageClient() {
  const [items, setItems] = useState<Mobi[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(FURNI_API)
      .then((r) => r.json())
      .then((json) => {
        const raw = Array.isArray(json?.furniture) ? json.furniture : []

        const data = raw
          .filter((row: any) => typeof row?.url_icon_habbo === 'string' && row.url_icon_habbo.length > 0)
          .map((row: any, idx: number) => ({
            id: Number(row?.id ?? idx),
            name: String(row?.name || row?.classname || 'Mobi'),
            image: String(row?.url_icon_habbo || ''),
            category: String(row?.furniline || row?.type || 'Autre'),
          }))

        setItems(data)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const term = search.trim().toLowerCase()
    return items.filter(
      (m) => m.name.toLowerCase().includes(term) || m.category.toLowerCase().includes(term)
    )
  }, [items, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)

  const visibleItems = useMemo(() => {
    const start = clampedPage * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, clampedPage])

  const visibleSlots = useMemo(() => {
    if (visibleItems.length >= PAGE_SIZE) return visibleItems
    return [
      ...visibleItems,
      ...Array.from({ length: PAGE_SIZE - visibleItems.length }, () => null as Mobi | null),
    ]
  }, [visibleItems])

  return (
    <SitePage>
      <SiteHeader
        title="Mobis Habbo"
        imageSrc="/img/store.png"
        description="Tous les mobiliers globaux publiés sur Habbo."
      />

      {/* Search */}
      <SiteSearch
        height="sm"
        wrapperClassName="sm:w-[320px]"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
        placeholder="Rechercher un mobi..."
      />

      {/* Mobis Grid */}
      <SitePanel padded={false} className="overflow-hidden">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[16px] font-bold uppercase text-white">
            Catalogue ({filtered.length} mobis)
          </h2>

          <div className="flex items-center gap-[5px]">
            <SiteButton
              type="button"
              size="icon-md"
              aria-label="Page precedente"
              onClick={() => setPage((c) => Math.max(0, c - 1))}
              disabled={clampedPage === 0}
              className="rounded-[3px]"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_left</i>
            </SiteButton>
            <span className="px-2 text-[12px] text-[#BEBECE]">
              {clampedPage + 1} / {pageCount}
            </span>
            <SiteButton
              type="button"
              size="icon-md"
              variant="ghost"
              aria-label="Page suivante"
              onClick={() => setPage((c) => Math.min(pageCount - 1, c + 1))}
              disabled={clampedPage >= pageCount - 1}
              className="rounded-[3px]"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_right</i>
            </SiteButton>
          </div>
        </header>

        <div className="px-[18px] py-[20px]">
          {loading ? (
            <div className="grid grid-cols-4 gap-[10px] sm:grid-cols-6 lg:grid-cols-8" aria-label="Chargement des mobis">
              {Array.from({ length: PAGE_SIZE }, (_, index) => (
                <SiteSkeleton key={index} className="aspect-square min-h-[64px] rounded-[4px]" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <SiteEmptyState className="border-[#1F1F3E] bg-transparent px-4 py-16 text-xs">Aucun mobi trouvé.</SiteEmptyState>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-4 gap-[10px] sm:grid-cols-6 lg:grid-cols-8">
                {visibleSlots.map((mobi, index) => (
                  mobi ? (
                    <TooltipPrimitive.Root key={`${mobi.id}-${mobi.name}`}>
                      <TooltipPrimitive.Trigger asChild>
                        <div
                          className="flex aspect-square w-full min-h-[64px] flex-col items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group transition hover:bg-[#303060]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mobi.image}
                            alt={mobi.name}
                            className="h-[34px] w-[34px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                            onError={(event) => {
                              (event.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      </TooltipPrimitive.Trigger>
                      <TooltipPrimitive.Portal>
                        <TooltipPrimitive.Content
                          sideOffset={6}
                          className="z-50 max-w-[200px] rounded-md bg-black px-3 py-1.5 text-xs text-white text-center shadow-md animate-in fade-in-0 zoom-in-95"
                        >
                          <p className="font-semibold">{mobi.name}</p>
                          <p className="text-[10px] text-white/60">{mobi.category}</p>
                          <TooltipPrimitive.Arrow className="fill-black" width={10} height={6} />
                        </TooltipPrimitive.Content>
                      </TooltipPrimitive.Portal>
                    </TooltipPrimitive.Root>
                  ) : (
                    <div
                      key={`empty-${index}`}
                      className="flex aspect-square w-full min-h-[64px] flex-col items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] opacity-35"
                    />
                  )
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      </SitePanel>
    </SitePage>
  )
}
