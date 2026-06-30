'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

type Item = {
  code: string
  name: string
  image: string
}

type TabId = 'mondial' | 'fr' | 'mobis'

const BADGE_API = '/api/habboassets/badges'
const FURNI_API = '/api/habboassets/furniture'
const GRID_COLS = 6
const GRID_ROWS = 6
const PAGE_SIZE = GRID_COLS * GRID_ROWS
const CACHE_PREFIX = 'habbone:latest-assets:'

const TABS: { id: TabId; icon: string; tooltip: string }[] = [
  { id: 'mondial', icon: '/img/earth.png', tooltip: 'Mondial' },
  { id: 'fr', icon: '/img/badges.png', tooltip: 'FR' },
  { id: 'mobis', icon: '/img/furni.png', tooltip: 'Mobis' },
]

function firstArray(...values: unknown[]): any[] {
  for (const value of values) {
    if (Array.isArray(value)) return value
  }

  return []
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

function parseBadges(json: any): Item[] {
  const rows = firstArray(json?.badges, json?.data?.badges, json?.data, json?.items, json)

  return rows
    .map((row: any) => {
      const image = firstText(
        row?.url_habbo,
        row?.image,
        row?.url,
        row?.badge_image,
        row?.url_icon_habbo,
      )

      if (!image) return null

      return {
        code: firstText(row?.code, row?.id, row?.name),
        name: firstText(row?.name, row?.title, row?.code) || 'Badge',
        image,
      }
    })
    .filter(Boolean) as Item[]
}

function parseFurni(json: any): Item[] {
  const rows = firstArray(json?.furniture, json?.data?.furniture, json?.data, json?.items, json)

  return rows
    .map((row: any) => {
      const image = firstText(
        row?.url_icon_habbo,
        row?.url_habbo,
        row?.image,
        row?.icon,
        row?.url,
      )

      if (!image) return null

      return {
        code: firstText(row?.classname, row?.code, row?.id, row?.name),
        name: firstText(row?.name, row?.classname, row?.code) || 'Mobi',
        image,
      }
    })
    .filter(Boolean) as Item[]
}

function readCachedItems(tab: TabId): Item[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${tab}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.items) ? parsed.items : []
  } catch {
    return []
  }
}

function writeCachedItems(tab: TabId, items: Item[]) {
  if (typeof window === 'undefined' || items.length === 0) return

  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${tab}`,
      JSON.stringify({ items, updatedAt: Date.now() }),
    )
  } catch {
    // Local storage is only an opportunistic fallback for unstable upstream data.
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HabboAssets proxy responded ${response.status}`)

  const json = await response.json()
  if (json?.error) throw new Error(String(json.error))
  return json
}

export default function LatestBadges() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<TabId>('mondial')
  const [direction, setDirection] = useState<1 | -1>(1)
  const reduce = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    const cached = readCachedItems(tab)

    setItems(cached)
    setLoading(cached.length === 0)
    setUnavailable(false)
    setPage(0)

    let url: string
    let parser: (json: any) => Item[]

    if (tab === 'mobis') {
      url = `${FURNI_API}?limit=1000`
      parser = parseFurni
    } else if (tab === 'fr') {
      url = `${BADGE_API}?limit=1000&hotel=fr`
      parser = parseBadges
    } else {
      url = `${BADGE_API}?limit=1000`
      parser = parseBadges
    }

    fetchJson(url)
      .then((json) => {
        if (cancelled) return

        const nextItems = parser(json)
        if (nextItems.length > 0) {
          setItems(nextItems)
          setUnavailable(false)
          writeCachedItems(tab, nextItems)
          return
        }

        if (cached.length === 0) {
          setItems([])
          setUnavailable(true)
        }
      })
      .catch(() => {
        if (!cancelled && cached.length > 0) setItems(cached)
        if (!cancelled && cached.length === 0) setUnavailable(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab])

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)

  const visibleItems = useMemo(() => {
    const start = clampedPage * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, clampedPage])

  const visibleSlots = useMemo(() => {
    if (visibleItems.length >= PAGE_SIZE) return visibleItems
    return [
      ...visibleItems,
      ...Array.from({ length: PAGE_SIZE - visibleItems.length }, () => null as Item | null),
    ]
  }, [visibleItems])

  const previousPage = () => {
    setDirection(-1)
    setPage((c) => Math.max(0, c - 1))
  }
  const nextPage = () => {
    setDirection(1)
    setPage((c) => Math.min(pageCount - 1, c + 1))
  }
  const switchTab = (next: TabId) => {
    if (next === tab) return
    // Direction based on tab order: mondial → fr → mobis
    const order: TabId[] = ['mondial', 'fr', 'mobis']
    setDirection(order.indexOf(next) > order.indexOf(tab) ? 1 : -1)
    setTab(next)
  }

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[14px] font-bold uppercase text-white">
            Derniers Badges/Mobis
          </h2>

          <div className="flex items-center gap-[5px]">
            {/* Tab icons */}
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.tooltip}
                onClick={() => switchTab(t.id)}
                className={`grid h-[40px] w-[40px] place-items-center rounded-[3px] transition ${
                  tab === t.id
                    ? 'bg-[#2596FF] ring-1 ring-white/20'
                    : 'bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.icon} alt={t.tooltip} className="h-[20px] w-[20px] image-pixelated" />
              </button>
            ))}
          </div>
        </header>

        <div className="px-[18px] py-[20px]">
          <TooltipProvider delayDuration={150}>
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={loading ? `${tab}-loading` : `${tab}-${clampedPage}`}
                  custom={direction}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="grid grid-cols-6 gap-[3px]"
                >
                  {loading
                    ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                        <div
                          key={`skeleton-${index}`}
                          className="flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden relative"
                        >
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer"
                            style={{ animationDelay: `${(index % 6) * 80}ms` }}
                          />
                        </div>
                      ))
                    : visibleItems.length === 0
                      ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] opacity-35"
                          />
                        ))
                      : visibleSlots.map((item, index) => (
                          item ? (
                            <TooltipPrimitive.Root key={`${item.code}-${index}`}>
                              <TooltipPrimitive.Trigger asChild>
                                <motion.div
                                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(index * 0.012, 0.2) }}
                                  className="flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group transition hover:bg-[#303060]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-[34px] w-[34px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  />
                                </motion.div>
                              </TooltipPrimitive.Trigger>
                              <TooltipPrimitive.Portal>
                                <TooltipPrimitive.Content
                                  sideOffset={6}
                                  className="z-50 rounded-md bg-black px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95"
                                >
                                  {item.name}
                                  <TooltipPrimitive.Arrow className="fill-black" width={10} height={6} />
                                </TooltipPrimitive.Content>
                              </TooltipPrimitive.Portal>
                            </TooltipPrimitive.Root>
                          ) : (
                            <div
                              key={`empty-${index}`}
                              className="flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] opacity-35"
                            />
                          )
                        ))}
                </motion.div>
              </AnimatePresence>
              {!loading && unavailable ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
                  <div className="rounded-[4px] border border-[#34345A] bg-[#1F1F3E]/95 px-4 py-3 text-[12px] font-semibold text-[#BEBECE] shadow-lg">
                    Données temporairement indisponibles
                  </div>
                </div>
              ) : null}
            </div>
          </TooltipProvider>
        </div>

        {/* Pagination */}
        <footer className="flex items-center justify-between border-t border-[#34345A] bg-[rgba(0,0,0,0.05)] px-5 py-2">
          <span className="text-[11px] text-[#BEBECE]/60">
            {items.length} {tab === 'mobis' ? 'mobis' : 'badges'}
          </span>
          <div className="flex items-center gap-[5px]">
            <button
              type="button"
              onClick={previousPage}
              disabled={clampedPage === 0}
              className="grid h-[32px] w-[32px] place-items-center rounded-[3px] bg-[#2596FF] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[16px]" aria-hidden>chevron_left</i>
            </button>
            <span className="min-w-[45px] text-center text-[11px] font-bold text-[#BEBECE]">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={nextPage}
              disabled={clampedPage >= pageCount - 1}
              className="grid h-[32px] w-[32px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[16px]" aria-hidden>chevron_right</i>
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}
