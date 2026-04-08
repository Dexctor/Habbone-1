'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_C_IMAGES_BASE || 'https://images.habbo.com/c_images'
const EU_SSL_C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_EUSSL_C_IMAGES_BASE || 'https://images-eussl.habbo.com/c_images'
const ALT_C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_ALT_C_IMAGES_BASE || 'https://habboo-a.akamaihd.net/c_images'

type NewsBadgeItem = {
  newsId: number
  title: string
  badgeCode: string
  badgeAlbum?: string | null
  badgeImageUrl: string
  articleUrl: string
  publishedAt: string | null
}

const MAX_BADGES = 220
const PAGE_SIZE = 4

function inferAlbumFromUrl(imageUrl?: string | null): string | null {
  const raw = String(imageUrl || '').trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const match = url.pathname.match(/\/c_images\/([^/]+)\//i)
    return match?.[1] || null
  } catch {
    const match = raw.match(/\/c_images\/([^/]+)\//i)
    return match?.[1] || null
  }
}

function HeaderBadgeImage({
  code,
  album,
  imageUrl,
}: {
  code: string
  album?: string | null
  imageUrl?: string | null
}) {
  const [idx, setIdx] = useState(0)
  const normCode = String(code || '').trim()

  const candidates = useMemo(() => {
    if (!normCode) return [] as string[]
    const list: string[] = []
    const firstUrl = String(imageUrl || '').trim()
    if (firstUrl) list.push(firstUrl)

    const upper = normCode.toUpperCase()
    const codes = new Set<string>([normCode, upper])
    if (upper.startsWith('ACH_')) {
      const rest = upper.replace(/^ACH_/, '')
      const camel = `ACH_${rest
        .split('_')
        .filter(Boolean)
        .map((seg) => seg.charAt(0) + seg.slice(1).toLowerCase())
        .join('')}`
      codes.add(camel)
    }

    const hosts = [C_IMAGES_BASE, EU_SSL_C_IMAGES_BASE, ALT_C_IMAGES_BASE]
    const albumFromUrl = inferAlbumFromUrl(imageUrl)
    const albumNorm = String(album || '').trim()
    const albums = new Set<string>()
    if (albumNorm) {
      albums.add(albumNorm)
      albums.add(albumNorm.toLowerCase())
    }
    if (albumFromUrl) {
      albums.add(albumFromUrl)
      albums.add(albumFromUrl.toLowerCase())
    }
    albums.add('album1584')

    for (const a of albums) {
      if (!a) continue
      for (const h of hosts) {
        for (const c of codes) {
          list.push(`${h}/${a}/${c}.gif`)
          list.push(`${h}/${a}/${c}.png`)
        }
      }
    }

    for (const h of hosts) {
      for (const c of codes) {
        list.push(`${h}/Badges/${c}.gif`)
        list.push(`${h}/Badges/${c}.png`)
        list.push(`${h}/badges/${c}.gif`)
        list.push(`${h}/badges/${c}.png`)
      }
    }

    return list.filter((value, i, arr) => arr.indexOf(value) === i)
  }, [album, imageUrl, normCode])

  const src = candidates[Math.min(idx, Math.max(0, candidates.length - 1))]

  if (!normCode || candidates.length === 0 || idx >= candidates.length) {
    return <span className="block h-[28px] w-[28px] rounded bg-[rgba(255,255,255,0.12)]" />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={normCode}
      width={28}
      height={28}
      loading="lazy"
      className="h-[28px] w-[28px] image-pixelated"
      onError={() => setIdx((v) => v + 1)}
    />
  )
}

function NavButton({
  disabled,
  onClick,
  icon,
  label,
  id,
}: {
  disabled: boolean
  onClick: () => void
  icon: 'chevron_left' | 'chevron_right'
  label: string
  id: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          id={id}
          className={`grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[6px] border border-[#141433] bg-[rgba(255,255,255,.08)] text-[#BEBECE] shadow-[0_1px_0_rgba(255,255,255,.08)] transition-colors hover:bg-[#2596FF] hover:text-white ${disabled ? 'opacity-45' : ''}`}
          onClick={onClick}
          aria-disabled={disabled}
          disabled={disabled}
        >
          <i className="material-icons leading-none text-[24px]">{icon}</i>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export default function BadgesSlider() {
  const [items, setItems] = useState<NewsBadgeItem[]>([])
  const [page, setPage] = useState(0)

  const visibleItems = useMemo(() => items.slice(0, MAX_BADGES), [items])
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE)),
    [visibleItems.length],
  )
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  const currentPageItems = useMemo(() => {
    const start = page * PAGE_SIZE
    const chunk = visibleItems.slice(start, start + PAGE_SIZE)
    const padded: Array<NewsBadgeItem | null> = [...chunk]
    while (padded.length < PAGE_SIZE) padded.push(null)
    return padded
  }, [page, visibleItems])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/news/badges', { cache: 'no-store' })
        if (!response.ok) return
        const json = await response.json().catch(() => ({}))
        const data = Array.isArray(json?.data) ? (json.data as NewsBadgeItem[]) : []
        if (!cancelled) setItems(data)
      } catch {}
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setPage((prev) => Math.min(prev, Math.max(0, totalPages - 1)))
  }, [totalPages])

  return (
    <div id="badges-free" className="col-4 pl-0 w-full lg:w-1/3 hidden lg:block">
      <div className="badges-free flex h-[92px] w-full items-center pl-[20px]">
        <TooltipProvider>
          <div className="flex w-full items-center gap-2">
            <NavButton
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              icon="chevron_left"
              label="Precedent"
              id="prev-badges"
            />

            <div className="min-w-0 flex-1 overflow-hidden rounded-[6px] border border-[#141433] bg-[rgba(255,255,255,.05)] px-[6px] py-[6px]">
              <div className="flex h-[56px] items-center gap-[10px] overflow-hidden">
                {currentPageItems.map((item, index) => (
                  <div
                    key={item ? `${item.newsId}-${item.badgeCode}-${index}` : `empty-${page}-${index}`}
                    className="h-[56px] w-[56px] shrink-0"
                    role="group"
                    aria-label={`${page * PAGE_SIZE + index + 1} / ${visibleItems.length || PAGE_SIZE}`}
                  >
                    {item ? (
                      <a
                        className="grid h-full w-full place-items-center rounded-[6px] border border-[#141433] bg-[#1F1F3E] shadow-[0_1px_0_rgba(255,255,255,.1)] transition-colors hover:bg-[#2596FF]"
                        href={item.articleUrl}
                        title={`${item.badgeCode} - ${item.title}`}
                      >
                        <HeaderBadgeImage
                          code={item.badgeCode}
                          album={item.badgeAlbum}
                          imageUrl={item.badgeImageUrl}
                        />
                      </a>
                    ) : (
                      <span className="grid h-full w-full place-items-center rounded-[6px] border border-[#141433] bg-[#1F1F3E] opacity-30">
                        <span className="h-[28px] w-[28px] rounded bg-[rgba(255,255,255,0.14)]" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <NavButton
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              icon="chevron_right"
              label="Suivant"
              id="next-badges"
            />
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
