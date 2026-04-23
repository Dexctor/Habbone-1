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

const BADGE_API = 'https://www.habboassets.com/api/v1/badges'
const FURNI_API = 'https://www.habboassets.com/api/v1/furniture'
const GRID_COLS = 6
const GRID_ROWS = 6
const PAGE_SIZE = GRID_COLS * GRID_ROWS

const TABS: { id: TabId; icon: string; tooltip: string }[] = [
  { id: 'mondial', icon: '/img/earth.png', tooltip: 'Mondial' },
  { id: 'fr', icon: '/img/badges.png', tooltip: 'FR' },
  { id: 'mobis', icon: '/img/furni.png', tooltip: 'Mobis' },
]

function parseBadges(json: any): Item[] {
  return Array.isArray(json?.badges)
    ? json.badges
        .filter((r: any) => typeof r?.url_habbo === 'string' && r.url_habbo.length > 0)
        .map((r: any) => ({
          code: String(r?.code || ''),
          name: String(r?.name || r?.code || 'Badge'),
          image: String(r?.url_habbo || ''),
        }))
    : []
}

function parseFurni(json: any): Item[] {
  return Array.isArray(json?.furniture)
    ? json.furniture
        .filter((r: any) => typeof r?.url_icon_habbo === 'string' && r.url_icon_habbo.length > 0)
        .map((r: any) => ({
          code: String(r?.classname || r?.id || ''),
          name: String(r?.name || r?.classname || 'Mobi'),
          image: String(r?.url_icon_habbo || ''),
        }))
    : []
}

export default function LatestBadges() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<TabId>('mondial')
  const [direction, setDirection] = useState<1 | -1>(1)
  const reduce = useReducedMotion()

  useEffect(() => {
    setLoading(true)
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

    fetch(url)
      .then((r) => r.json())
      .then((json) => setItems(parser(json)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
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
