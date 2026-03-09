import Link from 'next/link'
import {
  adminListForumComments,
  listForumCategoriesService,
  listForumTopicsWithCategories,
} from '@/server/directus/forum'
import type {
  ForumCategoryRecord,
  ForumCommentRecord,
  ForumTopicRecord,
} from '@/server/directus/types'
import { parseTimestamp } from '@/lib/date-utils'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'

export const revalidate = 60

type ForumPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>
}

type SectionId = 'habbone' | 'EXTRAS' | 'habbo'

type SectionConfig = {
  id: SectionId
  label: string
  icon: string
}

const SECTION_CONFIG: SectionConfig[] = [
  { id: 'habbone', label: 'HABBONE', icon: '/img/public.png' },
  { id: 'EXTRAS', label: 'EXTRAS', icon: '/img/fa-center.png' },
  { id: 'habbo', label: 'HABBO', icon: '/img/hotel.png' },
]

function toStringSafe(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return ''
}

function toNumberSafe(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeStatus(status: unknown): string {
  return toStringSafe(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isActiveStatus(status: unknown): boolean {
  const normalized = normalizeStatus(status)
  return normalized === '' || normalized === 'ativo' || normalized === 'active' || normalized === 'public'
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return /^(1|true|yes|y|s|on)$/i.test(value.trim())
  return false
}

function sortTopics(topics: ForumTopicRecord[]): ForumTopicRecord[] {
  return [...topics].sort((a, b) => {
    const pinnedDiff = Number(asBoolean(b.fixo)) - Number(asBoolean(a.fixo))
    if (pinnedDiff !== 0) return pinnedDiff
    const dateDiff = parseTimestamp(b.data, { numeric: 'ms', numericString: 'parse' }) -
      parseTimestamp(a.data, { numeric: 'ms', numericString: 'parse' })
    if (dateDiff !== 0) return dateDiff
    return toNumberSafe(b.id) - toNumberSafe(a.id)
  })
}

function computeIsAllView(viewParam: string | string[] | undefined): boolean {
  if (typeof viewParam === 'string') return viewParam.toLowerCase() === 'all'
  if (Array.isArray(viewParam)) {
    return viewParam.some((value) => String(value).toLowerCase() === 'all')
  }
  return false
}

function readQuery(raw: string | string[] | undefined): string {
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0].trim()
  return ''
}

function resolveSectionId(categoryId: string, categoryName: string): SectionId {
  const normalizedName = categoryName.toLowerCase()
  if (categoryId === '1' || normalizedName.includes('habbo')) return 'habbo'
  if (
    categoryId === '2' ||
    categoryId === '13' ||
    normalizedName.includes('wired') ||
    normalizedName.includes('video') ||
    normalizedName.includes('art') ||
    normalizedName.includes('pixel') ||
    normalizedName.includes('fan')
  ) {
    return 'EXTRAS'
  }
  return 'habbone'
}

function TopicStatChip({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: number
}) {
  return (
    <span className="inline-flex h-[38px] items-center gap-1.5 rounded-[2px] border border-white/20 bg-[#1F1F3E] px-3 text-[11px] font-bold text-[#DDD]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" className="h-[13px] w-[13px] image-pixelated opacity-95" />
      <span className="uppercase">{label}</span>
      <span className="text-[#BEBECE]">{value}</span>
    </span>
  )
}

function TopicRow({
  topic,
  responseCount,
}: {
  topic: ForumTopicRecord
  responseCount: number
}) {
  const topicId = toNumberSafe(topic.id)
  const title = stripHtml(toStringSafe(topic.titulo)) || `Sujet #${topicId}`
  const excerpt = buildPreviewText(buildExcerptFromHtml(toStringSafe(topic.conteudo), { maxLength: 160 }), {
    maxLength: 140,
    suffix: '',
  }) || 'Aucune description disponible.'
  const postCount = toNumberSafe(topic.views)

  return (
    <article className="flex flex-col gap-4 border-b border-[#34345A] px-5 py-5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <Link
          href={`/forum/topic/${topicId}`}
          className="block text-[16px] font-bold text-white hover:text-[#25B1FF]"
        >
          {title}
        </Link>
        <p className="mt-1 line-clamp-2 text-[13px] text-[#BEBECE]">{excerpt}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <TopicStatChip icon="/img/pincel-mini.png" label="Sujets" value={postCount} />
        <TopicStatChip icon="/img/comment-mini.png" label="Reponses" value={responseCount} />
        <Link
          href={`/forum/topic/${topicId}`}
          className="inline-flex h-[38px] items-center rounded-[2px] bg-[#2596FF] px-4 text-[11px] font-bold uppercase text-white hover:bg-[#2976E8]"
        >
          Voir plus
        </Link>
      </div>
    </article>
  )
}

function SectionBlock({
  label,
  icon,
  topics,
  responsesByTopicId,
}: {
  label: string
  icon: string
  topics: ForumTopicRecord[]
  responsesByTopicId: Map<number, number>
}) {
  return (
    <section className="space-y-2">
      <div className="flex h-[76px] items-center rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0px_0px_0px_0px_rgba(255,255,255,0.05)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="h-[34px] w-[34px] image-pixelated object-contain" />
        <h2 className="ml-3 text-[18px] font-bold uppercase tracking-[0.04em] text-[#DDD]">{label}</h2>
      </div>

      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        {topics.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm font-semibold uppercase tracking-[0.06em] text-[#BEBECE]/70">
            Aucun sujet dans cette section.
          </div>
        ) : (
          topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              responseCount={responsesByTopicId.get(toNumberSafe(topic.id)) || 0}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as Record<string, string | string[]>
  const isAllView = computeIsAllView(resolvedSearchParams.view)
  const searchTerm = readQuery(resolvedSearchParams.q).toLowerCase()

  const [rawCategories, rawTopics, rawComments] = await Promise.all([
    listForumCategoriesService().catch(() => [] as unknown),
    listForumTopicsWithCategories(500).catch(() => [] as unknown),
    adminListForumComments(2000).catch(() => [] as unknown),
  ])

  const categories = Array.isArray(rawCategories) ? (rawCategories as ForumCategoryRecord[]) : []
  const topics = Array.isArray(rawTopics) ? (rawTopics as ForumTopicRecord[]) : []
  const comments = Array.isArray(rawComments) ? (rawComments as ForumCommentRecord[]) : []

  const categoryById = new Map<string, ForumCategoryRecord>()
  for (const category of categories) {
    categoryById.set(toStringSafe(category.id), category)
  }

  const responsesByTopicId = new Map<number, number>()
  for (const comment of comments) {
    if (!isActiveStatus(comment?.status)) continue
    const topicId = toNumberSafe(comment?.id_forum)
    if (topicId <= 0) continue
    responsesByTopicId.set(topicId, (responsesByTopicId.get(topicId) || 0) + 1)
  }

  const visibleTopics = sortTopics(
    topics.filter((topic) => {
      if (!isActiveStatus(topic?.status)) return false
      const categoryId = toStringSafe(topic?.cat_id)
      const category = categoryById.get(categoryId)
      if (category && !isActiveStatus(category?.status)) return false
      if (!searchTerm) return true
      const title = stripHtml(toStringSafe(topic?.titulo)).toLowerCase()
      const content = stripHtml(toStringSafe(topic?.conteudo)).toLowerCase()
      return title.includes(searchTerm) || content.includes(searchTerm)
    }),
  )

  const topicsBySection = new Map<SectionId, ForumTopicRecord[]>()
  for (const section of SECTION_CONFIG) {
    topicsBySection.set(section.id, [])
  }

  for (const topic of visibleTopics) {
    const categoryId = toStringSafe(topic?.cat_id)
    const categoryName = toStringSafe(categoryById.get(categoryId)?.nome)
    const sectionId = resolveSectionId(categoryId, categoryName)
    topicsBySection.get(sectionId)?.push(topic)
  }

  const groupedSections = SECTION_CONFIG.map((section) => ({
    ...section,
    topics: (topicsBySection.get(section.id) || []).slice(0, 12),
  }))

  const allTopics = visibleTopics.slice(0, 48)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-[50px] px-4 py-10 sm:px-8">
      <div className="flex w-full justify-end">
        <form className="flex w-full max-w-[560px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-[5px]">
          {isAllView ? <input type="hidden" name="view" value="all" /> : null}
          <div className="relative w-full sm:max-w-[255px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#BEBECE] material-icons text-[16px]">
              search
            </span>
            <input
              type="search"
              name="q"
              defaultValue={readQuery(resolvedSearchParams.q)}
              placeholder="Rechercher un titre"
              className="h-[50px] w-full rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] pl-9 pr-3 text-[12px] text-[#DDD] placeholder:text-[#BEBECE] focus-visible:border-[#2596FF] focus-visible:outline-none"
            />
          </div>

          {isAllView ? (
            <Link
              href={readQuery(resolvedSearchParams.q) ? `/forum?q=${encodeURIComponent(readQuery(resolvedSearchParams.q))}` : '/forum'}
              className="inline-flex h-[50px] items-center justify-center rounded-[4px] bg-[rgba(255,255,255,0.1)] px-5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#DDD] hover:bg-[rgba(255,255,255,0.16)]"
            >
              Voir sections
            </Link>
          ) : (
            <button
              type="submit"
              name="view"
              value="all"
              className="h-[50px] rounded-[4px] bg-[rgba(255,255,255,0.1)] px-5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#DDD] hover:bg-[rgba(255,255,255,0.16)]"
            >
              Lister toutes
            </button>
          )}
        </form>
      </div>

      <div className="space-y-8">
        {isAllView ? (
          <SectionBlock
            label="TOUS LES SUJETS"
            icon="/img/forum.png"
            topics={allTopics}
            responsesByTopicId={responsesByTopicId}
          />
        ) : (
          groupedSections.map((section) => (
            <SectionBlock
              key={section.id}
              label={section.label}
              icon={section.icon}
              topics={section.topics}
              responsesByTopicId={responsesByTopicId}
            />
          ))
        )}
      </div>
    </main>
  )
}
