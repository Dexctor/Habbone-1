'use client'

import { useEffect, useMemo, useState } from 'react'

type Badge = {
  code: string
  name: string
  image: string
}

type HotelFilter = 'all' | 'fr' | 'com' | 'nl' | 'tr' | 'com.br' | 'it' | 'es' | 'de' | 'fi'

const HOTEL_FILTERS: { value: HotelFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'fr', label: 'FR' },
  { value: 'com', label: 'COM' },
  { value: 'com.br', label: 'BR' },
  { value: 'es', label: 'ES' },
  { value: 'it', label: 'IT' },
  { value: 'de', label: 'DE' },
  { value: 'nl', label: 'NL' },
  { value: 'fi', label: 'FI' },
  { value: 'tr', label: 'TR' },
]

const BADGE_API_BASE = 'https://www.habboassets.com/api/v1/badges'
const GRID_COLS = 6
const GRID_ROWS = 6
const PAGE_SIZE = GRID_COLS * GRID_ROWS
const FETCH_LIMIT = 1000

export default function LatestBadges() {
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hotel, setHotel] = useState<HotelFilter>('all')

  useEffect(() => {
    const url = hotel === 'all'
      ? `${BADGE_API_BASE}?limit=${FETCH_LIMIT}`
      : `${BADGE_API_BASE}?limit=${FETCH_LIMIT}&hotel=${hotel}`

    setLoading(true)
    setPage(0)

    fetch(url)
      .then((response) => response.json())
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

        setAllBadges(data)
      })
      .catch(() => setAllBadges([]))
      .finally(() => setLoading(false))
  }, [hotel])

  const items = allBadges
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

  const previousPage = () => setPage((current) => Math.max(0, current - 1))
  const nextPage = () => setPage((current) => Math.min(pageCount - 1, current + 1))

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[16px] font-bold uppercase text-white">Derniers Badges</h2>

          <div className="flex items-center gap-[5px]">
            {/* Hotel filter */}
            <select
              value={hotel}
              onChange={(e) => setHotel(e.target.value as HotelFilter)}
              className="h-[40px] rounded-[3px] border border-[#141433] bg-[#1F1F3E] px-2 text-[11px] font-bold uppercase text-[#DDD] outline-none focus:border-[#2596FF]"
            >
              {HOTEL_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#141433]">
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-label="Badges precedents"
              onClick={previousPage}
              disabled={clampedPage === 0}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[#2596FF] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>
                chevron_left
              </i>
            </button>
            <span className="px-1 text-[11px] font-bold text-[#BEBECE]">
              {clampedPage + 1}/{pageCount}
            </span>
            <button
              type="button"
              aria-label="Badges suivants"
              onClick={nextPage}
              disabled={clampedPage >= pageCount - 1}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>
                chevron_right
              </i>
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
            <div className="grid grid-cols-6 gap-[10px]">
              {visibleSlots.map((badge, index) => (
                <div
                  key={badge ? `${badge.code}-${badge.image}` : `empty-${index}`}
                  title={badge?.name || ''}
                  className={`flex aspect-square w-full min-h-[64px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${
                    badge ? 'group transition hover:bg-[#303060]' : 'opacity-35'
                  }`}
                >
                  {badge ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="h-[34px] w-[34px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                        onError={(event) => {
                          ;(event.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
