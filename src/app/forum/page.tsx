import Link from 'next/link'
import { JSX } from 'react'
import ContentCard from '@/components/shared/content-card'
import {
  listForumCategoriesService,
  listForumTopicsWithCategories,
} from '@/server/directus/forum'
import { mediaUrl } from '@/lib/media-url'
import { formatDateShortFr, parseTimestamp } from '@/lib/date-utils'
import { buildExcerptFromHtml, buildPreviewText, stripHtml } from '@/lib/text-utils'

export const revalidate = 60

type ForumCategory = {
  id: number | string
  nome?: string | null
  descricao?: string | null
  status?: string | null
}

type ForumTopic = {
  id: number | string
  titulo?: string | null
  conteudo?: string | null
  autor?: string | null
  data?: string | null
  views?: number | string | null
  status?: string | null
  fixo?: string | number | boolean | null
  fechado?: string | number | boolean | null
  cat_id?: string | number | null
  categoria?: string | number | null
  imagem?: string | null
}

const TARGET_CATEGORY_IDS = ['1', '3', '2', '13']
const FALLBACK_ICON = '/img/forum.png'

function toStringSafe(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return ''
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeStatus(status: unknown): string {
  return toStringSafe(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isActiveCategory(category: ForumCategory): boolean {
  const normalized = normalizeStatus(category?.status)
  return normalized === '' || normalized === 'ativo' || normalized === 'active'
}

function isActiveTopic(topic: ForumTopic): boolean {
  const normalized = normalizeStatus(topic?.status)
  return normalized === '' || normalized === 'ativo' || normalized === 'active'
}

function toTimestamp(value: unknown): number {
  return parseTimestamp(value, { numeric: 'ms', numericString: 'parse' })
}

function getCategoryKey(id: unknown): string {
  return String(id ?? '').trim()
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return /^(1|true|yes|y|s|on)$/i.test(value.trim())
  return false
}

function sortTopics(topics: ForumTopic[]): ForumTopic[] {
  return [...topics].sort((a, b) => {
    const pinnedDiff = Number(asBoolean(b.fixo)) - Number(asBoolean(a.fixo))
    if (pinnedDiff !== 0) return pinnedDiff
    const dateDiff = toTimestamp(b.data) - toTimestamp(a.data)
    if (dateDiff !== 0) return dateDiff
    const idDiff = (toNumber(b.id) ?? 0) - (toNumber(a.id) ?? 0)
    return idDiff
  })
}

function computeIsAllView(viewParam: string | string[] | undefined): boolean {
  if (typeof viewParam === 'string') return viewParam.toLowerCase() === 'all'
  if (Array.isArray(viewParam)) {
    return viewParam.some((value) => String(value).toLowerCase() === 'all')
  }
  return false
}

type ForumPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as Record<string, string | string[]>
  const isAllView = computeIsAllView(resolvedSearchParams.view)

  const [rawCategories, rawTopics] = await Promise.all([
    listForumCategoriesService().catch(() => [] as unknown),
    listForumTopicsWithCategories(200).catch(() => [] as unknown),
  ])

  const fetchedCategories = Array.isArray(rawCategories)
    ? (rawCategories as ForumCategory[])
    : Array.isArray((rawCategories as { data?: ForumCategory[] } | undefined)?.data)
      ? ((rawCategories as { data?: ForumCategory[] }).data as ForumCategory[])
      : []

  const categories: ForumCategory[] =
    fetchedCategories.length > 0
      ? fetchedCategories
        .filter(
          (category) =>
            TARGET_CATEGORY_IDS.includes(String(category?.id ?? '')) &&
            isActiveCategory(category),
        )
        .map((category) => ({ ...category }))
      : (TARGET_CATEGORY_IDS.map((id) => ({
        id,
        nome:
          id === '1'
            ? 'Habbo'
            : id === '2'
              ? 'Wired'
              : id === '3'
                ? 'General'
                : 'Videos',
        descricao: null,
        status: null,
      })) as ForumCategory[])

  const topics = Array.isArray(rawTopics)
    ? (rawTopics as ForumTopic[])
    : Array.isArray((rawTopics as { data?: ForumTopic[] } | undefined)?.data)
      ? ((rawTopics as { data?: ForumTopic[] }).data as ForumTopic[])
      : []

  const filteredTopics = topics.filter((topic) => {
    if (!isActiveTopic(topic)) return false
    const categoryKey = getCategoryKey(topic?.cat_id ?? topic?.categoria)
    return TARGET_CATEGORY_IDS.includes(categoryKey)
  })

  const topicsByCategory = new Map<string, ForumTopic[]>()
  for (const topic of filteredTopics) {
    const categoryKey = getCategoryKey(topic?.cat_id ?? topic?.categoria)
    if (!topicsByCategory.has(categoryKey)) {
      topicsByCategory.set(categoryKey, [])
    }
    topicsByCategory.get(categoryKey)!.push(topic)
  }
  const allTopicsSorted = sortTopics(filteredTopics)
  function renderTopicCard(topic: ForumTopic): JSX.Element {
    const topicId = toStringSafe(topic?.id) || '0'
    const title = toStringSafe(topic?.titulo) || (topicId ? `Sujet #${topicId}` : 'Sujet')
    const author = toStringSafe(topic?.autor)
    const publishedAt = formatDateShortFr(topic?.data)
    const excerpt = buildExcerptFromHtml(topic?.conteudo ?? '')
    const previewText = buildPreviewText(excerpt, { maxLength: 140 })
    const pinned = asBoolean(topic?.fixo)
    const closed = asBoolean(topic?.fechado)
    const imageUrl = mediaUrl(toStringSafe(topic?.imagem))

    return (
      <ContentCard
        key={topicId}
        title={title}
        href={`/forum/topic/${topicId}`}
        preview={previewText}
        image={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl || FALLBACK_ICON} alt="" className="h-full w-full object-contain" />
          </>
        }
        meta={
          <>
            {author ? <span>Par {author}</span> : null}
            {author && publishedAt ? (
              <span className="mx-1 h-px w-3 bg-[color:var(--foreground)]/20" />
            ) : null}
            {publishedAt ? <span>Publie le {publishedAt}</span> : null}
            {pinned ? (
              <span className="rounded-[2px] bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
                Epingle
              </span>
            ) : null}
            {closed ? (
              <span className="rounded-[2px] bg-rose-400/15 px-2 py-0.5 text-rose-200">Ferme</span>
            ) : null}
          </>
        }
      />
    )
  }

  const categorizedSections = categories.map((category) => {
    const categoryKey = getCategoryKey(category.id)
    const label =
      toStringSafe(category?.nome) || (categoryKey ? `Categorie ${categoryKey}` : 'Categorie')
    const description = toStringSafe(category?.descricao)
    const categoryTopics = sortTopics(topicsByCategory.get(categoryKey) ?? [])
    const topTopics = categoryTopics.slice(0, 5)

    return (
      <article
        key={categoryKey}
        className="rounded-[2px] border border-[color:var(--bg-700)]/50 bg-[color:var(--bg-900)]/45 p-5 shadow-[0_20px_60px_-60px_rgba(0,0,0,0.78)] transition hover:border-[color:var(--bg-600)]/60 hover:bg-[color:var(--bg-900)]/55"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FALLBACK_ICON}
              alt=""
              className="h-12 w-12 bg-[color:var(--bg-800)]/70 object-contain p-2"
            />
            <div>
              <h2 className="text-xl font-semibold uppercase text-[color:var(--foreground)]">
                {label}
              </h2>
              {description ? (
                <p className="text-xs text-[color:var(--foreground)]/60">{description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {topTopics.length ? (
            topTopics.map((topic) => renderTopicCard(topic))
          ) : (
            <div className="border border-dashed border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/35 px-4 py-6 text-center text-xs font-semibold uppercase text-[color:var(--foreground)]/55">
              Aucun sujet publie dans cette categorie pour le moment.
            </div>
          )}
        </div>
      </article>
    )
  })

  return (
    <main className="mx-auto flex w-full max-w-[1898px] flex-col gap-8 px-4 py-10 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase text-[color:var(--foreground)]">
            Forum communautaire
          </h1>
          <p className="text-xs font-semibold uppercase text-[color:var(--foreground)]/60">
            Choisis une categorie pour parcourir les sujets
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/35 material-icons">
              search
            </span>
            <input
              type="search"
              name="q"
              placeholder="Rechercher un sujet"
              className="h-11 w-full border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/55 pl-9 pr-3 text-sm font-medium text-[color:var(--foreground)]/85 placeholder:text-[color:var(--foreground)]/30 focus-visible:border-[color:var(--bg-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bg-300)]/25"
              disabled
            />
          </div>
          {isAllView ? (
            <Link
              href="/forum"
              className="flex h-11 items-center rounded-[2px] px-5 text-sm font-semibold uppercase bg-[#ffffff1a] text-white transition hover:bg-[#ffffff33]"
            >
              Voir par categorie
            </Link>
          ) : (
            <Link
              href="/forum?view=all"
              className="flex h-11 items-center rounded-[2px] px-5 text-sm font-semibold uppercase bg-[#ffffff1a] text-white transition hover:bg-[#ffffff33]"
            >
              Toutes les listes
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-6">
        {isAllView ? (
          <article className="rounded-[2px] border border-[color:var(--bg-700)]/50 bg-[color:var(--bg-900)]/45 p-5 shadow-[0_20px_60px_-60px_rgba(0,0,0,0.78)]">
            <div className="flex items-center gap-3 border-b border-[color:var(--bg-700)]/45 pb-4">
              <h2 className="text-xl font-semibold uppercase text-[color:var(--foreground)]">Tout</h2>
              <span className="text-xs font-semibold uppercase text-[color:var(--foreground)]/45">
                {allTopicsSorted.length} sujet{allTopicsSorted.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-5 space-y-5">
              {allTopicsSorted.length ? (
                allTopicsSorted.map((topic) => renderTopicCard(topic))
              ) : (
                <div className="border border-dashed border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/35 px-4 py-6 text-center text-xs font-semibold uppercase text-[color:var(--foreground)]/55">
                  Aucun sujet disponible pour le moment.
                </div>
              )}
            </div>
          </article>
        ) : (
          categorizedSections
        )}

        {!isAllView && categories.length === 0 ? (
          <div className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/45 px-6 py-10 text-center text-sm font-semibold uppercase text-[color:var(--foreground)]/50">
            Aucune categorie disponible pour le moment.
          </div>
        ) : null}
      </section>
    </main>
  )
}
