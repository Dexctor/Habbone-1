import { mediaUrl } from '@/lib/media-url'
import { parseTimestamp } from '@/lib/date-utils'

import { listStoriesService } from '@/server/directus/stories'
import StoriesClient from './stories-client'

function toTimestamp(value: unknown): number {
  if (value == null || value === '') return 0
  return parseTimestamp(value, { numeric: 'auto', numericString: 'number', mysqlLike: true })
}

function resolveStoryTimestamp(row: Record<string, any>): number {
  const candidates = [
    row?.published_at,
    row?.dta,
    row?.data,
    row?.Data,
    row?.date,
    row?.date_created,
    row?.dateCreated,
    row?.created_at,
    row?.createdAt,
    row?.updated_at,
    row?.updatedAt,
  ]
  for (const candidate of candidates) {
    const ts = toTimestamp(candidate)
    if (ts) return ts
  }
  return 0
}

export default async function Stories() {
  // Use server-side service token to ensure visibility even if collection isn't public
  const rows = (await listStoriesService(30).catch(() => [])) as any[]
  const items = Array.isArray(rows)
    ? rows
      .map((r: any) => {
        const src = mediaUrl(r.image ?? r.imagem ?? r.Image ?? r.Imagem ?? '')
        const author = String(r.autor ?? r.Autor ?? '')?.trim() || null
        const timestamp = resolveStoryTimestamp(r)
        const fallbackDate = r.published_at ?? r.data ?? r.dta ?? r.date_created ?? r.dateCreated ?? null
        const date = timestamp || fallbackDate || null
        const alt = author ? author : `Story #${r.id ?? ''}`
        return { id: String(r.id ?? ''), src, alt, author, date, timestamp }
      })
      .filter((x) => x.src)
    : []

  // Ensure chronological order: newest on the left
  const sorted = Array.isArray(items)
    ? [...items].sort((a: any, b: any) => {
      const diff = toTimestamp(b.timestamp ?? b.date) - toTimestamp(a.timestamp ?? a.date)
      if (diff !== 0) return diff
      // fallback to id desc if same/unknown date
      return (Number(b.id) || 0) - (Number(a.id) || 0)
    })
    : []

  return (
    <section className="w-full stories mb-8 md:mb-10">
      <div className="bar-default flex items-center justify-between w-full min-h-[50px] mb-[20px]">
        <div className="title flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/photo.png" alt="stories" className="mr-[12px] image-pixelated w-[28px] h-[28px]" />
          <label className="font-bold text-[var(--text-lg)] leading-[22px] text-[var(--text-100)] uppercase [text-shadow:0_1px_2px_var(--text-shadow)]">
            Stories
          </label>
        </div>
      </div>

      {sorted.length > 0 ? (
        <StoriesClient items={sorted as any} />
      ) : (
        <div className="text-sm opacity-70 py-2">Aucune story pour le moment.</div>
      )}
    </section>
  )
}
