import Link from 'next/link'
import {
  adminListForumComments,
  listForumCategoriesService,
  listForumTopicsWithCategories,
} from '@/server/pocketbase/forum'
import type {
  ForumCategoryRecord,
  ForumCommentRecord,
  ForumTopicRecord,
} from '@/server/pocketbase/types'
import { parseTimestamp } from '@/lib/date-utils'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'
import { SiteButton, SiteEmptyState, SiteHeader, SitePage, SitePanel, SiteSearch } from '@/components/site'

import { unstable_cache } from 'next/cache'

export const revalidate = 300

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
    return String(b.id ?? '').localeCompare(String(a.id ?? ''))
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
  const topicId = String(topic.id ?? '')
  const title = stripHtml(toStringSafe(topic.titulo)) || `Sujet ${topicId}`
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
        <SiteButton
          asChild
          size="sm"
          className="h-[38px] rounded-[2px] px-4"
        >
          <Link href={`/forum/topic/${topicId}`}>
            Voir plus
          </Link>
        </SiteButton>
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
  responsesByTopicId: Map<string, number>
}) {
  return (
    <section className="space-y-2">
      <SiteHeader title={label} imageSrc={icon} />

      <SitePanel padded={false} className="overflow-hidden">
        {topics.length === 0 ? (
          <SiteEmptyState className="border-0 bg-transparent px-5 py-8 tracking-[0.06em]">
            Aucun sujet dans cette section.
          </SiteEmptyState>
        ) : (
          topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              responseCount={responsesByTopicId.get(String(topic.id ?? '')) || 0}
            />
          ))
        )}
      </SitePanel>
    </section>
  )
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as Record<string, string | string[]>
  const isAllView = computeIsAllView(resolvedSearchParams.view)
  const searchTerm = readQuery(resolvedSearchParams.q).toLowerCase()

  const getCachedForumData = unstable_cache(
    () => Promise.all([
      listForumCategoriesService().catch(() => [] as unknown),
      listForumTopicsWithCategories(500).catch(() => [] as unknown),
      adminListForumComments(2000).catch(() => [] as unknown),
    ]),
    ['forum-page-data'],
    { tags: ['forum'], revalidate: 300 }
  )

  const [rawCategories, rawTopics, rawComments] = await getCachedForumData()

  const categories = Array.isArray(rawCategories) ? (rawCategories as ForumCategoryRecord[]) : []
  const topics = Array.isArray(rawTopics) ? (rawTopics as ForumTopicRecord[]) : []
  const comments = Array.isArray(rawComments) ? (rawComments as ForumCommentRecord[]) : []

  const categoryById = new Map<string, ForumCategoryRecord>()
  for (const category of categories) {
    categoryById.set(toStringSafe(category.id), category)
  }

  const responsesByTopicId = new Map<string, number>()
  for (const comment of comments) {
    if (!isActiveStatus(comment?.status)) continue
    const topicId = String(comment?.id_forum ?? '')
    if (!topicId) continue
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
    <SitePage className="gap-[50px] sm:px-8">
      <div className="flex w-full justify-end gap-3">
        <SiteButton asChild className="h-[50px] px-5 text-[11px]">
          <Link href="/forum/nouveau">Nouveau sujet</Link>
        </SiteButton>
        <form className="flex w-full max-w-[560px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-[5px]">
          {isAllView ? <input type="hidden" name="view" value="all" /> : null}
          <SiteSearch
            name="q"
            defaultValue={readQuery(resolvedSearchParams.q)}
            placeholder="Rechercher un titre"
          />

          {isAllView ? (
            <SiteButton asChild variant="ghost" className="h-[50px] px-5 text-[11px]">
              <Link href={readQuery(resolvedSearchParams.q) ? `/forum?q=${encodeURIComponent(readQuery(resolvedSearchParams.q))}` : '/forum'}>
                Voir sections
              </Link>
            </SiteButton>
          ) : (
            <SiteButton
              type="submit"
              name="view"
              value="all"
              variant="ghost"
              className="h-[50px] px-5 text-[11px]"
            >
              Lister toutes
            </SiteButton>
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
    </SitePage>
  )
}
