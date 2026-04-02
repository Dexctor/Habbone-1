'use client'

import { useEffect, useMemo, useState } from 'react'

type Badge = {
  code: string
  name: string
  image: string
}

type TabId = 'mondial' | 'fr'

const ALL_HOTELS = ['com', 'fr', 'nl', 'tr', 'com.br', 'it', 'es', 'de', 'fi']
const BADGE_API_BASE = 'https://www.habboassets.com/api/v1/badges'

const GRID_COLS = 8
const GRID_ROWS = 6
const PAGE_SIZE = GRID_COLS * GRID_ROWS

export default function BadgesPageClient() {
  const [tab, setTab] = useState<TabId>('mondial')
  const [mondialBadges, setMondialBadges] = useState<Badge[]>([])
  const [frBadges, setFrBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setLoading(true)

    // Fetch badges for all hotels (mondial)
    const fetchMondial = fetch(`${BADGE_API_BASE}?limit=2000`)
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json?.badges)
          ? json.badges
              .filter((row: any) => typeof row?.url_habbo === 'string' && row.url_habbo.length > 0)
              .map((row: any) => ({
                code: String(row?.code || ''),
                name: String(row?.name || row?.code || 'Badge'),
                image: String(row?.url_habbo || ''),
              }))
          : []
        setMondialBadges(data)
      })
      .catch(() => setMondialBadges([]))

    // Fetch badges specifically from habbo.fr
    const fetchFr = fetch(`${BADGE_API_BASE}?limit=2000&hotel=fr`)
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json?.badges)
          ? json.badges
              .filter((row: any) => typeof row?.url_habbo === 'string' && row.url_habbo.length > 0)
              .map((row: any) => ({
                code: String(row?.code || ''),
                name: String(row?.name || row?.code || 'Badge'),
                image: String(row?.url_habbo || ''),
              }))
          : []
        setFrBadges(data)
      })
      .catch(() => setFrBadges([]))

    Promise.all([fetchMondial, fetchFr]).finally(() => setLoading(false))
  }, [])

  const items = tab === 'mondial' ? mondialBadges : frBadges
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
      ...Array.from({ length: PAGE_SIZE - visibleItems.length }, () => null as Badge | null),
    ]
  }, [visibleItems])

  const handleTabChange = (newTab: TabId) => {
    setTab(newTab)
    setPage(0)
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/badges.png" alt="" className="h-[40px] w-auto image-pixelated" />
          <div className="space-y-1">
            <h1 className="text-[20px] font-bold uppercase tracking-[0.08em] text-[#DDD]">
              Badges Habbo
            </h1>
            <p className="text-[14px] text-[#BEBECE]">
              Explore tous les badges de l&apos;univers Habbo.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleTabChange('mondial')}
          className={`rounded-[4px] border px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] transition ${
            tab === 'mondial'
              ? 'border-[#2596FF] bg-[#2596FF] text-white'
              : 'border-[#34345A] bg-[#1F1F3E] text-[#BEBECE] hover:bg-[#25254D] hover:text-[#DDD]'
          }`}
        >
          Mondial ({mondialBadges.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('fr')}
          className={`rounded-[4px] border px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] transition ${
            tab === 'fr'
              ? 'border-[#2596FF] bg-[#2596FF] text-white'
              : 'border-[#34345A] bg-[#1F1F3E] text-[#BEBECE] hover:bg-[#25254D] hover:text-[#DDD]'
          }`}
        >
          FR ({frBadges.length})
        </button>
      </div>

      {/* Badge Grid */}
      <section className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[16px] font-bold uppercase text-white">
            {tab === 'mondial' ? 'Badges Mondial' : 'Badges FR'}
          </h2>

          <div className="flex items-center gap-[5px]">
            <button
              type="button"
              aria-label="Page precedente"
              onClick={() => setPage((c) => Math.max(0, c - 1))}
              disabled={clampedPage === 0}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[#2596FF] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_left</i>
            </button>
            <span className="px-2 text-[12px] text-[#BEBECE]">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Page suivante"
              onClick={() => setPage((c) => Math.min(pageCount - 1, c + 1))}
              disabled={clampedPage >= pageCount - 1}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_right</i>
            </button>
          </div>
        </header>

        <div className="px-[18px] py-[20px]">
          {loading ? (
            <div className="rounded-[4px] border border-dashed border-[#1F1F3E] px-4 py-16 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Chargement des badges...
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-[#1F1F3E] px-4 py-16 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Aucun badge disponible.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-[10px] sm:grid-cols-6 lg:grid-cols-8">
              {visibleSlots.map((badge, index) => (
                <div
                  key={badge ? `${badge.code}-${badge.image}` : `empty-${index}`}
                  title={badge?.name || ''}
                  className={`flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${
                    badge ? 'group transition hover:bg-[#303060]' : 'opacity-35'
                  }`}
                >
                  {badge ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={badge.image}
                      alt={badge.name}
                      className="h-[34px] w-[34px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                      onError={(event) => {
                        (event.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
