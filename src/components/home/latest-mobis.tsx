'use client'

import { useEffect, useMemo, useState } from 'react'

type Badge = {
  code: string
  name: string
  image: string
}

const BADGE_API = 'https://www.habboassets.com/api/v1/badges?limit=240'
const PAGE_SIZE = 36

export default function LatestMobis() {
  const [items, setItems] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetch(BADGE_API)
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

        setItems(data)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)

  const visibleItems = useMemo(() => {
    const start = clampedPage * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, clampedPage])

  const previousPage = () => setPage((current) => Math.max(0, current - 1))
  const nextPage = () => setPage((current) => Math.min(pageCount - 1, current + 1))

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[16px] font-bold uppercase text-white">Derniers Badges</h2>

          <div className="flex items-center gap-[5px]">
            <button
              type="button"
              aria-label="Mobis precedents"
              onClick={previousPage}
              disabled={clampedPage === 0}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[#2596FF] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>
                chevron_left
              </i>
            </button>
            <button
              type="button"
              aria-label="Mobis suivants"
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
              Chargement des mobis...
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-[#1F1F3E] px-4 py-16 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Aucun mobi disponible.
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-[10px] sm:grid-cols-7 lg:grid-cols-9">
              {visibleItems.map((badge) => (
                <div
                  key={`${badge.code}-${badge.image}`}
                  title={badge.name}
                  className="group flex h-[50px] w-[50px] items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:bg-[#303060]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={badge.image}
                    alt={badge.name}
                    className="h-[24px] w-[24px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                    onError={(event) => {
                      ;(event.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
